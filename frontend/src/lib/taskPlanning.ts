import { differenceInCalendarMonths as gregorianMonths, getMonth as gregorianMonth } from "date-fns";
import { differenceInCalendarMonths as jalaliMonths, getMonth as jalaliMonth } from "date-fns-jalali";
import type { Task } from "./taskTypes";
import { isScheduleOverdue, taskWorkDate } from "./taskDate";
import { ALL_HORIZONS, addDaysLocal, fromLocalISO, periodFor, todayISO, type Horizon, type Period, type TimeSettings } from "./timeHorizon";
import { periodPatch, readSchedule, schedulePeriod } from "./taskSchedule";

/** The plan period of the task's single schedule (a dated task occupies its own day). */
export function getTaskPlanning(task: Partial<Task>, settings: TimeSettings): Period | null {
  return schedulePeriod(readSchedule(task, settings));
}

/** Overdue = the task's own date (and time, when set) has already passed. */
export function isTaskOverdue(task: Partial<Task>, _settings: TimeSettings, now = new Date()): boolean {
  if (task.completed || task.status === "done" || task.status === "wont_do") return false;
  return isScheduleOverdue(taskWorkDate(task), now);
}

/** A daily plan whose day has passed (a soft state, separate from the task's own date being overdue). */
export function isTaskMissedWorkDay(task: Partial<Task>, settings: TimeSettings, now = new Date()): boolean {
  if (task.completed || task.status === "done" || task.status === "wont_do") return false;
  const sch = readSchedule(task, settings);
  return sch.kind === "period" && sch.period.end < todayISO(now);
}
/** Store a period (or a single day) as the task's only schedule; null clears it. */
export function planningPatch(period: Period | null, settings: TimeSettings): Partial<Task> {
  return periodPatch(period, settings);
}
const rank = (h: Horizon) => ALL_HORIZONS.indexOf(h);
const overlaps = (a: Period, b: Period) => a.start <= b.end && a.end >= b.start;

/** Promote children into their own tab; attach future children to their closest visible ancestor. */
export function buildPlanningProjection(tasks: Task[], view: Period, settings: TimeSettings, now = new Date()): Task[] {
  const map = new Map(tasks.map(task => [task.id, task]));
  const plans = new Map(tasks.map(task => [task.id, getTaskPlanning(task, settings)]));
  const future = (p: Period) => p.start > periodFor(p.horizon, now, settings).end;
  const visible = new Set<string>();
  for (const task of tasks) {
    const p = plans.get(task.id);
    if (!p || rank(p.horizon) > rank(view.horizon)) continue;
    if (p.horizon === view.horizon) {
      if (overlaps(p, view)) visible.add(task.id);
      continue;
    }
    if (!future(p)) continue;
    let parentId = task.parent_id;
    const visited = new Set([task.id]);
    let blocked = false;
    let owned = false;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const ancestor = plans.get(parentId);
      if (ancestor) {
        if (rank(ancestor.horizon) < rank(view.horizon) && !future(ancestor)) { blocked = true; break; }
        if (ancestor.horizon === view.horizon && overlaps(ancestor, view)) owned = true;
      }
      parentId = map.get(parentId)?.parent_id;
    }
    if (!blocked && (overlaps(p, view) || owned)) visible.add(task.id);
  }
  const result = tasks.filter(task => visible.has(task.id)).map(task => {
    let parentId = task.parent_id;
    const visited = new Set([task.id]);
    while (parentId && !visible.has(parentId) && !visited.has(parentId)) {
      visited.add(parentId); parentId = map.get(parentId)?.parent_id;
    }
    return { ...task, parent_id: parentId && !visited.has(parentId) && visible.has(parentId) ? parentId : null };
  });
  const projectedMap = new Map(result.map(task => [task.id, task]));
  return result.map(task => {
    let parentId = task.parent_id;
    const seen = new Set([task.id]);
    while (parentId) {
      if (seen.has(parentId)) return { ...task, parent_id: null };
      seen.add(parentId); parentId = projectedMap.get(parentId)?.parent_id;
    }
    return task;
  });
}

export function planningUnitNumber(period: Period, settings: TimeSettings): number | null {
  const date = fromLocalISO(period.start);
  const monthNumber = (settings.calendar === "jalali" ? jalaliMonth : gregorianMonth)(date) + 1;
  if (period.horizon === "month") return monthNumber;
  if (period.horizon === "quarter") return Math.ceil(monthNumber / 3);
  if (period.horizon !== "week") return null;
  const month = periodFor("month", addDaysLocal(date, 3), settings);
  const first = periodFor("week", fromLocalISO(month.start), settings);
  const utc = (iso: string) => { const [year, month, day] = iso.split("-").map(Number); return Date.UTC(year, month - 1, day); };
  return Math.floor((utc(period.start) - utc(first.start)) / (7 * 86400000)) + 1;
}

export function planningScopeTasks(tasks: Task[], rootIds: string[]): Task[] {
  const children = new Map<string, string[]>();
  for (const task of tasks) if (task.parent_id) children.set(task.parent_id, [...(children.get(task.parent_id) || []), task.id]);
  const ids = new Set<string>();
  const visit = (id: string) => { if (ids.has(id)) return; ids.add(id); (children.get(id) || []).forEach(visit); };
  rootIds.forEach(visit);
  return tasks.filter(task => ids.has(task.id));
}

export function planningOffset(period: Period, settings: TimeSettings, now = new Date()): number {
  const current = periodFor(period.horizon, now, settings);
  if (period.horizon === "day" || period.horizon === "week") {
    const utc = (iso: string) => { const [year, month, day] = iso.split("-").map(Number); return Date.UTC(year, month - 1, day); };
    return Math.round((utc(period.start) - utc(current.start)) / (86400000 * (period.horizon === "week" ? 7 : 1)));
  }
  const months = (settings.calendar === "jalali" ? jalaliMonths : gregorianMonths)(fromLocalISO(period.start), fromLocalISO(current.start));
  return months / (period.horizon === "quarter" ? 3 : period.horizon === "year" ? 12 : 1);
}
