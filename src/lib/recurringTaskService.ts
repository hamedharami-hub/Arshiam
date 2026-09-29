import { addDays, addMonths, addYears, format } from "date-fns";
import { firebaseStore } from "./firebaseStore";
import { persistTask } from "./firestoreDataService";
import { getCachedTasks } from "@/features/tasks/taskService";
import { buildTaskChildrenMap, collectTaskDescendantIds } from "@/features/tasks/taskTree";
import { nextOccurrence, type RecurrenceRule } from "./recurrence";
import { parseTaskDueDate, getLocalDateString } from "./taskDate";
import { logTaskActivity } from "./taskActivity";
import type { Task } from "./taskTypes";

/**
 * Checks whether a task is configured as recurring.
 */
export function isRecurringTask(task: Task | null | undefined): boolean {
  if (!task) return false;
  if (task.recurrence && task.recurrence !== "none") return true;
  if (task.recurrence_rule && task.recurrence_rule.freq) return true;
  return false;
}

/**
 * Resolves the effective recurrence rule for a task.
 * Supports explicit recurrence_rule as well as legacy recurrence ("daily" | "weekly" | "monthly").
 */
export function resolveRecurrenceRule(task: Task): RecurrenceRule | null {
  if (task.recurrence_rule && task.recurrence_rule.freq) {
    return task.recurrence_rule;
  }
  if (task.recurrence && task.recurrence !== "none") {
    return {
      freq: task.recurrence as RecurrenceRule["freq"],
      interval: 1,
    };
  }
  return null;
}

/**
 * Calculates the next occurrence date strictly in the future relative to `now`.
 */
export function calculateNextOccurrence(
  rule: RecurrenceRule,
  baseDate: Date = new Date(),
  now: Date = new Date()
): Date {
  let next = nextOccurrence(rule, baseDate);
  let guard = 0;
  while (next && next.getTime() <= now.getTime() && guard < 500) {
    const advanced = nextOccurrence(rule, next);
    if (!advanced || advanced.getTime() <= next.getTime()) break;
    next = advanced;
    guard++;
  }

  if (next && next.getTime() > now.getTime()) {
    return next;
  }

  // Safe fallback if rrule gave null or date not in future
  const interval = Math.max(1, rule.interval || 1);
  switch (rule.freq) {
    case "daily":
      return addDays(now, interval);
    case "weekly":
      return addDays(now, 7 * interval);
    case "monthly":
      return addMonths(now, interval);
    case "yearly":
      return addYears(now, interval);
    default:
      return addDays(now, 1);
  }
}

/**
 * Resets markdown and HTML task checklist checkboxes from checked to unchecked.
 */
export function resetDescriptionCheckboxes(
  desc: string | null | undefined
): string | null | undefined {
  if (!desc) return desc;
  // Markdown checklist checkboxes: - [x] or - [X] -> - [ ]
  let updated = desc.replace(/- \[[xX]\]/g, "- [ ]");
  // HTML task list checkboxes: data-checked="true" -> data-checked="false"
  updated = updated.replace(/data-checked="true"/g, 'data-checked="false"');
  // HTML input checkbox checked attribute: checked="checked" or checked
  updated = updated.replace(/<input\s+([^>]*?)checked(?:="[^"]*")?([^>]*?)>/gi, '<input $1$2>');
  return updated;
}

export type AdvanceRecurringTaskResult = {
  success: boolean;
  nextDate?: Date;
  formattedNextDate?: string;
  patch?: Partial<Task> & { id: string };
  updatedSubtaskCount?: number;
  error?: unknown;
};

/**
 * Advances a recurring task to its next recurrence instance:
 * 1. Calculates the next recurrence date (e.g. tomorrow for daily).
 * 2. Shifts due_date, reminder_at, start_at, and due_at.
 * 3. Resets the task's completion status to uncompleted (completed: false, status: "todo").
 * 4. Resets all subtasks and their checkboxes (completed: false, status: "todo") and advances their dates.
 * 5. Resets any checklist steps in task_step_lists / task_steps.
 * 6. Resets markdown / HTML checkboxes in task and subtask descriptions.
 * 7. Preserves all notes, files, attachments, and tags with the advanced task.
 */
export async function advanceRecurringTask(
  userId: string,
  task: Task,
  options?: {
    now?: Date;
    allKnownTasks?: Task[];
  }
): Promise<AdvanceRecurringTaskResult> {
  if (!userId || !task || !task.id) {
    return { success: false, error: new Error("Invalid user or task") };
  }

  const rule = resolveRecurrenceRule(task);
  if (!rule) {
    return { success: false, error: new Error("Task is not recurring") };
  }

  const now = options?.now || new Date();
  const baseDate = parseTaskDueDate(task.due_date) || now;
  const nextDate = calculateNextOccurrence(rule, baseDate, now);
  const deltaMs = nextDate.getTime() - baseDate.getTime();

  const isDateOnly = !task.due_date?.includes("T") && /^\d{4}-\d{2}-\d{2}$/.test(task.due_date || "");
  const nextDueDateStr = isDateOnly ? getLocalDateString(nextDate) : nextDate.toISOString();

  let nextReminderIso: string | null = null;
  if (task.reminder_at && task.due_date) {
    const reminderTime = new Date(task.reminder_at).getTime();
    if (!isNaN(reminderTime)) {
      nextReminderIso = new Date(reminderTime + deltaMs).toISOString();
    }
  } else if (task.reminder_at) {
    nextReminderIso = nextDate.toISOString();
  }

  const updatedDescription = resetDescriptionCheckboxes(task.description);

  const taskPatch: Partial<Task> & { id: string } = {
    id: task.id,
    completed: false,
    status: "todo",
    completed_at: null,
    due_date: nextDueDateStr,
    reminder_at: nextReminderIso,
    description: updatedDescription,
    updated_at: new Date().toISOString(),
  };

  if (task.start_at) {
    const sTime = new Date(task.start_at).getTime();
    if (!isNaN(sTime)) taskPatch.start_at = new Date(sTime + deltaMs).toISOString();
  }
  if (task.due_at) {
    const dTime = new Date(task.due_at).getTime();
    if (!isNaN(dTime)) taskPatch.due_at = new Date(dTime + deltaMs).toISOString();
  }

  // 1. Advance and reset all subtasks under this recurring task
  let subtaskCount = 0;
  let targetTaskIds = [task.id];
  try {
    let allTasks = options?.allKnownTasks || (await getCachedTasks(userId));
    if (!allTasks || allTasks.length === 0) {
      const { data } = await firebaseStore.from("tasks").select("*").eq("user_id", userId);
      allTasks = (data as Task[]) || [];
    }

    const childrenMap = buildTaskChildrenMap(allTasks || []);
    const descendantIds = collectTaskDescendantIds(task.id, childrenMap).filter((id) => id !== task.id);
    targetTaskIds = [task.id, ...descendantIds];

    const subtasks = (allTasks || []).filter((t) => descendantIds.includes(t.id));
    subtaskCount = subtasks.length;

    for (const sub of subtasks) {
      const subPatch: Partial<Task> & { id: string } = {
        id: sub.id,
        completed: false,
        status: "todo",
        completed_at: null,
        description: resetDescriptionCheckboxes(sub.description),
        updated_at: new Date().toISOString(),
      };

      if (sub.due_date) {
        const subDue = parseTaskDueDate(sub.due_date);
        if (subDue) {
          const newSubDue = new Date(subDue.getTime() + deltaMs);
          const subIsDateOnly = !sub.due_date.includes("T") && /^\d{4}-\d{2}-\d{2}$/.test(sub.due_date);
          subPatch.due_date = subIsDateOnly ? getLocalDateString(newSubDue) : newSubDue.toISOString();
        }
      }

      await persistTask(userId, subPatch).catch((e) =>
        console.warn("[RecurringTaskService] Failed to reset subtask:", sub.id, e)
      );
    }
  } catch (err) {
    console.warn("[RecurringTaskService] Subtask reset error:", err);
  }

  // 2. Reset checklist step lists for parent task and subtasks
  try {
    const { data: stepLists } = await firebaseStore
      .from("task_step_lists" as any)
      .select("id")
      .in("task_id", targetTaskIds);
    if (Array.isArray(stepLists) && stepLists.length > 0) {
      const listIds = stepLists.map((l: any) => l.id);
      await firebaseStore
        .from("task_steps" as any)
        .update({ completed: false } as any)
        .in("list_id", listIds);
    }
  } catch (stepErr) {
    console.warn("[RecurringTaskService] Step reset error:", stepErr);
  }

  // 3. Persist the main task
  const status = await persistTask(userId, taskPatch);
  if (status === "failed") {
    return { success: false, error: new Error("Could not persist advanced recurring task") };
  }

  // 4. Log activity
  await logTaskActivity(task.id, userId, "recurrence_advanced", {
    next_due: nextDueDateStr,
    previous_due: task.due_date,
  }).catch(() => {});

  // 5. Notify UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tasks-changed"));
  }

  const formattedNextDate = format(nextDate, "yyyy-MM-dd HH:mm");
  return {
    success: true,
    nextDate,
    formattedNextDate,
    patch: taskPatch,
    updatedSubtaskCount: subtaskCount,
  };
}
