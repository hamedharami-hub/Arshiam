/**
 * The one operational schedule of a task.
 *
 * Contract (schedule_v = 2):
 *   - kind "none"     → work_date = null and planning_* = null
 *   - kind "day"      → work_date = "YYYY-MM-DD" (a calendar date, never shifted through UTC)
 *   - kind "datetime" → work_date = full ISO instant chosen explicitly by the user
 *   - kind "period"   → planning_horizon/start/end (+calendar); work_date = null.
 *                       A custom range keeps its own start/end (it is not snapped to a calendar week).
 *
 * Only these fields are read for migrated tasks. Older fields (due_date, due_at, is_exact, horizon,
 * period_start/end, bucket_*) are read once by `legacySchedule`, converted, and kept as a backup in
 * `schedule_legacy`; they are never an independent source again.
 *
 * Status, priority, waiting, goal links and recurrence are independent of the schedule.
 */
import type { Task } from "./taskTypes";
import {
  ALL_HORIZONS, addDaysLocal, fromLocalISO, getTimeSettings, nextPeriod, periodFor, periodLabel, prevPeriod, toLocalISO,
  type Horizon, type Period, type TimeSettings,
} from "./timeHorizon";

export const SCHEDULE_VERSION = 2;

export type TaskSchedule =
  | { kind: "none" }
  | { kind: "day"; date: string }
  | { kind: "datetime"; date: string; at: string }
  | { kind: "period"; period: Period };

export const NO_SCHEDULE: TaskSchedule = { kind: "none" };

/** Fields that held a schedule (or a removed feature) before v2. Kept only as a migration backup. */
export const LEGACY_SCHEDULE_FIELDS = [
  "due_date", "due_at", "is_exact", "horizon", "period_start", "period_end",
  "bucket_kind", "bucket_anchor", "bucket_calendar",
  "planning_horizon", "planning_start", "planning_end", "planning_calendar", "work_date",
  "schedule_timezone",
  // removed features: time block, part of day, deadline
  "start_at", "end_at", "estimated_minutes", "time_of_day", "part_of_day", "deadline",
] as const;
const REMOVED_FEATURE_FIELDS = ["start_at", "end_at", "estimated_minutes", "time_of_day", "part_of_day", "deadline"] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const isHorizon = (h: unknown): h is Horizon => typeof h === "string" && (ALL_HORIZONS as string[]).includes(h);
function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
const EXPLICIT_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i;
function validExplicitInstant(value: unknown): value is string {
  return typeof value === "string" && EXPLICIT_INSTANT.test(value) && validDay(value.slice(0, 10)) && !Number.isNaN(Date.parse(value));
}
function validTaskDate(value: unknown): value is string {
  return validDay(value) || validExplicitInstant(value);
}

/** New writes preserve every explicit instant. Legacy all-day inference is opt-in. */
export function scheduleFromDateValue(value: string | null | undefined, legacyAllDay = false): TaskSchedule {
  if (!value) return NO_SCHEDULE;
  if (DATE_ONLY.test(value)) return validDay(value) ? { kind: "day", date: value } : NO_SCHEDULE;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return NO_SCHEDULE;
  const date = toLocalISO(d);
  const allDay = legacyAllDay && ((d.getHours() === 0 && d.getMinutes() === 0) || (d.getHours() === 23 && d.getMinutes() === 59));
  return allDay ? { kind: "day", date } : { kind: "datetime", date, at: d.toISOString() };
}

function periodSchedule(p: Period): TaskSchedule {
  return p.horizon === "day" ? { kind: "day", date: p.start } : { kind: "period", period: p };
}

export type LegacyResolution = { schedule: TaskSchedule; conflict: string | null };

/** Read a not-yet-migrated task. The more precise value wins; a disagreeing broad plan is only reported. */
export function legacySchedule(task: Partial<Task>, s: TimeSettings = getTimeSettings()): LegacyResolution {
  let precise: TaskSchedule | null = null;
  if (task.work_date !== undefined) precise = scheduleFromDateValue(task.work_date, task.is_exact !== true);
  else if (task.is_exact && task.due_at) precise = scheduleFromDateValue(task.due_at);
  else if (task.due_date) precise = scheduleFromDateValue(task.due_date, task.is_exact !== true);
  if (precise?.kind === "none") precise = null;

  let period: Period | null = null;
  if (task.planning_horizon !== undefined) {
    // An explicit null is a cleared plan: never fall back to older fields (bug: plan came back).
    if (isHorizon(task.planning_horizon) && task.planning_start && task.planning_end) {
      period = { horizon: task.planning_horizon, start: task.planning_start, end: task.planning_end };
    }
  } else if (isHorizon(task.bucket_kind) && task.bucket_anchor) {
    period = periodFor(task.bucket_kind, fromLocalISO(task.bucket_anchor), { ...s, calendar: task.bucket_calendar || s.calendar });
  } else if (isHorizon(task.horizon) && !task.is_exact && task.period_start && task.period_end) {
    period = { horizon: task.horizon, start: task.period_start, end: task.period_end };
  }

  if (precise && (precise.kind === "day" || precise.kind === "datetime")) {
    const day = precise.date;
    const conflict = period && !(day >= period.start && day <= period.end)
      ? `plan ${period.horizon} ${period.start}..${period.end} does not contain date ${day}; the date was kept`
      : null;
    return { schedule: precise, conflict };
  }
  return { schedule: period ? periodSchedule(period) : NO_SCHEDULE, conflict: null };
}

/** The task's single schedule. */
export function readSchedule(task: Partial<Task> | null | undefined, s: TimeSettings = getTimeSettings()): TaskSchedule {
  if (!task) return NO_SCHEDULE;
  if (task.schedule_v !== SCHEDULE_VERSION) return legacySchedule(task, s).schedule;
  if (task.work_date) {
    const fromDate = scheduleFromDateValue(task.work_date);
    if (fromDate.kind !== "none") return fromDate;
  }
  if (isHorizon(task.planning_horizon) && task.planning_start && task.planning_end) {
    return periodSchedule({ horizon: task.planning_horizon, start: task.planning_start, end: task.planning_end });
  }
  return NO_SCHEDULE;
}

/** Firestore patch that stores exactly one schedule and neutralises every legacy source. */
export function schedulePatch(schedule: TaskSchedule, s: TimeSettings = getTimeSettings()): Partial<Task> {
  const base: Partial<Task> = {
    schedule_v: SCHEDULE_VERSION,
    schedule_timezone: null,
    work_date: null,
    planning_horizon: null, planning_start: null, planning_end: null, planning_calendar: null,
    due_date: null, due_at: null, is_exact: null, horizon: null, period_start: null, period_end: null,
    bucket_kind: null, bucket_anchor: null, bucket_calendar: null,
  };
  if (schedule.kind === "day") return { ...base, work_date: schedule.date };
  if (schedule.kind === "datetime") return { ...base, work_date: schedule.at, schedule_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  if (schedule.kind === "period") {
    if (schedule.period.horizon === "day") return { ...base, work_date: schedule.period.start };
    return {
      ...base,
      planning_horizon: schedule.period.horizon, planning_start: schedule.period.start, planning_end: schedule.period.end,
      planning_calendar: s.calendar,
    };
  }
  return base;
}

export const clearSchedulePatch = (s?: TimeSettings) => schedulePatch(NO_SCHEDULE, s);
export const dayPatch = (date: string, s?: TimeSettings) => schedulePatch({ kind: "day", date }, s);
export const periodPatch = (period: Period | null, s?: TimeSettings) => schedulePatch(period ? periodSchedule(period) : NO_SCHEDULE, s);

/** Combine a calendar day and an optional HH:MM in local time. DST-safe: built from local parts. */
export function dateTimeSchedule(date: string, hhmm: string | null): TaskSchedule {
  if (!validDay(date)) throw new Error("A real YYYY-MM-DD date is required");
  if (!hhmm) return { kind: "day", date };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) throw new Error("Time must be a valid local HH:MM value");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const at = new Date(y, m - 1, d, h, min);
  if (at.getFullYear() !== y || at.getMonth() !== m - 1 || at.getDate() !== d || at.getHours() !== h || at.getMinutes() !== min) {
    throw new Error("The selected local time does not exist because of a clock change");
  }
  return { kind: "datetime", date: toLocalISO(at), at: at.toISOString() };
}

/** Backwards-compatible: value is a day or an instant (or null = clear). */
export function scheduleFromWorkDate(value: string | null): TaskSchedule {
  const sch = scheduleFromDateValue(value);
  return sch;
}

// ---------------- periods & views ----------------
const rank = (h: Horizon) => ALL_HORIZONS.indexOf(h);

/** The plan period a schedule occupies (a day/datetime is its own day). */
export function schedulePeriod(schedule: TaskSchedule): Period | null {
  if (schedule.kind === "day" || schedule.kind === "datetime") return { horizon: "day", start: schedule.date, end: schedule.date };
  if (schedule.kind === "period") return schedule.period;
  return null;
}

/** True when the stored period is not exactly one calendar period (e.g. 10 Jun – 10 Jul). */
export function isCustomRange(p: Period, s: TimeSettings = getTimeSettings()): boolean {
  if (p.horizon === "day") return p.start !== p.end;
  const snapped = periodFor(p.horizon, fromLocalISO(p.start), s);
  return snapped.start !== p.start || snapped.end !== p.end;
}

const utcDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const rangeLengthDays = (p: Pick<Period, "start" | "end">) => Math.round((utcDay(p.end) - utcDay(p.start)) / 86_400_000) + 1;

/** "Next period": a custom range keeps its inclusive length and starts the day after it ended. */
export function nextPlanPeriod(p: Period, s: TimeSettings = getTimeSettings()): Period {
  if (!isCustomRange(p, s)) return nextPeriod(p, s);
  const start = addDaysLocal(fromLocalISO(p.end), 1);
  return { horizon: p.horizon, start: toLocalISO(start), end: toLocalISO(addDaysLocal(start, rangeLengthDays(p) - 1)) };
}
export function prevPlanPeriod(p: Period, s: TimeSettings = getTimeSettings()): Period {
  if (!isCustomRange(p, s)) return prevPeriod(p, s);
  const end = addDaysLocal(fromLocalISO(p.start), -1);
  return { horizon: p.horizon, start: toLocalISO(addDaysLocal(end, -(rangeLengthDays(p) - 1))), end: toLocalISO(end) };
}

/**
 * Does a scheduled task belong in a plan view? Same or finer level, and the spans overlap
 * (both ends inclusive). A month plan without a day never appears in a day view.
 */
export function scheduleInView(schedule: TaskSchedule, view: Period): boolean {
  const p = schedulePeriod(schedule);
  if (!p) return false;
  return rank(p.horizon) <= rank(view.horizon) && p.start <= view.end && p.end >= view.start;
}

/** A real commitment for this calendar day (only a day or a time on that day). */
export function isScheduledOn(schedule: TaskSchedule, day: string): boolean {
  return (schedule.kind === "day" || schedule.kind === "datetime") && schedule.date === day;
}

/** Open task (not done, not set aside). */
export function isOpenTask(task: Partial<Task>): boolean {
  return !task.completed && task.status !== "done" && task.status !== "wont_do";
}

/**
 * Shared selector: an open task the user actually committed to for this calendar day
 * (a day or a time on that day). Month/week plans without a day, future, done or set-aside tasks are excluded.
 */
export function isTodayCommitment(task: Partial<Task>, now = new Date(), s: TimeSettings = getTimeSettings()): boolean {
  return isOpenTask(task) && isScheduledOn(readSchedule(task, s), toLocalISO(now));
}

/** The schedule has passed: a day after it ends, a time once it is reached, a period after its last day. */
export function isSchedulePast(schedule: TaskSchedule, now = new Date()): boolean {
  if (schedule.kind === "none") return false;
  if (schedule.kind === "datetime") return new Date(schedule.at).getTime() < now.getTime();
  const end = schedule.kind === "day" ? schedule.date : schedule.period.end;
  return end < toLocalISO(now);
}

/** Value stored in work_date for day/datetime schedules (null for none/period). */
export function scheduleWorkDate(schedule: TaskSchedule): string | null {
  return schedule.kind === "day" ? schedule.date : schedule.kind === "datetime" ? schedule.at : null;
}

// ---------------- migration ----------------
export function needsScheduleMigration(task: Partial<Task>): boolean {
  if (task.schedule_v === SCHEDULE_VERSION) return false;
  return LEGACY_SCHEDULE_FIELDS.some((f) => (task as Record<string, unknown>)[f] !== undefined);
}

/** One-time, idempotent conversion. Returns null when the task is already on v2. */
export function scheduleMigrationPatch(task: Partial<Task>, s: TimeSettings = getTimeSettings(), now = new Date()): Partial<Task> | null {
  if (!needsScheduleMigration(task)) return null;
  const { schedule, conflict } = legacySchedule(task, s);
  const backup: Record<string, unknown> = {};
  for (const f of LEGACY_SCHEDULE_FIELDS) {
    const v = (task as Record<string, unknown>)[f];
    if (v !== undefined) backup[f] = v;
  }
  const removed: Record<string, null> = {};
  for (const f of REMOVED_FEATURE_FIELDS) if ((task as Record<string, unknown>)[f] !== undefined) removed[f] = null;
  return {
    ...schedulePatch(schedule, s),
    ...removed,
    schedule_legacy: { version: SCHEDULE_VERSION, migrated_at: now.toISOString(), fields: backup, ...(conflict ? { conflict } : {}) },
  } as Partial<Task>;
}

/** Apply a migration patch locally (used for in-memory reads before the write lands). */
export function migrateTask<T extends Partial<Task>>(task: T, s?: TimeSettings): T {
  const patch = scheduleMigrationPatch(task, s);
  return patch ? { ...task, ...patch } : task;
}

// ---------------- labels ----------------
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faDigits = (v: string) => v.replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

function shortDate(iso: string, s: TimeSettings, lang: "fa" | "en", weekday = false, year = false): string {
  const d = fromLocalISO(iso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", ...(weekday ? { weekday: "short" } : {}), ...(year ? { year: "numeric" } : {}) };
  const loc = s.calendar === "jalali"
    ? (lang === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian")
    : (lang === "fa" ? "fa-IR-u-ca-gregory" : "en-US");
  return d.toLocaleDateString(loc, opts).replace(/\s?AP$/, "");
}

const RELATIVE: Record<Exclude<Horizon, "day">, { prev: [string, string]; cur: [string, string]; next: [string, string] }> = {
  week: { prev: ["هفتهٔ پیش", "Last week"], cur: ["این هفته", "This week"], next: ["هفتهٔ بعد", "Next week"] },
  month: { prev: ["ماه پیش", "Last month"], cur: ["این ماه", "This month"], next: ["ماه بعد", "Next month"] },
  quarter: { prev: ["فصل پیش", "Last season"], cur: ["این فصل", "This season"], next: ["فصل بعد", "Next season"] },
  year: { prev: ["پارسال", "Last year"], cur: ["امسال", "This year"], next: ["سال بعد", "Next year"] },
};

/** Clear words or a date: yesterday, today, tomorrow, this/next/last period, or the actual date/range. */
export function periodText(p: Period, s: TimeSettings, lang: "fa" | "en", now = new Date()): string {
  const fa = lang === "fa";
  if (p.horizon === "day" || p.start === p.end) {
    const today = toLocalISO(now);
    if (p.start === today) return fa ? "امروز" : "Today";
    if (p.start === toLocalISO(addDaysLocal(now, 1))) return fa ? "فردا" : "Tomorrow";
    if (p.start === toLocalISO(addDaysLocal(now, -1))) return fa ? "دیروز" : "Yesterday";
    const thisYear = periodFor("year", now, s);
    return shortDate(p.start, s, lang, true, p.start < thisYear.start || p.start > thisYear.end);
  }
  if (isCustomRange(p, s)) return `${shortDate(p.start, s, lang)} – ${shortDate(p.end, s, lang)}`;
  const cur = periodFor(p.horizon, now, s);
  const rel = RELATIVE[p.horizon];
  if (p.start === cur.start) return rel.cur[fa ? 0 : 1];
  if (p.start === nextPeriod(cur, s).start) return rel.next[fa ? 0 : 1];
  if (p.start === prevPeriod(cur, s).start) return rel.prev[fa ? 0 : 1];
  const label = periodLabel(p, s, lang, now);
  return fa ? faDigits(label) : label;
}

/** Human label for any schedule, or null for "no schedule". */
export function scheduleLabel(schedule: TaskSchedule, s: TimeSettings, lang: "fa" | "en", now = new Date()): string | null {
  if (schedule.kind === "none") return null;
  if (schedule.kind === "period") return periodText(schedule.period, s, lang, now);
  const day = periodText({ horizon: "day", start: schedule.date, end: schedule.date }, s, lang, now);
  if (schedule.kind === "day") return day;
  const at = new Date(schedule.at);
  const hhmm = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  return `${day} · ${lang === "fa" ? faDigits(hhmm) : hhmm}`;
}

// ---------------- shared adapters ----------------
/** Compact, schedule-aware task summary for AI prompts (one "when" value, no legacy fields). */
export function compactTasksForAI(tasks: Array<Partial<Task>>, s: TimeSettings = getTimeSettings()) {
  return tasks.map((t) => {
    const sch = readSchedule(t, s);
    const when = sch.kind === "none" ? null
      : sch.kind === "period" ? `${sch.period.horizon} ${sch.period.start}..${sch.period.end}`
      : sch.kind === "datetime" ? sch.at : sch.date;
    return { title: t.title, priority: t.priority, completed: Boolean(t.completed), when };
  });
}

/**
 * Write adapter for older code paths that still send `due_date` (or removed time-block / part-of-day /
 * deadline fields). Converts them to the single schedule so a legacy field never becomes a second,
 * independent schedule again. Writes that already speak the v2 contract pass through unchanged.
 */
export function normalizeTaskWrite<T extends Record<string, unknown>>(row: T, s: TimeSettings = getTimeSettings()): T {
  if (!row || typeof row !== "object") return row;
  const out: Record<string, unknown> = { ...row };
  if (out.deadline_date !== undefined && out.deadline_date !== null && !validDay(out.deadline_date)) {
    throw new Error("deadline_date must be a real YYYY-MM-DD calendar date or null");
  }
  for (const f of REMOVED_FEATURE_FIELDS) if (out[f] !== undefined && out[f] !== null) delete out[f];
  const hasDate = out.work_date !== undefined;
  const hasPeriod = out.planning_horizon !== undefined;
  if (hasDate && out.work_date && hasPeriod && out.planning_horizon) throw new Error("Conflicting task schedules: choose a date or a period");
  let canonical: TaskSchedule | undefined;
  if (hasPeriod && out.planning_horizon) {
    if (!isHorizon(out.planning_horizon) || !validDay(out.planning_start) || !validDay(out.planning_end) || out.planning_start > out.planning_end) {
      throw new Error("A period requires a valid horizon, start and end");
    }
    canonical = periodSchedule({ horizon: out.planning_horizon, start: out.planning_start, end: out.planning_end });
  } else if (hasDate) canonical = scheduleFromDateValue(out.work_date as string | null);
  else if (hasPeriod) canonical = NO_SCHEDULE;
  else if (out.schedule_v !== SCHEDULE_VERSION && out.due_date !== undefined) canonical = scheduleFromDateValue(out.due_date as string | null);
  const dateInput = hasDate ? out.work_date : !hasPeriod && out.schedule_v !== SCHEDULE_VERSION ? out.due_date : undefined;
  if (dateInput !== undefined && dateInput !== null && !validTaskDate(dateInput)) {
    throw new Error("Task date must be a real YYYY-MM-DD day or an ISO 8601 instant with an explicit offset");
  }
  if (canonical) {
    const timezone = out.schedule_timezone;
    const calendar = out.planning_calendar;
    Object.assign(out, schedulePatch(canonical, s));
    if (canonical.kind === "datetime" && typeof timezone === "string") out.schedule_timezone = timezone;
    else if (canonical.kind === "datetime" && (timezone === null || row.schedule_v === SCHEDULE_VERSION)) out.schedule_timezone = null;
    if (canonical.kind === "period" && (calendar === "jalali" || calendar === "gregorian")) out.planning_calendar = calendar;
  }
  return out as T;
}
