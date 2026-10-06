import { TaskSplitScreen } from "@/components/TaskSplitScreen";
import { QuickAddTask } from "@/components/QuickAddTask";
import { SharedTaskRow, SharedTaskRowsProvider } from "@/components/SharedTaskRow";
import type { Task as FullTask } from "@/lib/taskTypes";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { firebaseStore } from "@/lib/firebaseStore";
import { upsertTask } from "@/lib/firestoreDataService";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Flag,
  Calendar,
  Circle,
  Loader2,
  CheckCircle2,
  MoreVertical,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Edit2,
  FolderTree,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PriorityFlag } from "@/components/PriorityFlag";
import { TaskMetaQuickEdit, type TaskMetaPatch } from "@/components/kanban/TaskMetaQuickEdit";
import { format } from "date-fns";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import { haptic } from "@/lib/haptics";
import { toPersianDigits } from "@/lib/persianDigits";
import { playCompletionFeedback } from "@/lib/completionFeedback";
import { awardTaskWatering } from "@/lib/garden";
import { isRecurringTask, advanceRecurringTask } from "@/lib/recurringTaskService";
import { filterTasksForVisibility, useShowCompletedTasks } from "@/lib/completedTaskVisibility";
import { getCachedTasks, applyPendingTaskOperations } from "@/features/tasks/taskService";
import {
  type GoalKanban,
  type OwnedGoal,
  type TimeHorizon,
  type GoalPriority,
  readStoredGoals,
  saveKanbanGoals,
  getUserOwnGoals,
  isAutoDefaultGoal,
  filterGoalsForView,
  generateUUID,
} from "@/lib/kanbanGoals";
import { cacheGet } from "@/lib/offlineQueue";
import MultiTierTabs from "@/components/kanban/MultiTierTabs";
import { GoalHeader } from "@/components/kanban/GoalHeader";
import GoalEditorModal from "@/components/kanban/GoalEditorModal";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Status = "todo" | "in_progress" | "done";
type Task = {
  id: string;
  user_id?: string;
  title: string;
  priority: Priority;
  due_date?: string | null;
  status: Status;
  completed: boolean;
  completed_at?: string | null;
  parent_id: string | null;
  folder_id?: string | null;
  kanban_column_id?: string | null;
  position?: number;
  created_at?: string;
  updated_at?: string;
};

const COLUMNS: { id: Status; labelFa: string; labelEn: string; icon: any; accent: string }[] = [
  { id: "todo", labelFa: "برای انجام", labelEn: "To Do", icon: Circle, accent: "border-t-muted-foreground/40" },
  { id: "in_progress", labelFa: "در حال انجام", labelEn: "In Progress", icon: Loader2, accent: "border-t-primary" },
  { id: "done", labelFa: "انجام شده", labelEn: "Done", icon: CheckCircle2, accent: "border-t-success" },
];
const COL_ORDER: Status[] = ["todo", "in_progress", "done"];

export default function KanbanView() {
  const { user } = useAuth();
  const showCompletedTasks = useShowCompletedTasks();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  // --- GOAL STATE (only goals the user defined, mostly inside folders) ---
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [goalsVersion, setGoalsVersion] = useState(0);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Mode and Layout
  const [viewMode, setViewMode] = useState<"hierarchy" | "time" | "priority">("hierarchy");
  const [layoutMode, setLayoutMode] = useState<"stream" | "columns">("stream");
  const [timeFilter, setTimeFilter] = useState<TimeHorizon | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<GoalPriority | "all">("all");

  // Goal Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalKanban | null>(null);

  // --- TASK STATE ---
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);


  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Folders drive which goals exist
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let unsubscribe = () => {};
    cacheGet<Array<{ id: string; name: string }>>(`folders:${user.id}`)
      .then((cached) => { if (active && cached) setFolders(cached); })
      .catch(() => undefined);
    import("@/lib/firestoreDataService")
      .then(({ subscribeFolders }) => {
        if (!active) return;
        unsubscribe = subscribeFolders(user.id, (items) => setFolders((items || []) as Array<{ id: string; name: string }>));
      })
      .catch(() => undefined);
    return () => { active = false; unsubscribe(); };
  }, [user?.id]);

  useEffect(() => {
    const onGoalsUpdated = () => setGoalsVersion((v) => v + 1);
    window.addEventListener("arshnaz-goals-updated", onGoalsUpdated);
    return () => window.removeEventListener("arshnaz-goals-updated", onGoalsUpdated);
  }, []);

  // Load tasks from cache / firestore
  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      let cached = await getCachedTasks(user.id);
      cached = await applyPendingTaskOperations(cached, user.id);
      const parents = cached.filter((t) => !t.parent_id);
      const subs = cached.filter((t) => Boolean(t.parent_id));
      setAllTasks((parents as unknown) as Task[]);
      setSubtasks((subs as unknown) as Task[]);
    } catch {
      const [parentsRes, subsRes] = await Promise.all([
        firebaseStore.from("tasks").select("*").eq("user_id", user.id).is("parent_id", null).order("position"),
        firebaseStore.from("tasks").select("*").eq("user_id", user.id).not("parent_id", "is", null).order("position"),
      ]);
      setAllTasks(((parentsRes.data || []) as unknown) as Task[]);
      setSubtasks(((subsRes.data || []) as unknown) as Task[]);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
    const handleTasksChanged = () => {
      void loadTasks();
    };
    window.addEventListener("tasks-changed", handleTasksChanged);
    return () => window.removeEventListener("tasks-changed", handleTasksChanged);
  }, [loadTasks]);

  useEffect(() => {
    if (!user) return;
    const ch = firebaseStore
      .channel(`kanban-goals-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadTasks)
      .subscribe();
    return () => {
      firebaseStore.removeChannel(ch);
    };
  }, [user, loadTasks]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ownGoals = useMemo(() => getUserOwnGoals(folders, user?.id), [folders, user?.id, goalsVersion]);

  const firstGoalByFolder = useMemo(() => {
    const map: Record<string, string> = {};
    ownGoals.forEach((g) => { if (g.folderId && !map[g.folderId]) map[g.folderId] = g.id; });
    return map;
  }, [ownGoals]);

  // Hide untouched auto-created goals unless tasks were explicitly assigned to them
  const goals = useMemo(() => {
    const used = new Set(allTasks.map((t) => t.kanban_column_id).filter(Boolean));
    return ownGoals.filter((g) => !isAutoDefaultGoal(g) || used.has(g.id));
  }, [ownGoals, allTasks]);

  const visibleGoals = useMemo(
    () => filterGoalsForView(goals, viewMode, timeFilter, priorityFilter),
    [goals, viewMode, timeFilter, priorityFilter],
  );

  const belongsToGoal = useCallback(
    (t: Task, g: OwnedGoal) =>
      t.kanban_column_id === g.id ||
      (!t.kanban_column_id && Boolean(g.folderId) && t.folder_id === g.folderId && firstGoalByFolder[g.folderId!] === g.id),
    [firstGoalByFolder],
  );

  const activeGoal: OwnedGoal | null = useMemo(
    () => visibleGoals.find((goal) => goal.id === selectedGoalId) || visibleGoals[0] || null,
    [visibleGoals, selectedGoalId],
  );
  const activeGoalId = activeGoal?.id || null;

  const taskCountsByGoal = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach((g) => { map[g.id] = allTasks.filter((t) => belongsToGoal(t, g)).length; });
    return map;
  }, [allTasks, goals, belongsToGoal]);

  const currentGoalTasks = useMemo(
    () => (activeGoal ? allTasks.filter((t) => belongsToGoal(t, activeGoal)) : []),
    [allTasks, activeGoal, belongsToGoal],
  );

  const openFullForm = (status?: Status) => {
    const params = new URLSearchParams();
    if (activeGoalId) params.set("kanban_goal_id", activeGoalId);
    if (activeGoal?.folderId) params.set("folder_id", activeGoal.folderId);
    if (status) params.set("status", status);
    navigate(`/app/new/task?${params.toString()}`);
  };

  const incompleteTasks = useMemo(() => currentGoalTasks.filter((t) => !t.completed), [currentGoalTasks]);
  const completedTasks = useMemo(() => currentGoalTasks.filter((t) => t.completed), [currentGoalTasks]);

  // Task mutation helpers
  const patchTask = async (task: Task, patch: Partial<FullTask>) => {
    if (!user) return;
    const updated: Task = { ...task, ...patch, updated_at: new Date().toISOString() } as Task;
    setAllTasks((prev) => prev.map((x) => (x.id === task.id ? updated : x)));
    setSubtasks((prev) => prev.map((x) => (x.id === task.id ? updated : x)));
    const ok = await upsertTask(user.id, updated);
    if (!ok) {
      setAllTasks((prev) => prev.map((x) => (x.id === task.id ? task : x)));
      setSubtasks((prev) => prev.map((x) => (x.id === task.id ? task : x)));
      toast.error(T("خطا در ذخیره تغییر", "Failed to save change"));
    } else {
      window.dispatchEvent(new Event("tasks-changed"));
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    const newCompleted = !task.completed;
    if (newCompleted) {
      playCompletionFeedback();
    } else {
      haptic("light");
    }
    if (newCompleted && isRecurringTask(task)) {
      awardTaskWatering(task.title, Boolean(task.parent_id));
      const res = await advanceRecurringTask(user.id, task, { allKnownTasks: [...allTasks, ...subtasks] });
      if (res.success && res.patch) {
        setSubtasks(prev => prev.map(t => t.id === task.id ? ({ ...t, ...res.patch } as Task) : t));
        setAllTasks((prev) =>
          prev.map((t) => (t.id === task.id ? ({ ...t, ...res.patch } as Task) : t))
        );
        toast.success(
          T(
            `نمونه بعدی به ${res.formattedNextDate} منتقل شد 🔁`,
            `Next instance moved to ${res.formattedNextDate} 🔁`
          )
        );
        return;
      }
    }
    const newStatus: Status = newCompleted ? "done" : "todo";
    const updatedTask: Task = {
      ...task,
      completed: newCompleted,
      status: newStatus,
      completed_at: newCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    setAllTasks((prev) =>
      prev.map((t) => (t.id === task.id ? updatedTask : t))
    );
    setSubtasks((prev) => prev.map((t) => t.id === task.id ? updatedTask : t));
    if (newCompleted) awardTaskWatering(task.title, Boolean(task.parent_id));
    const ok = await upsertTask(user.id, updatedTask);
    if (!ok) {
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setSubtasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(T("خطا در تغییر وضعیت تسک", "Failed to update task"));
    }
  };

  const moveTaskColumn = async (taskId: string, newStatus: Status) => {
    if (!user) return;
    const t = allTasks.find((x) => x.id === taskId);
    if (!t || t.status === newStatus) return;
    if (newStatus === "done" && isRecurringTask(t)) {
      awardTaskWatering(t.title, Boolean(t.parent_id));
      const res = await advanceRecurringTask(user.id, t, { allKnownTasks: [...allTasks, ...subtasks] });
      if (res.success && res.patch) {
        setSubtasks(prev => prev.map(t => t.id === taskId ? ({ ...t, ...res.patch } as Task) : t));
        setAllTasks((prev) =>
          prev.map((x) => (x.id === taskId ? ({ ...x, ...res.patch } as Task) : x))
        );
        toast.success(
          T(
            `نمونه بعدی به ${res.formattedNextDate} منتقل شد 🔁`,
            `Next instance moved to ${res.formattedNextDate} 🔁`
          )
        );
        return;
      }
    }
    const completed = newStatus === "done";
    const updatedTask: Task = {
      ...t,
      status: newStatus,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    setAllTasks((prev) =>
      prev.map((x) => (x.id === taskId ? updatedTask : x))
    );
    if (newStatus === "done" && t.status !== "done") {
      playCompletionFeedback();
      awardTaskWatering(t.title, Boolean(t.parent_id));
    }
    const ok = await upsertTask(user.id, updatedTask);
    if (!ok) {
      setAllTasks((prev) => prev.map((x) => (x.id === taskId ? t : x)));
      toast.error(T("خطا در جابه‌جایی ستون", "Failed to move task column"));
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const targetCol: Status | undefined =
      COLUMNS.find((c) => c.id === overIdStr)?.id ||
      allTasks.find((t) => t.id === overIdStr)?.status;
    if (!targetCol) return;
    moveTaskColumn(activeIdStr, targetCol);
  };

  // Goal management: every change is written back to the goal's own folder
  const handleSaveGoal = (goalData: Partial<GoalKanban>, folderIdForNew?: string | null) => {
    const now = new Date().toISOString();
    if (goalData.id) {
      const fid = ownGoals.find((g) => g.id === goalData.id)?.folderId ?? null;
      const list = readStoredGoals(fid, user?.id).map((g) =>
        g.id === goalData.id ? ({ ...g, ...goalData, parentId: null, updatedAt: now } as GoalKanban) : g,
      );
      saveKanbanGoals(list, fid, user?.id);
      toast.success(T("هدف با موفقیت بروزرسانی شد", "Goal updated successfully"));
      return;
    }
    const fid = folderIdForNew ?? null;
    const newG: GoalKanban = {
      id: generateUUID(),
      title: goalData.title || "هدف جدید",
      description: goalData.description,
      parentId: null,
      timeHorizon: goalData.timeHorizon || "monthly",
      priority: goalData.priority || "medium",
      color: goalData.color || "hsl(var(--primary))",
      icon: goalData.icon || "🎯",
      createdAt: now,
      updatedAt: now,
    };
    saveKanbanGoals([...readStoredGoals(fid, user?.id), newG], fid, user?.id);
    setSelectedGoalId(newG.id);
    toast.success(T("هدف جدید ایجاد شد", "New goal created"));
  };

  const handleDeleteGoal = (goalId: string) => {
    const fid = ownGoals.find((g) => g.id === goalId)?.folderId ?? null;
    saveKanbanGoals(readStoredGoals(fid, user?.id).filter((g) => g.id !== goalId), fid, user?.id);
    setSelectedGoalId(null);
    toast.success(T("هدف با موفقیت حذف شد", "Goal deleted successfully"));
  };

  const openEditForGoal = (g: GoalKanban) => {
    setEditingGoal(g);
    setEditorOpen(true);
  };

  const openAddNewGoal = () => {
    setEditingGoal(null);
    setEditorOpen(true);
  };

  const [selectedTask, setSelectedTask] = useState<FullTask | null>(null);
  useEffect(() => { setSelectedTask(null); }, [activeGoalId]);
  const activeTaskObj = activeId ? allTasks.find((t) => t.id === activeId) : null;

  return (
    <SharedTaskRowsProvider tasks={[...allTasks, ...subtasks] as FullTask[]} onToggle={(t) => void toggleTask(t as Task)} onPatch={(t, patch) => void patchTask(t as Task, patch)} onOpen={setSelectedTask}>
    <TaskSplitScreen task={selectedTask} onClose={() => setSelectedTask(null)} onChanged={() => void loadTasks()} allowDelete>
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--xl space-y-4 pb-safe-bottom page-enter relative min-h-screen"
      style={activeGoal?.color ? { background: `linear-gradient(135deg, color-mix(in srgb, ${activeGoal.color} 16%, transparent), color-mix(in srgb, ${activeGoal.color} 5%, transparent))` } : undefined}>
      <HeaderTitlePortal title={T("کانبان", "Kanban")} />
      {goals.length === 0 ? (
        <div data-testid="kanban-empty-goals" className="mx-auto max-w-md rounded-lg border border-dashed border-border px-6 py-12 text-center space-y-3">
          <Target className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">{T("هنوز هدفی تعریف نکرده‌ای", "No goals yet")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {T(
              "اهدافی که داخل فولدرهایت (نمای کانبان هر فولدر) تعریف می‌کنی، این‌جا کنار هم نمایش داده می‌شوند.",
              "Goals you define inside your folders (each folder's Kanban view) appear here together.",
            )}
          </p>
          <Button onClick={openAddNewGoal} className="gap-1.5" data-testid="kanban-empty-add-goal">
            <Plus className="h-4 w-4" /> {T("هدف جدید", "New goal")}
          </Button>
        </div>
      ) : (
      <>
      {/* 1. Goal header: one row, one entry per action */}
      {activeGoal?.folderName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="kanban-goal-folder">
          <FolderTree className="h-3.5 w-3.5" />
          <span className="truncate">{activeGoal.folderName}</span>
        </div>
      )}
      <GoalHeader
        showTitle={false}
        goal={activeGoal}
        canDelete={Boolean(activeGoal)}
        onRename={(title) => activeGoal && handleSaveGoal({ id: activeGoal.id, title })}
        onEditSettings={() => activeGoal && openEditForGoal(activeGoal)}
        onAddGoal={openAddNewGoal}
        onDelete={() => activeGoal && handleDeleteGoal(activeGoal.id)}
      >
        <div className="flex rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setLayoutMode("stream")}
            aria-pressed={layoutMode === "stream"}
            data-testid="kanban-layout-stream"
            className={`grid h-7 w-7 place-items-center rounded ${layoutMode === "stream" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            title={T("نمای فهرست", "List view")}
            aria-label={T("نمای فهرست", "List view")}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("columns")}
            aria-pressed={layoutMode === "columns"}
            data-testid="kanban-layout-columns"
            className={`grid h-7 w-7 place-items-center rounded ${layoutMode === "columns" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            title={T("ستون‌های کانبان", "Kanban columns")}
            aria-label={T("ستون‌های کانبان", "Kanban columns")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        <DropdownMenu dir={isEn ? "ltr" : "rtl"}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground" data-testid="kanban-view-mode">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">
                {viewMode === "hierarchy" ? T("همه اهداف", "All goals") : viewMode === "time" ? T("بر اساس زمان", "By time") : T("بر اساس اولویت", "By priority")}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-48">
            <DropdownMenuItem onClick={() => setViewMode("hierarchy")} className="gap-2">
              <FolderTree className="w-4 h-4 text-muted-foreground" /> {T("همه اهداف", "All goals")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode("time")} className="gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" /> {T("بر اساس بازهٔ زمانی", "By time horizon")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode("priority")} className="gap-2">
              <Flag className="w-4 h-4 text-muted-foreground" /> {T("بر اساس اولویت", "By priority")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </GoalHeader>

      {/* 2. SINGLE-TIER GOAL TABS */}
      <div className="overflow-x-auto no-scrollbar">
        <MultiTierTabs
          goals={visibleGoals}
          selectedGoalId={activeGoalId}
          viewMode={viewMode}
          selectedTimeFilter={timeFilter}
          selectedPriorityFilter={priorityFilter}
          onSelectGoal={(id) => setSelectedGoalId(id)}
          onSelectTimeFilter={(h) => setTimeFilter(h)}
          onSelectPriorityFilter={(p) => setPriorityFilter(p)}
          onDoubleTapGoal={openEditForGoal}
          onEditGoal={openEditForGoal}
          onAddNewGoal={() => openAddNewGoal()}
          taskCountsByGoal={taskCountsByGoal}
        />
      </div>

      {/* 3. MAIN CONTENT: STREAM VIEW (MATCHING USER SCREENSHOT) OR CLASSIC COLUMNS */}
      <>

      {layoutMode === "stream" ? (
        <div className="space-y-4">
          {/* Quick Input Bar at Top */}
          <QuickAddTask defaults={{ folder_id: activeGoal?.folderId || null, kanban_column_id: activeGoalId }} onCreated={() => void loadTasks()} />

          {/* Incomplete Tasks Cards (Full Screen style like screenshot) */}
          <div className="space-y-3">
            {incompleteTasks.map((t) => <SharedTaskRow key={t.id} task={t as FullTask} />)}

            {incompleteTasks.length === 0 && (
              <div className="text-center py-10 border border-dashed rounded-lg space-y-2" data-testid="kanban-goal-empty">
                <h4 className="text-sm font-semibold text-foreground">
                  {currentGoalTasks.length === 0
                    ? T("هنوز تسکی برای این هدف نیست", "No tasks for this goal yet")
                    : T("همه کارهای این هدف انجام شده‌اند!", "All tasks in this goal are completed!")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {T("می‌توانید تسک جدیدی برای ادامه مسیر اضافه کنید.", "You can add new tasks to keep going.")}
                </p>
              </div>
            )}
          </div>

          {/* Completed Section (Collapsible like in screenshot) */}
          {showCompletedTasks && completedTasks.length > 0 && (
            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={() => setCompletedOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                <span>{T("انجام‌شده", "Completed")}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full">
                  {isEn ? completedTasks.length : toPersianDigits(completedTasks.length)}
                </Badge>
                {completedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {completedOpen && (
                <div className="space-y-2 animate-fade-in">
                  {completedTasks.map((t) => <SharedTaskRow key={t.id} task={t as FullTask} />)}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Classic 3-Column Kanban Board */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = currentGoalTasks.filter((t) => t.status === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={colTasks}
                  defaults={{ folder_id: activeGoal?.folderId || null, kanban_column_id: activeGoalId, status: col.id }}
                  onCreated={() => void loadTasks()}
                  onMove={moveTaskColumn}
                  onToggle={toggleTask}
                  onPatch={patchTask}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeTaskObj ? <TaskCard task={activeTaskObj} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
      </>
      </>
      )}

      {/* Floating Action Button (+) opens full form with goal preselected */}
      <button
        type="button"
        onClick={() => openFullForm()}
        data-testid="kanban-fab-new-task"
        className="fixed bottom-8 end-8 hidden w-14 h-14 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground md:flex items-center justify-center shadow-lg transition-transform z-30"
        title={T("ایجاد تسک جدید (فرم کامل)", "New task (full form)")}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Goal Editor & Settings Modal */}
      <GoalEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        goal={editingGoal}
        allGoals={goals}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        folderOptions={folders}
        canDelete
      />
    </div>
    </TaskSplitScreen>
    </SharedTaskRowsProvider>
  );
}

function KanbanColumn({
  column,
  defaults,
  onCreated,
  tasks,
  onMove,
  onToggle,
  onPatch,
}: {
  column: (typeof COLUMNS)[number];
  defaults: Parameters<typeof QuickAddTask>[0]["defaults"];
  onCreated: () => void;
  tasks: Task[];
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
  onPatch?: (task: Task, patch: Partial<FullTask>) => void;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;
  const colIdx = COL_ORDER.indexOf(column.id);
  const prevCol = COL_ORDER[colIdx - 1];
  const nextCol = COL_ORDER[colIdx + 1];

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 rounded-2xl border-t-4 ${column.accent} p-3 min-h-[400px] transition ${
        isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${column.id === "in_progress" ? "animate-pulse" : ""}`} />
          <h2 className="font-semibold text-sm">{T(column.labelFa, column.labelEn)}</h2>
          <Badge variant="secondary" className="text-xs">
            {isEn ? tasks.length : toPersianDigits(tasks.length)}
          </Badge>
        </div>
      </div>

      <div className="mb-3"><QuickAddTask defaults={defaults} onCreated={onCreated} /></div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              task={t}
              prevCol={prevCol}
              nextCol={nextCol}
              onMove={onMove}
              onToggle={onToggle}
              onPatch={onPatch}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-xl">
              {T("اینجا رها کن", "Drop here")}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({
  task,
  prevCol,
  nextCol,
  onMove,
  onToggle,
  onPatch,
}: {
  task: Task;
  prevCol?: Status;
  nextCol?: Status;
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
  onPatch?: (task: Task, patch: Partial<FullTask>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const navigate = useNavigate();
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        dragHandleProps={{ ...attributes, ...listeners }}
        prevCol={prevCol}
        nextCol={nextCol}
        onMove={onMove}
        onToggle={onToggle ? () => onToggle(task) : undefined}
        onPatch={onPatch ? (patch) => onPatch(task, patch) : undefined}
        onOpen={() => navigate(`/app/tasks/${task.id}`)}
      />
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  dragHandleProps,
  prevCol,
  nextCol,
  onMove,
  onToggle,
  onOpen,
  onPatch,
}: {
  task: Task;
  dragging?: boolean;
  dragHandleProps?: any;
  prevCol?: Status;
  nextCol?: Status;
  onMove?: (taskId: string, newStatus: Status) => void;
  onToggle?: () => void;
  onOpen?: () => void;
  onPatch?: (patch: Partial<FullTask>) => void;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  if (dragging) return <Card className="p-2 rounded-xl shadow-lg text-sm">{task.title}</Card>;
  return <div className="space-y-1">
    <SharedTaskRow task={task as FullTask} externalDragHandle={dragHandleProps} />
    {(prevCol || nextCol) && onMove && <div className="flex justify-end gap-1">
      {prevCol && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onMove(task.id, prevCol)} aria-label={T("ستون قبل", "Previous column")}>{isEn ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}</Button>}
      {nextCol && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onMove(task.id, nextCol)} aria-label={T("ستون بعد", "Next column")}>{isEn ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}</Button>}
    </div>}
  </div>;
}
