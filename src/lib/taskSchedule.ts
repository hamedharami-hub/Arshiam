import type { Task } from "./taskTypes";

/**
 * Schedule contract v2. Reads the current fields and builds an explicit patch.
 * It does not migrate legacy fields, touch the browser, or write a deadline.
 */

export type ScheduleMode = "none" | "day" | "clock" | "horizon";
export type ScheduleHorizon = "week" | "month" | "quarter" | "year" | "range";
export type ScheduleCalendar = "jalali" | "gregorian" | null;

export type TaskSchedule = {
  v: 2;
  mode: ScheduleMode;
  workDate: string | null;
  timezone: string | null;
  horizon: ScheduleHorizon | "day" | null;
  start: string | null;
  end: string | null;
  deadlineDate: string | null;
  conflict: boolean;
};

export type ScheduleWrite = {
  work_date: string | null;
  schedule_timezone: string | null;
  planning_horizon: ScheduleHorizon | null;
  planning_start: string | null;
  planning_end: string | null;
  planning_calendar: ScheduleCalendar;
  schedule_v: 2;
};

export type SchedulePatchInput =
  | { mode: "none" }
  | { mode: "day"; date: string }
  | { mode: "clock"; instant: string; timezone: string }
  | { mode: "horizon"; horizon: ScheduleHorizon; start: string; end: string; calendar?: ScheduleCalendar };

export type SchedulePatchResult =
  | { ok: true; patch: ScheduleWrite }
  | { ok: false; reason: "day-and-horizon" | "invalid-clock" | "invalid-day" | "invalid-horizon" };

export type ScheduleSource = Partial<Pick<Task,
  | "work_date"
  | "schedule_timezone"
  | "schedule_v"
  | "deadline_date"
  | "planning_horizon"
  | "planning_start"
  | "planning_end"
>> & {
  /** Ignored. A deadline is never inferred from a removed due field. */
  due_date?: string | null;
};

const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})$/;
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:$|T)/;
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const HORIZONS: readonly ScheduleHorizon[] = ["week", "month", "quarter", "year", "range"];

function isScheduleHorizon(value: string | null | undefined): value is ScheduleHorizon {
  return !!value && (HORIZONS as readonly string[]).includes(value);
}

function datePrefix(value: string | null | undefined): string | null {
  if (!value) return null;
  return DATE_PREFIX.exec(value)?.[1] ?? null;
}

function clearedPlanning(): Pick<ScheduleWrite, "planning_horizon" | "planning_start" | "planning_end" | "planning_calendar"> {
  return {
    planning_horizon: null,
    planning_start: null,
    planning_end: null,
    planning_calendar: null,
  };
}

/** Calendar day of an absolute instant. A zoneless clock time keeps its written day. */
function calendarDayOfInstant(instant: string, timezone: string | null): string | null {
  const prefix = datePrefix(instant);
  if (!prefix || !instant.includes("T")) return null;
  if (!HAS_OFFSET.test(instant)) return prefix;
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return prefix;
  const zone = timezone?.trim();
  if (zone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    } catch {
      // An unknown zone falls through to the runtime local calendar.
    }
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Operational calendar day. Day mode keeps the literal date; clock mode uses the zoned day. Horizon-only schedules have none. */
export function scheduleCalendarDay(schedule: TaskSchedule): string | null {
  return workCalendarDay(schedule);
}

function workCalendarDay(schedule: TaskSchedule): string | null {
  if (!schedule.workDate) return null;
  if (schedule.mode === "day" || (schedule.conflict && DATE_ONLY.test(schedule.workDate))) {
    return schedule.workDate;
  }
  if (schedule.mode === "clock" || schedule.conflict) {
    return calendarDayOfInstant(schedule.workDate, schedule.timezone);
  }
  return null;
}

function rangesOverlap(start: string | null, end: string | null, period: { start: string; end: string }): boolean {
  return !!start && !!end && start <= period.end && end >= period.start;
}

export function readTaskSchedule(task: ScheduleSource | null | undefined): TaskSchedule {
  const deadlineDate = task?.deadline_date || null;
  const workRaw = typeof task?.work_date === "string" ? task.work_date : null;
  const dateOnly = !!workRaw && DATE_ONLY.test(workRaw);
  const clock = !!workRaw && workRaw.includes("T");
  const realWork = dateOnly || clock;
  const planningStart = task?.planning_start || null;
  const planningEnd = task?.planning_end || null;
  const horizonPeriod = isScheduleHorizon(task?.planning_horizon) && planningStart && planningEnd
    ? { horizon: task.planning_horizon, start: planningStart, end: planningEnd }
    : null;
  const dayFromPlan = !realWork && task?.planning_horizon === "day" ? datePrefix(planningStart) : null;
  const conflict = realWork && horizonPeriod != null;

  const base: TaskSchedule = {
    v: 2,
    mode: "none",
    workDate: null,
    timezone: null,
    horizon: null,
    start: null,
    end: null,
    deadlineDate,
    conflict: false,
  };

  if (horizonPeriod && !realWork) {
    return { ...base, mode: "horizon", horizon: horizonPeriod.horizon, start: horizonPeriod.start, end: horizonPeriod.end };
  }
  if (dayFromPlan) {
    return {
      ...base,
      mode: "day",
      workDate: dayFromPlan,
      horizon: "day",
      start: dayFromPlan,
      end: datePrefix(planningEnd) ?? dayFromPlan,
    };
  }
  if (!realWork || !workRaw) return base;

  return {
    ...base,
    mode: clock ? "clock" : "day",
    workDate: workRaw,
    timezone: clock ? task?.schedule_timezone || null : null,
    horizon: horizonPeriod?.horizon ?? null,
    start: horizonPeriod?.start ?? null,
    end: horizonPeriod?.end ?? null,
    conflict,
  };
}

type RawPatch = SchedulePatchInput & {
  date?: string;
  instant?: string;
  timezone?: string;
  horizon?: ScheduleHorizon | string;
  start?: string;
  end?: string;
  calendar?: ScheduleCalendar;
};

export function schedulePatch(input: SchedulePatchInput): SchedulePatchResult {
  const raw = input as RawPatch;
  const dated = raw.mode === "day" || raw.mode === "clock";
  const period = raw.mode === "horizon";
  const extraPeriod = dated && raw.horizon != null && raw.start != null && raw.end != null;
  const extraDate = period && (raw.date != null || raw.instant != null);
  if ((dated && period) || extraPeriod || extraDate) return { ok: false, reason: "day-and-horizon" };

  if (raw.mode === "none") {
    return { ok: true, patch: { work_date: null, schedule_timezone: null, ...clearedPlanning(), schedule_v: 2 } };
  }
  if (raw.mode === "day") {
    if (!raw.date || !DATE_ONLY.test(raw.date)) return { ok: false, reason: "invalid-day" };
    return { ok: true, patch: { work_date: raw.date, schedule_timezone: null, ...clearedPlanning(), schedule_v: 2 } };
  }
  if (raw.mode === "clock") {
    const timezone = typeof raw.timezone === "string" ? raw.timezone.trim() : "";
    if (!raw.instant || !raw.instant.includes("T") || !timezone) return { ok: false, reason: "invalid-clock" };
    return { ok: true, patch: { work_date: raw.instant, schedule_timezone: timezone, ...clearedPlanning(), schedule_v: 2 } };
  }
  if (raw.mode === "horizon") {
    if (!isScheduleHorizon(raw.horizon) || !raw.start || !raw.end) return { ok: false, reason: "invalid-horizon" };
    return {
      ok: true,
      patch: {
        work_date: null,
        schedule_timezone: null,
        planning_horizon: raw.horizon,
        planning_start: raw.start,
        planning_end: raw.end,
        planning_calendar: raw.calendar ?? null,
        schedule_v: 2,
      },
    };
  }
  return { ok: false, reason: "invalid-horizon" };
}

export function assertSchedulePatch(input: SchedulePatchInput): ScheduleWrite {
  const result = schedulePatch(input);
  if (result.ok === false) throw new Error(`schedulePatch rejected: ${result.reason}`);
  return result.patch;
}

export function isScheduledToday(schedule: TaskSchedule, today: string): boolean {
  if (schedule.mode !== "day" && schedule.mode !== "clock") return false;
  const day = workCalendarDay(schedule);
  return day === today;
}

/**
 * A dated item is matched by its calendar day, never also as a horizon item.
 * Week/month/quarter/year match only that horizon. A range matches any overlapping
 * non-day period. Conflict keeps both sides visible and does not pick a winner.
 */
export function occursInPeriod(
  schedule: TaskSchedule,
  period: { start: string; end: string },
  horizon?: ScheduleHorizon | "day",
): boolean {
  const day = workCalendarDay(schedule);
  const dated = schedule.mode === "day" || schedule.mode === "clock" || schedule.conflict;
  const datedHit = dated && !!day && day >= period.start && day <= period.end;
  const periodHit = rangesOverlap(schedule.start, schedule.end, period);
  const horizonHit = !!schedule.horizon && schedule.horizon !== "day" && schedule.horizon === horizon && periodHit;
  const rangeHit = schedule.horizon === "range" && periodHit;

  if (horizon === "day") return datedHit;
  if (horizon === "week" || horizon === "month") return datedHit || horizonHit || rangeHit;
  if (horizon === "quarter" || horizon === "year") return horizonHit || rangeHit;
  if (horizon === "range") return schedule.horizon === "range" && periodHit;
  if (datedHit) return true;
  if (rangeHit) return true;
  return (schedule.mode === "horizon" || schedule.conflict) && schedule.horizon != null && schedule.horizon !== "day" && periodHit;
}

/** Visible calendar label. Text, not color, is the signal. */
export const DEADLINE_MARK_TEXT = "مهلت / Deadline";

export type DeadlinePatchResult =
  | { ok: true; patch: { deadline_date: string | null } }
  | { ok: false; reason: "invalid-deadline" };

export type DeadlineSignal = { state: "soon" | "passed"; days: number };

export type CalendarDayMark = { day: string; work: boolean; deadline: boolean };

/**
 * A deadline is a date-only field. Passing it does not build a schedule patch,
 * complete a task, move work_date, or write a reminder.
 */
export function deadlinePatch(date: string | null): DeadlinePatchResult {
  if (date === null) return { ok: true, patch: { deadline_date: null } };
  if (typeof date !== "string" || date.includes("T") || civilDayNumber(date) == null) {
    return { ok: false, reason: "invalid-deadline" };
  }
  return { ok: true, patch: { deadline_date: date } };
}

/** Calendar-day distance from literal YYYY-MM-DD values. Never Date.parse of a date-only string. */
export function deadlineSignal(deadline: string | null, today: string): DeadlineSignal | null {
  if (!deadline || deadline.includes("T")) return null;
  const deadlineDay = civilDayNumber(deadline);
  const todayDay = civilDayNumber(today);
  if (deadlineDay == null || todayDay == null) return null;
  const days = deadlineDay - todayDay;
  if (days > 7) return null;
  if (days >= 0) return { state: "soon", days };
  return { state: "passed", days: -days };
}

export function isLiteralDeadlineDay(deadline: string | null | undefined, day: string): boolean {
  return !!deadline && !deadline.includes("T") && deadline === day && civilDayNumber(deadline) != null && civilDayNumber(day) != null;
}

/**
 * Days a task occupies in a range. A deadline is one day, never copied across a horizon.
 * The operational day and the deadline share one entry when they are the same day.
 * This does not turn a deadline into work_date.
 */
export function calendarDayMarks(task: ScheduleSource | null | undefined, range: { start: string; end: string }): CalendarDayMark[] {
  const schedule = readTaskSchedule(task);
  const workDay = scheduleCalendarDay(schedule);
  const deadline = isLiteralDeadlineDay(schedule.deadlineDate, schedule.deadlineDate || "") ? schedule.deadlineDate : null;
  const inRange = (day: string | null): day is string => !!day && day >= range.start && day <= range.end;
  const workIn = inRange(workDay);
  const deadlineIn = inRange(deadline);
  if (workIn && deadlineIn && workDay === deadline) return [{ day: workDay, work: true, deadline: true }];
  const marks: CalendarDayMark[] = [];
  if (workIn) marks.push({ day: workDay, work: true, deadline: false });
  if (deadlineIn && deadline) marks.push({ day: deadline, work: false, deadline: true });
  return marks;
}

function civilDayNumber(value: string): number | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  const probe = new Date(utc);
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return utc / 86400000;
}
