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
  type TimeHorizon,
  type GoalPriority,
  getKanbanGoals,
  saveKanbanGoals,
  getGoalById,
  getChildGoals,
  generateUUID,
  isValidUUID,
  TIME_HORIZONS,
  GOAL_PRIORITIES,
} from "@/lib/kanbanGoals";
import MultiTierTabs from "@/components/kanban/MultiTierTabs";
import GoalEditorModal from "@/components/kanban/GoalEditorModal";
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

  // --- GOAL STATE ---
  const [goals, setGoals] = useState<GoalKanban[]>(() => getKanbanGoals(null, user?.id));
  const [selectedTier1Id, setSelectedTier1Id] = useState<string | null>(() => goals[0]?.id || null);
  const [selectedTier2Id, setSelectedTier2Id] = useState<string | null>(null);
  const [selectedTier3Id, setSelectedTier3Id] = useState<string | null>(null);

  // Mode and Layout
  const [viewMode, setViewMode] = useState<"hierarchy" | "time" | "priority">("hierarchy");
  const [layoutMode, setLayoutMode] = useState<"stream" | "columns">("stream");
  const [timeFilter, setTimeFilter] = useState<TimeHorizon | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<GoalPriority | "all">("all");

  // Goal Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalKanban | null>(null);
  const [newGoalParentId, setNewGoalParentId] = useState<string | null>(null);

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

  // Synchronize goals
  useEffect(() => {
    const list = getKanbanGoals(null, user?.id);
    setGoals(list);
    setSelectedTier1Id((prev) => (!prev && list.length > 0 ? list[0].id : prev));

    const handleGoalsUpdated = () => {
      const updated = getKanbanGoals(null, user?.id);
      setGoals(updated);
    };
    window.addEventListener("arshnaz-goals-updated", handleGoalsUpdated);
    return () => window.removeEventListener("arshnaz-goals-updated", handleGoalsUpdated);
  }, [user?.id]);

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

  // Identify Active Goal (Tier 3 > Tier 2 > Tier 1)
  const activeGoalId = selectedTier3Id || selectedTier2Id || selectedTier1Id;
  const activeGoal = useMemo(() => {
    if (!activeGoalId) return goals[0] || null;
    return getGoalById(goals, activeGoalId) || goals[0] || null;
  }, [goals, activeGoalId]);

  // Task Counts per Goal (for badge indicators)
  const taskCountsByGoal = useMemo(() => {
    const map: Record<string, number> = {};
    const rootGoalId = goals.find((g) => g.parentId === null)?.id || goals[0]?.id;
    allTasks.forEach((t) => {
      const gid = t.kanban_column_id || rootGoalId;
      if (gid) map[gid] = (map[gid] || 0) + 1;
    });
    return map;
  }, [allTasks, goals]);

  // Filtered tasks for current goal
  const currentGoalTasks = useMemo(() => {
    if (!activeGoalId) return allTasks;
    const isRootGoal =
      activeGoal?.parentId === null &&
      (activeGoalId === goals[0]?.id || goals.filter((g) => g.parentId === null).length <= 1);
    return allTasks.filter((t) => {
      if (t.kanban_column_id === activeGoalId) return true;
      if (!t.kanban_column_id && isRootGoal) return true;
      return false;
    });
  }, [allTasks, activeGoalId, activeGoal, goals]);

  const incompleteTasks = useMemo(() => currentGoalTasks.filter((t) => !t.completed), [currentGoalTasks]);
  const completedTasks = useMemo(() => currentGoalTasks.filter((t) => t.completed), [currentGoalTasks]);

  // Task mutation helpers
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

  // Goal management
  const handleSaveGoal = (goalData: Partial<GoalKanban>) => {
    let nextGoals: GoalKanban[];
    if (goalData.id) {
      // Edit existing
      nextGoals = goals.map((g) =>
        g.id === goalData.id
          ? ({ ...g, ...goalData, updatedAt: new Date().toISOString() } as GoalKanban)
          : g
      );
      toast.success("کانبان با موفقیت بروزرسانی شد");
    } else {
      // Add new
      const rootGoal = goals.find((g) => g.parentId === null) || goals[0];
      const newG: GoalKanban = {
        id: generateUUID(),
        title: goalData.title || "زیرمجموعه جدید",
        description: goalData.description,
        parentId: goalData.parentId || rootGoal?.id || null,
        timeHorizon: goalData.timeHorizon || "monthly",
        priority: goalData.priority || "medium",
        color: goalData.color || "#3b82f6",
        icon: goalData.icon || "🎯",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      nextGoals = [...goals, newG];
      setSelectedTier1Id(newG.id);
      toast.success(T("زیرمجموعه جدید ایجاد شد", "New sub-goal created"));
    }
    setGoals(nextGoals);
    saveKanbanGoals(nextGoals, null, user?.id);
  };

  const handleDeleteGoal = (goalId: string) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target || target.parentId === null) {
      toast.error(T("هدف اصلی کانبان قابل حذف نیست", "Primary goal cannot be deleted"));
      return;
    }
    const deletedIds = new Set([goalId]);
    let changed = true;
    while (changed) {
      changed = false;
      goals.forEach((g) => {
        if (g.parentId && deletedIds.has(g.parentId) && !deletedIds.has(g.id)) {
          deletedIds.add(g.id);
          changed = true;
        }
      });
    }
    const next = goals.filter((g) => !deletedIds.has(g.id));
    setGoals(next);
    saveKanbanGoals(next, null, user?.id);
    setSelectedTier1Id(next.find((g) => g.parentId === null)?.id || next[0].id);
    setSelectedTier2Id(null);
    setSelectedTier3Id(null);
    toast.success(T("زیرمجموعه با موفقیت حذف شد", "Sub-goal deleted successfully"));
  };

  const openEditForGoal = (g: GoalKanban) => {
    setEditingGoal(g);
    setNewGoalParentId(null);
    setEditorOpen(true);
  };

  const openAddNewGoal = (parentId: string | null = null) => {
    setEditingGoal(null);
    const rootGoal = goals.find((g) => g.parentId === null) || goals[0];
    setNewGoalParentId(parentId || rootGoal?.id || null);
    setEditorOpen(true);
  };

  const activeTaskObj = activeId ? allTasks.find((t) => t.id === activeId) : null;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-5xl mx-auto p-3 md:p-6 space-y-4 pb-24 page-enter relative min-h-screen">
      {/* 1. TOP HEADER (Title matching screenshot & controls) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => activeGoal && openEditForGoal(activeGoal)}
            className="flex items-center gap-2 text-xl md:text-2xl font-black text-foreground hover:text-primary transition-colors text-start group cursor-pointer"
            title={T("ویرایش نام و تنظیمات این هدف", "Edit name and settings of this goal")}
          >
            <span>{activeGoal?.icon || "🎯"}</span>
            <span>{activeGoal?.title || T("هدف اصلی", "Main Goal")}</span>
            <span className="p-1 rounded-lg bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition">
              <Edit2 className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </span>
          </button>

          {activeGoal && (
            <Badge variant="outline" className="text-[11px] font-mono gap-1 border-primary/30 text-primary">
              <span>
                {isEn
                  ? TIME_HORIZONS.find((th) => th.id === activeGoal.timeHorizon)?.labelEn || "Monthly"
                  : TIME_HORIZONS.find((th) => th.id === activeGoal.timeHorizon)?.labelFa || "ماهانه"}
              </span>
            </Badge>
          )}

          {activeGoal?.priority && activeGoal.priority !== "none" && (
            <Badge variant="secondary" className="text-[11px] gap-1">
              <span>{GOAL_PRIORITIES.find((p) => p.id === activeGoal.priority)?.badge}</span>
              <span>
                {isEn
                  ? GOAL_PRIORITIES.find((p) => p.id === activeGoal.priority)?.labelEn
                  : GOAL_PRIORITIES.find((p) => p.id === activeGoal.priority)?.labelFa}
              </span>
            </Badge>
          )}
        </div>

        {/* Action controls & View mode dropdown */}
        <div className="flex items-center gap-1.5">
          {/* Layout Mode Toggle (Stream vs Classic Kanban) */}
          <div className="flex rounded-xl bg-muted/60 p-0.5 border">
            <button
              type="button"
              onClick={() => setLayoutMode("stream")}
              className={`p-1.5 rounded-lg text-xs transition ${
                layoutMode === "stream" ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground"
              }`}
              title={T("نمای استریم تمام‌صفحه", "Fullscreen stream view")}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("columns")}
              className={`p-1.5 rounded-lg text-xs transition ${
                layoutMode === "columns" ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground"
              }`}
              title={T("ستون‌های کلاسیک کانبان", "Classic Kanban columns")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Grouping / Filter Dropdown */}
          <DropdownMenu dir={isEn ? "ltr" : "rtl"}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl gap-1.5 bg-card/60">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {viewMode === "hierarchy"
                    ? T("ساختار درختی", "Hierarchy")
                    : viewMode === "time"
                    ? T("بر اساس زمان", "By Time")
                    : T("بر اساس اهمیت", "By Priority")}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-48">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                {T("حالت نمایش کانبان", "Kanban View Mode")}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setViewMode("hierarchy")} className="gap-2 font-medium">
                <FolderTree className="w-3.5 h-3.5 text-primary" /> {T("ساختار درختی و چندسطحی", "Multi-tier hierarchy")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("time")} className="gap-2 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> {T("مرتب‌سازی بر اساس زمان (افق)", "Sort by time horizon")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("priority")} className="gap-2 font-medium">
                <Flag className="w-3.5 h-3.5 text-rose-500" /> {T("مرتب‌سازی بر اساس اهمیت", "Sort by priority")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => activeGoal && openEditForGoal(activeGoal)} className="gap-2">
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> {T("ویرایش هدف فعلی", "Edit current goal")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAddNewGoal(activeGoalId || goals[0]?.id)} className="gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-500" /> {T("افزودن زیرمجموعه جدید", "Add new sub-goal")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 3-dots Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-44">
              {activeGoal && (
                <>
                  <DropdownMenuItem onClick={() => openEditForGoal(activeGoal)} className="gap-2">
                    <Edit2 className="w-3.5 h-3.5" /> {T("ویرایش تنظیمات این کانبان", "Edit Kanban settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAddNewGoal(activeGoal.id)} className="gap-2">
                    <Plus className="w-3.5 h-3.5 text-primary" /> {T("افزودن زیرمجموعه به این هدف", "Add sub-goal")}
                  </DropdownMenuItem>
                  {activeGoal.parentId !== null && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteGoal(activeGoal.id)}
                        className="gap-2 text-destructive focus:bg-destructive/10"
                      >
                        {T("حذف این زیرمجموعه", "Delete this sub-goal")}
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. SINGLE-TIER GOAL TABS */}
      <div className="overflow-x-auto no-scrollbar">
        <MultiTierTabs
          goals={goals}
          selectedGoalId={selectedTier1Id}
          viewMode={viewMode}
          selectedTimeFilter={timeFilter}
          selectedPriorityFilter={priorityFilter}
          onSelectGoal={(id) => {
            setSelectedTier1Id(id);
            setSelectedTier2Id(null);
            setSelectedTier3Id(null);
          }}
          onSelectTimeFilter={(h) => setTimeFilter(h)}
          onSelectPriorityFilter={(p) => setPriorityFilter(p)}
          onDoubleTapGoal={openEditForGoal}
          onEditGoal={openEditForGoal}
          onAddNewGoal={() => openAddNewGoal(activeGoalId || goals[0]?.id)}
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
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuickTask(quickTitle)}
              placeholder={
                isEn
                  ? `+ Add new task to "${activeGoal?.title || "this Kanban"}"...`
                  : `+ افزودن تسک جدید به «${activeGoal?.title || "این کانبان"}»...`
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
              onClick={() => {
                const params = new URLSearchParams();
                if (activeGoalId) params.set("kanban_goal_id", activeGoalId);
                navigate(`/app/new/task?${params.toString()}`);
              }}
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
                      <h4 className="text-[15px] font-bold text-foreground hover:text-primary transition-colors leading-snug">
                        {t.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {t.priority !== "none" && (
                          <Badge variant="outline" className={`text-[10px] gap-1 ${pm.bgClass} ${pm.textClass}`}>
                            <Flag className="w-2.5 h-2.5" /> {T(pm.label, pm.labelEn)}
                          </Badge>
                        )}
                        {t.due_date && (
                          <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {format(new Date(t.due_date), "MMM d")}
                          </span>
                        )}
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
              <div className="text-center py-12 border border-dashed rounded-3xl bg-muted/20 space-y-2">
                <div className="text-3xl">✨</div>
                <h4 className="text-sm font-bold text-foreground">
                  {T("همه کارهای این هدف انجام شده‌اند!", "All tasks in this goal are completed!")}
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
                          {format(new Date(ct.due_date), "d MMM")}
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
                  onOpenFullForm={() => {
                    const params = new URLSearchParams();
                    if (activeGoalId) params.set("kanban_goal_id", activeGoalId);
                    params.set("status", col.id);
                    navigate(`/app/new/task?${params.toString()}`);
                  }}
                  onMove={moveTaskColumn}
                  onToggle={toggleTask}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeTaskObj ? <TaskCard task={activeTaskObj} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Floating Action Button (+) opens full form with goal preselected */}
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams();
          if (activeGoalId) params.set("kanban_goal_id", activeGoalId);
          navigate(`/app/new/task?${params.toString()}`);
        }}
        className="fixed bottom-6 start-6 md:bottom-8 md:start-8 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 transition-transform z-30"
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
        defaultParentId={newGoalParentId}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
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
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  newValue: string;
  setNewValue: (v: string) => void;
  onAdd: () => void;
  onOpenFullForm?: () => void;
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
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
}: {
  task: Task;
  prevCol?: Status;
  nextCol?: Status;
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
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
}: {
  task: Task;
  dragging?: boolean;
  dragHandleProps?: any;
  prevCol?: Status;
  nextCol?: Status;
  onMove?: (taskId: string, newStatus: Status) => void;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.none;

  return (
    <Card className={`p-3 border-s-4 ${pm.borderClass} ${dragging ? "shadow-lg" : "hover:shadow-xs"}`}>
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
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-start">
          <p
            className={`text-sm font-medium hover:underline ${
              task.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {task.priority !== "none" && (
              <Badge variant="outline" className={`text-[10px] gap-1 ${pm.bgClass} ${pm.textClass}`}>
                <Flag className="w-2.5 h-2.5" /> {T(pm.label, pm.labelEn)}
              </Badge>
            )}
            {task.due_date && (
              <Badge variant="secondary" className="text-[10px] gap-1 font-mono">
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(task.due_date), "MMM d")}
              </Badge>
            )}
            {task.kanban_column_id && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/25 bg-primary/10 text-primary">
                <Target className="w-2.5 h-2.5" />
                <span>{T("هدف", "Goal")}</span>
              </Badge>
            )}
          </div>
        </button>
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
