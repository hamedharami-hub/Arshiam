import { formatDueLabel } from "./localeFormat";
import type { Task } from "./taskTypes";
import { readSchedule, schedulePatch, scheduleFromDateValue, scheduleWorkDate } from "./taskSchedule";

/** The task's day (YYYY-MM-DD) or instant, read from the single schedule. Null for "no schedule" and for a period plan. */
export function taskWorkDate(task: Partial<Task>): string | null {
  return scheduleWorkDate(readSchedule(task));
}

/** Set the task's day/instant. Replaces any earlier schedule (a period plan included) — one task, one schedule. */
export function workDatePatch(_task: Partial<Task>, work_date: string | null): Partial<Task> {
  return schedulePatch(scheduleFromDateValue(work_date));
}

/** Parse task dates consistently in the user's local timezone.
 * Date-only Firestore values must not go through Date.parse (UTC), otherwise
 * they can move to the previous day in negative timezones.
 */
export function parseTaskDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? (() => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); })()
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function taskDueTimestamp(value: string | null | undefined): number {
  return parseTaskDueDate(value)?.getTime() ?? Number.POSITIVE_INFINITY;
}

/** Get a YYYY-MM-DD string in the user's local timezone (or specified timezone), never shifting day due to UTC */
export function getLocalDateString(date: Date = new Date(), timeZone?: string): string {
  if (isNaN(date.getTime())) return "";
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTaskDueDateDisplay(value: string | null | undefined, isEn = false, scheduleVersion?: number | null): string {
  return formatDueLabel(value, null, isEn ? "en" : "fa", scheduleVersion) || "";
}

/**
 * True once the task's remaining date/time has passed.
 * Date-only values are overdue after that day ends; values with a clock time are overdue at that time.
 * Only legacy, non-v2 23:59 values can be treated as an all-day marker.
 */
export function isScheduleOverdue(value: string | null | undefined, now: Date = new Date(), scheduleVersion?: number | null): boolean {
  const d = parseTaskDueDate(value);
  if (!d || !value) return false;
  const legacyLastMinuteMarker = scheduleVersion !== 2 && d.getHours() === 23 && d.getMinutes() === 59;
  const allDay = !value.includes("T") || legacyLastMinuteMarker;
  if (allDay) return d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return d.getTime() < now.getTime();
}
