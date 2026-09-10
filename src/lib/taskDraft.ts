import type { Task } from "@/lib/taskTypes";

export const EDITABLE_TASK_FIELDS: (keyof Task)[] = [
  "title", "description", "priority", "due_date", "completed", "status", "folder_id",
  "reminder_at", "recurrence", "recurrence_rule", "parent_id", "outcome_id", "pinned",
  "start_at", "end_at", "estimated_minutes", "is_avoidance", "location", "bucket_kind",
  "bucket_calendar", "bucket_anchor",
];

export function taskPatch(current: Task, saved: Task): Partial<Task> {
  return EDITABLE_TASK_FIELDS.reduce<Partial<Task>>((patch, key) => {
    if (JSON.stringify(current[key] ?? null) !== JSON.stringify(saved[key] ?? null)) {
      (patch as Record<string, unknown>)[key] = current[key] ?? null;
    }
    return patch;
  }, {});
}

export function clearTaskDraft(taskId: string) {
  try { localStorage.removeItem(`arshnaz-task-draft:${taskId}`); } catch { /* storage can be unavailable */ }
}

export function writeTaskDraft(task: Task) {
  try {
    const fields = EDITABLE_TASK_FIELDS.reduce<Record<string, unknown>>((draft, key) => {
      draft[key] = task[key] ?? null;
      return draft;
    }, {});
    localStorage.setItem(`arshnaz-task-draft:${task.id}`, JSON.stringify({ task: fields, updatedAt: Date.now() }));
  } catch { /* storage can be unavailable */ }
}
