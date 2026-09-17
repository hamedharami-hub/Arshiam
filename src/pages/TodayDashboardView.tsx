import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endOfDay, startOfDay } from "date-fns";
import {
  Star, ChevronDown, ChevronRight, CheckSquare, Columns2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTasksData } from "@/hooks/useTasksData";
import { useBilingual } from "@/hooks/useBilingual";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { firebaseStore } from "@/lib/firebaseStore";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { PRIORITY_META } from "@/lib/priority";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import { deleteTask as deletePersistedTask, persistTask } from "@/lib/firestoreDataService";
import { taskDueTimestamp } from "@/lib/taskDate";
import { buildTaskChildrenMap, getTaskProgress } from "@/features/tasks/taskTree";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { TaskListItem } from "@/components/TaskListItem";
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
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
} from "@/components/TaskDnDHelpers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";

export default function TodayDashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const { isPhone } = useDeviceFormFactor();

  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<Task[]>([]);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [moveTask, setMoveTask] = useState<Task | null>(null);
  const [makeChildOf, setMakeChildOf] = useState<Task | null>(null);
  const [pomoTask, setPomoTask] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const isSplitActive = splitView && isWideOrFoldable;

  const toggleSplitView = () => {
    setSplitView((prev) => {
      const next = !prev;
      localStorage.setItem("arshnaz_tasks_split_view", String(next));
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // 1. Fetch task data
  const {
    allTasks,
    setAllTasks,
    outcomeById,
    outcomeByTaskId,
    load,
  } = useTasksData({ user, scope: "today" });

  const startOfToday = useMemo(() => startOfDay(new Date()).getTime(), []);
  const endOfToday = useMemo(() => endOfDay(new Date()).getTime(), []);

  const taskMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);
  const childrenMap = useMemo(() => buildTaskChildrenMap(allTasks), [allTasks]);
  const getProgress = useCallback((id: string) => getTaskProgress(id, childrenMap), [childrenMap]);

  // 2. Classify tasks
  // Only consider root tasks; subtasks are rendered hierarchically inside parents
  const rootDueTasks = useMemo(() => {
    return allTasks.filter((t) => !t.parent_id && t.due_date);
  }, [allTasks]);

  // Today's tasks (due between startOfToday and endOfToday)
  const todayTasks = useMemo(() => {
    return rootDueTasks.filter((t) => {
      const due = taskDueTimestamp(t.due_date);
      return !isNaN(due) && due >= startOfToday && due <= endOfToday;
    });
  }, [rootDueTasks, startOfToday, endOfToday]);

  // Active today tasks: sorted by pinned, then priority, then due date
  const activeTodayTasks = useMemo(() => {
    return todayTasks
      .filter((t) => !t.completed)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const priorityDiff = (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
        if (priorityDiff !== 0) return priorityDiff;
        const aDue = taskDueTimestamp(a.due_date);
        const bDue = taskDueTimestamp(b.due_date);
        if (aDue !== bDue) return aDue - bDue;
        return a.id.localeCompare(b.id);
      });
  }, [todayTasks]);

  // Top priorities: up to three urgent or high priority tasks from today
  const priorityTasks = useMemo(() => {
    return activeTodayTasks
      .filter((t) => t.priority === "urgent" || t.priority === "high")
      .slice(0, 3);
  }, [activeTodayTasks]);

  const priorityIds = useMemo(() => new Set(priorityTasks.map((t) => t.id)), [priorityTasks]);

  // Remaining active today tasks (excluding top priorities)
  const activeRemaining = useMemo(() => {
    return activeTodayTasks.filter((t) => !priorityIds.has(t.id));
  }, [activeTodayTasks, priorityIds]);

  // Completed today tasks
  const completedTodayTasks = useMemo(() => {
    return todayTasks
      .filter((t) => t.completed)
      .sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.id.localeCompare(b.id);
      });
  }, [todayTasks]);

  // Overdue tasks: open tasks with due date strictly before start of today
  const overdueTasks = useMemo(() => {
    return rootDueTasks
      .filter((t) => {
        if (t.completed) return false;
        const due = taskDueTimestamp(t.due_date);
        return !isNaN(due) && due < startOfToday;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const aDue = taskDueTimestamp(a.due_date);
        const bDue = taskDueTimestamp(b.due_date);
        if (aDue !== bDue) return aDue - bDue;
        const priorityDiff = (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
        if (priorityDiff !== 0) return priorityDiff;
        return a.id.localeCompare(b.id);
      });
  }, [rootDueTasks, startOfToday]);

  const totalCount = todayTasks.length;
  const completedCount = completedTodayTasks.length;

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
    const nextStatus = nextCompleted ? "done" : "todo";
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
  }, [T, user?.id, setAllTasks]);

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
    setConfirm({
      kind: "task",
      id: task.id,
      title: task.title,
      onConfirm: async () => {
        setAllTasks((prev) => prev.filter((t) => t.id !== task.id));
        try {
          if (user?.id) {
            const res = await deletePersistedTask(user.id, task.id);
            if (res === "failed") throw new Error(T("حذف تسک ناموفق بود", "Could not delete task"));
          } else {
            const { error } = await firebaseStore.from("tasks").delete().eq("id", task.id);
            if (error) throw new Error(error.message);
          }
          window.dispatchEvent(new Event("tasks-changed"));
          toast.success(T("تسک حذف شد", "Task deleted"));
        } catch (err) {
          setAllTasks((prev) => [...prev, task]);
          toast.error(err instanceof Error ? err.message : T("حذف تسک با خطا مواجه شد", "Could not delete task"));
        }
      },
    });
  }, [user?.id, setAllTasks, T]);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
  }, []);

  const sortableItems = useMemo(() => {
    return [
      ...priorityTasks.map((t) => t.id),
      ...activeRemaining.map((t) => t.id),
      ...completedTodayTasks.map((t) => t.id),
      ...overdueTasks.map((t) => t.id),
    ];
  }, [priorityTasks, activeRemaining, completedTodayTasks, overdueTasks]);

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
      splitView={splitView}
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
    />
  );

  const isEmpty = totalCount === 0 && overdueTasks.length === 0;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className={`w-full mx-auto relative page-enter ${
        isSplitActive
          ? "h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)] xl:h-[calc(100dvh-7.2rem)] flex flex-col p-2 sm:p-3 md:p-4 lg:px-5 xl:px-7 lg:py-2.5 space-y-2 overflow-hidden"
          : "p-2 sm:p-3 md:p-4 lg:px-5 xl:px-7 lg:py-5 space-y-3 pb-24"
      }`}
    >
      <HeaderTitlePortal title={T("امروز", "Today")} />

      {/* ۱. هدر فشرده تاریخ و وضعیت و کلید تغییر نمای دوپنله */}
      <div className="flex items-center justify-between py-1 px-1 gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
            {isEn ? todayGregorian : todayJalali}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              {toPersianDigits(completedCount)} / {toPersianDigits(totalCount)} {T("تکمیل‌شده", "completed")}
            </span>
          )}
          <Button
            variant={splitView ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSplitView}
            className="inline-flex items-center gap-1.5 text-xs h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-border/60 font-medium transition-colors cursor-pointer"
            title={splitView ? T("حالت تمام‌صفحه", "Full width") : T("نمای دوپنله (نیمه چپ)", "Split view (left panel)")}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">{splitView ? T("نمای دوپنله", "Split view") : T("تمام‌صفحه", "Full width")}</span>
          </Button>
        </div>
      </div>

      <div
        data-task-split={isSplitActive ? "true" : "false"}
        dir="ltr"
        className={`w-full items-start gap-3 sm:gap-4 xl:gap-5 ${
          isSplitActive
            ? "flex-1 min-h-0 grid grid-cols-[minmax(340px,1.15fr)_minmax(280px,0.85fr)] lg:grid-cols-[minmax(460px,1.15fr)_minmax(360px,0.85fr)] 2xl:grid-cols-[minmax(560px,1.2fr)_minmax(420px,0.8fr)] overflow-hidden"
            : "flex flex-col"
        }`}
      >
        {/* پنل سمت چپ جزئیات تسک در نمایش دسکتاپ/ویندوز/تاشو با اسکرول مستقل */}
        {isSplitActive && (
          <aside
            dir={isEn ? "ltr" : "rtl"}
            className="col-start-1 w-full min-w-0 h-full overflow-hidden transition-all duration-200"
          >
            {selectedTask ? (
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
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-border/70 bg-card/40 flex flex-col items-center justify-center p-6 text-center text-muted-foreground shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">{T("یک تسک را انتخاب کنید", "Select a task")}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-5">
                  {T("جزئیات و ویرایش در پنل سمت چپ باز می‌شود؛ فهرست کارها در سمت راست باقی می‌ماند.", "Details open in the left panel while the task list remains on the right.")}
                </p>
              </div>
            )}
          </aside>
        )}

        {/* پنل سمت راست فهرست تیترهای تسک با اسکرول مستقل */}
        <section
          dir={isEn ? "ltr" : "rtl"}
          className={`w-full min-w-0 rounded-2xl border border-border/60 bg-card/35 p-2 sm:p-3 lg:p-4 shadow-sm ${
            isSplitActive
              ? "col-start-2 h-full min-h-0 overflow-y-auto overscroll-contain pb-6"
              : "pb-16"
          }`}
        >
          {/* ۳. لیست تسک‌ها با خط زمان و ریتم فشرده هفتگی */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {/* اولویت‌های برتر (تا ۳ تسک فوری یا بالا) با تمایز ملایم */}
                {priorityTasks.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-1.5 sm:p-2 space-y-1">
                    <div className="flex items-center px-1 pt-0.5 pb-0.5">
                      <Star
                        className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500 shrink-0"
                        aria-label={T("اولویت‌های برتر", "Top Priorities")}
                        title={T("اولویت‌های برتر", "Top Priorities")}
                      />
                      <span className="sr-only">{T("اولویت‌های برتر", "Top Priorities")}</span>
                    </div>
                    <div className="space-y-1">
                      {priorityTasks.map((t) => renderTaskItem(t))}
                    </div>
                  </div>
                )}

                {/* سایر کارهای فعال امروز */}
                {activeRemaining.length > 0 && (
                  <div className="space-y-1">
                    {activeRemaining.map((t) => renderTaskItem(t))}
                  </div>
                )}

                {/* تسک‌های تکمیل‌شده امروز به صورت تاشو و فشرده */}
                {completedTodayTasks.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCompleted((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1 px-1 font-medium cursor-pointer transition-colors"
                      aria-label={showCompleted ? T("مخفی کردن تسک‌های تکمیل‌شده", "Hide completed tasks") : T("نمایش تسک‌های تکمیل‌شده", "Show completed tasks")}
                    >
                      {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />}
                      <span>{T("تکمیل‌شده", "Completed")}</span>
                      <span className="text-[11px] text-muted-foreground">({toPersianDigits(completedTodayTasks.length)})</span>
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
                  <div className="space-y-1 pt-3">
                    <div className="sticky top-0 z-[5] bg-background/95 backdrop-blur py-1 px-1 text-xs sm:text-sm font-semibold text-rose-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>{T("به‌تعویق‌افتاده", "Overdue")}</span>
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {toPersianDigits(overdueTasks.length)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {overdueTasks.map((t) => renderTaskItem(t))}
                    </div>
                  </div>
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
            </SortableContext>

            <DragOverlay>
              {activeDragId ? (
                <Card className="p-3 shadow-lg opacity-90">
                  <p className="text-sm font-medium">
                    {allTasks.find((x) => x.id === activeDragId)?.title || "..."}
                  </p>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
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
            <AlertDialogTitle>{T("حذف تسک؟", "Delete task?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(`آیا مطمئنی می‌خوای «${confirm?.title || T("این مورد", "this item")}» را حذف کنی؟`, `Are you sure you want to delete "${confirm?.title || T("این مورد", "this item")}"?`)}
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
