import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";
import { useTaskListSort } from "@/lib/taskListSort";
import { planOf } from "@/lib/planCascade";
import { isTaskOverdue, isTaskMissedWorkDay } from "@/lib/taskPlanning";
import { getTimeSettings, todayISO } from "@/lib/timeHorizon";
import { filterAndSortTasks, DEFAULT_FILTERS } from "@/lib/smartListService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { endOfDay, startOfDay } from "date-fns";
import {
  ChevronDown, ChevronRight, CheckSquare, Columns2,
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
import { persistTask } from "@/lib/firestoreDataService";
import { awardTaskWatering } from "@/lib/garden";
import { isRecurringTask, advanceRecurringTask } from "@/lib/recurringTaskService";
import { playCompletionFeedback } from "@/lib/completionFeedback";
import { deleteTaskCascade } from "@/features/tasks/taskService";
import { taskDueTimestamp, getLocalDateString, taskWorkDate } from "@/lib/taskDate";
import { buildTaskChildrenMap, collectTaskDescendantIds, getTaskProgress, isStandaloneTaskForScope } from "@/features/tasks/taskTree";
import { setShowCompletedTasks, useShowCompletedTasks } from "@/lib/completedTaskVisibility";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
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
    outcomeById,
    outcomeByTaskId,
    load,
  } = useTasksData({ user, scope: "today" });

  const [currentDayKey, setCurrentDayKey] = useState(() => getLocalDateString());
  useEffect(() => {
    const checkDay = () => {
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
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      clearTimeout(timer);
    };
  }, [currentDayKey, load]);

  const startOfToday = useMemo(() => {
    void currentDayKey;
    return startOfDay(new Date()).getTime();
  }, [currentDayKey]);
  const endOfToday = useMemo(() => {
    void currentDayKey;
    return endOfDay(new Date()).getTime();
  }, [currentDayKey]);

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
  }, [startOfToday, endOfToday]);

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

  const isDueOverdue = useCallback((t: Task) => isTaskOverdue(t, getTimeSettings()), []);
  const isMissed = useCallback((t: Task) => !isTaskOverdue(t, getTimeSettings()) && isTaskMissedWorkDay(t, getTimeSettings()), []);

  const overdueTasks = useMemo(() => filterAndSortTasks(
    allTasks.filter((task) => isStandaloneTaskForScope(task, isDueOverdue, taskMap) && !getStudyTaskNavigation(task).isStudyTask),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [allTasks, isDueOverdue, taskMap, todaySort]);

  const overdueStudyTasks = useMemo(() => filterAndSortTasks(
    allTasks.filter((task) => isStandaloneTaskForScope(task, isDueOverdue, taskMap) && getStudyTaskNavigation(task).isStudyTask),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [allTasks, isDueOverdue, taskMap, todaySort]);

  const missedTasks = useMemo(() => filterAndSortTasks(
    allTasks.filter(task => isStandaloneTaskForScope(task, isMissed, taskMap)),
    { ...DEFAULT_FILTERS, ...todaySort, show_completed: true }, {}, [],
  ), [allTasks, isMissed, taskMap, todaySort]);

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
        toast.success(
          T(
            `نمونه بعدی به ${res.formattedNextDate} منتقل شد 🔁`,
            `Next instance moved to ${res.formattedNextDate} 🔁`
          )
        );
        return;
      }
    }
    if (nextCompleted) {
      playCompletionFeedback();
      awardTaskWatering(task.title, Boolean(task.parent_id));
    }
    const nextStatus: TaskStatus = nextCompleted ? "done" : "todo";
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;
    const patch = { completed: nextCompleted, status: nextStatus, completed_at: nextCompletedAt };

    setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    try {
      if (user?.id) {
        const res = await persistTask(user.id, { id: task.id, ...patch });
        if (res === "failed") throw new Error(T("بروزرسانی تسک ناموفق بود", "Could not update task"));
      } else {
        const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", task.id);
        if (error) throw new Error(error.message);
      }
      window.dispatchEvent(new Event("tasks-changed"));
    } catch (err) {
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(err instanceof Error ? err.message : T("بروزرسانی تسک با خطا مواجه شد", "Could not update task"));
    }
  }, [T, user?.id, setAllTasks, navigate]);

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

  const handlePatchTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const prevTask = allTasks.find((t) => t.id === id);
    if (!prevTask) return;
    const next = { ...prevTask, ...patch };

    setAllTasks((prev) => prev.map((item) => (item.id === id ? next : item)));
    try {
      if (user?.id) {
        const res = await persistTask(user.id, { id, ...patch });
        if (res === "failed") throw new Error(T("ذخیره تغییرات ناموفق بود", "Could not save task changes"));
      } else {
        const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", id);
        if (error) throw new Error(error.message);
      }
      window.dispatchEvent(new Event("tasks-changed"));
    } catch (error) {
      setAllTasks((prev) => prev.map((item) => (item.id === id ? prevTask : item)));
      toast.error(error instanceof Error ? error.message : T("ذخیره تغییرات ناموفق بود", "Could not save task changes"));
    }
  }, [T, user?.id, allTasks, setAllTasks]);

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
          toast.success(
            childCount > 0
              ? T(`تسک و ${childCount} زیرتسک آن حذف شدند`, `Task and its ${childCount} subtasks deleted`)
              : T("تسک حذف شد", "Task deleted")
          );
        } catch (err) {
          setAllTasks(previousTasks);
          toast.error(err instanceof Error ? err.message : T("حذف تسک با خطا مواجه شد", "Could not delete task"));
        }
      },
    });
  }, [childrenMap, allTasks, user?.id, setAllTasks, T]);

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
    />
  );

  const isEmpty = totalCount === 0 && overdueTasks.length === 0 && overdueStudyTasks.length === 0 && missedTasks.length === 0;

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

                {/* تسک‌های به‌تعویق‌افتاده، حتماً بعد و پایین تسک‌های امروز */}
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
                {missedTasks.length > 0 && (
                  <section data-testid="missed-work-tasks" className="space-y-1 pt-3">
                    <TaskGroupHeader label={T("از برنامه عقب‌مانده", "Missed work day")} count={missedTasks.length} tone="accent" />
                    <div className="space-y-1">{missedTasks.map(task => renderTaskItem(task))}</div>
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
