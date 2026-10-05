// Cascading planning: year → quarter → month → week → day, linked by plan_parent_id.
import type { Task } from "./taskTypes";
import { getTaskPlanning, planningPatch } from "./taskPlanning";
import { readSchedule, scheduleInView, schedulePeriod } from "./taskSchedule";
import { addDaysLocal, fromLocalISO, nextPeriod, periodFor, toLocalISO, type Horizon, type Period, type TimeSettings } from "./timeHorizon";

export const LEVELS_TOP_DOWN: Horizon[] = ["year", "quarter", "month", "week", "day"];

export function levelsFor(s: Pick<TimeSettings, "seasonsEnabled">): Horizon[] {
  return s.seasonsEnabled ? LEVELS_TOP_DOWN : LEVELS_TOP_DOWN.filter((h) => h !== "quarter");
}
export function parentLevel(h: Horizon, s: TimeSettings): Horizon | null {
  const l = levelsFor(s); const i = l.indexOf(h);
  return i > 0 ? l[i - 1] : null;
}
export function childLevel(h: Horizon, s: TimeSettings): Horizon | null {
  const l = levelsFor(s); const i = l.indexOf(h);
  return i >= 0 && i < l.length - 1 ? l[i + 1] : null;
}

export const isClosed = (t: Partial<Task>) => !!t.completed || t.status === "done" || t.status === "wont_do";
/** Actually finished (a set-aside "won't do" task is closed but never counts as done). */
export const isDone = (t: Partial<Task>) => t.status !== "wont_do" && (!!t.completed || t.status === "done");

/** The plan period of the task's single schedule (a dated task occupies its day). */
export function planOf(t: Partial<Task>, s: TimeSettings): Period | null {
  return schedulePeriod(readSchedule(t, s));
}

/**
 * Tasks shown in a plan view: same or finer level whose schedule overlaps the view (both ends inclusive).
 * A day task is also in its week and month; a custom range is in every week it touches; a month plan
 * without a day is never in a day view. Each task appears once.
 */
export function itemsInPeriod(tasks: Task[], period: Period, s: TimeSettings): Task[] {
  return tasks.filter((t) => scheduleInView(readSchedule(t, s), period));
}

/** Top-level rows of a view: a task whose plan-parent is in the same view is shown nested, not twice. */
export function topLevelItems(items: Task[]): Task[] {
  const ids = new Set(items.map((t) => t.id));
  return items.filter((t) => !(t.plan_parent_id && ids.has(t.plan_parent_id)));
}

export function childrenMap(tasks: Task[]): Map<string, Task[]> {
  const m = new Map<string, Task[]>();
  for (const t of tasks) if (t.plan_parent_id) m.set(t.plan_parent_id, [...(m.get(t.plan_parent_id) || []), t]);
  return m;
}

export type Progress = { done: number; total: number; ratio: number };
/** Count eligible leaf actions once; a checked grouping goal never completes its open descendants. */
export function progressOf(t: Task, kids: Map<string, Task[]>, seen = new Set<string>()): Progress {
  let done = 0;
  let total = 0;
  const visit = (task: Task) => {
    if (seen.has(task.id) || task.status === "wont_do") return;
    seen.add(task.id);
    const children = kids.get(task.id) || [];
    const eligible = children.filter((child) => child.status !== "wont_do" && !seen.has(child.id));
    if (eligible.length) {
      eligible.forEach(visit);
      return;
    }
    // The root itself is not another action when it has descendants; when a
    // caller asks about a standalone item, count that item as its own leaf.
    if (task.id !== t.id || !(kids.get(t.id) || []).some((child) => child.status !== "wont_do")) {
      total += 1;
      if (isDone(task)) done += 1;
    }
  };
  visit(t);
  return { done, total, ratio: total ? done / total : (isDone(t) ? 1 : 0) };
}

/**
 * Open items left behind before this view (same or finer level, schedule fully before the view starts).
 * Covers days, times and periods alike; nothing is moved automatically — the user decides.
 */
export function carryOver(tasks: Task[], current: Period, s: TimeSettings): Task[] {
  const rank = (h: Horizon) => LEVELS_TOP_DOWN.length - 1 - LEVELS_TOP_DOWN.indexOf(h);
  return tasks.filter((t) => {
    if (isClosed(t)) return false;
    const p = planOf(t, s);
    return !!p && rank(p.horizon) <= rank(current.horizon) && p.end < current.start;
  });
}

export function unplanned(tasks: Task[], s: TimeSettings): Task[] {
  return tasks.filter((t) => !t.parent_id && !isClosed(t) && !t.plan_parent_id && readSchedule(t, s).kind === "none");
}

/** Every period of `h` whose start lies inside `range`. */
export function periodsWithin(h: Horizon, range: Pick<Period, "start" | "end">, s: TimeSettings): Period[] {
  const out: Period[] = [];
  let p = periodFor(h, fromLocalISO(range.start), s);
  if (p.start < range.start) p = nextPeriod(p, s);
  for (let i = 0; i < 40 && p.start <= range.end; i++) { out.push(p); p = nextPeriod(p, s); }
  return out;
}

/** Default lower period for a new child: today if it is inside the parent period, else its first sub-period. */
export function defaultChildPeriod(parent: Period, level: Horizon, s: TimeSettings, now = new Date()): Period {
  const today = toLocalISO(now);
  const anchor = today >= parent.start && today <= parent.end ? now : fromLocalISO(parent.start);
  return periodFor(level, anchor, s);
}

export function planPatch(period: Period | null, s: TimeSettings, parentId?: string | null): Partial<Task> {
  return { ...planningPatch(period, s), ...(parentId !== undefined ? { plan_parent_id: parentId } : {}) };
}

export function weekDays(week: Period): string[] {
  const out: string[] = [];
  for (let d = fromLocalISO(week.start), i = 0; i < 7 && toLocalISO(d) <= week.end; i++, d = addDaysLocal(d, 1)) out.push(toLocalISO(d));
  return out;
}
