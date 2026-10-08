import type { Task } from "@/lib/taskTypes";

/** Calendar-only extensions are optional until the shared task model lands. */
export type CalendarTask = Pick<Task, "id" | "title" | "completed"> & Partial<Task> & {
  due_date: string | null;
  priority: string;
  deadline_date?: string | null;
  tag_ids?: string[];
  calendar_kind?: "schedule" | "deadline";
};

/** Date-only and legacy 23:59 task dates belong in the calendar's all-day area. */
export function isAllDayCalendarDate(value: string | null | undefined, scheduleVersion?: number | null): boolean {
  if (!value) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
  if (scheduleVersion === 2) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getHours() === 23 && date.getMinutes() === 59;
}
