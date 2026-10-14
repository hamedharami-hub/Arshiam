// Helpers to convert mental-health artifacts (Thought records, ABC, Worry, Values & Goals)
// into actionable Tasks — one of the main "integration" points between Mind and Tasks.

import { createMindTaskOnce } from "@/lib/mind/createTaskOnce";
import type { MindActionSource } from "@/lib/mind/sources";
import type { Task } from "@/lib/taskTypes";
import { addDaysLocal, toLocalISO } from "@/lib/timeHorizon";

export type MindSourceType = MindActionSource;

export interface CreateTaskFromMindOptions {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  due_in_days?: number | null; // 0 = today, 1 = tomorrow, null/undefined = inbox
  source_type?: MindSourceType;
  source_id?: string;
  priority?: "none" | "low" | "medium" | "high";
}

const pending = new Map<string, Promise<{ ok: boolean; error?: string; task?: Task }>>();

export function createTaskFromMind(opts: CreateTaskFromMindOptions): Promise<{ ok: boolean; error?: string; task?: Task }> {
  const taskId = opts.id || (opts.source_type && opts.source_id
    ? `task_${opts.source_type}_${encodeURIComponent(opts.source_id)}`
    : `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const key = `${opts.user_id}:${taskId}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const operation = createTask({ ...opts, id: taskId }).catch(() => ({ ok: false, error: "Failed to create task" })).finally(() => {
    if (pending.get(key) === operation) pending.delete(key);
  });
  pending.set(key, operation);
  return operation;
}

async function createTask(opts: CreateTaskFromMindOptions & { id: string }): Promise<{ ok: boolean; error?: string; task?: Task }> {
  if (!opts.user_id || !opts.title.trim()) return { ok: false, error: "Missing owner or title" };
  let due: string | null = null;
  if (opts.due_in_days !== undefined && opts.due_in_days !== null) {
    // A calendar day only — never a fabricated clock time (the user did not pick one).
    due = toLocalISO(addDaysLocal(new Date(), opts.due_in_days));
  }

  const taskId = opts.id;
  const taskData: Task = {
    id: taskId,
    user_id: opts.user_id,
    title: opts.title.slice(0, 200),
    description: opts.description?.slice(0, 2000) || null,
    priority: opts.priority || "medium",
    due_date: due,
    completed: false,
    status: "todo",
    folder_id: null,
    reminder_at: null,
    recurrence: "none",
    recurrence_rule: null,
    parent_id: null,
    pinned: false,
    source_type: opts.source_type || null,
    source_id: opts.source_id || null,
  };

  return createMindTaskOnce(opts.user_id, taskData);
}

/** Route that opens the exact Mind record a task came from. */
export function mindSourceRoute(task: { source_type?: string | null; source_id?: string | null }): string | null {
  const id = task.source_id ? `record=${encodeURIComponent(task.source_id)}` : "";
  if (task.source_type === "cbt_thought" || task.source_type === "worry_tree") return `/app/thoughts${id ? `?${id}` : ""}`;
  if (task.source_type === "abc_model") return `/app/thoughts?mode=short${id ? `&${id}` : ""}`;
  if (task.source_type === "mind_need" && task.source_id) return `/app/mind/session/${encodeURIComponent(task.source_id)}`;
  if (task.source_type === "values_goal") return "/app/values";
  return null;
}
