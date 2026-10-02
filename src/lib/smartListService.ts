import { useEffect, useState } from "react";
import type { Task } from "@/lib/taskTypes";
import { PRIORITY_META } from "@/lib/priority";
import { taskDueTimestamp } from "@/lib/taskDate";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { isTaskOverdue } from "@/lib/taskPlanning";
import { getTimeSettings } from "@/lib/timeHorizon";
import type { GoalKanban } from "@/lib/kanbanGoals";

export type SortKey = "due" | "priority" | "created" | "title" | "time_bucket" | "goal";
export type SortDir = "asc" | "desc";
export type SortLevel = { key: SortKey; dir: SortDir };

export type DueWindow = "overdue" | "today" | "tomorrow" | "this_week" | "next_7_days" | "no_date" | "has_date";
export type TimeHorizonFilter = "day" | "week" | "month" | "quarter" | "year" | "none";

export type TaskFilters = {
  folder_ids: string[];
  tag_ids: string[];
  priorities: string[]; // none|low|medium|high|urgent
  goal_ids: string[];
  time_horizons: string[]; // day|week|month|quarter|year|none
  due_windows: string[]; // overdue|today|tomorrow|this_week|next_7_days|no_date|has_date
  show_completed: boolean;
  // Two-level sort: primary then secondary
  sort_primary: SortLevel;
  sort_secondary: SortLevel;
  sort?: "priority" | "due_asc" | "due_desc" | "created_desc" | "alpha";
};

export const DEFAULT_FILTERS: TaskFilters = {
  folder_ids: [],
  tag_ids: [],
  priorities: [],
  goal_ids: [],
  time_horizons: [],
  due_windows: [],
  show_completed: true,
  sort_primary: { key: "due", dir: "asc" },
  sort_secondary: { key: "priority", dir: "asc" },
  sort: "priority",
};

export const PROFILES_KEY = "task_filter_profiles_v1";
export const PROFILES_CHANGED_EVENT = "arshnaz:smart-list-profiles-changed";

export type SmartListProfile = {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  color?: string;
  filters: TaskFilters;
  isPreset?: boolean;
};

export const PRESET_SMART_PROFILES: SmartListProfile[] = [
  {
    id: "preset-high-priority",
    name: "⭐️ اولویت بالا و فوری",
    nameEn: "⭐️ High & Urgent",
    icon: "⭐️",
    color: "#ef4444",
    isPreset: true,
    filters: {
      ...DEFAULT_FILTERS,
      priorities: ["urgent", "high"],
      sort_primary: { key: "priority", dir: "asc" },
      sort_secondary: { key: "due", dir: "asc" },
    },
  },
  {
    id: "preset-goals",
    name: "🎯 متمرکز بر اهداف",
    nameEn: "🎯 Goal-Focused",
    icon: "🎯",
    color: "#e11d48",
    isPreset: true,
    filters: {
      ...DEFAULT_FILTERS,
      goal_ids: ["__all_goals__"],
      sort_primary: { key: "goal", dir: "asc" },
      sort_secondary: { key: "priority", dir: "asc" },
    },
  },
  {
    id: "preset-due-soon",
    name: "⏳ عقب‌افتاده و امروز",
    nameEn: "⏳ Due Soon & Overdue",
    icon: "⏳",
    color: "#f59e0b",
    isPreset: true,
    filters: {
      ...DEFAULT_FILTERS,
      due_windows: ["overdue", "today"],
      sort_primary: { key: "due", dir: "asc" },
      sort_secondary: { key: "priority", dir: "asc" },
    },
  },
  {
    id: "preset-buckets",
    name: "🗓️ افق‌های هفتگی و ماهانه",
    nameEn: "🗓️ Week & Month Horizons",
    icon: "🗓️",
    color: "#3b82f6",
    isPreset: true,
    filters: {
      ...DEFAULT_FILTERS,
      time_horizons: ["week", "month"],
      sort_primary: { key: "time_bucket", dir: "asc" },
      sort_secondary: { key: "due", dir: "asc" },
    },
  },
  {
    id: "preset-inbox",
    name: "📥 اینباکس (بدون فولدر)",
    nameEn: "📥 Inbox (No Folder)",
    icon: "📥",
    color: "#6b7280",
    isPreset: true,
    filters: {
      ...DEFAULT_FILTERS,
      folder_ids: ["__none__"],
      sort_primary: { key: "created", dir: "desc" },
      sort_secondary: { key: "priority", dir: "asc" },
    },
  },
];

export function loadSmartListProfiles(): SmartListProfile[] {
  try {
    if (typeof localStorage === "undefined") return PRESET_SMART_PROFILES;
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return PRESET_SMART_PROFILES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return PRESET_SMART_PROFILES;

    // Support legacy profile schema { name: string, filters: TaskFilters }
    const normalized: SmartListProfile[] = parsed.map((p, idx) => {
      const id = p.id || `profile-${idx}-${p.name}`;
      const filters: TaskFilters = {
        ...DEFAULT_FILTERS,
        ...p.filters,
        folder_ids: p.filters?.folder_ids || [],
        tag_ids: p.filters?.tag_ids || [],
        priorities: p.filters?.priorities || [],
        goal_ids: p.filters?.goal_ids || [],
        time_horizons: p.filters?.time_horizons || [],
        due_windows: p.filters?.due_windows || [],
        sort_primary: p.filters?.sort_primary || DEFAULT_FILTERS.sort_primary,
        sort_secondary: p.filters?.sort_secondary || DEFAULT_FILTERS.sort_secondary,
      };
      return {
        id,
        name: p.name,
        icon: p.icon || "📋",
        color: p.color,
        filters,
        isPreset: Boolean(p.isPreset),
      };
    });

    return normalized;
  } catch {
    return PRESET_SMART_PROFILES;
  }
}

export function saveSmartListProfiles(list: SmartListProfile[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
    }
  } catch {
    void 0;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILES_CHANGED_EVENT));
  }
}

export function useSmartListProfiles(): [SmartListProfile[], (next: SmartListProfile[]) => void] {
  const [profiles, setProfiles] = useState<SmartListProfile[]>(loadSmartListProfiles);

  useEffect(() => {
    const sync = () => setProfiles(loadSmartListProfiles());
    window.addEventListener(PROFILES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (next: SmartListProfile[]) => {
    saveSmartListProfiles(next);
    setProfiles(next);
  };

  return [profiles, update];
}

export const SORT_KEYS: SortKey[] = ["due", "priority", "created", "title", "time_bucket", "goal"];

export const SORT_LABELS: Record<SortKey, { fa: string; en: string }> = {
  due: { fa: "سررسید", en: "Due Date" },
  priority: { fa: "اهمیت و اولویت", en: "Priority" },
  created: { fa: "تاریخ ساخت", en: "Created Date" },
  title: { fa: "عنوان الفبایی", en: "Title" },
  time_bucket: { fa: "بازه زمانی", en: "Time Bucket" },
  goal: { fa: "هدف کانبان", en: "Kanban Goal" },
};

export const TIME_HORIZON_OPTIONS: { id: TimeHorizonFilter; fa: string; en: string; icon: string }[] = [
  { id: "day", fa: "روزانه", en: "Day", icon: "☀️" },
  { id: "week", fa: "هفتگی", en: "Week", icon: "🗓️" },
  { id: "month", fa: "ماهانه", en: "Month", icon: "📅" },
  { id: "quarter", fa: "فصلی", en: "Quarter", icon: "🍂" },
  { id: "year", fa: "سالانه", en: "Year", icon: "🎯" },
  { id: "none", fa: "بدون بازه زمانی", en: "No Horizon", icon: "⚪" },
];

export const DUE_WINDOW_OPTIONS: { id: DueWindow; fa: string; en: string; icon: string }[] = [
  { id: "overdue", fa: "عقب‌افتاده", en: "Overdue", icon: "⚠️" },
  { id: "today", fa: "امروز", en: "Today", icon: "📍" },
  { id: "tomorrow", fa: "فردا", en: "Tomorrow", icon: "🌅" },
  { id: "this_week", fa: "این هفته", en: "This Week", icon: "📆" },
  { id: "next_7_days", fa: "۷ روز آینده", en: "Next 7 Days", icon: "🔮" },
  { id: "has_date", fa: "دارای سررسید", en: "Has Date", icon: "🗓️" },
  { id: "no_date", fa: "بدون سررسید", en: "No Due Date", icon: "⏳" },
];

export function doesTaskMatchTimeFilters(
  t: Task,
  dueWindows: string[] = [],
  timeHorizons: string[] = []
): boolean {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();
  const tomorrowStart = startOfDay(addDays(now, 1)).getTime();
  const tomorrowEnd = endOfDay(addDays(now, 1)).getTime();
  const next7End = endOfDay(addDays(now, 7)).getTime();
  const dayOfWeek = now.getDay();
  // Saturday is start in Iran/Solar, Sunday in Western, give a broad 7-day end
  const thisWeekEnd = endOfDay(addDays(now, Math.max(1, 7 - dayOfWeek))).getTime();

  // 1. Time Horizon filter (day, week, month, quarter, year, none)
  if (timeHorizons && timeHorizons.length > 0) {
    const taskHorizon = t.planning_horizon || t.horizon || t.bucket_kind || null;
    let horizonMatched = false;
    for (const h of timeHorizons) {
      if (h === "none" && !taskHorizon) {
        horizonMatched = true;
        break;
      }
      if (h === taskHorizon) {
        horizonMatched = true;
        break;
      }
    }
    if (!horizonMatched) return false;
  }

  // 2. Due window filter
  if (dueWindows && dueWindows.length > 0) {
    const rawDue = t.due_date || t.due_at || null;
    const dueTime = rawDue ? taskDueTimestamp(rawDue) : null;
    const overdue = dueWindows.includes("overdue") && isTaskOverdue(t, getTimeSettings(), now);

    let windowMatched = false;
    for (const w of dueWindows) {
      if (w === "overdue" && overdue) {
        windowMatched = true;
        break;
      }
      if (w === "no_date" && !dueTime) {
        windowMatched = true;
        break;
      }
      if (w === "has_date" && dueTime) {
        windowMatched = true;
        break;
      }
      if (dueTime) {
        if (w === "today" && dueTime >= todayStart && dueTime <= todayEnd) {
          windowMatched = true;
          break;
        }
        if (w === "tomorrow" && dueTime >= tomorrowStart && dueTime <= tomorrowEnd) {
          windowMatched = true;
          break;
        }
        if (w === "this_week" && dueTime >= todayStart && dueTime <= thisWeekEnd) {
          windowMatched = true;
          break;
        }
        if (w === "next_7_days" && dueTime >= todayStart && dueTime <= next7End) {
          windowMatched = true;
          break;
        }
      }
    }
    if (!windowMatched) return false;
  }

  return true;
}

export function doesTaskMatchGoalFilter(
  t: Task,
  goalIds: string[] = [],
  goals: GoalKanban[] = []
): boolean {
  if (!goalIds || goalIds.length === 0) return true;
  const allowNoGoal = goalIds.includes("__none__");
  const allowAllGoals = goalIds.includes("__all_goals__");
  const actualGoalIds = goalIds.filter((id) => id !== "__none__" && id !== "__all_goals__");

  const hasGoal = Boolean(t.kanban_column_id);
  const matchesNoGoal = allowNoGoal && !hasGoal;
  const matchesAll = allowAllGoals && hasGoal;

  let matchesSpecific = false;
  if (hasGoal && actualGoalIds.length > 0) {
    const matchingIds = new Set<string>(actualGoalIds);
    for (const g of goals) {
      if (g.parentId && actualGoalIds.includes(g.parentId)) {
        matchingIds.add(g.id);
      }
    }
    matchesSpecific = matchingIds.has(t.kanban_column_id!);
  }

  return matchesNoGoal || matchesAll || matchesSpecific;
}

export function cmpForSortLevel(lvl: SortLevel): (a: Task, b: Task) => number {
  return (a: Task, b: Task): number => {
    let res = 0;
    switch (lvl.key) {
      case "due": {
        const av = a.due_date ? taskDueTimestamp(a.due_date) : Infinity;
        const bv = b.due_date ? taskDueTimestamp(b.due_date) : Infinity;
        res = av - bv;
        break;
      }
      case "priority":
        res = (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
        break;
      case "created":
        res =
          new Date((a as any).created_at || 0).getTime() -
          new Date((b as any).created_at || 0).getTime();
        break;
      case "title":
        res = (a.title || "").localeCompare(b.title || "", "fa");
        break;
      case "time_bucket": {
        const order: Record<string, number> = { day: 1, week: 2, month: 3, quarter: 4, year: 5 };
        const aH = a.horizon || a.bucket_kind || "";
        const bH = b.horizon || b.bucket_kind || "";
        const aVal = order[aH] ?? 99;
        const bVal = order[bH] ?? 99;
        res = aVal - bVal;
        break;
      }
      case "goal": {
        const aG = a.kanban_column_id || "zzz";
        const bG = b.kanban_column_id || "zzz";
        res = aG.localeCompare(bG, "fa");
        break;
      }
    }
    return lvl.dir === "desc" ? -res : res;
  };
}

export function filterAndSortTasks(
  tasks: Task[],
  filters: TaskFilters,
  taskTagsMap: Record<string, string[]> = {},
  goals: GoalKanban[] = []
): Task[] {
  let list = tasks;

  // 1. Completion visibility
  if (!filters.show_completed) {
    list = list.filter((t) => !t.completed);
  }

  // 2. Folder filter
  if (filters.folder_ids && filters.folder_ids.length > 0) {
    const allowNoFolder = filters.folder_ids.includes("__none__");
    const actualFolderIds = filters.folder_ids.filter((id) => id !== "__none__");
    list = list.filter((t) => {
      const matchesNoFolder = allowNoFolder && !t.folder_id;
      const matchesFolder = Boolean(t.folder_id) && actualFolderIds.includes(t.folder_id!);
      return matchesNoFolder || matchesFolder;
    });
  }

  // 3. Priorities filter
  if (filters.priorities && filters.priorities.length > 0) {
    list = list.filter((t) => filters.priorities.includes(t.priority as string));
  }

  // 4. Tags filter
  if (filters.tag_ids && filters.tag_ids.length > 0) {
    const allowNoTag = filters.tag_ids.includes("__none__");
    const actualTagIds = filters.tag_ids.filter((id) => id !== "__none__");
    list = list.filter((t) => {
      const tgs = taskTagsMap[t.id] || [];
      const matchesNoTag = allowNoTag && tgs.length === 0;
      const matchesTag = actualTagIds.some((id) => tgs.includes(id));
      return matchesNoTag || matchesTag;
    });
  }

  // 5. Goals filter
  if (filters.goal_ids && filters.goal_ids.length > 0) {
    list = list.filter((t) => doesTaskMatchGoalFilter(t, filters.goal_ids, goals));
  }

  // 6. Time Horizons & Due Windows filter
  if (
    (filters.time_horizons && filters.time_horizons.length > 0) ||
    (filters.due_windows && filters.due_windows.length > 0)
  ) {
    list = list.filter((t) =>
      doesTaskMatchTimeFilters(t, filters.due_windows, filters.time_horizons)
    );
  }

  // 7. Sort (Pinned first, then primary, then secondary)
  const primary = filters.sort_primary || DEFAULT_FILTERS.sort_primary;
  const secondary = filters.sort_secondary || DEFAULT_FILTERS.sort_secondary;
  const primaryCmp = cmpForSortLevel(primary);
  const secondaryCmp = cmpForSortLevel(secondary);

  list = [...list].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return primaryCmp(a, b) || secondaryCmp(a, b);
  });

  return list;
}
