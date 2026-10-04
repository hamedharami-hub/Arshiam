import type { Priority } from "@/lib/priority";
import { PRIORITY_META } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import type { Horizon } from "@/lib/timeHorizon";
import type { GoalKanban } from "@/lib/kanbanGoals";

import { taskWorkDate } from "@/lib/taskDate";
export type SortKey = "priority" | "time" | "created" | "title" | "goal";
export type CompletionFilter = "all" | "active" | "completed";

export type HorizonFilter = {
  priorities: Priority[];
  folderIds: string[];
  tagIds: string[];
  goalIds: string[];
  sort: SortKey;
  completion?: CompletionFilter;
  search?: string;
};

export const EMPTY_FILTER: HorizonFilter = {
  priorities: [],
  folderIds: [],
  tagIds: [],
  goalIds: [],
  sort: "priority",
  completion: "all",
  search: "",
};

const key = (h: Horizon) => `arsh_horizon_filter_v1:${h}`;

/** Filters/sort are stored separately for every bucket (horizon). */
export function loadFilter(h: Horizon): HorizonFilter {
  try {
    const raw = localStorage.getItem(key(h));
    if (raw) return { ...EMPTY_FILTER, ...JSON.parse(raw) };
  } catch {}
  return { ...EMPTY_FILTER };
}

export function saveFilter(h: Horizon, f: HorizonFilter) {
  try { localStorage.setItem(key(h), JSON.stringify(f)); } catch {}
}

export function isFilterActive(f: HorizonFilter): boolean {
  return (
    (f.priorities?.length || 0) +
    (f.folderIds?.length || 0) +
    (f.tagIds?.length || 0) +
    (f.goalIds?.length || 0) > 0 ||
    Boolean(f.search?.trim()) ||
    Boolean(f.completion && f.completion !== "all")
  );
}

export function collectGoalDescendantIds(
  goals: Array<Pick<GoalKanban, "id" | "parentId">> = [],
  targetIds: string[] = []
): Set<string> {
  const result = new Set<string>(targetIds);
  const childrenMap = new Map<string, string[]>();
  for (const g of goals) {
    if (g.parentId) {
      const arr = childrenMap.get(g.parentId) || [];
      arr.push(g.id);
      childrenMap.set(g.parentId, arr);
    }
  }
  const queue = [...targetIds];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = childrenMap.get(curr);
    if (children) {
      for (const ch of children) {
        if (!result.has(ch)) {
          result.add(ch);
          queue.push(ch);
        }
      }
    }
  }
  return result;
}

export function applyFilter(
  tasks: Task[],
  f: HorizonFilter,
  taskTags: Map<string, Set<string>>,
  goals?: Array<Pick<GoalKanban, "id" | "parentId">>
): Task[] {
  const searchLower = f.search?.trim().toLowerCase();
  const goalIdsWithDescendants = f.goalIds?.length
    ? collectGoalDescendantIds(goals || [], f.goalIds.filter((id) => id !== "__none__"))
    : new Set<string>();
  const allowNoGoal = f.goalIds?.includes("__none__");

  const allowNoFolder = f.folderIds?.includes("__none__");
  const actualFolderIds = f.folderIds?.filter((id) => id !== "__none__") || [];

  const allowNoTags = f.tagIds?.includes("__none__");
  const actualTagIds = f.tagIds?.filter((id) => id !== "__none__") || [];

  return tasks.filter((t) => {
    // Completion filter
    if (f.completion === "active" && t.completed) return false;
    if (f.completion === "completed" && !t.completed) return false;

    // Search query
    if (searchLower && !t.title.toLowerCase().includes(searchLower)) return false;

    // Priorities
    if (f.priorities?.length && !f.priorities.includes(t.priority || "none")) return false;

    // Folders
    if (f.folderIds?.length) {
      const matchesNoFolder = allowNoFolder && !t.folder_id;
      const matchesFolder = Boolean(t.folder_id) && actualFolderIds.includes(t.folder_id!);
      if (!matchesNoFolder && !matchesFolder) return false;
    }

    // Goals
    if (f.goalIds?.length) {
      const matchesNoGoal = allowNoGoal && !t.kanban_column_id;
      const matchesGoal = Boolean(t.kanban_column_id) && goalIdsWithDescendants.has(t.kanban_column_id!);
      if (!matchesNoGoal && !matchesGoal) return false;
    }

    // Tags
    if (f.tagIds?.length) {
      const tags = taskTags.get(t.id);
      const matchesNoTag = allowNoTags && (!tags || tags.size === 0);
      const matchesTag = Boolean(tags) && actualTagIds.some((id) => tags!.has(id));
      if (!matchesNoTag && !matchesTag) return false;
    }

    return true;
  });
}

const rank = (p?: Priority) => PRIORITY_META[p || "none"]?.rank ?? 99;
const timeKey = (t: Task) => taskWorkDate(t) || t.period_start || "9999";

export function sortTasks(tasks: Task[], sort: SortKey): Task[] {
  const done = (t: Task) => (t.completed ? 1 : 0);
  return [...tasks].sort((a, b) => {
    if (done(a) !== done(b)) return done(a) - done(b);
    if (sort === "priority") return rank(a.priority) - rank(b.priority) || timeKey(a).localeCompare(timeKey(b));
    if (sort === "time") return timeKey(a).localeCompare(timeKey(b)) || rank(a.priority) - rank(b.priority);
    if (sort === "created") return (b.created_at || "").localeCompare(a.created_at || "");
    if (sort === "goal") {
      const gA = a.folder_id ? `${a.folder_id}:${a.kanban_column_id || ""}` : (a.kanban_column_id || "zzz");
      const gB = b.folder_id ? `${b.folder_id}:${b.kanban_column_id || ""}` : (b.kanban_column_id || "zzz");
      return gA.localeCompare(gB, "fa") || timeKey(a).localeCompare(timeKey(b)) || rank(a.priority) - rank(b.priority);
    }
    return a.title.localeCompare(b.title, "fa");
  });
}

export type Inherited = { priority?: Priority; folderId?: string; tagIds?: string[]; kanban_column_id?: string };

export function inheritFromFilter(f: HorizonFilter): Inherited {
  if (
    (f.priorities?.length || 0) > 1 ||
    (f.folderIds?.length || 0) > 1 ||
    (f.tagIds?.length || 0) > 1 ||
    (f.goalIds?.length || 0) > 1
  ) return {};
  const out: Inherited = {};
  if (f.priorities?.length === 1 && f.priorities[0] !== "none") out.priority = f.priorities[0];
  if (f.folderIds?.length === 1 && f.folderIds[0] !== "__none__") out.folderId = f.folderIds[0];
  if (f.tagIds?.length === 1 && f.tagIds[0] !== "__none__") out.tagIds = [f.tagIds[0]];
  if (f.goalIds?.length === 1 && f.goalIds[0] !== "__none__") out.kanban_column_id = f.goalIds[0];
  return out;
}
