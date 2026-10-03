// Cascading planning: year → quarter → month → week → day, linked by plan_parent_id.
import type { Task } from "./taskTypes";
import { getTaskPlanning, planningPatch } from "./taskPlanning";
import { taskWorkDate, parseTaskDueDate, getLocalDateString } from "./taskDate";
import { addDaysLocal, fromLocalISO, getTaskTime, nextPeriod, periodFor, toLocalISO, type Horizon, type Period, type TimeSettings } from "./timeHorizon";

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

/** Planned period, falling back to the day of an exact due date. */
export function planOf(t: Partial<Task>, s: TimeSettings): Period | null {
  const p = getTaskPlanning(t, s);
  if (p) return p;
  if (t.work_date !== undefined) {
    const day = parseTaskDueDate(taskWorkDate(t));
    return day ? { horizon: "day", start: getLocalDateString(day), end: getLocalDateString(day) } : null;
  }
  const tf = getTaskTime(t, s);
  if (!tf) return null;
  if (tf.is_exact && tf.due_at) { const day = toLocalISO(new Date(tf.due_at)); return { horizon: "day", start: day, end: day }; }
  return { horizon: tf.horizon, start: tf.period_start, end: tf.period_end };
}

export function itemsInPeriod(tasks: Task[], period: Period, s: TimeSettings): Task[] {
  return tasks.filter((t) => {
    const p = planOf(t, s);
    return !!p && p.horizon === period.horizon && p.start >= period.start && p.start <= period.end;
  });
}

export function childrenMap(tasks: Task[]): Map<string, Task[]> {
  const m = new Map<string, Task[]>();
  for (const t of tasks) if (t.plan_parent_id) m.set(t.plan_parent_id, [...(m.get(t.plan_parent_id) || []), t]);
  return m;
}

export type Progress = { done: number; total: number; ratio: number };
/** Leaves count by completion; a parent is the average of its children, so a ticked day moves the year. */
export function progressOf(t: Task, kids: Map<string, Task[]>, seen = new Set<string>()): Progress {
  const list = (kids.get(t.id) || []).filter((c) => c.status !== "wont_do" && !seen.has(c.id));
  if (!list.length) return { done: isClosed(t) ? 1 : 0, total: 0, ratio: isClosed(t) ? 1 : 0 };
  seen.add(t.id);
  const ratios = list.map((c) => progressOf(c, kids, seen).ratio);
  const ratio = isClosed(t) ? 1 : ratios.reduce((a, b) => a + b, 0) / list.length;
  return { done: ratios.filter((r) => r >= 1).length, total: list.length, ratio };
}

/** Planned items of earlier periods at this level that are still open (shown once, above the current period). */
export function carryOver(tasks: Task[], current: Period, s: TimeSettings): Task[] {
  return tasks.filter((t) => {
    if (isClosed(t)) return false;
    const p = getTaskPlanning(t, s);
    return !!p && p.horizon === current.horizon && p.end < current.start;
  });
}

export function unplanned(tasks: Task[], s: TimeSettings): Task[] {
  return tasks.filter((t) => !t.parent_id && !isClosed(t) && !t.plan_parent_id && !planOf(t, s));
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
