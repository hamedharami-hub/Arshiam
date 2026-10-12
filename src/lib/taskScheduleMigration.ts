import { endOfMonth, endOfQuarter, endOfYear, startOfMonth, startOfQuarter, startOfYear } from "date-fns-jalali";
import { schedulePatch, type ScheduleHorizon } from "./taskSchedule";

export const REMOVED_TASK_SCHEDULE_FIELDS = [
  "due_date",
  "due_at",
  "is_exact",
  "start_at",
  "end_at",
  "estimated_minutes",
] as const;

const PART_OF_DAY = ["morning", "noon", "afternoon", "night"] as const;
const PERIOD_KINDS = ["week", "month", "quarter", "year", "range"] as const;
const BUCKET_PERIODS = ["week", "month", "quarter", "year"] as const;
const MIRROR_KEYS = ["horizon", "period_start", "period_end"] as const;
const BUCKET_KEYS = ["bucket_kind", "bucket_anchor", "bucket_calendar"] as const;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Keys an explicit apply may archive. A normal schedule write must not delete these. */
export const LEGACY_SCHEDULE_ARCHIVE_KEYS = [
  ...REMOVED_TASK_SCHEDULE_FIELDS,
  ...BUCKET_KEYS,
  ...MIRROR_KEYS,
] as const;

export type LegacySchedulePreview = {
  needed: boolean;
  conflict: boolean;
  labelFa: string;
  labelEn: string;
  patch: Record<string, unknown> | null;
};

type PeriodProposal = {
  horizon: ScheduleHorizon;
  start: string;
  end: string;
  calendar: "jalali" | "gregorian" | null;
};

const EMPTY_PREVIEW: LegacySchedulePreview = {
  needed: false,
  conflict: false,
  labelFa: "",
  labelEn: "",
  patch: null,
};

function hasOwn(task: Record<string, any>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(task, key);
}

function present(task: Record<string, any>, key: string): boolean {
  return hasOwn(task, key) && task[key] !== undefined;
}

function calendarOf(value: unknown): "jalali" | "gregorian" | null {
  return value === "jalali" || value === "gregorian" ? value : null;
}

function dateOnly(value: unknown): string | null {
  return typeof value === "string" && DATE_ONLY.test(value) ? value : null;
}

function dateLike(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.includes("T")) return value;
  return dateOnly(value);
}

function localISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromYmd(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekBounds(ymd: string): { start: string; end: string } {
  const date = fromYmd(ymd);
  const sinceSaturday = (date.getDay() + 1) % 7;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceSaturday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start: localISO(start), end: localISO(end) };
}

function boundsFromAnchor(kind: "week" | "month" | "quarter" | "year", anchor: string, calendar: "jalali" | "gregorian" | null): { start: string; end: string } | null {
  const day = anchor.slice(0, 10);
  if (!DATE_ONLY.test(day)) return null;
  if (kind === "week") return weekBounds(day);
  const date = fromYmd(day);
  try {
    if (calendar === "jalali") {
      if (kind === "month") return { start: localISO(startOfMonth(date)), end: localISO(endOfMonth(date)) };
      if (kind === "quarter") return { start: localISO(startOfQuarter(date)), end: localISO(endOfQuarter(date)) };
      return { start: localISO(startOfYear(date)), end: localISO(endOfYear(date)) };
    }
  } catch {
    // Fall through to the civil month of the written anchor.
  }
  const [year, month] = day.split("-").map(Number);
  if (kind === "month") {
    const last = new Date(year, month, 0).getDate();
    return { start: `${day.slice(0, 8)}01`, end: `${day.slice(0, 8)}${String(last).padStart(2, "0")}` };
  }
  if (kind === "quarter") {
    const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const endMonth = startMonth + 2;
    const last = new Date(year, endMonth, 0).getDate();
    return {
      start: `${year}-${String(startMonth).padStart(2, "0")}-01`,
      end: `${year}-${String(endMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function isPeriodKind(value: unknown): value is ScheduleHorizon {
  return typeof value === "string" && (PERIOD_KINDS as readonly string[]).includes(value);
}

function isBucketPeriod(value: unknown): value is "week" | "month" | "quarter" | "year" {
  return typeof value === "string" && (BUCKET_PERIODS as readonly string[]).includes(value);
}

/** A stored week/month/quarter/year/range. A day mirror is not a competing period. */
function readNonDayPeriod(task: Record<string, any>): PeriodProposal | null {
  if (isPeriodKind(task.planning_horizon) && dateOnly(task.planning_start) && dateOnly(task.planning_end)) {
    return {
      horizon: task.planning_horizon,
      start: task.planning_start,
      end: task.planning_end,
      calendar: calendarOf(task.planning_calendar),
    };
  }
  if (isPeriodKind(task.horizon) && task.horizon !== "day" && dateOnly(task.period_start) && dateOnly(task.period_end)) {
    return {
      horizon: task.horizon,
      start: task.period_start,
      end: task.period_end,
      calendar: calendarOf(task.bucket_calendar ?? task.planning_calendar),
    };
  }
  if (isBucketPeriod(task.bucket_kind)) {
    const stored = dateOnly(task.period_start) && dateOnly(task.period_end)
      ? { start: task.period_start as string, end: task.period_end as string }
      : null;
    const bounds = stored || (typeof task.bucket_anchor === "string" ? boundsFromAnchor(task.bucket_kind, task.bucket_anchor, calendarOf(task.bucket_calendar)) : null);
    if (bounds) return { horizon: task.bucket_kind, ...bounds, calendar: calendarOf(task.bucket_calendar) };
  }
  return null;
}

function explicitEmptyWorkDate(task: Record<string, any>): boolean {
  return hasOwn(task, "work_date") && (task.work_date == null || task.work_date === "");
}

/**
 * A concrete former work day. An explicit empty work_date is never filled from due_date.
 * due_date is a former work date, never a deadline.
 */
function readConcreteWork(task: Record<string, any>, explicitEmpty: boolean): string | null {
  if (explicitEmpty) return null;
  const work = dateLike(task.work_date);
  if (work) return work;
  if (hasOwn(task, "work_date")) return null;
  for (const key of ["due_date", "due_at", "start_at"] as const) {
    const value = dateLike(task[key]);
    if (value) return value;
  }
  if ((PART_OF_DAY as readonly string[]).includes(task.bucket_kind)) return dateLike(task.bucket_anchor);
  return null;
}

function hasLegacyResidue(task: Record<string, any>): boolean {
  if (REMOVED_TASK_SCHEDULE_FIELDS.some((key) => present(task, key))) return true;
  if ((PART_OF_DAY as readonly string[]).includes(task.bucket_kind)) return true;
  if (isBucketPeriod(task.bucket_kind)) return true;
  return MIRROR_KEYS.some((key) => present(task, key) && task[key] != null && task[key] !== "");
}

function archivePresent(task: Record<string, any>): Record<string, unknown> {
  const legacy: Record<string, unknown> = {};
  for (const key of REMOVED_TASK_SCHEDULE_FIELDS) {
    if (present(task, key)) legacy[key] = task[key];
  }
  const bucketLegacy = (PART_OF_DAY as readonly string[]).includes(task.bucket_kind) || isBucketPeriod(task.bucket_kind);
  if (bucketLegacy) {
    for (const key of BUCKET_KEYS) {
      if (present(task, key)) legacy[key] = task[key];
    }
  }
  if (MIRROR_KEYS.some((key) => present(task, key) && task[key] != null && task[key] !== "")) {
    for (const key of MIRROR_KEYS) {
      if (present(task, key)) legacy[key] = task[key];
    }
  }
  return legacy;
}

function commit(result: ReturnType<typeof schedulePatch>): Record<string, unknown> | null {
  return result.ok ? { ...result.patch } : null;
}

function clockZone(task: Record<string, any>): string {
  return typeof task.schedule_timezone === "string" && task.schedule_timezone.trim() ? task.schedule_timezone.trim() : "UTC";
}

function periodLabel(horizon: ScheduleHorizon): { fa: string; en: string } {
  if (horizon === "week") return { fa: "هفته", en: "week" };
  if (horizon === "month") return { fa: "ماه", en: "month" };
  if (horizon === "quarter") return { fa: "فصل", en: "quarter" };
  if (horizon === "year") return { fa: "سال", en: "year" };
  return { fa: "بازه", en: "range" };
}

function labelsFor(kind: "none" | "day" | "clock" | "horizon", value?: string, horizon?: ScheduleHorizon): { labelFa: string; labelEn: string } {
  if (kind === "none") {
    return {
      labelFa: "تاریخ کار خالی می‌ماند و فیلدهای قدیمی بایگانی می‌شوند.",
      labelEn: "The work date stays empty and the old fields are archived.",
    };
  }
  if (kind === "day") {
    return {
      labelFa: `برنامهٔ قدیمی به روز ${value} تبدیل می‌شود.`,
      labelEn: `The old schedule becomes the day ${value}.`,
    };
  }
  if (kind === "clock") {
    return {
      labelFa: `برنامهٔ قدیمی به ساعت ${value} تبدیل می‌شود.`,
      labelEn: `The old schedule becomes the clock time ${value}.`,
    };
  }
  const name = periodLabel(horizon || "week");
  return {
    labelFa: `برنامهٔ قدیمی به دورهٔ ${name.fa} تبدیل می‌شود.`,
    labelEn: `The old schedule becomes the ${name.en} period.`,
  };
}

const CONFLICT_LABEL = {
  labelFa: "هم روز کار و هم دوره روی این تسک است. در انتخابگر یکی را انتخاب کنید.",
  labelEn: "Both a work day and a period are set. Choose one in the picker.",
};

/**
 * Read-only preview of one legacy task. Does not write, delete, or pick a winner
 * when a work day and a non-day period both exist.
 */
export function legacySchedulePreview(task: Record<string, any> | null | undefined): LegacySchedulePreview {
  const source = task && typeof task === "object" ? task : {};
  if (source.schedule_v === 2) return { ...EMPTY_PREVIEW };
  const explicitEmpty = explicitEmptyWorkDate(source);
  const concrete = readConcreteWork(source, explicitEmpty);
  const period = readNonDayPeriod(source);
  const residue = hasLegacyResidue(source);
  if (!residue && !(concrete && period)) return { ...EMPTY_PREVIEW };
  if (concrete && period) {
    return { needed: true, conflict: true, ...CONFLICT_LABEL, patch: null };
  }
  if (explicitEmpty && period) {
    const patch = commit(schedulePatch({ mode: "horizon", horizon: period.horizon, start: period.start, end: period.end, calendar: period.calendar }));
    return { needed: true, conflict: false, ...labelsFor("horizon", undefined, period.horizon), patch };
  }
  if (explicitEmpty || (!concrete && !period)) {
    return { needed: true, conflict: false, ...labelsFor("none"), patch: commit(schedulePatch({ mode: "none" })) };
  }
  if (concrete?.includes("T")) {
    const patch = commit(schedulePatch({ mode: "clock", instant: concrete, timezone: clockZone(source) }));
    return { needed: true, conflict: false, ...labelsFor("clock", concrete), patch };
  }
  if (concrete && DATE_ONLY.test(concrete)) {
    return { needed: true, conflict: false, ...labelsFor("day", concrete), patch: commit(schedulePatch({ mode: "day", date: concrete })) };
  }
  if (period) {
    const patch = commit(schedulePatch({ mode: "horizon", horizon: period.horizon, start: period.start, end: period.end, calendar: period.calendar }));
    return { needed: true, conflict: false, ...labelsFor("horizon", undefined, period.horizon), patch };
  }
  return { needed: true, conflict: false, ...labelsFor("none"), patch: commit(schedulePatch({ mode: "none" })) };
}

/**
 * Proposed schedule fields plus a plain archive of legacy values that were present.
 * Delete markers are added only by the click-path apply write. Conflict yields null.
 */
export function applyLegacySchedule(task: Record<string, any> | null | undefined): Record<string, unknown> | null {
  const preview = legacySchedulePreview(task);
  if (!preview.patch) return null;
  const source = task && typeof task === "object" ? task : {};
  return { ...preview.patch, schedule_legacy: archivePresent(source) };
}

export function isExplicitScheduleApply(patch: Record<string, any> | null | undefined): boolean {
  if (!patch || patch.schedule_v !== 2) return false;
  const legacy = patch.schedule_legacy;
  return !!legacy && typeof legacy === "object" && !Array.isArray(legacy);
}

/** Archived keys that were actually present. Empty unless this write is an explicit apply. */
export function scheduleApplyDeleteKeys(patch: Record<string, any> | null | undefined): string[] {
  if (!isExplicitScheduleApply(patch)) return [];
  const legacy = patch!.schedule_legacy as Record<string, unknown>;
  return Object.keys(legacy).filter((key) => (LEGACY_SCHEDULE_ARCHIVE_KEYS as readonly string[]).includes(key));
}

/** Convert saved schedules from older app versions into the supported task fields.
 * This module has no browser dependencies so API reads use the same conversion.
 * The returned copy may omit removed keys. The original object is not changed, and reading does not write.
 */
export function normalizeTaskSchedule<T extends Record<string, any>>(task: T): T {
  const next: Record<string, any> = { ...task };
  if (
    next.work_date === undefined &&
    ["due_date", "due_at", "start_at"].some((key) => key in task)
  ) {
    next.work_date = next.due_date || next.due_at || next.start_at || null;
  }
  // An explicit empty work date must stay empty, even when a former deadline exists.
  if (["morning", "noon", "afternoon", "night"].includes(next.bucket_kind)) {
    if (!next.work_date && task.work_date === undefined) {
      next.work_date = next.bucket_anchor || null;
    }
    delete next.bucket_kind;
    delete next.bucket_anchor;
    delete next.bucket_calendar;
  }
  if (task.is_exact === true) {
    delete next.horizon;
    delete next.period_start;
    delete next.period_end;
  }
  for (const key of REMOVED_TASK_SCHEDULE_FIELDS) {
    delete next[key];
  }
  return next as T;
}

/** Strip unsupported fields from partial writes without adding an empty work date. */
export function supportedTaskPatch<T extends Record<string, any>>(patch: T): T {
  const next = normalizeTaskSchedule(patch);
  if (
    !["work_date", "due_date", "due_at", "start_at", "bucket_kind"].some((key) =>
      Object.prototype.hasOwnProperty.call(patch, key)
    )
  ) {
    delete next.work_date;
  }
  return next;
}
