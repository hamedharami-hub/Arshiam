/** Date-only deadline helpers. These intentionally avoid Date parsing and UTC conversion. */
export type DeadlineStatus = "none" | "upcoming" | "overdue";

export type DeadlineTaskLike = {
  recurrence?: string | null;
  recurrence_rule?: unknown;
  completed?: boolean;
  status?: string | null;
};

/** Deadlines are independent of recurrence and can be edited or cleared on every task. */
export function supportsTaskDeadline(_task: DeadlineTaskLike): boolean {
  return true;
}

export function isTaskClosed(task: DeadlineTaskLike): boolean {
  return task.completed === true || task.status === "done" || task.status === "wont_do";
}

export function isValidDeadlineDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= daysInMonth;
}

/** Gregorian ordinal for a calendar date, calculated using integer arithmetic (no timezone). */
function civilDayNumber(value: string): number {
  let [year, month, day] = value.split("-").map(Number);
  year -= month <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra;
}

/**
 * Returns `upcoming` from today through seven days ahead, `overdue` for prior
 * dates, and `none` for an absent, invalid, or more distant date. Callers decide
 * whether a completed task should suppress the status.
 */
export function taskDeadlineStatus(deadlineDate: unknown, today: string): DeadlineStatus {
  if (!isValidDeadlineDate(deadlineDate) || !isValidDeadlineDate(today)) return "none";
  if (deadlineDate < today) return "overdue";
  return civilDayNumber(deadlineDate) - civilDayNumber(today) <= 7 ? "upcoming" : "none";
}
