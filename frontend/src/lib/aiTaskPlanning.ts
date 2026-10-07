import { readSchedule, type TaskSchedule } from "@/lib/taskSchedule";
import type { Task } from "@/lib/taskTypes";

export type TaskListDraft = {
  source_text: string;
  title: string;
  description: string | null;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  work_date: string | null;
};

export type AIWorkTask = Pick<Task, "id" | "title"> & Partial<Pick<Task, "priority" | "completed" | "status" | "folder_id" | "parent_id" | "source_type" | "work_date" | "due_date" | "schedule_v" | "planning_horizon" | "planning_start" | "planning_end" | "planning_calendar" | "schedule_timezone">>;

const VALID_PRIORITIES = new Set(["none", "low", "medium", "high", "urgent"]);
const EXPLICIT_DATE_HINT = /\b(?:today|tomorrow|day after tomorrow|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)(?![\p{L}])/iu;
const EXPLICIT_PERSIAN_WEEKDAY = /(?:شنبه|یکشنبه|یک‌شنبه|دوشنبه|دو‌شنبه|سه‌شنبه|سه شنبه|سهشنبه|چهارشنبه|چهار‌شنبه|پنجشنبه|پنج‌شنبه|پنج شنبه|جمعه)/u;
const EXPLICIT_RELATIVE_DAYS = /\bin\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\b|(?:\d+|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)\s*روز\s*(?:دیگه|دیگر|بعد)/iu;
const EXPLICIT_ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/u;
const EXPLICIT_PERSIAN_DATE = /(?:امروز|فردا|پس\s*فردا|پس‌فردا)/u;
const EXPLICIT_DEADLINE_CONTEXT = /\b(?:deadline|due(?:\s+(?:by|on))?|no\s+later\s+than)\b|\bby\s+(?=(?:at\s+)?(?:\d|today|tomorrow|day\s+after\s+tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday))|(?:مهلت|موعد\s+تحویل|تا\s*(?:ساعت\s*)?(?:[\d۰-۹٠-٩]|امروز|فردا|پس\s*فردا|شنبه|یکشنبه|یک‌شنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|پنجشنبه|پنج‌شنبه|جمعه))/iu;
const EXPLICIT_TIME_QUALIFIER = /(?<![\p{L}])(?:am|pm)(?![\p{L}])|(?:صبح|بامداد|ظهر|عصر|بعد\s*از\s*ظهر|بعدازظهر|شب)/iu;
const EXPLICIT_24_HOUR_TIME = /(?:ساعت\s*)?\d{1,2}[:٫]\d{2}|(?:ساعت\s*)?(?:13|14|15|16|17|18|19|20|21|22|23)(?!\d)/u;

/**
 * Convert only an explicitly named date into a task schedule. The general
 * quick-add parser also assumes today/tomorrow for a time-only phrase; AI
 * previews must not turn that convenience into a guessed commitment.
 */
export function parseExplicitWorkDate(source: string, parseDate: (text: string) => string | null): string | null {
  const normalized = source.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10));
  if (EXPLICIT_DEADLINE_CONTEXT.test(normalized)) return null;
  const hasDate = EXPLICIT_DATE_HINT.test(normalized) || EXPLICIT_PERSIAN_WEEKDAY.test(normalized) ||
    EXPLICIT_RELATIVE_DAYS.test(normalized) || EXPLICIT_ISO_DATE.test(normalized) || EXPLICIT_PERSIAN_DATE.test(normalized);
  if (!hasDate) return null;
  const parsed = parseDate(source);
  if (!parsed) return null;
  // The generic parser assigns an implicit 05:00 to phrases such as
  // "tomorrow at 5". Keep the explicit day and omit an ambiguous clock.
  if (/^\d{4}-\d{2}-\d{2}T/.test(parsed) && !EXPLICIT_TIME_QUALIFIER.test(normalized) && !EXPLICIT_24_HOUR_TIME.test(normalized)) {
    return parsed.slice(0, 10);
  }
  return parsed;
}

function exactSourceMatch(source: string, original: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  return !!source && normalize(original).includes(normalize(source));
}

/** Accepts only task proposals grounded in an exact quote from the user's input. */
export function parseTaskListDrafts(data: unknown, originalInput: string, parseDate: (text: string) => string | null): TaskListDraft[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const drafts: TaskListDraft[] = [];
  const seen = new Set<string>();
  for (const item of items.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const source = typeof row.source_text === "string" ? row.source_text.trim().slice(0, 500) : "";
    const title = typeof row.title === "string" ? row.title.trim().slice(0, 240) : "";
    if (!title || !exactSourceMatch(source, originalInput)) continue;
    const key = title.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const description = typeof row.description === "string" ? row.description.trim().slice(0, 1200) : "";
    const priority = typeof row.priority === "string" && VALID_PRIORITIES.has(row.priority) ? row.priority as TaskListDraft["priority"] : "none";
    // The model cannot author schedule values. Only the deterministic parser may
    // extract a date from the verbatim, input-matched quote shown in the preview.
    drafts.push({ source_text: source, title, description: description || null, priority, work_date: parseDate(source) });
  }
  return drafts;
}

function isOpenProductivityTask(task: Partial<Task>, userId: string): task is AIWorkTask {
  return task.user_id === userId && typeof task.id === "string" && typeof task.title === "string" &&
    !task.completed && task.status !== "done" && task.status !== "wont_do" &&
    !task.parent_id && !task.source_type;
}

export function safeInboxTasks(tasks: Array<Partial<Task>>, userId: string): AIWorkTask[] {
  return tasks.filter((task): task is AIWorkTask => isOpenProductivityTask(task, userId) && !task.folder_id);
}

function scheduledDate(schedule: TaskSchedule): string | null {
  if (schedule.kind === "day") return schedule.date;
  if (schedule.kind === "datetime") return schedule.date;
  return null;
}

function belongsToWindow(task: Partial<Task>, start: string, end: string, kind: "day" | "week"): boolean {
  const schedule = readSchedule(task);
  if (schedule.kind === "none") return false;
  if (schedule.kind === "period") {
    if (kind === "day") return schedule.period.horizon === "day" && schedule.period.start <= start && schedule.period.end >= start;
    return (schedule.period.horizon === "day" || schedule.period.horizon === "week") &&
      schedule.period.start <= end && schedule.period.end >= start;
  }
  const date = scheduledDate(schedule);
  if (!date) return false;
  // Today's view includes overdue work, matching the app's Today behavior.
  return kind === "day" ? date <= end : date >= start && date <= end;
}

export function taskScheduledStart(task: Partial<Task>): string | null {
  const schedule = readSchedule(task);
  if (schedule.kind === "period") return schedule.period.start;
  if (schedule.kind === "day" || schedule.kind === "datetime") return schedule.date;
  return null;
}

/** Fixed-date items before today are overdue; a planning period that includes today is not. */
export function isOverdueFixedSchedule(task: Partial<Task>, today: string): boolean {
  const schedule = readSchedule(task);
  return (schedule.kind === "day" || schedule.kind === "datetime") && schedule.date < today;
}

/** Small, owner-checked, non-sensitive task summaries for an explicitly requested plan question. */
export function safeScheduledTasks(
  tasks: Array<Partial<Task>>,
  userId: string,
  start: string,
  end: string,
  kind: "day" | "week",
): AIWorkTask[] {
  return tasks.filter((task): task is AIWorkTask => isOpenProductivityTask(task, userId) && belongsToWindow(task, start, end, kind))
    .sort((left, right) => (taskScheduledStart(left) || "").localeCompare(taskScheduledStart(right) || "") || left.id.localeCompare(right.id));
}

export function taskScheduleLabel(task: Partial<Task>): string | null {
  const schedule = readSchedule(task);
  if (schedule.kind === "none") return null;
  if (schedule.kind === "period") return `${schedule.period.horizon}: ${schedule.period.start}–${schedule.period.end}`;
  return schedule.kind === "datetime" ? schedule.at : schedule.date;
}

export function validateInboxSortProposal(data: unknown): {
  primary: { key: "due" | "priority" | "created" | "title" | "time_bucket" | "goal"; dir: "asc" | "desc" };
  secondary: { key: "due" | "priority" | "created" | "title" | "time_bucket" | "goal"; dir: "asc" | "desc" };
  reason: string;
} | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, any>;
  const validLevel = (value: any) => value &&
    ["due", "priority", "created", "title", "time_bucket", "goal"].includes(value.key) &&
    ["asc", "desc"].includes(value.dir)
    ? { key: value.key as "due" | "priority" | "created" | "title" | "time_bucket" | "goal", dir: value.dir as "asc" | "desc" }
    : null;
  const primary = validLevel(row.primary);
  const secondary = validLevel(row.secondary);
  if (!primary || !secondary) return null;
  return { primary, secondary, reason: typeof row.reason === "string" ? row.reason.trim().slice(0, 500) : "" };
}
