import { firebaseStore } from "@/lib/firebaseStore";
import { normalizeTaskPriority, type Priority } from "@/lib/priority";
import type { RecurrenceRule } from "@/lib/recurrence";
import type { Task, TaskTemplate } from "@/lib/taskTypes";
import { addHours } from "date-fns";

/** Extra, whitelisted fields kept locally to the task-template feature. */
export type TaskTemplateRecord = TaskTemplate & {
  recurrence_rule?: RecurrenceRule | null;
  tag_ids?: string[];
  payload?: {
    is_avoidance?: boolean;
    location?: string | null;
    workflow_tasks?: WorkflowTaskTemplateItem[];
  };
  created_at?: string;
  updated_at?: string;
};

/** A workflow item stores only reusable task content, never task identity/state. */
export type WorkflowTaskTemplateItem = {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  folder_id: string | null;
};

export type TaskTemplateSource = Pick<Task, "title" | "priority"> & Partial<Pick<
  Task,
  "description" | "folder_id" | "recurrence" | "recurrence_rule" | "is_avoidance" | "location"
>>;

export type SaveTaskTemplateOptions = {
  title?: string;
  /** Explicit relative offset in hours. `null` means this template has no schedule. */
  dueOffsetHours?: number | null;
  tagIds?: string[];
  /** Present only for a multi-task workflow saved from the existing Quick Add flow. */
  workflowTasks?: WorkflowTaskTemplateItem[];
  /** Caller-owned stable id, reused after an uncertain write so retries cannot duplicate the template. */
  id: string;
};

const validPriorities = new Set<Priority>(["none", "low", "medium", "high", "urgent"]);
const validLegacyRecurrences = new Set(["none", "daily", "weekly", "monthly"]);
const validWeekdays = new Set(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);
type WeekdayCode = NonNullable<RecurrenceRule["byweekday"]>[number];
const MAX_TEMPLATE_OFFSET_HOURS = 24 * 365;

function normalizeDueOffset(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_TEMPLATE_OFFSET_HOURS
    ? value
    : null;
}

function normalizeStringId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTagIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map(id => id.trim()))].slice(0, 100);
}

function normalizeRecurrenceRule(value: unknown): RecurrenceRule | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const freq = candidate.freq;
  if (freq !== "daily" && freq !== "weekly" && freq !== "monthly" && freq !== "yearly") return null;

  const interval = typeof candidate.interval === "number" && Number.isInteger(candidate.interval)
    ? Math.min(366, Math.max(1, candidate.interval))
    : 1;
  const byweekday = Array.isArray(candidate.byweekday)
    ? [...new Set(candidate.byweekday.filter((day): day is WeekdayCode => typeof day === "string" && validWeekdays.has(day)))]
    : undefined;
  const byhour = typeof candidate.byhour === "number" && Number.isInteger(candidate.byhour) && candidate.byhour >= 0 && candidate.byhour <= 23
    ? candidate.byhour
    : undefined;
  const byminute = typeof candidate.byminute === "number" && Number.isInteger(candidate.byminute) && candidate.byminute >= 0 && candidate.byminute <= 59
    ? candidate.byminute
    : undefined;

  return {
    freq,
    interval,
    ...(byweekday?.length ? { byweekday } : {}),
    ...(byhour !== undefined ? { byhour } : {}),
    ...(byminute !== undefined ? { byminute } : {}),
  };
}

function normalizeTemplatePayload(value: unknown): TaskTemplateRecord["payload"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const payload = value as Record<string, unknown>;
  const result: NonNullable<TaskTemplateRecord["payload"]> = {};
  if (payload.is_avoidance === true) result.is_avoidance = true;
  if (typeof payload.location === "string" && payload.location.trim()) result.location = payload.location.trim().slice(0, 500);
  if (Array.isArray(payload.workflow_tasks)) {
    const workflowTasks: WorkflowTaskTemplateItem[] = [];
    const seenIds = new Set<string>();
    for (const rawItem of payload.workflow_tasks.slice(0, 100)) {
      if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) continue;
      const item = rawItem as Record<string, unknown>;
      const id = normalizeStringId(item.id);
      const title = typeof item.title === "string" ? item.title.trim().slice(0, 500) : "";
      if (!id || seenIds.has(id) || !title) continue;
      seenIds.add(id);
      const priority = normalizeTaskPriority(item.priority);
      workflowTasks.push({
        id,
        title,
        priority: validPriorities.has(priority) ? priority : "none",
        folder_id: normalizeStringId(item.folder_id),
        ...(typeof item.description === "string" && item.description.trim()
          ? { description: item.description.slice(0, 10_000) }
          : {}),
      });
    }
    if (workflowTasks.length) result.workflow_tasks = workflowTasks;
  }
  return result;
}

function normalizeTemplateRecord(value: unknown, userId: string): TaskTemplateRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id || typeof row.title !== "string" || !row.title.trim()) return null;
  if (typeof row.user_id === "string" && row.user_id !== userId) return null;

  const legacyRecurrence = typeof row.recurrence === "string" && validLegacyRecurrences.has(row.recurrence)
    ? row.recurrence as TaskTemplateRecord["recurrence"]
    : "none";
  const recurrenceRule = normalizeRecurrenceRule(row.recurrence_rule)
    ?? (legacyRecurrence && legacyRecurrence !== "none" ? { freq: legacyRecurrence, interval: 1 } : null);
  const offset = normalizeDueOffset(row.due_offset_hours);
  const priority = normalizeTaskPriority(row.priority);

  return {
    id: row.id,
    user_id: userId,
    title: row.title.trim(),
    description: typeof row.description === "string" ? row.description : null,
    priority: validPriorities.has(priority) ? priority : "none",
    folder_id: normalizeStringId(row.folder_id),
    due_offset_hours: offset,
    recurrence: legacyRecurrence,
    recurrence_rule: recurrenceRule,
    tag_ids: normalizeTagIds(row.tag_ids),
    payload: normalizeTemplatePayload(row.payload),
    ...(typeof row.created_at === "string" ? { created_at: row.created_at } : {}),
    ...(typeof row.updated_at === "string" ? { updated_at: row.updated_at } : {}),
  };
}

export async function saveTaskTemplate(
  userId: string,
  task: TaskTemplateSource,
  options: SaveTaskTemplateOptions,
): Promise<TaskTemplateRecord | null> {
  const title = options.title?.trim() || task.title.trim();
  if (!userId || !title) throw new Error("عنوان قالب و حساب کاربری لازم است.");

  const recurrenceRule = normalizeRecurrenceRule(task.recurrence_rule);
  const legacyRecurrence = task.recurrence && validLegacyRecurrences.has(task.recurrence)
    ? task.recurrence
    : recurrenceRule && recurrenceRule.freq !== "yearly" ? recurrenceRule.freq : "none";
  const dueOffsetHours = normalizeDueOffset(options.dueOffsetHours);
  const safePayload = normalizeTemplatePayload({
    is_avoidance: task.is_avoidance,
    location: task.location,
    ...(options.workflowTasks ? { workflow_tasks: options.workflowTasks } : {}),
  });
  const id = normalizeStringId(options.id);
  if (!id) throw new Error("برای ذخیرهٔ تکرارپذیر قالب، شناسهٔ ثابت لازم است.");

  const row = {
    id,
    user_id: userId,
    title: title.slice(0, 500),
    description: typeof task.description === "string" ? task.description : null,
    priority: normalizeTaskPriority(task.priority),
    folder_id: normalizeStringId(task.folder_id),
    due_offset_hours: dueOffsetHours,
    recurrence: legacyRecurrence,
    recurrence_rule: recurrenceRule,
    tag_ids: normalizeTagIds(options.tagIds),
    payload: safePayload,
  };

  // The supplied owner is bound to the Firestore path. A stale account id cannot write
  // into the currently signed-in user's collection or create an invisible foreign row.
  const { data, error } = await firebaseStore
    .from("task_templates", userId)
    .upsert(row as never, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return normalizeTemplateRecord(data, userId);
}

export async function listTaskTemplates(userId: string): Promise<TaskTemplateRecord[]> {
  const { data, error } = await firebaseStore
    .from("task_templates", userId)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || [])
    .map(row => normalizeTemplateRecord(row, userId))
    .filter((row): row is TaskTemplateRecord => !!row);
}

export async function deleteTaskTemplate(userId: string, id: string): Promise<void> {
  const safeId = normalizeStringId(id);
  if (!safeId) return;
  const { error } = await firebaseStore
    .from("task_templates", userId)
    .delete()
    .eq("id", safeId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function buildTaskFromTemplate(
  template: TaskTemplateRecord | TaskTemplate,
  referenceDate: Date = new Date(),
): Partial<Task> & { tag_ids: string[] } {
  const safeTemplate = normalizeTemplateRecord(template, template.user_id || "") ?? {
    id: template.id,
    title: typeof template.title === "string" ? template.title.trim() : "",
    priority: normalizeTaskPriority(template.priority),
    folder_id: normalizeStringId(template.folder_id),
    due_offset_hours: normalizeDueOffset(template.due_offset_hours),
    recurrence: template.recurrence && validLegacyRecurrences.has(template.recurrence) ? template.recurrence : "none",
    recurrence_rule: normalizeRecurrenceRule((template as TaskTemplateRecord).recurrence_rule),
    tag_ids: normalizeTagIds((template as TaskTemplateRecord).tag_ids),
    description: typeof template.description === "string" ? template.description : null,
    payload: normalizeTemplatePayload(template.payload),
  } as TaskTemplateRecord;
  const dueOffsetHours = normalizeDueOffset(safeTemplate.due_offset_hours);
  const due = dueOffsetHours !== null ? addHours(referenceDate, dueOffsetHours).toISOString() : null;
  const legacyRecurrence = safeTemplate.recurrence && safeTemplate.recurrence !== "none"
    ? safeTemplate.recurrence
    : safeTemplate.recurrence_rule?.freq !== "yearly" ? safeTemplate.recurrence_rule?.freq ?? "none" : "none";

  return {
    title: safeTemplate.title,
    description: safeTemplate.description || null,
    priority: normalizeTaskPriority(safeTemplate.priority),
    folder_id: safeTemplate.folder_id || null,
    ...(due ? { work_date: due } : {}),
    recurrence: legacyRecurrence as Task["recurrence"],
    recurrence_rule: safeTemplate.recurrence_rule ?? null,
    ...(safeTemplate.payload?.is_avoidance ? { is_avoidance: true } : {}),
    ...(safeTemplate.payload?.location ? { location: safeTemplate.payload.location } : {}),
    tag_ids: safeTemplate.tag_ids || [],
  };
}

/** Return validated task definitions for a workflow template. */
export function buildWorkflowTasksFromTemplate(
  template: TaskTemplateRecord | TaskTemplate,
): WorkflowTaskTemplateItem[] {
  const ownerId = typeof template.user_id === "string" ? template.user_id : "";
  const normalized = normalizeTemplateRecord(template, ownerId);
  const payload = normalized?.payload ?? normalizeTemplatePayload(template.payload);
  return (payload?.workflow_tasks ?? []).map(item => ({ ...item }));
}

export async function createTaskFromTemplate(
  userId: string,
  template: TaskTemplateRecord | TaskTemplate,
  overrides: Partial<Task> = {},
  taskId: string,
): Promise<Task | null> {
  const base = buildTaskFromTemplate(template);
  const { tag_ids: _tagIds, ...taskFields } = base;
  const permittedOverrideKeys = [
    "title", "description", "priority", "folder_id", "work_date", "planning_horizon",
    "planning_start", "planning_end", "planning_calendar", "schedule_v", "schedule_timezone",
    "recurrence", "recurrence_rule", "is_avoidance", "location",
  ] as const;
  const safeOverrides: Partial<Task> = {};
  for (const key of permittedOverrideKeys) {
    if (key in overrides) Object.assign(safeOverrides, { [key]: overrides[key] });
  }
  const stableTaskId = normalizeStringId(taskId);
  if (!userId || !stableTaskId) throw new Error("برای ساخت تکرارپذیر تسک، شناسهٔ ثابت لازم است.");
  const { data, error } = await firebaseStore
    .from("tasks", userId)
    .upsert({
      ...taskFields,
      ...safeOverrides,
      id: stableTaskId,
      user_id: userId,
      parent_id: null,
      completed: false,
      status: "todo",
      completed_at: null,
    } as never, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Task | null;
}
