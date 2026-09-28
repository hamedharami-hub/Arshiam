import type { Priority } from "@/lib/priority";
import { PRIORITY_META } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import type { Horizon } from "@/lib/timeHorizon";

export type SortKey = "priority" | "time" | "created" | "title";
export type HorizonFilter = { priorities: Priority[]; folderIds: string[]; tagIds: string[]; sort: SortKey };

export const EMPTY_FILTER: HorizonFilter = { priorities: [], folderIds: [], tagIds: [], sort: "priority" };

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
  return f.priorities.length + f.folderIds.length + f.tagIds.length > 0;
}

export function applyFilter(tasks: Task[], f: HorizonFilter, taskTags: Map<string, Set<string>>): Task[] {
  return tasks.filter((t) => {
    if (f.priorities.length && !f.priorities.includes(t.priority || "none")) return false;
    if (f.folderIds.length && !f.folderIds.includes(t.folder_id || "")) return false;
    if (f.tagIds.length) {
      const tags = taskTags.get(t.id);
      if (!tags || !f.tagIds.some((id) => tags.has(id))) return false;
    }
    return true;
  });
}

const rank = (p?: Priority) => PRIORITY_META[p || "none"]?.rank ?? 99;
const timeKey = (t: Task) => t.due_at || t.period_start || t.due_date || "9999";

export function sortTasks(tasks: Task[], sort: SortKey): Task[] {
  const done = (t: Task) => (t.completed ? 1 : 0);
  return [...tasks].sort((a, b) => {
    if (done(a) !== done(b)) return done(a) - done(b);
    if (sort === "priority") return rank(a.priority) - rank(b.priority) || timeKey(a).localeCompare(timeKey(b));
    if (sort === "time") return timeKey(a).localeCompare(timeKey(b)) || rank(a.priority) - rank(b.priority);
    if (sort === "created") return (b.created_at || "").localeCompare(a.created_at || "");
    return a.title.localeCompare(b.title, "fa");
  });
}

export type Inherited = { priority?: Priority; folderId?: string; tagIds?: string[] };

/**
 * A new task inherits folder / tag / importance from the current filter —
 * but only when the filter is unambiguous. If any category has more than one
 * value selected, nothing is inherited from the filter.
 */
export function inheritFromFilter(f: HorizonFilter): Inherited {
  if (f.priorities.length > 1 || f.folderIds.length > 1 || f.tagIds.length > 1) return {};
  const out: Inherited = {};
  if (f.priorities.length === 1) out.priority = f.priorities[0];
  if (f.folderIds.length === 1) out.folderId = f.folderIds[0];
  if (f.tagIds.length === 1) out.tagIds = [f.tagIds[0]];
  return out;
}
