import { useTaskListSort } from "@/lib/taskListSort";
import { planOf } from "@/lib/planCascade";
import { isTaskOverdue, isTaskMissedWorkDay } from "@/lib/taskPlanning";
import { getTimeSettings, todayISO } from "@/lib/timeHorizon";
import { filterAndSortTasks, DEFAULT_FILTERS } from "@/lib/smartListService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { addDays, endOfDay, startOfDay } from "date-fns";
import {
  ChevronDown, ChevronRight, CheckSquare, Columns2, CircleDot, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTasksData } from "@/hooks/useTasksData";
import { useBilingual } from "@/hooks/useBilingual";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { firebaseStore } from "@/lib/firebaseStore";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { PRIORITY_META } from "@/lib/priority";
import { getStudyTaskNavigation, isLeitnerStudyTask } from "@/lib/taskStudyService";
import type { Task, TaskStatus, ConfirmState } from "@/lib/taskTypes";
import { persistTask, type TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { toSaveStatus } from "@/lib/saveFeedback";
import { applyPatchResolution, beginTaskPatch, createTaskPatchJournal, resolveTaskPatch } from "@/lib/taskPatchJournal";
import { awardTaskWatering } from "@/lib/garden";
import { isRecurringTask, advanceRecurringTask } from "@/lib/recurringTaskService";
import { playCompletionFeedback } from "@/lib/completionFeedback";
import { deleteTaskCascade } from "@/features/tasks/taskService";
import { taskDueTimestamp, getLocalDateString, taskWorkDate, moveTaskDayPatch } from "@/lib/taskDate";
import { readSchedule, schedulePatch } from "@/lib/taskSchedule";
import type { TaskSwipeAction } from "@/lib/taskSwipeSettings";
import { pushUndo } from "@/lib/undoStack";
import { buildTaskChildrenMap, collectTaskDescendantIds, getTaskProgress, isStandaloneTaskForScope } from "@/features/tasks/taskTree";
import { setShowCompletedTasks, useShowCompletedTasks } from "@/lib/completedTaskVisibility";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";
import { HeaderActionsPortal } from "@/components/HeaderActionsPortal";
import { useResizableSplit } from "@/hooks/useResizableSplit";
import { Button } from "@/components/ui/button";
import { TaskListItem } from "@/components/TaskListItem";
import { QuickAddTask } from "@/components/QuickAddTask";
import { TaskDetail } from "@/components/TaskDetail";
import TaskActionSheet from "@/components/TaskActionSheet";
import { MoveToDialog } from "@/components/MoveToDialog";
import { MakeChildDialog } from "@/components/MakeChildDialog";
import PomodoroSheet from "@/components/PomodoroSheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StreakCard } from "@/components/StreakCard";
import { NavLink } from "@/components/NavLink";
import { useTodayPlanning } from "@/hooks/useTodayPlanning";
import { countActiveWip, shouldClearInvalidNextTask } from "@/lib/todayPlanning";

export default function TodayDashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { T, isEn } = useBilingual();
  const { isPhone } = useDeviceFormFactor();

  const showCompleted = useShowCompletedTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<Task[]>([]);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [moveTask, setMoveTask] = useState<Task | null>(null);
  const [makeChildOf, setMakeChildOf] = useState<Task | null>(null);
  const [pomoTask, setPomoTask] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const patchJournal = useRef(createTaskPatchJournal());
  const activeUserId = useRef(user?.id);
  activeUserId.current = user?.id;

  const [splitView, setSplitView] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("arshnaz_tasks_split_view") !== "false";
  });
  const [isWideOrFoldable, setIsWideOrFoldable] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return (
      window.innerWidth >= 600 ||
      (typeof window.matchMedia === "function" &&
        (window.matchMedia("(horizontal-viewport-segments: 2)").matches ||
          window.matchMedia("(spanning: single-fold-vertical)").matches))
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const wide =
        window.innerWidth >= 600 ||
        (typeof window.matchMedia === "function" &&
          (window.matchMedia("(horizontal-viewport-segments: 2)").matches ||
            window.matchMedia("(spanning: single-fold-vertical)").matches));
      setIsWideOrFoldable(wide);
    };
    window.addEventListener("resize", check);
    const m1 = window.matchMedia?.("(horizontal-viewport-segments: 2)");
    const m2 = window.matchMedia?.("(spanning: single-fold-vertical)");
    m1?.addEventListener?.("change", check);
    m2?.addEventListener?.("change", check);
    return () => {
      window.removeEventListener("resize", check);
      m1?.removeEventListener?.("change", check);
      m2?.removeEventListener?.("change", check);
    };
  }, []);

  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const isSplitEnabled = splitView && isWideOrFoldable && (availableWidth === null || availableWidth >= 640);
  const isSplitActive = isSplitEnabled && selectedTask !== null;

  const {
    splitRatio,
    isResizing: isSplitResizing,
    containerRef: splitContainerRef,
    handlePointerDown: handleSplitPointerDown,
    handlePointerMove: handleSplitPointerMove,
    handlePointerUp: handleSplitPointerUp,
  } = useResizableSplit({
    storageKey: "arshnaz_today_split_ratio",
    defaultRatio: 48,
    minRatio: 28,
    maxRatio: 72,
  });

  useEffect(() => {
    const container = splitContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const measure = () => setAvailableWidth(container.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [splitContainerRef]);

  const toggleSplitView = () => {
    setSplitView((prev) => {
      const next = !prev;
      localStorage.setItem("arshnaz_tasks_split_view", String(next));
      return next;
    });
  };

  // 1. Fetch task data
  const {
    allTasks,
    setAllTasks,
    isReady: tasksReady,
    isServerAuthoritative: tasksAuthoritative,
    outcomeById,
    outcomeByTaskId,
    load,
  } = useTasksData({ user, scope: "today" });

  const [currentDayKey, setCurrentDayKey] = useState(() => getLocalDateString());
  const [clockRevision, setClockRevision] = useState(0);
  const todayPlanning = useTodayPlanning(user?.id, currentDayKey);
  const selectedNextTask = todayPlanning.nextTaskId ? allTasks.find(task => task.id === todayPlanning.nextTaskId) || null : null;
  const nextTaskIdRef = useRef<string | null>(todayPlanning.nextTaskId);
  nextTaskIdRef.current = todayPlanning.nextTaskId;
  const wipCount = useMemo(() => countActiveWip(allTasks), [allTasks]);
  const pendingInvalidations = useRef(new Set<string>());

  useEffect(() => {
    if (!tasksReady || !shouldClearInvalidNextTask(todayPlanning.nextTaskId, allTasks, tasksAuthoritative)
      || (todayPlanning.nextTaskId && pendingInvalidations.current.has(todayPlanning.nextTaskId))) return;
    todayPlanning.clearNextTaskIf(todayPlanning.nextTaskId);
  }, [tasksReady, tasksAuthoritative, allTasks, todayPlanning.nextTaskId, todayPlanning.clearNextTaskIf]);
  useEffect(() => {
    const checkDay = () => {
      setClockRevision(value => value + 1);
      const nowKey = getLocalDateString();
      if (nowKey !== currentDayKey) {
        setCurrentDayKey(nowKey);
        void load();
      }
    };
    const onVisibility = () => {
      if (!document.hidden) checkDay();
    };
    const onFocus = () => checkDay();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1).getTime() - now.getTime();
    const timer = setTimeout(checkDay, Math.max(1000, msUntilMidnight));
    const clockTimer = window.setInterval(checkDay, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      clearTimeout(timer);
      window.clearInterval(clockTimer);
    };
  }, [currentDayKey, load]);

  const startOfToday = useMemo(() => {
    void currentDayKey;
    return startOfDay(new Date()).getTime();
  }, [currentDayKey, clockRevision]);
  const endOfToday = useMemo(() => {
    void currentDayKey;
    return endOfDay(new Date()).getTime();
  }, [currentDayKey, clockRevision]);

  const taskMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);
  const childrenMap = useMemo(() => buildTaskChildrenMap(allTasks), [allTasks]);
  const getProgress = useCallback((id: string) => getTaskProgress(id, childrenMap), [childrenMap]);

  // 2. Classify tasks
  // Today's tasks: standalone tasks whose due date is today.
  // Root tasks, or subtasks whose parents are not due today, are displayed at top-level.
  // Tasks planned for today in Planning (time-bucket) count as today's tasks too.
  const isDueToday = useCallback((t: Task) => {
    if (isTaskOverdue(t, getTimeSettings())) return false;
    const plan = planOf(t, getTimeSettings());
    if (plan?.horizon === "day" && plan.start === todayISO()) return true;
    return [taskWorkDate(t)].some(date => {
      if (!date) return false;
      const timestamp = taskDueTimestamp(date);
      return timestamp >= startOfToday && timestamp <= endOfToday;
    });
  }, [startOfToday, endOfToday, clockRevision]);

  // Today's tasks (due between startOfToday and endOfToday)
  const todayTasks = useMemo(() => {
    return allTasks.filter((t) => isStandaloneTaskForScope(t, isDueToday, taskMap));
  }, [allTasks, isDueToday, taskMap]);

  const todayStudyTasks = useMemo(
    () => todayTasks.filter((task) => getStudyTaskNavigation(task).isStudyTask),
    [todayTasks],
  );
  const todayPersonalTasks = useMemo(
    () => todayTasks.filter((task) => !getStudyTaskNavigation(task).isStudyTask),
    [todayTasks],
  );

  const todaySort = useTaskListSort("today:_");

  // Pinned tasks lead; the two display rules are configured in Settings.
  const activeTodayTasks = useMemo(() => filterAndSortTasks(
    todayPersonalTasks.filter((task) => !task.completed),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [todayPersonalTasks, todaySort]);

  const activeTodayStudyTasks = useMemo(() => filterAndSortTasks(
    todayStudyTasks.filter((task) => !task.completed),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [todayStudyTasks, todaySort]);
  const completedTodayStudyTasks = useMemo(() => todayStudyTasks
    .filter((task) => task.completed)
    .sort((a, b) => {
      const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    }), [todayStudyTasks]);

  // Completed today tasks
  const completedTodayTasks = useMemo(() => {
    return todayPersonalTasks
      .filter((t) => t.completed)
      .sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.id.localeCompare(b.id);
      });
  }, [todayPersonalTasks]);

  const isDueOverdue = useCallback((t: Task) => {
    void currentDayKey;
    const settings = getTimeSettings();
    return isTaskOverdue(t, settings) || isTaskMissedWorkDay(t, settings);
  }, [currentDayKey, clockRevision]);

  const overdueTasks = useMemo(() => filterAndSortTasks(
    allTasks.filter((task) => isStandaloneTaskForScope(task, isDueOverdue, taskMap) && !getStudyTaskNavigation(task).isStudyTask),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [allTasks, isDueOverdue, taskMap, todaySort]);

  const overdueStudyTasks = useMemo(() => filterAndSortTasks(
    allTasks.filter((task) => isStandaloneTaskForScope(task, isDueOverdue, taskMap) && getStudyTaskNavigation(task).isStudyTask),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [allTasks, isDueOverdue, taskMap, todaySort]);

  const totalCount = todayTasks.length;
  const completedCount = completedTodayTasks.length + completedTodayStudyTasks.length;

  // Sync selected task with latest data
  useEffect(() => {
    if (!selectedTask) return;
    const current = allTasks.find((item) => item.id === selectedTask.id);
    if (!current) {
      setSelectedTask(null);
      setSelectedTaskHistory([]);
    } else if (current !== selectedTask) {
      setSelectedTask(current);
    }
  }, [allTasks, selectedTask]);

  const handleBackInDrawer = useCallback(() => {
    setSelectedTaskHistory((prev) => {
      if (prev.length === 0) {
        setSelectedTask(null);
        return [];
      }
      const next = [...prev];
      const previousTask = next.pop()!;
      const fresh = allTasks.find((t) => t.id === previousTask.id) || previousTask;
      setSelectedTask(fresh);
      return next;
    });
  }, [allTasks]);

  const handleOpenParentInDrawer = useCallback((targetTaskId: string) => {
    if (!selectedTask) return;
    const target = allTasks.find((t) => t.id === targetTaskId);
    if (target) {
      setSelectedTaskHistory((prev) => [...prev, selectedTask]);
      setSelectedTask(target);
    } else {
      navigate(`/app/tasks/${encodeURIComponent(targetTaskId)}?from=${encodeURIComponent(selectedTask.id)}`);
    }
  }, [selectedTask, allTasks, navigate]);

  // 3. Selection handler: opens in split left-panel on wide/foldable/desktop, or drawer on mobile
  const handleSelectTask = useCallback((task: Task) => {
    if (task.parent_id) {
      const parent = allTasks.find((p) => p.id === task.parent_id);
      if (parent) {
        setSelectedTaskHistory([parent]);
        setSelectedTask(task);
        return;
      }
    }
    setSelectedTaskHistory([]);
    setSelectedTask(task);
  }, [allTasks]);

  // 4. Canonical persistence with optimistic update & rollback
  const handleToggleTask = useCallback(async (task: Task) => {
    const nextCompleted = !task.completed;
    if (nextCompleted && isLeitnerStudyTask(task)) {
      navigate(getStudyTaskNavigation(task).navUrl);
      return;
    }
    if (nextCompleted && isRecurringTask(task) && user?.id) {
      playCompletionFeedback();
      awardTaskWatering(task.title, Boolean(task.parent_id));
      const res = await advanceRecurringTask(user.id, task, { allKnownTasks: allTasks });
      if (res.success && res.patch) {
        setAllTasks((prev) => prev.map((t) => (t.id === task.id ? ({ ...t, ...res.patch } as Task) : t)));
        if (todayPlanning.nextTaskId === task.id) todayPlanning.clearNextTaskIf(task.id);
        toast.success(
          T(
            `نمونه بعدی به ${res.formattedNextDate} منتقل شد 🔁`,
            `Next instance moved to ${res.formattedNextDate} 🔁`
          )
        );
        return;
      }
      toast.error(T("نمونهٔ بعدی ذخیره نشد؛ کار انجام‌شده نشد. دوباره تلاش کنید.", "The next occurrence could not be saved. The task remains open; please retry."));
      return;
    }
    if (nextCompleted) {
      playCompletionFeedback();
      awardTaskWatering(task.title, Boolean(task.parent_id));
    }
    const nextStatus: TaskStatus = nextCompleted ? "done" : "todo";
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;
    const patch = { completed: nextCompleted, status: nextStatus, completed_at: nextCompletedAt };
    const invalidatesNext = nextCompleted && todayPlanning.nextTaskId === task.id;
    if (invalidatesNext) pendingInvalidations.current.add(task.id);

    setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    try {
      if (user?.id) {
        const res = await persistTask(user.id, { id: task.id, ...patch });
        if (res === "failed") throw new Error(T("بروزرسانی تسک ناموفق بود", "Could not update task"));
        if (res === "queued") toast.info(T("تغییر ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Saved locally — will sync when online"));
      } else {
        const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", task.id);
        if (error) throw new Error(error.message);
      }
      window.dispatchEvent(new Event("tasks-changed"));
      if (invalidatesNext) todayPlanning.clearNextTaskIf(task.id);
      if (user?.id) {
        const ownerId = user.id;
        pushUndo({
          label: nextCompleted ? T(`کار «${task.title}» انجام شد`, `Completed "${task.title}"`) : T(`کار «${task.title}» باز شد`, `Reopened "${task.title}"`),
          undo: async () => {
            if (activeUserId.current !== ownerId) throw new Error(T("برای بازگردانی وارد همان حساب شوید", "Sign in to the same account to undo"));
            const inverse = { completed: task.completed, status: task.status, completed_at: task.completed_at || null };
            const result = await persistTask(ownerId, { id: task.id, ...inverse });
            if (result === "failed") throw new Error(T("بازگردانی ذخیره نشد", "Could not save undo"));
            if (activeUserId.current === ownerId) setAllTasks(previous => previous.map(row => row.id === task.id ? { ...row, ...inverse } : row));
            window.dispatchEvent(new Event("tasks-changed"));
          },
        });
      }
    } catch (err) {
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(err instanceof Error ? err.message : T("بروزرسانی تسک با خطا مواجه شد", "Could not update task"));
    } finally {
      if (invalidatesNext) pendingInvalidations.current.delete(task.id);
    }
  }, [T, user?.id, setAllTasks, navigate, allTasks, todayPlanning.nextTaskId, todayPlanning.clearNextTaskIf]);

  useEffect(() => {
    const taskId = searchParams.get("completeTaskId");
    if (!taskId) return;
    const task = allTasks.find((item) => item.id === taskId);
    if (!task) return;

    if (isLeitnerStudyTask(task) && !task.completed) {
      navigate(getStudyTaskNavigation(task).navUrl, { replace: true });
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("completeTaskId");
    setSearchParams(nextParams, { replace: true });
    if (!task.completed) {
      playCompletionFeedback();
      void handleToggleTask(task);
    }
  }, [allTasks, handleToggleTask, navigate, searchParams, setSearchParams]);

  const handlePatchTask = useCallback(async (id: string, patch: Partial<Task>): Promise<TaskPersistenceStatus> => {
    const prevTask = allTasks.find((t) => t.id === id);
    if (!prevTask) return "failed";
    const next = { ...prevTask, ...patch };
    const invalidating = (patch.completed === true || ["done", "wont_do", "waiting"].includes(String(patch.status)))
      && todayPlanning.nextTaskId === id;
    if (invalidating) pendingInvalidations.current.add(id);
    const ownerId = user?.id ?? null;
    const entityId = `${ownerId || "guest"}\u0000${id}`;
    const version = beginTaskPatch(patchJournal.current, entityId, prevTask, patch);

    setAllTasks((prev) => prev.map((item) => (item.id === id ? next : item)));
    let status: TaskPersistenceStatus = "failed";
    let message: string | null = null;
    try {
      if (ownerId) {
        status = toSaveStatus(await persistTask(ownerId, { id, ...patch }));
        if (status === "failed") message = T("ذخیره تغییرات ناموفق بود", "Could not save task changes");
      } else {
        const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", id);
        if (error) { status = "failed"; message = error.message; }
        else status = "saved";
      }
    } catch (error) {
      status = "failed";
      message = error instanceof Error ? error.message : T("ذخیره تغییرات ناموفق بود", "Could not save task changes");
    }
    const resolution = resolveTaskPatch(patchJournal.current, entityId, version, status !== "failed");
    setAllTasks((prev) => prev.map((item) => item.id === id ? applyPatchResolution(item, resolution) : item));
    if (status === "failed") toast.error(message || T("ذخیره تغییرات ناموفق بود", "Could not save task changes"));
    else {
      window.dispatchEvent(new Event("tasks-changed"));
      if (invalidating) todayPlanning.clearNextTaskIf(id);
    }
    if (invalidating) pendingInvalidations.current.delete(id);
    return status;
  }, [T, user?.id, allTasks, setAllTasks, todayPlanning.nextTaskId, todayPlanning.clearNextTaskIf]);

  const handleSwipeTask = async (task: Task, action: TaskSwipeAction) => {
    if (task.user_id !== user?.id || action === "none") return;
    if (action === "menu") { setActionTask(task); return; }
    if (action === "complete") { await handleToggleTask(task); return; }
    const ownerId = user.id;
    const inverse = schedulePatch(readSchedule(task));
    const result = await handlePatchTask(task.id, moveTaskDayPatch(task, getLocalDateString(addDays(new Date(), action === "tomorrow" ? 1 : 0))));
    if (result === "failed") return;
    pushUndo({
      label: action === "today" ? T("کار به امروز منتقل شد", "Task scheduled for today") : T("کار به فردا منتقل شد", "Task scheduled for tomorrow"),
      undo: async () => {
        if (activeUserId.current !== ownerId) throw new Error(T("برای بازگردانی وارد همان حساب شوید", "Sign in to the same account to undo"));
        const status = await handlePatchTask(task.id, inverse);
        if (status === "failed") throw new Error(T("بازگردانی ذخیره نشد", "Could not save undo"));
      },
    });
  };

  const askDeleteTask = useCallback((task: Task) => {
    const descendants = collectTaskDescendantIds(task.id, childrenMap);
    const childCount = descendants.length;
    const idsToRemove = new Set([task.id, ...descendants]);
    setConfirm({
      kind: "task",
      id: task.id,
      title: task.title,
      childCount,
      onConfirm: async () => {
        const invalidatedNextTaskId = nextTaskIdRef.current && idsToRemove.has(nextTaskIdRef.current)
          ? nextTaskIdRef.current
          : null;
        if (invalidatedNextTaskId) pendingInvalidations.current.add(invalidatedNextTaskId);
        const previousTasks = allTasks;
        setAllTasks((prev) => prev.filter((t) => !idsToRemove.has(t.id)));
        try {
          if (user?.id) {
            const res = await deleteTaskCascade(user.id, task.id, allTasks);
            if (!res.success) throw new Error(T("حذف تسک ناموفق بود", "Could not delete task"));
          } else {
            const { error } = await firebaseStore.from("tasks").delete().in("id", Array.from(idsToRemove));
            if (error) throw new Error(error.message);
          }
          window.dispatchEvent(new Event("tasks-changed"));
          if (invalidatedNextTaskId) todayPlanning.clearNextTaskIf(invalidatedNextTaskId);
          toast.success(
            childCount > 0
              ? T(`تسک و ${childCount} زیرتسک آن حذف شدند`, `Task and its ${childCount} subtasks deleted`)
              : T("تسک حذف شد", "Task deleted")
          );
        } catch (err) {
          setAllTasks(previousTasks);
          toast.error(err instanceof Error ? err.message : T("حذف تسک با خطا مواجه شد", "Could not delete task"));
        } finally {
          if (invalidatedNextTaskId) pendingInvalidations.current.delete(invalidatedNextTaskId);
        }
      },
    });
  }, [childrenMap, allTasks, user?.id, setAllTasks, T, todayPlanning.nextTaskId, todayPlanning.clearNextTaskIf]);

  const todayJalali = formatDate(new Date(), "EEEE، d MMMM yyyy", "jalali");
  const todayGregorian = formatDate(new Date(), "EEEE, MMMM d, yyyy", "gregorian");

  const renderTaskItem = (t: Task, depth = 0) => (
    <TaskListItem
      key={t.id}
      t={t}
      depth={depth}
      subs={childrenMap[t.id] || []}
      open={!!expanded[t.id]}
      onToggleExpand={(id) => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
      progress={getProgress(t.id)}
      parent={t.parent_id ? taskMap.get(t.parent_id) : null}
      onSelectTask={handleSelectTask}
      onToggleTask={handleToggleTask}
      onActionTask={setActionTask}
      onDeleteTask={askDeleteTask}
      onPatchTask={handlePatchTask}
      onSwipeTask={handleSwipeTask}
      onMoveTask={setMoveTask}
      userId={user?.id}
      isSelected={selectedTask?.id === t.id}
      splitView={isSplitActive}
      layout="compact"
      isEn={isEn}
      T={T}
      navigate={navigate}
      outcomeByTaskId={outcomeByTaskId}
      outcomeById={outcomeById}
      childrenMap={childrenMap}
      expanded={expanded}
      getProgress={getProgress}
      taskMap={taskMap}
      allowDrag={false}
      showCompletedTasks={showCompleted}
      todayNextTaskId={todayPlanning.nextTaskId}
      todayImportantTaskIds={todayPlanning.data.importantByDay[currentDayKey] || []}
    />
  );

  // Never claim "no tasks today" before the first load resolves: tasksReady is
  // false on every cold start, which used to flash the empty state.
  const isEmpty =
    tasksReady && totalCount === 0 && overdueTasks.length === 0 && overdueStudyTasks.length === 0;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className={`w-full mx-auto relative page-enter ${
        isSplitActive
          ? "h-[calc(100dvh-var(--bottom-bar-height)-var(--bottom-bar-gap))] sm:h-[calc(100dvh-var(--bottom-bar-height)-var(--bottom-bar-gap))] xl:h-[calc(100dvh-var(--bottom-bar-height)-var(--bottom-bar-gap))] flex flex-col p-2 sm:p-3 md:p-4 lg:px-5 xl:px-7 lg:py-2.5 space-y-2 overflow-hidden"
          : "p-2 sm:p-3 md:p-4 lg:px-5 xl:px-7 lg:py-4 space-y-3 pb-safe-bottom"
      }`}
    >
      <HeaderTitlePortal
        title={T("امروز", "Today")}
        subtitle={isEn ? todayGregorian : todayJalali}
      />

      <HeaderActionsPortal>
        <div className="flex items-center gap-2 shrink-0">
          {selectedNextTask && (
            <div data-testid="today-next-selection" className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2 py-1 text-[10px] sm:text-xs text-primary max-w-[150px] sm:max-w-[210px]">
              <CircleDot className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline shrink-0">{T("بعدی:", "Next:")}</span>
              <span className="truncate">{selectedNextTask.title}</span>
              <button type="button" aria-label={T("پاک‌کردن کار بعدی", "Clear next task")} onClick={() => todayPlanning.setNextTask(null)} className="shrink-0 rounded-full hover:bg-primary/10">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <NavLink to="/app/stats" className="hidden sm:block" activeClassName="" data-testid="today-streak-link">
            <StreakCard compact />
          </NavLink>
          {totalCount > 0 && (
            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
              {T(`${toPersianDigits(completedCount)} از ${toPersianDigits(totalCount)}`, `${completedCount} / ${totalCount}`)} <span className="hidden sm:inline">{T("تکمیل‌شده", "completed")}</span>
            </span>
          )}
          {isWideOrFoldable && (
            <Button
              variant={isSplitEnabled ? "secondary" : "ghost"}
              size="icon"
              onClick={toggleSplitView}
              className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground"
              disabled={availableWidth !== null && availableWidth < 640}
              aria-pressed={isSplitEnabled}
              aria-label={splitView ? T("حالت تمام‌صفحه", "Full width") : T("نمای دوپنله", "Split view")}
              title={splitView ? T("حالت تمام‌صفحه", "Full width") : T("نمای دوپنله (نیمه چپ)", "Split view (left panel)")}
              data-testid="today-toggle-split"
            >
              <Columns2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </HeaderActionsPortal>

      <div
        ref={splitContainerRef}
        data-task-split={isSplitActive ? "true" : "false"}
        dir="ltr"
        className={`w-full items-start gap-1 sm:gap-1.5 xl:gap-2 ${
          isSplitActive
            ? "flex-1 min-h-0 flex flex-row overflow-hidden"
            : "flex flex-col"
        } ${isSplitResizing ? "select-none cursor-col-resize" : ""}`}
      >
        {/* پنل سمت چپ جزئیات تسک در نمایش دسکتاپ/ویندوز/تاشو با اسکرول مستقل */}
        {isSplitActive && selectedTask && (
          <aside
            dir={isEn ? "ltr" : "rtl"}
            style={{ width: `clamp(280px, ${splitRatio}%, calc(100% - 320px))` }}
            className={`shrink-0 min-w-[280px] max-w-[75%] h-full overflow-hidden ${
              isSplitResizing ? "transition-none" : "transition-[width] duration-150 ease-out"
            }`}
          >
            <TaskDetail
                key={selectedTask.id}
                task={selectedTask}
                mode="embedded"
                onClose={() => {
                  setSelectedTaskHistory([]);
                  setSelectedTask(null);
                }}
                onChanged={load}
                setConfirm={setConfirm}
                allowDelete
                onOpenParentTask={handleOpenParentInDrawer}
                onBack={selectedTaskHistory.length > 0 ? handleBackInDrawer : undefined}
                hasBackHistory={selectedTaskHistory.length > 0}
              />
          </aside>
        )}

        {/* دستگیره درگ تغییر عرض ستون‌ها در حالت دوپنله */}
        {isSplitActive && selectedTask && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={T("تغییر عرض ستون‌ها", "Resize columns")}
            onPointerDown={handleSplitPointerDown}
            onPointerMove={handleSplitPointerMove}
            onPointerUp={handleSplitPointerUp}
            onPointerCancel={handleSplitPointerUp}
            className="w-3 -mx-1 shrink-0 h-full flex items-center justify-center cursor-col-resize group/splitter select-none touch-none z-10"
            title={T("بکشید برای تنظیم عرض دو ستون", "Drag to resize columns")}
          >
            <div className="w-1 h-12 rounded-full bg-border/80 group-hover/splitter:bg-primary group-hover/splitter:h-16 group-active/splitter:bg-primary group-active/splitter:h-20 transition-all shadow-xs" />
          </div>
        )}

        {/* پنل سمت راست فهرست تیترهای تسک با اسکرول مستقل */}
        <section
          dir={isEn ? "ltr" : "rtl"}
          className={`w-full min-w-0 p-1 sm:p-2 lg:p-3 ${
            isSplitActive
              ? "flex-1 h-full min-h-0 overflow-y-auto overscroll-contain pb-6"
              : "pb-16"
          }`}
        >
          {/* باکس درج سریع تسک در نمای امروز به سبک تیک‌تیک */}
          <div className="sticky top-0 z-20 py-1.5 -mx-1 px-1 mb-2" style={{ background: "var(--page-surface, hsl(var(--background)))" }}>
            <QuickAddTask
              defaults={{
                work_date: getLocalDateString(),
                folder_id: null,
              }}
              onCreated={() => load()}
            />
          </div>

          <div className="mb-3 flex">
            <Link to="/app/recall" className="recall-launch" data-testid="start-recall">
              {T("شروع مرور", "Start review")}
            </Link>
          </div>

          {/* ۳. لیست تسک‌ها با خط زمان و ریتم فشرده هفتگی */}
          <div className="space-y-2">
                {activeTodayTasks.length > 0 && (
                  <div className="space-y-1" data-testid="today-active-tasks">
                    {activeTodayTasks.map((task) => renderTaskItem(task))}
                  </div>
                )}

                {(activeTodayStudyTasks.length > 0 || (showCompleted && completedTodayStudyTasks.length > 0)) && (
                  <section data-testid="study-due-today" aria-label={T("مرورهای امروز", "Study due today")} className="space-y-1 pb-2 border-b border-border">
                    <TaskGroupHeader label={T("مرورهای امروز", "Study due today")} count={todayStudyTasks.length} />
                    <div className="space-y-1">
                      {activeTodayStudyTasks.map((task) => renderTaskItem(task))}
                      {showCompleted && completedTodayStudyTasks.map((task) => renderTaskItem(task))}
                    </div>
                  </section>
                )}

                {/* تسک‌های تکمیل‌شده امروز به صورت تاشو و فشرده */}
                {completedTodayTasks.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCompletedTasks(!showCompleted)}
                      className="flex items-center gap-1.5 px-1 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showCompleted ? T("مخفی کردن تسک‌های تکمیل‌شده", "Hide completed tasks") : T("نمایش تسک‌های تکمیل‌شده", "Show completed tasks")}
                    >
                      {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />}
                      <span>{T("تکمیل‌شده", "Completed")}</span>
                      <span className="text-xs font-normal text-muted-foreground/80">{toPersianDigits(completedTodayTasks.length)}</span>
                    </button>
                    {showCompleted && (
                      <div className="space-y-1 mt-1 opacity-75">
                        {completedTodayTasks.map((t) => renderTaskItem(t))}
                      </div>
                    )}
                  </div>
                )}

                {/* کارهای دارای روز یا بازهٔ گذشته، پس از همهٔ کارهای امروز */}
                {overdueTasks.length > 0 && (
                  <section data-testid="overdue-tasks" className="space-y-1 pt-3">
                    <TaskGroupHeader label={T("عقب‌افتاده", "Overdue")} count={overdueTasks.length} tone="overdue" testid="task-group-overdue" />
                    <div className="space-y-1">
                      {overdueTasks.map((t) => renderTaskItem(t))}
                    </div>
                  </section>
                )}

                {overdueStudyTasks.length > 0 && (
                  <section data-testid="overdue-study" aria-label={T("مرورهای عقب‌افتاده", "Overdue study")} className="space-y-1 pt-3">
                    <TaskGroupHeader label={T("مرورهای عقب‌افتاده", "Overdue study")} count={overdueStudyTasks.length} tone="accent" />
                    <div className="space-y-1">
                      {overdueStudyTasks.map((task) => renderTaskItem(task))}
                    </div>
                  </section>
                )}
                {/* حالت خالی */}
                {isEmpty && (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <CheckSquare className="w-10 h-10 mx-auto opacity-30 text-primary" />
                    <p className="text-sm font-medium text-foreground/80">
                      {T("امروز تسکی نداری ✨", "No tasks for today ✨")}
                    </p>
                  </div>
                )}
          </div>
        </section>
      </div>

      {/* جزئیات تسک در نمایشگرهای تک‌پنله/موبایل به‌صورت کشویی (Drawer) */}
      {selectedTask && !isSplitActive && (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          mode="drawer"
          onClose={() => {
            setSelectedTaskHistory([]);
            setSelectedTask(null);
          }}
          onChanged={load}
          setConfirm={setConfirm}
          allowDelete
          onOpenParentTask={handleOpenParentInDrawer}
          onBack={selectedTaskHistory.length > 0 ? handleBackInDrawer : undefined}
          hasBackHistory={selectedTaskHistory.length > 0}
        />
      )}

      {/* اکشن‌شیت برای لانگ‌پرس و کنش‌های پیشرفته */}
      <TaskActionSheet
        task={actionTask}
        onOpenChange={(v) => !v && setActionTask(null)}
        onComplete={() => actionTask && handleToggleTask(actionTask)}
        onDelete={() => actionTask && askDeleteTask(actionTask)}
        onMove={() => actionTask && setMoveTask(actionTask)}
        onMakeChild={() => actionTask && setMakeChildOf(actionTask)}
        onPatch={(patch) => actionTask && handlePatchTask(actionTask.id, patch)}
        onPomodoro={() => actionTask && setPomoTask(actionTask)}
        onEdit={() => actionTask && handleSelectTask(actionTask)}
        onRefresh={load}
        wipEnabled={todayPlanning.data.wipEnabled}
        wipLimit={todayPlanning.data.wipLimit}
        wipCount={wipCount}
        onSetWipEnabled={todayPlanning.setWipEnabled}
        onSetWipLimit={todayPlanning.setWipLimit}
      />

      {/* پومودورو شیت */}
      <PomodoroSheet
        task={pomoTask}
        open={!!pomoTask}
        onOpenChange={(v) => !v && setPomoTask(null)}
      />

      {/* دیالوگ تبدیل به زیرتسک */}
      {makeChildOf && (
        <MakeChildDialog
          open={!!makeChildOf}
          onOpenChange={(v) => !v && setMakeChildOf(null)}
          task={makeChildOf}
          allTasks={allTasks}
          onDone={(newParentId) => {
            setAllTasks((prev) => prev.map((x) => (x.id === makeChildOf.id ? { ...x, parent_id: newParentId } : x)));
            if (newParentId) setExpanded((s) => ({ ...s, [newParentId]: true }));
            window.dispatchEvent(new Event("tasks-changed"));
          }}
        />
      )}

      {/* دیالوگ انتقال تسک به فولدر */}
      {moveTask && (
        <MoveToDialog
          open={!!moveTask}
          onOpenChange={(v) => !v && setMoveTask(null)}
          kind="task"
          itemId={moveTask.id}
          currentFolderId={moveTask.folder_id}
          onMoved={() => { load(); setMoveTask(null); }}
        />
      )}

      {/* دیالوگ تایید حذف */}
      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.childCount && confirm.childCount > 0
                ? T(`حذف این تسک و ${confirm.childCount} زیرتسک؟`, `Delete this task and ${confirm.childCount} subtasks?`)
                : T("حذف تسک؟", "Delete task?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.childCount && confirm.childCount > 0
                ? T(
                    `آیا مطمئنی می‌خوای «${confirm?.title || T("این تسک", "this task")}» و ${confirm.childCount} زیرتسک آن را حذف کنی؟`,
                    `Are you sure you want to delete "${confirm?.title || T("this task", "this task")}" and its ${confirm.childCount} subtasks?`
                  )
                : T(
                    `آیا مطمئنی می‌خوای «${confirm?.title || T("این مورد", "this item")}» را حذف کنی؟`,
                    `Are you sure you want to delete "${confirm?.title || T("this item", "this item")}"?`
                  )}
              <span className="block mt-2 text-xs">{T("این عمل قابل بازگشت نیست.", "This action cannot be undone.")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirm) await confirm.onConfirm();
                setConfirm(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {T("حذف", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
