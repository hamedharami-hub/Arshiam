/**
 * Server-side view of the single task schedule (same contract as frontend/src/lib/taskSchedule.ts).
 * work_date holds the task's day ("YYYY-MM-DD") or instant; planning_* hold a period. Time block,
 * part of day and deadline are not part of the model. Older callers may still send `due_date`:
 * it is accepted as the task date and stored in work_date.
 */
export function taskDateOf(t: any): string | null {
  if (!t) return null;
  if (t.schedule_v === 2 || t.work_date !== undefined) return t.work_date || null;
  return t.due_date || t.due_at || null;
}

/** Validate and canonicalize caller-provided display context; never use it for identity or access. */
export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try { return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone; }
  catch { return null; }
}

/** Calendar date for an instant in an explicit IANA time zone. */
export function localDayOf(instant: Date, timeZone: string): string | null {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) return null;
  const zone = normalizeTimeZone(timeZone);
  if (!zone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch { return null; }
}

/** Local calendar day of a stored value; a date-only value is returned as-is (never shifted through UTC). */
export function taskDayOf(t: any, userTimeZone?: string): string | null {
  const v = taskDateOf(t);
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const zone = userTimeZone !== undefined ? normalizeTimeZone(userTimeZone) : normalizeTimeZone(t.schedule_timezone);
  if (!zone) return null; // No reliable user zone: never invent a UTC calendar day.
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return null;
  return localDayOf(date, zone);
}

export class InvalidTaskScheduleError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidTaskScheduleError"; }
}
export class InvalidTaskPriorityError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidTaskPriorityError"; }
}

const PRIORITY_ALIASES: Record<string, string> = { p1: "high", p2: "medium", p3: "low", p4: "none" };
const TASK_PRIORITIES = new Set(["none", "low", "medium", "high", "urgent"]);
const REMOVED_TASK_TIME_FIELDS = ["start_at", "end_at", "estimated_minutes", "time_of_day", "part_of_day", "deadline"] as const;

/** Hide retired task scheduling fields from active API readers while leaving migration backups intact. */
export function stripRemovedTaskTimeFields<T extends Record<string, any>>(task: T): T {
  const result = { ...task };
  for (const field of REMOVED_TASK_TIME_FIELDS) delete result[field];
  return result;
}

export function normalizeTaskPriority(value: unknown, fallback = "none"): string {
  if (value === undefined) return fallback;
  const priority = typeof value === "string" ? (PRIORITY_ALIASES[value] || value) : "";
  if (!TASK_PRIORITIES.has(priority)) throw new InvalidTaskPriorityError("priority must be none, low, medium, high, or urgent.");
  return priority;
}

const LEGACY_SCHEDULE_INPUTS = [
  "due_date", "due_at", "is_exact", "horizon", "period_start", "period_end",
  "bucket_kind", "bucket_anchor", "bucket_calendar",
] as const;
const SCHEDULE_INPUTS = [
  "work_date", "due_date", "schedule_v", "schedule_timezone",
  "planning_horizon", "planning_start", "planning_end", "planning_calendar",
  ...LEGACY_SCHEDULE_INPUTS,
] as const;
const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const isCalendarDay = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const isExplicitInstant = (value: unknown): value is string => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
  isCalendarDay(value.slice(0, 10)) &&
  !Number.isNaN(Date.parse(value));

/**
 * Normalize a partial API task write into the v2 schedule fields. A metadata-only
 * patch returns null so callers leave schedule fields untouched. Deprecated due_date
 * remains an input alias; removed time-block fields and legacy schedule sources are
 * never copied into the active record.
 */
export function normalizeTaskScheduleInput(input: Record<string, any>, fallbackTimeZone?: string | null): Record<string, any> | null {
  if (!SCHEDULE_INPUTS.some((key) => hasOwn(input, key))) return null;
  if (hasOwn(input, "work_date") && hasOwn(input, "due_date")) {
    const canonical = input.work_date;
    const alias = input.due_date;
    const equivalent = canonical === alias || (typeof canonical === "string" && typeof alias === "string" &&
      isExplicitInstant(canonical) && isExplicitInstant(alias) && Date.parse(canonical) === Date.parse(alias));
    if (!equivalent) throw new InvalidTaskScheduleError("work_date and deprecated due_date disagree; send only one schedule value.");
  }
  const dateKey = hasOwn(input, "work_date") ? "work_date" : hasOwn(input, "due_date") ? "due_date" : null;
  const date = dateKey ? input[dateKey] : undefined;
  const periodKeys = ["planning_horizon", "planning_start", "planning_end", "planning_calendar"] as const;
  const hasPeriod = periodKeys.some((key) => hasOwn(input, key));
  const horizon = input.planning_horizon;
  const start = input.planning_start;
  const end = input.planning_end;

  // The canonical null is an explicit full clear. A partial or contradictory
  // period is rejected instead of silently erasing or guessing a schedule.
  const hasActivePeriodValue = horizon != null || start != null || end != null || input.planning_calendar != null;
  if (dateKey && date === null && !hasActivePeriodValue) return scheduleWrite(null);
  if (dateKey && date === null && hasActivePeriodValue && !hasPeriod) {
    throw new InvalidTaskScheduleError("A cleared work_date cannot be combined with an incomplete planning period.");
  }

  if (date !== undefined && date !== null) {
    if (hasPeriod && (horizon != null || start != null || end != null || input.planning_calendar != null)) {
      throw new InvalidTaskScheduleError("A task cannot have both work_date and a planning period.");
    }
    if (!isCalendarDay(date) && !isExplicitInstant(date)) {
      throw new InvalidTaskScheduleError("work_date must be a real YYYY-MM-DD day, an ISO 8601 instant with an explicit offset, or null.");
    }
    const zoneInput = input.schedule_timezone ?? fallbackTimeZone;
    if (date.includes("T") && zoneInput != null && !normalizeTimeZone(zoneInput)) {
      throw new InvalidTaskScheduleError("schedule_timezone must be a valid IANA time zone.");
    }
    return scheduleWrite(date, typeof zoneInput === "string" ? zoneInput : undefined);
  }

  // A standalone version/timezone or legacy period field is ambiguous. The API
  // intentionally accepts v2 periods only through the complete planning_* tuple.
  if (horizon === "day" && isCalendarDay(start) && start === end && input.planning_calendar == null) {
    return scheduleWrite(start);
  }
  const horizons = new Set(["week", "month", "quarter", "year"]);
  if (horizons.has(horizon) && isCalendarDay(start) && isCalendarDay(end) && start <= end) {
    if (input.planning_calendar != null && input.planning_calendar !== "jalali" && input.planning_calendar !== "gregorian") {
      throw new InvalidTaskScheduleError("planning_calendar must be 'jalali', 'gregorian', or null.");
    }
    return {
      ...scheduleWrite(null),
      planning_horizon: horizon,
      planning_start: start,
      planning_end: end,
      planning_calendar: typeof input.planning_calendar === "string" ? input.planning_calendar : null,
    };
  }

  throw new InvalidTaskScheduleError("Schedule updates require work_date or a complete valid planning_horizon/start/end tuple.");
}

export function scheduleWrite(value: string | null, timeZone?: string): Record<string, any> {
  let zone: string | null = null;
  if (typeof timeZone === "string") {
    try { zone = new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions().timeZone; } catch { /* unknown zone remains explicit null */ }
  }
  return {
    schedule_v: 2, work_date: value || null,
    schedule_timezone: value && value.includes("T") ? zone : null,
    planning_horizon: null, planning_start: null, planning_end: null, planning_calendar: null,
    due_date: null, due_at: null, is_exact: null, horizon: null, period_start: null, period_end: null,
    bucket_kind: null, bucket_anchor: null, bucket_calendar: null,
  };
}
