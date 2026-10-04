import { addDays, addMonths, addYears, format } from "date-fns";
import { firebaseStore } from "./firebaseStore";
import { persistTask } from "./firestoreDataService";
import { showMascotMoment } from "./mascot";
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
 * An overdue occurrence can roll into today once. Completing today's
 * occurrence advances past today, keeping the original cadence anchor.
 */
export function calculateNextOccurrence(
  rule: RecurrenceRule,
  baseDate: Date = new Date(),
  now: Date = new Date()
): Date {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1);
  const overdue = baseDate.getTime() < todayStart.getTime();
  const cursor = overdue ? new Date(todayStart.getTime() - 1) :
    baseDate.getTime() > dayEnd.getTime() ? baseDate : dayEnd;
  const next = nextOccurrence(rule, cursor, baseDate);
  if (next && next.getTime() > cursor.getTime()) {
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
 * 2. Shifts the date, reminder_at and due_at.
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
  const savedDue = parseTaskDueDate(task.work_date === undefined ? task.due_date : task.work_date);
  const occurrenceDate = task.work_date === undefined ? task.due_date : task.work_date;
  const hasRepeatHour = typeof rule.byhour === "number";
  const legacyAllDay = !!savedDue && savedDue.getHours() === 23 && savedDue.getMinutes() === 59;
  const isAllDay = !hasRepeatHour && (
    /^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate || "") || legacyAllDay ||
    (!savedDue && !task.due_at)
  );
  const anchor = savedDue || now;
  const baseDate = isAllDay
    ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
    : anchor;
  const nextDate = calculateNextOccurrence(rule, baseDate, now);
  const deltaMs = nextDate.getTime() - baseDate.getTime();
  const calendarDaysShift = Math.round((
    Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()) -
    Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  ) / 86400000);

  const nextDueDateStr = isAllDay ? getLocalDateString(nextDate) : nextDate.toISOString();

  let nextReminderIso: string | null = null;
  const reminderSource = task.reminder_plan?.enabled ? task.reminder_plan.trigger_at : task.reminder_at;
  if (reminderSource) {
    const reminderTime = new Date(reminderSource).getTime();
    if (!isNaN(reminderTime)) nextReminderIso = new Date(reminderTime + deltaMs).toISOString();
  }

  const updatedDescription = resetDescriptionCheckboxes(task.description);

  const taskPatch: Partial<Task> & { id: string } = {
    id: task.id,
    completed: false,
    status: "todo",
    completed_at: null,
    work_date: nextDueDateStr,
    // A legacy schedule moves into work_date; any other stored due_date is an ignored legacy value.
    ...(task.work_date === undefined ? { due_date: null } : {}),
    reminder_at: nextReminderIso,
    ...(task.reminder_plan?.enabled && nextReminderIso ? { reminder_plan: {
      ...task.reminder_plan,
      trigger_at: nextReminderIso,
      status: "pending" as const,
      fire_count: 0,
      snooze_until: null,
      last_fired_at: null,
    } } : {}),
    description: updatedDescription,
    updated_at: new Date().toISOString(),
  };

  // Day-level placement belongs to the current occurrence. A stale daily plan
  // would otherwise keep the reset task in Today after its due date advances.
  const nextDay = getLocalDateString(nextDate);
  if (task.planning_horizon === "day") {
    taskPatch.planning_start = nextDay;
    taskPatch.planning_end = nextDay;
  }
  if (task.horizon === "day") {
    taskPatch.period_start = nextDay;
    taskPatch.period_end = nextDay;
  }
  if (task.bucket_anchor && task.bucket_kind === "day") {
    taskPatch.bucket_anchor = nextDay;
  }

  if (task.due_at) {
    const dTime = new Date(task.due_at).getTime();
    if (!isNaN(dTime)) taskPatch.due_at = new Date(dTime + deltaMs).toISOString();
  }
  if (isAllDay && (task.is_exact || task.due_at)) {
    taskPatch.due_at = null;
    taskPatch.is_exact = false;
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
    // Subtasks that carry their own recurrence manage their own cadence: resetting
    // or shifting them here would corrupt their schedule when the parent advances.
    const plainSubtasks = subtasks.filter((sub) => !isRecurringTask(sub));
    subtaskCount = plainSubtasks.length;

    for (const sub of plainSubtasks) {
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

      await persistTask(userId, subPatch, { quietCompanion: true }).catch((e) =>
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
  const status = await persistTask(userId, taskPatch, { quietCompanion: true });
  if (status === "failed") {
    return { success: false, error: new Error("Could not persist advanced recurring task") };
  }
  showMascotMoment("celebrate");

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
