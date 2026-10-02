import { getFolderTaskTree } from "@/features/tasks/taskTree";
import { QuickAddTask } from "@/components/QuickAddTask";
import { SharedTaskRow, SharedTaskRowsProvider } from "@/components/SharedTaskRow";
import type { Task as FullTask } from "@/lib/taskTypes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { firebaseStore } from "@/lib/firebaseStore";
import { taskDueTimestamp } from "@/lib/taskDate";
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
  ChevronDown,
  ChevronUp,
  Edit2,
  FolderTree,
  Check,
  SlidersHorizontal,
  Target,
  ArrowLeft,
  ArrowRight,
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
  type TimeHorizon,
  type GoalPriority,
  getKanbanGoals,
  saveKanbanGoals,
  getGoalById,
  generateUUID,
  isValidUUID,
  TIME_HORIZONS,
  GOAL_PRIORITIES,
} from "@/lib/kanbanGoals";
import type { FolderPrefs } from "@/lib/folderPrefs";
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

function sortFolderTasks(tasks: Task[], sortOrder: FolderPrefs["sortOrder"]) {
  if (sortOrder === "manual") return tasks;
  return [...tasks].sort((a, b) => {
    if (sortOrder === "priority") {
      return (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
    }
    if (sortOrder === "due_date") {
      const aDue = a.due_date ? taskDueTimestamp(a.due_date) : Infinity;
      const bDue = b.due_date ? taskDueTimestamp(b.due_date) : Infinity;
      return aDue - bDue;
    }
    return a.title.localeCompare(b.title, "fa");
  });
}

export function FolderKanban({
  folderId,
  onOpenTask,
  layout,
  sortOrder,
  goalMode = "hierarchy",
  onGoalColorChange,
}: {
  onGoalColorChange?: (color: string | null) => void;
  folderId: string;
  onOpenTask?: (taskId: string) => void;
  layout: "stream" | "columns";
  sortOrder: FolderPrefs["sortOrder"];
  goalMode?: "hierarchy" | "time" | "priority";
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showCompletedTasks = useShowCompletedTasks();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  // --- GOAL STATE FOR THIS FOLDER ---
  const [goals, setGoals] = useState<GoalKanban[]>(() => getKanbanGoals(folderId, user?.id));
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => goals[0]?.id || null);

  // Mode (controlled by the folder settings menu) and layout
  const viewMode = goalMode;
  const [timeFilter, setTimeFilter] = useState<TimeHorizon | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<GoalPriority | "all">("all");

  // Goal Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalKanban | null>(null);

  // --- TASK STATE FOR THIS FOLDER ---
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);


  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Synchronize folder goals
  useEffect(() => {
    const list = getKanbanGoals(folderId, user?.id);
    setGoals(list);
    setSelectedGoalId((prev) => (!prev && list.length > 0 ? list[0].id : prev));

    const handleUpdated = (e: any) => {
      if (e?.detail?.folderId === folderId) {
        const updated = getKanbanGoals(folderId, user?.id);
        setGoals(updated);
      }
    };
    window.addEventListener("arshnaz-goals-updated", handleUpdated);
    return () => window.removeEventListener("arshnaz-goals-updated", handleUpdated);
  }, [folderId, user?.id]);

  // Load tasks belonging to this folder
  const loadTasks = async () => {
    if (!user || !folderId) return;
    try {
      let cached = await getCachedTasks(user.id);
      cached = await applyPendingTaskOperations(cached, user.id);
      const folderTasks = getFolderTaskTree(cached, folderId);
      const parents = folderTasks.filter((t) => !t.parent_id);
      const subs = folderTasks.filter((t) => Boolean(t.parent_id));
      setAllTasks((parents as unknown) as Task[]);
      setSubtasks((subs as unknown) as Task[]);
    } catch {
      const { data } = await firebaseStore.from("tasks").select("*").eq("user_id", user.id).order("position");
      const tree = getFolderTaskTree((data || []) as FullTask[], folderId);
      setAllTasks(tree.filter(t => !t.parent_id) as Task[]);
      setSubtasks(tree.filter(t => !!t.parent_id) as Task[]);
    }
  };

  useEffect(() => {
    loadTasks();
    const handleTasksChanged = () => {
      void loadTasks();
    };
    window.addEventListener("tasks-changed", handleTasksChanged);
    return () => window.removeEventListener("tasks-changed", handleTasksChanged);
  }, [user, folderId]);

  useEffect(() => {
    if (!user || !folderId) return;
    const ch = firebaseStore
      .channel(`folder-kanban-goals-${folderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `folder_id=eq.${folderId}` }, loadTasks)
      .subscribe();
    return () => {
      firebaseStore.removeChannel(ch);
    };
  }, [user, folderId]);

  // Identify Active Goal
  const activeGoal = useMemo(() => {
    if (!selectedGoalId) return goals[0] || null;
    return getGoalById(goals, selectedGoalId) || goals[0] || null;
  }, [goals, selectedGoalId]);
  useEffect(() => {
    onGoalColorChange?.(activeGoal?.color || null);
    return () => onGoalColorChange?.(null);
  }, [activeGoal?.color, onGoalColorChange]);

  const activeGoalId = activeGoal?.id || goals[0]?.id || null;

  // Task Counts per Goal (for badge indicators)
  const taskCountsByGoal = useMemo(() => {
    const map: Record<string, number> = {};
    const defaultGoalId = goals[0]?.id;
    allTasks.forEach((t) => {
      const gid = t.kanban_column_id || defaultGoalId;
      if (gid) map[gid] = (map[gid] || 0) + 1;
    });
    return map;
  }, [allTasks, goals]);

  // Filtered tasks for current active goal in this folder
  const currentGoalTasks = useMemo(() => {
    if (!activeGoalId) return allTasks;
    const isFirstGoal = activeGoalId === goals[0]?.id;
    return allTasks.filter((t) => {
      if (t.kanban_column_id === activeGoalId) return true;
      if (!t.kanban_column_id && isFirstGoal) return true;
      return false;
    });
  }, [allTasks, activeGoalId, goals]);

  const incompleteTasks = useMemo(
    () => sortFolderTasks(currentGoalTasks.filter((t) => !t.completed), sortOrder),
    [currentGoalTasks, sortOrder],
  );
  const completedTasks = useMemo(
    () => sortFolderTasks(currentGoalTasks.filter((t) => t.completed), sortOrder),
    [currentGoalTasks, sortOrder],
  );

  // Task mutations
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

  // Goal management
  const handleSaveGoal = (goalData: Partial<GoalKanban>) => {
    let nextGoals: GoalKanban[];
    if (goalData.id) {
      nextGoals = goals.map((g) =>
        g.id === goalData.id
          ? ({ ...g, ...goalData, parentId: null, updatedAt: new Date().toISOString() } as GoalKanban)
          : g
      );
      toast.success(T("هدف با موفقیت بروزرسانی شد", "Goal updated successfully"));
    } else {
      const newG: GoalKanban = {
        id: generateUUID(),
        title: goalData.title || "هدف جدید",
        description: goalData.description,
        parentId: null,
        timeHorizon: goalData.timeHorizon || "monthly",
        priority: goalData.priority || "medium",
        color: goalData.color || "#3b82f6",
        icon: goalData.icon || "🎯",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      nextGoals = [...goals, newG];
      setSelectedGoalId(newG.id);
      toast.success(T("هدف جدید ایجاد شد", "New goal created"));
    }
    setGoals(nextGoals);
    saveKanbanGoals(nextGoals, folderId, user?.id);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (goals.length <= 1) {
      toast.error(T("حداقل یک هدف باید در این پوشه باقی بماند", "At least one goal must remain in this folder"));
      return;
    }
    const next = goals.filter((g) => g.id !== goalId);
    setGoals(next);
    saveKanbanGoals(next, folderId, user?.id);
    setSelectedGoalId(next[0].id);
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
    <SharedTaskRowsProvider tasks={[...allTasks, ...subtasks] as FullTask[]} onToggle={(t) => void toggleTask(t as Task)} onPatch={(t, patch) => void patchTask(t as Task, patch)} onOpen={(t) => onOpenTask ? onOpenTask(t.id) : navigate(`/app/tasks/${t.id}`)}>
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-2 pb-4 relative">
      {/* Goal identity lives in the tab row; metadata and actions share one compact rail. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {activeGoal && (
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              {isEn
                ? TIME_HORIZONS.find((th) => th.id === activeGoal.timeHorizon)?.labelEn || "Monthly"
                : TIME_HORIZONS.find((th) => th.id === activeGoal.timeHorizon)?.labelFa || "ماهانه"}
            </Badge>
          )}
          {activeGoal?.priority && activeGoal.priority !== "none" && <PriorityFlag priority={activeGoal.priority} />}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={T("تنظیمات هدف", "Goal settings")}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-44">
            {activeGoal && <DropdownMenuItem onClick={() => openEditForGoal(activeGoal)} className="gap-2">
              <Edit2 className="w-3.5 h-3.5" />{T("ویرایش هدف", "Edit goal")}
            </DropdownMenuItem>}
            <DropdownMenuItem onClick={openAddNewGoal} className="gap-2">
              <Plus className="w-3.5 h-3.5" />{T("افزودن هدف جدید", "Add new goal")}
            </DropdownMenuItem>
            {activeGoal && goals.length > 1 && <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDeleteGoal(activeGoal.id)} className="text-destructive focus:bg-destructive/10">
                {T("حذف این هدف", "Delete this goal")}
              </DropdownMenuItem>
            </>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      {/* 3. MAIN CONTENT: STREAM VIEW OR CLASSIC KANBAN */}
      <>

      {layout === "stream" ? (
        <div className="space-y-4">
          {/* Quick Input Bar */}
          <QuickAddTask defaults={{ folder_id: folderId, kanban_column_id: activeGoalId }} onCreated={() => void loadTasks()} />

          {/* Incomplete Task Cards */}
          <div className="space-y-3">
            {incompleteTasks.map((t) => <SharedTaskRow key={t.id} task={t as FullTask} />)}

            {incompleteTasks.length === 0 && (
              <div className="text-center py-10 border border-dashed rounded-3xl bg-muted/20 space-y-2">
                <div className="text-2xl">✨</div>
                <h4 className="text-sm font-bold text-foreground">همه تسک‌های این هدف انجام شده‌اند!</h4>
                <p className="text-xs text-muted-foreground">می‌توانید تسک جدیدی برای ادامه کارها بیفزایید.</p>
              </div>
            )}
          </div>

          {/* Completed Collapsible Section */}
          {showCompletedTasks && completedTasks.length > 0 && (
            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={() => setCompletedOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                <span>Completed</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full">
                  {completedTasks.length}
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
              const colTasks = sortFolderTasks(currentGoalTasks.filter((t) => t.status === col.id), sortOrder);
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={colTasks}
                  defaults={{ folder_id: folderId, kanban_column_id: activeGoalId, status: col.id }}
                  onCreated={() => void loadTasks()}
                  onMove={moveTaskColumn}
                  onToggle={toggleTask}
                  onPatch={patchTask}
                  onOpenTask={onOpenTask}
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

      {/* Floating Action Button (+) opens full form with goal & folder preselected */}
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams();
          if (activeGoalId) params.set("kanban_goal_id", activeGoalId);
          if (folderId) params.set("folder_id", folderId);
          navigate(`/app/new/task?${params.toString()}`);
        }}
        className="fixed bottom-8 end-8 hidden w-14 h-14 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground md:flex items-center justify-center shadow-lg transition-transform z-30"
        title="ایجاد تسک جدید (فرم کامل)"
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
      />
    </div>
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
  onOpenTask,
  onPatch,
}: {
  column: (typeof COLUMNS)[number];
  defaults: Parameters<typeof QuickAddTask>[0]["defaults"];
  onCreated: () => void;
  tasks: Task[];
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
  onOpenTask?: (taskId: string) => void;
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
          <Icon className={`w-4 h-4 ${column.id === "in_progress" ? "animate-spin" : ""}`} />
          <h2 className="font-semibold text-sm">{T(column.labelFa, column.labelEn)}</h2>
          <Badge variant="secondary" className="text-xs font-mono">
            {tasks.length}
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
              onOpenTask={onOpenTask}
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
  onOpenTask,
  onPatch,
}: {
  task: Task;
  prevCol?: Status;
  nextCol?: Status;
  onMove: (taskId: string, newStatus: Status) => void;
  onToggle?: (task: Task) => void;
  onOpenTask?: (taskId: string) => void;
  onPatch?: (task: Task, patch: Partial<FullTask>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
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
        onOpen={() => onOpenTask?.(task.id)}
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
      {prevCol && <Button size="sm" variant="ghost" onClick={() => onMove(task.id, prevCol)} aria-label={T("ستون قبل", "Previous column")}><ArrowRight className="w-3 h-3" /></Button>}
      {nextCol && <Button size="sm" variant="ghost" onClick={() => onMove(task.id, nextCol)} aria-label={T("ستون بعد", "Next column")}><ArrowLeft className="w-3 h-3" /></Button>}
    </div>}
  </div>;
}
