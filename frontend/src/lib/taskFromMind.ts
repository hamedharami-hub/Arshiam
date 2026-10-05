// Helpers to convert mental-health artifacts (Thought records, ABC, Worry, Values & Goals)
// into actionable Tasks — one of the main "integration" points between Mind and Tasks.

import { upsertTask } from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";
import { addDaysLocal, toLocalISO } from "@/lib/timeHorizon";

export type MindSourceType = "cbt_thought" | "abc_model" | "worry_tree" | "values_goal";

export interface CreateTaskFromMindOptions {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  due_in_days?: number; // 0 = today, 1 = tomorrow, null/undefined = inbox
  source_type?: MindSourceType;
  source_id?: string;
  priority?: "none" | "low" | "medium" | "high";
}

export async function createTaskFromMind(opts: CreateTaskFromMindOptions): Promise<{ ok: boolean; error?: string; task?: Task }> {
  let due: string | null = null;
  if (opts.due_in_days !== undefined && opts.due_in_days !== null) {
    // A calendar day only — never a fabricated clock time (the user did not pick one).
    due = toLocalISO(addDaysLocal(new Date(), opts.due_in_days));
  }

  const taskId = opts.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

  const ok = await upsertTask(opts.user_id, taskData);

  return { ok, error: ok ? undefined : "Failed to create task", task: taskData };
}

/** Route that opens the exact Mind record a task came from. */
export function mindSourceRoute(task: { source_type?: string | null; source_id?: string | null }): string | null {
  const id = task.source_id ? `record=${encodeURIComponent(task.source_id)}` : "";
  if (task.source_type === "cbt_thought" || task.source_type === "worry_tree") return `/app/thoughts${id ? `?${id}` : ""}`;
  if (task.source_type === "abc_model") return `/app/thoughts?mode=short${id ? `&${id}` : ""}`;
  return null;
}
