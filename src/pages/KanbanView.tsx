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
  getGoalById,
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
  { id: "done", labelFa: "انجام شده", labelEn: "Done", icon: CheckCircle2, accent: "border-t-emerald-500" },
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
  const [quickTitle, setQuickTitle] = useState("");
  const quickInputRef = useRef<HTMLInputElement>(null);
  const [quickColumnTitle, setQuickColumnTitle] = useState<Record<Status, string>>({
    todo: "",
    in_progress: "",
    done: "",
  });

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

  const belongsToGoal = useCallback(
    (t: Task, g: OwnedGoal) =>
      t.kanban_column_id === g.id ||
      (!t.kanban_column_id && Boolean(g.folderId) && t.folder_id === g.folderId && firstGoalByFolder[g.folderId!] === g.id),
    [firstGoalByFolder],
  );

  const activeGoal: OwnedGoal | null = useMemo(
    () => (selectedGoalId && (getGoalById(goals, selectedGoalId) as OwnedGoal | undefined)) || goals[0] || null,
    [goals, selectedGoalId],
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
  const patchTask = async (task: Task, patch: TaskMetaPatch) => {
    if (!user) return;
    const updated: Task = { ...task, ...patch, updated_at: new Date().toISOString() } as Task;
    setAllTasks((prev) => prev.map((x) => (x.id === task.id ? updated : x)));
    const ok = await upsertTask(user.id, updated);
    if (!ok) {
      setAllTasks((prev) => prev.map((x) => (x.id === task.id ? task : x)));
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
      const res = await advanceRecurringTask(user.id, task, { allKnownTasks: allTasks });
      if (res.success && res.patch) {
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
    if (newCompleted) awardTaskWatering(task.title, Boolean(task.parent_id));
    const ok = await upsertTask(user.id, updatedTask);
    if (!ok) {
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(T("خطا در تغییر وضعیت تسک", "Failed to update task"));
    }
  };

  const addQuickTask = async (title: string, status: Status = "todo") => {
    if (!title.trim() || !user) return;
    const completed = status === "done";
    const targetGoalId = activeGoalId || null;
    const newTask: Task = {
      id: generateUUID(),
      user_id: user.id,
      title: title.trim(),
      status,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      due_date: null,
      kanban_column_id: targetGoalId,
      folder_id: activeGoal?.folderId ?? null,
      priority: "none",
      position: allTasks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_id: null,
    };

    setAllTasks((prev) => [...prev, newTask]);
    setQuickTitle("");
    haptic("success");

    const ok = await upsertTask(user.id, newTask);
    if (ok) {
      toast.success(T("تسک جدید با موفقیت افزوده شد", "Task added successfully"));
      window.dispatchEvent(new Event("tasks-changed"));
    } else {
      toast.error(T("خطا در ذخیره تسک", "Failed to save task"));
    }
  };

  const moveTaskColumn = async (taskId: string, newStatus: Status) => {
    if (!user) return;
    const t = allTasks.find((x) => x.id === taskId);
    if (!t || t.status === newStatus) return;
    if (newStatus === "done" && isRecurringTask(t)) {
      awardTaskWatering(t.title, Boolean(t.parent_id));
      const res = await advanceRecurringTask(user.id, t, { allKnownTasks: allTasks });
      if (res.success && res.patch) {
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
      color: goalData.color || "#3b82f6",
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

  const activeTaskObj = activeId ? allTasks.find((t) => t.id === activeId) : null;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-5xl mx-auto p-3 md:p-6 space-y-4 pb-24 page-enter relative min-h-screen">
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
          goals={goals}
          selectedGoalId={selectedGoalId}
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
      {layoutMode === "stream" ? (
        <div className="space-y-4">
          {/* Quick Input Bar at Top */}
          <div className="flex gap-2">
            <Input
              ref={quickInputRef}
              dir="auto"
              data-testid="kanban-quick-input"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuickTask(quickTitle)}
              placeholder={
                isEn
                  ? `Add new task to "${activeGoal?.title || "this Kanban"}"`
                  : `افزودن تسک جدید به «${activeGoal?.title || "این کانبان"}»`
              }
              className="bg-card/70 border-border/70 text-sm h-11 rounded-2xl shadow-xs"
            />
            <Button
              onClick={() => addQuickTask(quickTitle)}
              disabled={!quickTitle.trim()}
              className="h-11 px-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xs shrink-0"
              title={T("افزودن تسک سریع", "Add quick task")}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openFullForm()}
              className="h-11 px-3 sm:px-4 rounded-2xl border-border/70 gap-1.5 text-xs font-semibold shrink-0 bg-card hover:bg-muted"
              title={T("صفحه کامل ایجاد تسک", "Full task creation form")}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{T("فرم کامل", "Full Form")}</span>
            </Button>
          </div>

          {/* Incomplete Tasks Cards (Full Screen style like screenshot) */}
          <div className="space-y-3">
            {incompleteTasks.map((t) => {
              const taskSubs = subtasks.filter((s) => s.parent_id === t.id);
              const visibleTaskSubs = filterTasksForVisibility(taskSubs, showCompletedTasks);
              const pm = PRIORITY_META[t.priority] || PRIORITY_META.none;
              return (
                <Card
                  key={t.id}
                  className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/40 transition-all space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTask(t)}
                      className="mt-0.5 w-5 h-5 rounded-md border-2 border-rose-500/80 hover:bg-rose-500/10 flex items-center justify-center transition shrink-0"
                    >
                      {t.completed && <Check className="w-3.5 h-3.5 text-rose-500" />}
                    </button>

                    <div
                      onClick={() => navigate(`/app/tasks/${t.id}`)}
                      className="flex-1 min-w-0 cursor-pointer text-start"
                    >
                      <h4 dir="auto" className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors leading-snug text-start" style={{ unicodeBidi: "plaintext" }}>
                        {t.title}
                      </h4>

                      <div className="mt-1.5">
                        <TaskMetaQuickEdit taskId={t.id} priority={t.priority} dueDate={t.due_date} isEn={isEn} onChange={(patch) => patchTask(t, patch)} />
                      </div>
                    </div>
                  </div>

                  {/* Subtasks checklist inside card (matching screenshot) */}
                  {visibleTaskSubs.length > 0 && (
                    <div className="pe-2 ps-6 space-y-2 border-t border-border/40 pt-2.5">
                      {visibleTaskSubs.map((st) => (
                        <div key={st.id} className="flex items-center gap-2.5 text-xs text-foreground/90">
                          <Checkbox
                            checked={st.completed}
                            onCheckedChange={() => toggleTask(st)}
                            className="w-4 h-4 rounded"
                          />
                          <span
                            onClick={() => navigate(`/app/tasks/${st.id}`)}
                            className={`cursor-pointer hover:underline ${
                              st.completed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {st.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

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
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full font-mono">
                  {completedTasks.length}
                </Badge>
                {completedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {completedOpen && (
                <div className="space-y-2 animate-fade-in">
                  {completedTasks.map((ct) => (
                    <Card
                      key={ct.id}
                      className="p-3.5 rounded-2xl bg-card/40 border border-border/50 opacity-70 hover:opacity-100 transition-opacity flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox checked={true} onCheckedChange={() => toggleTask(ct)} className="rounded" />
                        <span
                          onClick={() => navigate(`/app/tasks/${ct.id}`)}
                          className="text-xs line-through text-muted-foreground truncate cursor-pointer hover:underline"
                        >
                          {ct.title}
                        </span>
                      </div>
                      {ct.due_date && (
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {new Date(ct.due_date).toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </Card>
                  ))}
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
                  newValue={quickColumnTitle[col.id]}
                  setNewValue={(v) => setQuickColumnTitle((s) => ({ ...s, [col.id]: v }))}
                  onAdd={() => {
                    addQuickTask(quickColumnTitle[col.id], col.id);
                    setQuickColumnTitle((s) => ({ ...s, [col.id]: "" }));
                  }}
                  onOpenFullForm={() => openFullForm(col.id)}
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
  );
}

function KanbanColumn({
  column,
  tasks,
  newValue,
  setNewValue,
  onAdd,
  onOpenFullForm,
  onMove,
  onToggle,
  onPatch,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  newValue: string;
  setNewValue: (v: string) => void;
  onAdd: () => void;
  onOpenFullForm?: () => void;
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
  onPatch?: (task: Task, patch: TaskMetaPatch) => void;
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
          <Icon className={`w-4 h-4 ${column.id === "in_progress" ? "animate-spin" : ""}`} />
          <h2 className="font-semibold text-sm">{T(column.labelFa, column.labelEn)}</h2>
          <Badge variant="secondary" className="text-xs font-mono">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={T("+ کارت جدید", "+ New card")}
          className="h-8 text-xs bg-background rounded-xl"
        />
        <Button size="icon" variant="ghost" onClick={onAdd} className="h-8 w-8 rounded-xl" title={T("افزودن سریع", "Quick add")}>
          <Plus className="w-4 h-4" />
        </Button>
        {onOpenFullForm && (
          <Button size="icon" variant="ghost" onClick={onOpenFullForm} className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground" title={T("فرم کامل", "Full form")}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

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
  onPatch?: (task: Task, patch: TaskMetaPatch) => void;
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
  onPatch?: (patch: TaskMetaPatch) => void;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.none;

  return (
    <Card className={`p-3  ${dragging ? "shadow-lg" : "hover:shadow-xs"}`}>
      <div className="flex items-start gap-2">
        <button
          {...(dragHandleProps || {})}
          className="cursor-grab active:cursor-grabbing px-0.5 text-muted-foreground/60 hover:text-foreground touch-none shrink-0 mt-0.5"
          aria-label="drag"
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </button>
        {onToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
              task.completed
                ? "bg-rose-500 border-rose-500 text-white"
                : "border-muted-foreground/40 hover:border-primary"
            }`}
            title={T("تغییر وضعیت انجام", "Toggle completion")}
          >
            {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        )}
        <div className="flex-1 min-w-0 text-start">
          <button type="button" onClick={onOpen} className="block w-full text-start">
            <p
              dir="auto"
              style={{ unicodeBidi: "plaintext" }}
              className={`text-sm font-medium text-start hover:underline ${
                task.completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.title}
            </p>
          </button>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {onPatch ? (
              <TaskMetaQuickEdit taskId={task.id} priority={task.priority} dueDate={task.due_date} isEn={isEn} onChange={onPatch} />
            ) : (
              task.priority !== "none" && <PriorityFlag priority={task.priority} />
            )}
            {task.kanban_column_id && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/25 bg-primary/10 text-primary">
                <Target className="w-2.5 h-2.5" />
                <span>{T("هدف", "Goal")}</span>
              </Badge>
            )}
          </div>
        </div>
        {(prevCol || nextCol) && onMove && (
          <div className="flex items-center gap-0.5 shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
            {prevCol && (
              <button
                type="button"
                onClick={() => onMove(task.id, prevCol)}
                className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted text-[10px] transition"
                title={T(COLUMNS.find((c) => c.id === prevCol)?.labelFa || "ستون قبل", "Previous column")}
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {nextCol && (
              <button
                type="button"
                onClick={() => onMove(task.id, nextCol)}
                className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted text-[10px] transition"
                title={T(COLUMNS.find((c) => c.id === nextCol)?.labelFa || "ستون بعد", "Next column")}
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
