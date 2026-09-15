import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { formatDate } from "@/lib/jalali";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Calendar, Trash2, ChevronRight, ChevronDown, Flag, GripVertical, CornerDownRight, Ban, Pin, Clock, FolderInput, Check, X, GitBranch, MoreVertical, Zap, Columns2, CheckSquare } from "lucide-react";
import { MoveToDialog } from "@/components/MoveToDialog";
import { FolderDeleteDialog } from "@/components/FolderDeleteDialog";
import { useNavigate } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import {
  removeTask,
  saveTask,
} from "@/features/tasks/taskService";
import {
  buildTaskChildrenMap,
  collectTaskDescendantIds,
  getTaskProgress,
} from "@/features/tasks/taskTree";
import { useAuth } from "@/hooks/useAuth";
import { useTasksData } from "@/hooks/useTasksData";
import { syncAndroidWidget } from "@/lib/androidWidget";
import { syncNativeTaskReminder } from "@/lib/reminders";
import { Button } from "@/components/ui/button";
import { BidiText } from "@/components/BidiText";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PRIORITY_META } from "@/lib/priority";
import { FolderKanban } from "@/components/FolderKanban";
import { pushUndo } from "@/lib/undoStack";
import { pushDeleted } from "@/lib/recentlyDeleted";
import { enqueueOp } from "@/lib/offlineQueue";
import { logTaskActivity } from "@/lib/taskActivity";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describeRule, nextOccurrence } from "@/lib/recurrence";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
  SortableTaskRow,
} from "@/components/TaskDnDHelpers";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { TaskFilterSheet, DEFAULT_FILTERS, type TaskFilters, type SortLevel } from "@/components/TaskFilterSheet";
import { QuickAddTask } from "@/components/QuickAddTask";
import { VirtualTaskList } from "@/components/VirtualTaskList";
import { TaskDetail } from "@/components/TaskDetail";
import type { Task, ConfirmState, TaskOutcome, TaskStatus } from "@/lib/taskTypes";
import { OutcomePicker } from "@/components/OutcomePicker";
import { listTaskOutcomes, executeTaskOutcome } from "@/lib/taskOutcomes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SwipeableRow, { type SwipeAction } from "@/components/gestures/SwipeableRow";
import PullToRefresh from "@/components/gestures/PullToRefresh";
import TaskActionSheet from "@/components/TaskActionSheet";
import PomodoroSheet from "@/components/PomodoroSheet";
import { useLongPress } from "@/lib/useLongPress";
import { DueDatePicker } from "@/components/DueDatePicker";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { MakeChildDialog } from "@/components/MakeChildDialog";
import { PRIORITY_SELECTABLE, type Priority } from "@/lib/priority";
import { Repeat } from "lucide-react";
import type { RecurrenceRule } from "@/lib/recurrence";
import { awardWaterDrops } from "@/lib/garden";
import { DEFAULT_FOLDER_PREFS, getFolderPrefs, saveFolderPrefs, type FolderPrefs } from "@/lib/folderPrefs";

const FOLDER_BG_COLORS = [
  { label: "رز", value: "hsl(350 80% 96%)" },
  { label: "کهربایی", value: "hsl(42 90% 94%)" },
  { label: "زمردی", value: "hsl(150 55% 94%)" },
  { label: "آسمانی", value: "hsl(200 80% 94%)" },
  { label: "بنفش", value: "hsl(265 65% 95%)" },
  { label: "صورتی", value: "hsl(325 75% 95%)" },
  { label: "خاکستری", value: "hsl(220 15% 93%)" },
];
const FOLDER_BG_IMAGES = [
  { label: "مه صبحگاهی", value: "linear-gradient(135deg, hsl(210 40% 96%), hsl(190 35% 90%))" },
  { label: "غروب آرام", value: "linear-gradient(135deg, hsl(20 70% 95%), hsl(280 50% 94%))" },
  { label: "باغ سبز", value: "linear-gradient(135deg, hsl(145 45% 94%), hsl(190 55% 93%))" },
  { label: "شب بنفش", value: "linear-gradient(135deg, hsl(250 35% 18%), hsl(285 30% 28%))" },
  { label: "نقطه‌ای", value: "radial-gradient(hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)" },
];

import { TaskListItem, outcomeMeta, groupedChildren } from "@/components/TaskListItem";

export default function TasksView({ scope }: { scope: "inbox" | "today" | "tomorrow" | "next7" | "smart" | "folder" | "tag" }) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = useCallback((fa: string, en: string) => (isEn ? en : fa), [isEn]);
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [layout, setLayout] = useState<"compact" | "comfortable">("compact");
  useEffect(() => {
    if (!user) return;
    firebaseStore.from("user_settings").select("task_card_layout").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.task_card_layout) setLayout(data.task_card_layout as any); });
  }, [user]);
  const {
    allTasks,
    setAllTasks,
    taskTagsMap,
    outcomeById,
    outcomeByTaskId,
    folderName,
    tagName,
    load,
  } = useTasksData({ user, scope, scopeId: params.id });
  // Soft-completed / soft-deleted tasks are kept visible for a short grace period
  // so users see the strikethrough before the item disappears.
  const [graceTasks, setGraceTasks] = useState<Record<string, Task & { _graceUntil: number }>>({});
  const [graceMap, setGraceMap] = useState<Record<string, number>>({});
  const GRACE_MS = 5000;
  const effectiveAllTasks = useMemo(() => {
    const now = Date.now();
    const activeGhosts = Object.values(graceTasks).filter(
      (g) => (graceMap[g.id] || 0) > now && !allTasks.some((t) => t.id === g.id),
    );
    return activeGhosts.length ? [...allTasks, ...activeGhosts] : allTasks;
  }, [allTasks, graceTasks, graceMap]);
  useEffect(() => {
    void syncAndroidWidget(allTasks, user?.id).catch(() => {});
    void Promise.all(allTasks
      .filter((task) => task.reminder_at || task.completed)
      .slice(0, 100)
      .map((task) => syncNativeTaskReminder(task)));
  }, [allTasks, user?.id]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // selected task removed — clicks navigate to /app/tasks/:id
  const [folderPrefs, setFolderPrefs] = useState<FolderPrefs>(DEFAULT_FOLDER_PREFS);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [moveTask, setMoveTask] = useState<Task | null>(null);
  const [makeChildOf, setMakeChildOf] = useState<Task | null>(null);
  const [delFolderOpen, setDelFolderOpen] = useState(false);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<Task[]>([]);

  const handleBackInDrawer = useCallback(() => {
    setSelectedTaskHistory((prev) => {
      if (prev.length === 0) {
        setSelectedTask(null);
        return [];
      }
      const next = [...prev];
      const previousTask = next.pop()!;
      setSelectedTask(previousTask);
      return next;
    });
  }, []);

  const handleOpenParentInDrawer = useCallback(async (parentId: string) => {
    if (!selectedTask) return;
    let parent = allTasks.find(t => t.id === parentId);
    if (!parent && user) {
      try {
        const cached = await cacheGet<Task[]>(`tasks:all:${user.id}`);
        parent = cached?.find(t => t.id === parentId);
      } catch {}
    }
    if (!parent) {
      try {
        const { data } = await firebaseStore.from("tasks").select("*").eq("id", parentId).maybeSingle();
        if (data) parent = data as unknown as Task;
      } catch {}
    }
    if (parent) {
      setSelectedTaskHistory(prev => [...prev, selectedTask]);
      setSelectedTask(parent);
    } else {
      navigate(`/app/tasks/${encodeURIComponent(parentId)}?from=${encodeURIComponent(selectedTask.id)}`);
    }
  }, [selectedTask, allTasks, user, navigate]);

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
  useEffect(() => {
    if (!selectedTask) return;
    const current = allTasks.find((item) => item.id === selectedTask.id);
    if (current && current !== selectedTask) setSelectedTask(current);
  }, [allTasks, selectedTask]);
  const [pomoTask, setPomoTask] = useState<Task | null>(null);
  const [outcomeTask, setOutcomeTask] = useState<Task | null>(null);
  const [outcomes, setOutcomes] = useState<TaskOutcome[]>([]);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!params.id) {
      setFolderPrefs({ ...DEFAULT_FOLDER_PREFS });
      return;
    }
    setFolderPrefs(getFolderPrefs(params.id, user?.id));
    const onPrefsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ folderId?: string; userId?: string; prefs?: FolderPrefs }>).detail;
      if (detail?.folderId === params.id && detail.userId === user?.id) {
        setFolderPrefs(detail.prefs || getFolderPrefs(params.id, user?.id));
      }
    };
    window.addEventListener("arshnaz-folder-prefs-updated", onPrefsUpdated);
    return () => window.removeEventListener("arshnaz-folder-prefs-updated", onPrefsUpdated);
  }, [params.id, user?.id]);

  // Patch a task field optimistically + persist
  const patchTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const target = effectiveAllTasks.find(t => t.id === id);
    const owner = target ? target.user_id === user?.id : true;
    if (owner) setAllTasks(prev => prev.map(x => x.id === id ? { ...x, ...patch } as Task : x));

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id } });
      toast.info(T("تغییر ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Saved locally — will sync when online"));
      return;
    }

    const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", id);
    if (error) {
      toast.error(error.message);
      if (owner && target) setAllTasks(prev => prev.map(x => x.id === id ? target : x));
      return;
    }
    if (!owner && !error) setAllTasks(prev => prev.map(x => x.id === id ? { ...x, ...patch } as Task : x));
  }, [effectiveAllTasks, user?.id, setAllTasks, T]);

  useEffect(() => {
    const taskId = searchParams.get("completeTaskId");
    if (!taskId) return;
    const target = effectiveAllTasks.find((task) => task.id === taskId);
    if (!target || target.completed) return;
    void patchTask(taskId, { completed: true, status: "done" });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("completeTaskId");
    setSearchParams(nextParams, { replace: true });
  }, [effectiveAllTasks, searchParams, setSearchParams, patchTask]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const SORT_KEY = "task_sort_v2";
  const scopeKey = `${scope}:${params.id || "_"}`;
  const loadSavedFilters = (): TaskFilters => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj[scopeKey]) {
          const saved = obj[scopeKey];
          // Merge into defaults so newly added fields are present
          return {
            ...DEFAULT_FILTERS,
            ...saved,
            sort_primary: saved.sort_primary || DEFAULT_FILTERS.sort_primary,
            sort_secondary: saved.sort_secondary || DEFAULT_FILTERS.sort_secondary,
          };
        }
      }
    } catch { void 0; }
    return DEFAULT_FILTERS;
  };
  const [filters, setFilters] = useState<TaskFilters>(loadSavedFilters());
  // Reload saved filters when scope/folder/tag changes
  useEffect(() => {
    setFilters(loadSavedFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, params.id]);
  // Persist whole filter object per-scope
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj[scopeKey] = filters;
      localStorage.setItem(SORT_KEY, JSON.stringify(obj));
    } catch { void 0; }
  }, [filters, scopeKey]);
  const title = {
    inbox: T("صندوق ورودی", "Inbox"), today: T("امروز", "Today"), tomorrow: T("فردا", "Tomorrow"), next7: T("۷ روز آینده", "Next 7 Days"),
    smart: T("لیست‌های هوشمند", "Smart Lists"), folder: folderName || T("فولدر", "Folder"), tag: `#${tagName || T("تگ", "Tag")}`,
  }[scope];

  // Build children map
  const childrenMap = useMemo(() => buildTaskChildrenMap(effectiveAllTasks), [effectiveAllTasks]);

  // Filter top-level visible tasks per scope
  const topLevel = useMemo(() => {
    const nowMs = Date.now();
    const isGraceActive = (id: string) => (graceMap[id] || 0) > nowMs;
    let list = effectiveAllTasks.filter(t => !t.parent_id);
    if (scope === "inbox") list = list.filter(t => !t.folder_id);
    else if (scope === "today") {
      // Show overdue tasks plus today so the Today view matches TickTick (Overdue + Today groups)
      const e = endOfDay(new Date()).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() <= e);
    } else if (scope === "tomorrow") {
      const s = startOfDay(addDays(new Date(), 1)).getTime();
      const e = endOfDay(addDays(new Date(), 1)).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "next7") {
      // Show overdue plus next 7 days for grouped Upcoming view
      const e = endOfDay(addDays(new Date(), 7)).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() <= e);
    } else if (scope === "smart") {
      list = list.filter(t => t.priority === "high" && (!t.completed || isGraceActive(t.id)));
    } else if (scope === "folder") {
      list = list.filter(t => t.folder_id === params.id);
    }

    // Apply advanced filters
    if (!filters.show_completed) list = list.filter(t => !t.completed || isGraceActive(t.id));
    if (filters.folder_ids.length) list = list.filter(t => t.folder_id && filters.folder_ids.includes(t.folder_id));
    if (filters.priorities.length) list = list.filter(t => filters.priorities.includes(t.priority as string));
    if (filters.tag_ids.length) {
      list = list.filter(t => {
        const tgs = taskTagsMap[t.id] || [];
        return filters.tag_ids.some(id => tgs.includes(id));
      });
    }

    // Apply two-level sort
    const cmpForLevel = (lvl: SortLevel) => (a: Task, b: Task): number => {
      let res = 0;
      switch (lvl.key) {
        case "due": {
          const av = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bv = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          res = av - bv;
          break;
        }
        case "priority":
          res = (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
          break;
        case "created":
          res = new Date((a as any).created_at).getTime() - new Date((b as any).created_at).getTime();
          break;
      }
      return lvl.dir === "desc" ? -res : res;
    };
    const primary = filters.sort_primary || DEFAULT_FILTERS.sort_primary;
    const secondary = filters.sort_secondary || DEFAULT_FILTERS.sort_secondary;
    list = [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return cmpForLevel(primary)(a, b) || cmpForLevel(secondary)(a, b);
    });
    return list;
  }, [effectiveAllTasks, scope, params.id, filters, taskTagsMap, graceMap]);

  const isFolder = scope === "folder" && !!params.id;
  const folderTopLevel = useMemo(() => {
    if (!isFolder || folderPrefs.sortOrder === "manual") return topLevel;
    return [...topLevel].sort((a, b) => {
      if (folderPrefs.sortOrder === "priority") {
        return (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
      }
      if (folderPrefs.sortOrder === "due_date") {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return aDue - bDue;
      }
      return a.title.localeCompare(b.title, "fa");
    });
  }, [folderPrefs.sortOrder, isFolder, topLevel]);

  const taskMap = useMemo(() => new Map(effectiveAllTasks.map(t => [t.id, t])), [effectiveAllTasks]);

  // Date-based grouping for Today/Next7 to mimic TickTick (Overdue, Today, Tomorrow, ...)
  type TaskGroup = { key: string; label: string; tasks: Task[] };
  const groupedTasks = useMemo<TaskGroup[] | null>(() => {
    if (scope !== "today" && scope !== "next7") return null;
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const todayEnd = endOfDay(now).getTime();
    const tomorrowStart = startOfDay(addDays(now, 1)).getTime();
    const tomorrowEnd = endOfDay(addDays(now, 1)).getTime();
    const sorted = [...topLevel].sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (da !== db) return da - db;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
    });
    const groups = new Map<string, TaskGroup>();
    for (const task of sorted) {
      if (!task.due_date) continue;
      const due = new Date(task.due_date).getTime();
      let key: string;
      let label: string;
      if (due < todayStart) {
        key = "overdue";
        label = T("تاخیر", "Overdue");
      } else if (due <= todayEnd) {
        key = "today";
        label = T("امروز", "Today");
      } else if (due <= tomorrowEnd) {
        key = "tomorrow";
        label = T("فردا", "Tomorrow");
      } else {
        const d = new Date(task.due_date);
        key = format(d, "yyyy-MM-dd");
        label = d.toLocaleDateString(isEn ? "en-US" : "fa-IR", { weekday: "long", month: "short", day: "numeric" });
      }
      if (!groups.has(key)) groups.set(key, { key, label, tasks: [] });
      groups.get(key)!.tasks.push(task);
    }
    // Preserve Overdue -> Today -> Tomorrow -> chronological day order
    const orderedKeys: string[] = [];
    if (groups.has("overdue")) orderedKeys.push("overdue");
    if (groups.has("today")) orderedKeys.push("today");
    if (groups.has("tomorrow")) orderedKeys.push("tomorrow");
    [...groups.keys()]
      .filter(k => !["overdue", "today", "tomorrow"].includes(k))
      .sort()
      .forEach(k => orderedKeys.push(k));
    return orderedKeys.map(k => groups.get(k)!);
  }, [topLevel, scope, isEn, T]);

  const completeTaskCore = async (t: Task, outcome: TaskOutcome | null, isOwner: boolean) => {
    const patch = { completed: true, status: "done" as const, completed_at: new Date().toISOString() };
    if (isOwner) setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } as Task : x));
    if (!t.completed) awardWaterDrops(10, "تکمیل تسک");

    // Keep the completed task visible (with strikethrough) for a few seconds
    const until = Date.now() + GRACE_MS;
    setGraceMap(prev => ({ ...prev, [t.id]: until }));
    window.setTimeout(() => {
      setGraceMap(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    }, GRACE_MS);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: t.id } });
      toast.info(T("تغییر ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Saved locally — will sync when online"));
      return;
    }

    if (user) {
      await saveTask(user.id, { id: t.id, ...patch });
    }
    try {
      await firebaseStore.from("tasks").update(patch).eq("id", t.id);
    } catch {}
    if (!isOwner) setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } as Task : x));
    if (user) await logTaskActivity(t.id, user.id, "completed", { ...patch, outcome_id: outcome?.id } as Record<string, unknown>);
  };

  const completeTask = async (t: Task, outcome: TaskOutcome | null = null) => {
    const isOwner = t.user_id === user?.id;

    if (outcome && user) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.info(T("اتصال اینترنت برای اجرای سناریو لازم است", "Internet connection required to run outcome scenario"));
      } else {
        try {
          await executeTaskOutcome(outcome, user.id, t);
          toast.success(`${outcome.actions.length} ${T("تسک ساخته شد", "follow-up tasks created")}`);
        } catch (e: any) {
          toast.error(e.message || T("خطا در ساخت تسک‌ها", "Error creating tasks"));
          return;
        }
      }
    }

    await completeTaskCore(t, outcome, isOwner);
  };

  const reopenTask = async (t: Task) => {
    const isOwner = t.user_id === user?.id;
    const patch = { completed: false, status: "todo" as const, completed_at: null as string | null };
    if (isOwner) setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } as Task : x));
    // Cancel any pending grace for this task
    setGraceMap(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    setGraceTasks(prev => { const n = { ...prev }; delete n[t.id]; return n; });

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: t.id } });
      toast.info(T("تغییر ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Saved locally — will sync when online"));
      return;
    }

    if (user) {
      await saveTask(user.id, { id: t.id, ...patch });
    }
    try {
      await firebaseStore.from("tasks").update(patch).eq("id", t.id);
    } catch {}
    if (!isOwner) setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } as Task : x));
    if (user) await logTaskActivity(t.id, user.id, "reopened", patch as Record<string, unknown>);
  };

  const toggleTask = async (t: Task) => {
    const newCompleted = !t.completed;

    if (!newCompleted) {
      await reopenTask(t);
      return;
    }

    if (t.recurrence_rule && user) {
      const now = new Date();
      let next = nextOccurrence(t.recurrence_rule, t.due_date ? new Date(t.due_date) : now);
      let guard = 0;
      while (next && next < now && guard < 500) {
        const advanced = nextOccurrence(t.recurrence_rule, next);
        if (!advanced || advanced <= next) break;
        next = advanced;
        guard++;
      }
      if (next) {
        let nextReminderIso: string | null = null;
        if (t.reminder_at && t.due_date) {
          const delta = next.getTime() - new Date(t.due_date).getTime();
          nextReminderIso = new Date(new Date(t.reminder_at).getTime() + delta).toISOString();
        } else if (t.reminder_at) {
          nextReminderIso = next.toISOString();
        }
        const patch: any = {
          due_date: next.toISOString(),
          reminder_at: nextReminderIso,
          completed: false,
          completed_at: null,
        };
        if (t.user_id === user?.id) setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x));

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: t.id } });
          toast.info(T("تغییر ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Saved locally — will sync when online"));
          return;
        }

        const { error } = await firebaseStore.from("tasks").update(patch).eq("id", t.id);
        if (error) { toast.error(error.message); return; }
        if (t.user_id !== user?.id) setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x));
        toast.success(T(`نمونه بعدی به ${format(next, "yyyy-MM-dd HH:mm")} منتقل شد 🔁`, `Next instance moved to ${format(next, "yyyy-MM-dd HH:mm")} 🔁`));
        return;
      }
    }

    try {
      const outs = await listTaskOutcomes(t.id);
      if (outs.length > 0) {
        setOutcomeTask(t);
        setOutcomes(outs);
        setOutcomeOpen(true);
        return;
      }
    } catch (e) {
      // No outcomes or network error; proceed to normal completion.
    }

    await completeTask(t);
  };

  const delTask = async (id: string) => {
    const target = effectiveAllTasks.find(t => t.id === id);
    if (target && target.user_id !== user?.id) { toast(T("فقط صاحب تسک می‌تواند حذف کند", "Only the task owner can delete")); return; }
    // snapshot task + descendants + tag links for undo
    const ids = collectTaskDescendantIds(id, childrenMap);
    const snaps = allTasks.filter(t => ids.includes(t.id));
    const until = Date.now() + GRACE_MS;
    // Keep deleted task(s) visible with strikethrough for a short grace period
    const ghosts: Record<string, Task & { _graceUntil: number }> = {};
    for (const s of snaps) {
      ghosts[s.id] = { ...s, completed: true, status: "done" as TaskStatus, _graceUntil: until };
    }
    let tagLinks: Record<string, unknown>[] | null = null;
    if (typeof navigator === "undefined" || navigator.onLine) {
      const { data } = await firebaseStore.from("task_tags").select("*").in("task_id", ids);
      tagLinks = (data as Record<string, unknown>[] | null) || null;
    }
    setAllTasks(prev => prev.filter(t => !ids.includes(t.id)));
    setGraceTasks(prev => ({ ...prev, ...ghosts }));
    setGraceMap(prev => ({ ...prev, ...Object.fromEntries(ids.map(i => [i, until])) }));
    window.setTimeout(() => {
      setGraceTasks(prev => { const n = { ...prev }; ids.forEach(i => delete n[i]); return n; });
      setGraceMap(prev => { const n = { ...prev }; ids.forEach(i => delete n[i]); return n; });
    }, GRACE_MS);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "tasks", op: "delete", match: { id } });
      toast.info(T("حذف ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Delete saved locally — will sync when online"));
      return;
    }

    if (user) {
      await removeTask(user.id, id);
    }
    try {
      await firebaseStore.from("tasks").delete().eq("id", id);
    } catch {}
    const title = snaps.find(s => s.id === id)?.title || "";
    const restore = async () => {
      await firebaseStore.from("tasks").insert(snaps as never);
      if (tagLinks?.length) await firebaseStore.from("task_tags").insert(tagLinks as never);
      load();
    };
    pushUndo({ label: T(`تسک «${title}» حذف شد`, `Task "${title}" deleted`), undo: restore });
    pushDeleted({ kind: "task", label: title, restore });
  };

  const askDeleteTask = (t: Task) => {
    if (t.user_id !== user?.id) { toast(T("فقط صاحب تسک می‌تواند حذف کند", "Only the task owner can delete")); return; }
    const childCount = (childrenMap[t.id] || []).length;
    setConfirm({
      kind: "task",
      id: t.id,
      title: t.title,
      onConfirm: async () => { await delTask(t.id); },
    });
    // include child count info via title hack (handled in dialog body)
    (window as any).__lastChildCount = childCount;
  };

  // Compute progress including nested descendants.
  const getProgress = (id: string): { done: number; total: number } =>
    getTaskProgress(id, childrenMap);

  // Drag & drop: drop a task onto another → set as child; drop in same parent zone → reorder
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    // Date-grouped views (Today/Next7) sort tasks by due date; manual reorder is disabled there.
    if (scope === "today" || scope === "next7") return;
    const { active, over, delta } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeTask = effectiveAllTasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Helper: when promoting a task to top-level, also fill scope-defining fields
    // so it doesn't disappear from the current view.
    const scopeRootPatch = (): Record<string, any> => {
      const sc = scope as string;
      const patch: Record<string, any> = { parent_id: null };
      const today = startOfDay(new Date()).toISOString();
      const tomorrowIso = addDays(new Date(), 1).toISOString();
      if (sc === "today") patch.due_date = today;
      else if (sc === "tomorrow") patch.due_date = tomorrowIso;
      else if (sc === "next7" && !activeTask.due_date) patch.due_date = tomorrowIso;
      else if (sc === "folder") patch.folder_id = params.id || null;
      return patch;
    };

    if (overId.startsWith("child:")) {
      const newParent = overId.slice(6);
      if (newParent === activeId) return;
      // prevent cycles
      let p: string | null = newParent;
      while (p) {
        if (p === activeId) { toast.error(T("نمی‌توان داخل خودش انداخت", "Cannot move a task into itself")); return; }
        const pt = effectiveAllTasks.find(x => x.id === p);
        p = pt?.parent_id || null;
      }
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, parent_id: newParent } : t));
      setExpanded(s => ({ ...s, [newParent]: true }));
      const { error } = await firebaseStore.from("tasks").update({ parent_id: newParent }).eq("id", activeId);
      if (error) toast.error(error.message);
      return;
    }
    if (overId === "root") {
      const patch = scopeRootPatch();
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, ...patch } as Task : t));
      const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", activeId);
      if (error) toast.error(error.message);
      return;
    }
    // Dropped on another task row
    const overTask = effectiveAllTasks.find(t => t.id === overId);
    if (!overTask) return;

    // TickTick-style: if user dragged horizontally significantly, treat as INDENT
    // (make active a subtask of over) instead of reorder.
    const HORIZONTAL_INDENT = 40;
    if (delta && Math.abs(delta.x) > HORIZONTAL_INDENT && Math.abs(delta.x) > Math.abs(delta.y)) {
      // prevent cycles
      let p: string | null = overId;
      while (p) {
        if (p === activeId) { toast.error(T("نمی‌توان داخل خودش انداخت", "Cannot move a task into itself")); return; }
        const pt = effectiveAllTasks.find(x => x.id === p);
        p = pt?.parent_id || null;
      }
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, parent_id: overId } : t));
      setExpanded(s => ({ ...s, [overId]: true }));
      const { error } = await firebaseStore.from("tasks").update({ parent_id: overId }).eq("id", activeId);
      if (error) toast.error(error.message);
      return;
    }

    // Otherwise: reorder among siblings (or move to over's parent if different)
    const siblings = overTask.parent_id
      ? (childrenMap[overTask.parent_id] || [])
      : topLevel;
    const fromIdx = siblings.findIndex(s => s.id === activeId);
    const toIdx = siblings.findIndex(s => s.id === overId);
    if (activeTask.parent_id !== overTask.parent_id) {
      // Moving across parents. If target is top-level (no parent), inherit scope.
      const patch: Record<string, any> = overTask.parent_id
        ? { parent_id: overTask.parent_id }
        : scopeRootPatch();
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, ...patch } as Task : t));
      await firebaseStore.from("tasks").update(patch as any).eq("id", activeId);
      return;
    }
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = arrayMove(siblings, fromIdx, toIdx);
    const updates = reordered.map((s, i) =>
      firebaseStore.from("tasks").update({ position: i }).eq("id", s.id)
    );
    setAllTasks(prev => {
      const map = new Map(reordered.map((s, i) => [s.id, i]));
      return [...prev].sort((a, b) => {
        const ai = map.get(a.id); const bi = map.get(b.id);
        if (ai !== undefined && bi !== undefined) return ai - bi;
        return 0;
      }).map(t => map.has(t.id) ? { ...t, position: map.get(t.id)! } : t);
    });
    await Promise.all(updates);
  };

  const moveSibling = async (t: Task, dir: -1 | 1) => {
    const siblings = t.parent_id ? (childrenMap[t.parent_id] || []) : topLevel;
    const idx = siblings.findIndex(s => s.id === t.id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= siblings.length) return;
    const reordered = arrayMove(siblings, idx, newIdx);
    const map = new Map(reordered.map((s, i) => [s.id, i]));
    setAllTasks(prev => prev.map(x => map.has(x.id) ? { ...x, position: map.get(x.id)! } : x));
    await Promise.all(reordered.map((s, i) =>
      firebaseStore.from("tasks").update({ position: i }).eq("id", s.id)
    ));
  };

  const renderTaskItem = (t: Task, depth = 0) => (
    <TaskListItem
      key={t.id}
      t={t}
      depth={depth}
      subs={childrenMap[t.id] || []}
      open={!!expanded[t.id]}
      onToggleExpand={(id) => setExpanded(s => ({ ...s, [id]: !s[id] }))}
      progress={getProgress(t.id)}
      parent={t.parent_id ? taskMap.get(t.parent_id) : null}
      onSelectTask={(task) => { setSelectedTaskHistory([]); setSelectedTask(task); }}
      onToggleTask={toggleTask}
      onActionTask={setActionTask}
      onDeleteTask={askDeleteTask}
      onPatchTask={patchTask}
      onMoveTask={setMoveTask}
      userId={user?.id}
      isSelected={selectedTask?.id === t.id}
      splitView={splitView}
      layout={layout}
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


  const listView = (
    <PullToRefresh onRefresh={load}>
      {/* On desktop: clean inline quick add task */}
      <div className="mb-4 hidden md:block">
        <QuickAddTask
          defaults={{
            folder_id: scope === "folder" ? params.id || null : null,
            due_date: scope === "today"
              ? new Date().toISOString()
              : scope === "next7"
                ? addDays(new Date(), 1).toISOString()
                : null,
            tag_id: scope === "tag" ? params.id || null : null,
          }}
          chipsTrailing={
            <div className="flex items-center gap-1.5">
              <TaskFilterSheet filters={filters} onChange={setFilters} />
              <Button
                variant={splitView ? "secondary" : "outline"}
                size="sm"
                onClick={toggleSplitView}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-lg border border-border/60 font-medium transition-colors"
                title={splitView ? T("حالت تمام‌صفحه", "Full width") : T("نمای دوپنله (نیمه چپ)", "Split view (left panel)")}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>{splitView ? T("نمای دوپنله", "Split view") : T("تمام‌صفحه", "Full width")}</span>
              </Button>
            </div>
          }
          onCreated={() => load()}
        />
      </div>

      {/* On mobile / foldable: clean minimal bar with split view toggle + filter button */}
      <div className="flex items-center justify-between mb-2 md:hidden">
        <span className="text-xs font-medium text-muted-foreground">
          {folderTopLevel.length > 0 ? `${folderTopLevel.length} ${T("تسک", "tasks")}` : ""}
        </span>
        <div className="ms-auto flex items-center gap-1.5">
          <Button
            variant={splitView ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSplitView}
            className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-lg border border-border/60 font-medium transition-colors"
            title={splitView ? T("حالت تمام‌صفحه", "Full width") : T("نمای دوپنله (نیمه چپ)", "Split view (left panel)")}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">{splitView ? T("دوپنله", "Split") : T("تک‌پنله", "Single")}</span>
          </Button>
          <TaskFilterSheet filters={filters} onChange={setFilters} />
        </div>
      </div>


      {(() => {
        const isEmpty = groupedTasks ? groupedTasks.length === 0 : folderTopLevel.length === 0;
        const sortableItems = groupedTasks
          ? groupedTasks.flatMap(g => g.tasks.map(t => t.id))
          : folderTopLevel.map(t => t.id);
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <div className="space-y-1 mt-1">
              {isEmpty && (
                <EmptyState
                  icon={CheckSquare}
                  title={
                    scope === "today"
                      ? T("همه کارهای امروز انجام شده یا هنوز تسکی ثبت نشده!", "All tasks for today completed or none yet!")
                      : T("هیچ تسکی در این لیست نیست", "No tasks in this list")
                  }
                  description={
                    scope === "today"
                      ? T("می‌تونی یک تسک جدید اضافه کنی و روزت رو با انگیزه برنامه‌ریزی کنی ✨", "You can add a new task and plan your day with intention ✨")
                      : T("برای شروع، یک تسک جدید ثبت کن تا کارهات رو منظم دنبال کنی.", "Add a task to start tracking your progress.")
                  }
                  action={{
                    label: T("افزودن تسک جدید", "Add new task"),
                    icon: Plus,
                    onClick: () => {
                      window.dispatchEvent(new Event("lov:open-quick-capture"));
                    },
                  }}
                  className="my-3"
                />
              )}
              <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                {groupedTasks ? (
                  <div className="space-y-3">
                    {groupedTasks.map(group => (
                      <div key={group.key}>
                        <div className="sticky top-0 z-[5] bg-background/95 backdrop-blur py-1 px-1 text-sm font-semibold text-foreground/80 flex items-center justify-between">
                          <span>{group.label}</span>
                          <span className="text-xs text-muted-foreground font-normal">{group.tasks.length}</span>
                        </div>
                        <div className="space-y-1">
                          {group.tasks.map(t => renderTaskItem(t))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <VirtualTaskList
                    itemIds={folderTopLevel.map(t => t.id)}
                    renderItem={(id) => {
                      const t = taskMap.get(id);
                      if (!t) return null;
                      return renderTaskItem(t);
                    }}
                  />
                )}
              </SortableContext>
            </div>
            <DragOverlay>
              {activeDragId ? (
                <Card className="p-3 shadow-lg opacity-90">
                  <p className="text-sm font-medium">
                    {effectiveAllTasks.find(x => x.id === activeDragId)?.title || "..."}
                  </p>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        );
      })()}
    </PullToRefresh>
  );

  const updateFolderPrefs = (patch: Partial<FolderPrefs>) => {
    if (!params.id) return;
    const next = { ...folderPrefs, ...patch };
    setFolderPrefs(next);
    saveFolderPrefs(params.id, next, user?.id);
  };

  return (
    <div
      className={`p-2 sm:p-3 md:p-4 lg:px-5 xl:px-7 lg:py-5 w-full mx-auto relative${isFolder ? " min-h-screen" : ""}`}
      style={isFolder ? {
        backgroundColor: folderPrefs.bgColor ?? undefined,
        backgroundImage: folderPrefs.bgImage ?? undefined,
        backgroundSize: folderPrefs.bgImage ? "cover" : undefined,
        backgroundAttachment: folderPrefs.bgImage ? "fixed" : undefined,
      } : undefined}
    >
      {isFolder && folderPrefs.bgImage && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] pointer-events-none" />
      )}
      <div className="relative z-10">
        <HeaderTitlePortal title={title} />
        {isFolder && (
          <div className="flex items-center justify-between gap-2 mb-4">
            <h1 className="text-lg md:text-xl font-black text-foreground truncate">{folderName || title}</h1>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={T("تنظیمات فولدر", "Folder settings")}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="w-60 text-xs p-1.5 space-y-1">
                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                  {T("نمای فولدر", "Folder View")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={folderPrefs.view}
                  onValueChange={(value) => updateFolderPrefs({ view: value as FolderPrefs["view"] })}
                >
                  <DropdownMenuRadioItem value="list" className="rounded-lg cursor-pointer">
                    📋 {T("لیست تسک‌ها", "Task List")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="kanban-stream" className="rounded-lg cursor-pointer">
                    🎯 {T("اهداف و کانبان", "Goals & Kanban")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="kanban-columns" className="rounded-lg cursor-pointer">
                    🧱 {T("برد ستونی", "Columns Board")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                  {T("ترتیب نمایش", "Sort Order")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={folderPrefs.sortOrder}
                  onValueChange={(value) => updateFolderPrefs({ sortOrder: value as FolderPrefs["sortOrder"] })}
                >
                  <DropdownMenuRadioItem value="manual" className="rounded-lg cursor-pointer">{T("دستی", "Manual")}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="priority" className="rounded-lg cursor-pointer">{T("بر اساس اولویت", "By Priority")}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="due_date" className="rounded-lg cursor-pointer">{T("بر اساس سررسید", "By Due Date")}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="alphabetical" className="rounded-lg cursor-pointer">{T("الفبایی", "Alphabetical")}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                  {T("رنگ پس‌زمینه", "Background Color")}
                </DropdownMenuLabel>
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                  {FOLDER_BG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={color.label}
                      aria-label={color.label}
                      onClick={() => updateFolderPrefs({ bgColor: color.value })}
                      className={`h-6 w-6 rounded-full border border-border/60 transition-transform hover:scale-110 ${
                        folderPrefs.bgColor === color.value ? "ring-2 ring-primary ring-offset-1" : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                  <button
                    type="button"
                    title={T("بدون رنگ", "No color")}
                    aria-label={T("بدون رنگ", "No color")}
                    onClick={() => updateFolderPrefs({ bgColor: null })}
                    className={`h-6 w-6 rounded-full border border-border/60 bg-background text-[10px] ${
                      folderPrefs.bgColor === null ? "ring-2 ring-primary ring-offset-1" : ""
                    }`}
                  >
                    ×
                  </button>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => setDelFolderOpen(true)} className="text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5 ms-1" /> {T("حذف فولدر", "Delete Folder")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div
          data-task-split={isSplitActive ? "true" : "false"}
          dir="ltr"
          className={`w-full items-start gap-3 sm:gap-4 xl:gap-5 ${
            isSplitActive
              ? "grid grid-cols-[minmax(280px,0.85fr)_minmax(320px,1.15fr)] lg:grid-cols-[minmax(340px,0.78fr)_minmax(460px,1.22fr)] 2xl:grid-cols-[minmax(400px,0.82fr)_minmax(640px,1.3fr)]"
              : "flex flex-col"
          }`}
        >
          {/* Explicit LTR grid placement keeps the inspector on the physical left:
              sidebar/folders live on the right, the list remains central/right. */}
          {isSplitActive && (
            <aside
              dir={isEn ? "ltr" : "rtl"}
              className="col-start-1 w-full min-w-0 sticky top-[3.75rem] sm:top-[4.25rem] h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.5rem)] overflow-hidden transition-all duration-200"
            >
              {selectedTask ? (
                <TaskDetail
                  key={selectedTask.id}
                  task={selectedTask}
                  mode="embedded"
                  onClose={() => {
                    if (selectedTaskHistory.length > 0) {
                      handleBackInDrawer();
                    } else {
                      setSelectedTask(null);
                    }
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

          <section
            dir={isEn ? "ltr" : "rtl"}
            className={`w-full min-w-0 rounded-2xl border border-border/60 bg-card/35 p-2 sm:p-3 lg:p-4 shadow-sm ${
              isSplitActive ? "col-start-2" : ""
            }`}
          >
            {isFolder ? (
              folderPrefs.view === "list" ? (
                listView
              ) : (
                <FolderKanban
                  folderId={params.id!}
                  layout={folderPrefs.view === "kanban-columns" ? "columns" : "stream"}
                  sortOrder={folderPrefs.sortOrder}
                  onOpenTask={(id) => {
                    const found = effectiveAllTasks.find(x => x.id === id);
                    if (found && isSplitActive) setSelectedTask(found);
                    else navigate(`/app/tasks/${id}`);
                  }}
                />
              )
            ) : (
              listView
            )}
          </section>

        </div>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "task" ? T("حذف تسک؟", "Delete task?") : confirm?.kind === "note" ? T("حذف نوت؟", "Delete note?") : T("حذف زیرتسک؟", "Delete subtask?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {T(`آیا مطمئنی می‌خوای «${confirm?.title || T("این مورد", "this item")}» را حذف کنی؟`, `Are you sure you want to delete "${confirm?.title || T("این مورد", "this item")}"?`)}
              {confirm?.kind === "task" && (window as any).__lastChildCount > 0 && (
                <span className="block mt-2 text-destructive">⚠️ {T(`${(window as any).__lastChildCount} زیرتسک هم با این تسک حذف می‌شود.`, `${(window as any).__lastChildCount} subtask(s) will also be deleted.`)}</span>
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

      {makeChildOf && (
        <MakeChildDialog
          open={!!makeChildOf}
          onOpenChange={(v) => !v && setMakeChildOf(null)}
          task={makeChildOf}
          allTasks={effectiveAllTasks}
          onDone={(newParentId) => {
            setAllTasks(prev => prev.map(x => x.id === makeChildOf!.id ? { ...x, parent_id: newParentId } : x));
            if (newParentId) setExpanded(s => ({ ...s, [newParentId]: true }));
          }}
        />
      )}

      {isFolder && delFolderOpen && (
        <FolderDeleteDialog
          open={delFolderOpen}
          onOpenChange={setDelFolderOpen}
          folderId={params.id!}
          folderName={folderName}
          onDone={() => { setDelFolderOpen(false); navigate("/app/inbox"); }}
        />
      )}

      {selectedTask && !isSplitActive && (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          mode="drawer"
          onClose={() => {
            if (selectedTaskHistory.length > 0) {
              handleBackInDrawer();
            } else {
              setSelectedTask(null);
            }
          }}
          onChanged={load}
          setConfirm={setConfirm}
          allowDelete
          onOpenParentTask={handleOpenParentInDrawer}
          onBack={selectedTaskHistory.length > 0 ? handleBackInDrawer : undefined}
          hasBackHistory={selectedTaskHistory.length > 0}
        />
      )}

      <TaskActionSheet
        task={actionTask}
        onOpenChange={(v) => !v && setActionTask(null)}
        onComplete={() => actionTask && toggleTask(actionTask)}
        onDelete={() => actionTask && askDeleteTask(actionTask)}
        onMove={() => actionTask && setMoveTask(actionTask)}
        onMakeChild={() => actionTask && setMakeChildOf(actionTask)}
        onPatch={(patch) => actionTask && patchTask(actionTask.id, patch)}
        onPomodoro={() => actionTask && setPomoTask(actionTask)}
        onEdit={() => actionTask && setSelectedTask(actionTask)}
        onRefresh={load}
      />

      <PomodoroSheet
        task={pomoTask}
        open={!!pomoTask}
        onOpenChange={(v) => !v && setPomoTask(null)}
      />

      <OutcomePicker
        outcomes={outcomes}
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
        onSelect={(outcome) => {
          setOutcomeOpen(false);
          if (outcomeTask) {
            if (outcome) completeTask(outcomeTask, outcome);
            else completeTask(outcomeTask);
          }
        }}
      />
      </div>
    </div>
  );
}
