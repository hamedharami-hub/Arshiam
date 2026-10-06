import { addDays, addMonths, addYears, format } from "date-fns";
import { firebaseStore } from "./firebaseStore";
import { db, doc } from "./firebase";
import { runTransaction } from "firebase/firestore";
import { showMascotMoment } from "./mascot";
import { getCachedTasks } from "@/features/tasks/taskService";
import { buildTaskChildrenMap } from "@/features/tasks/taskTree";
import { nextOccurrence, type RecurrenceRule } from "./recurrence";
import { parseTaskDueDate, getLocalDateString } from "./taskDate";
import { logTaskActivity } from "./taskActivity";
import type { Task } from "./taskTypes";
import { isCustomRange, normalizeTaskWrite, readSchedule, schedulePatch, scheduleWorkDate, type TaskSchedule } from "./taskSchedule";
import { addDaysLocal, fromLocalISO, getTimeSettings, periodFor, toLocalISO, type Period, type TimeSettings } from "./timeHorizon";

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
  // The `\s` before `checked` is required so that a real attribute is removed;
  // without it the pattern also ate "data-checked"/"unchecked" fragments.
  updated = updated.replace(/<input\b([^>]*?)\schecked(?:="[^"]*")?([^>]*?)>/gi, "<input$1$2>");
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
function shiftPeriodByDays(p: Period, days: number, settings: TimeSettings): Period {
  const start = addDaysLocal(fromLocalISO(p.start), days);
  if (!isCustomRange(p, settings)) return periodFor(p.horizon, start, settings);
  return { horizon: p.horizon, start: toLocalISO(start), end: toLocalISO(addDaysLocal(fromLocalISO(p.end), days)) };
}

/** Next occurrence in the same precision: a period stays a period, a day a day, a time a time. */
function nextSchedule(current: TaskSchedule, nextDate: Date, nextValue: string, isAllDay: boolean, days: number, settings: TimeSettings): TaskSchedule {
  if (current.kind === "period") return { kind: "period", period: shiftPeriodByDays(current.period, days, settings) };
  if (isAllDay) return { kind: "day", date: getLocalDateString(nextDate) };
  return { kind: "datetime", date: getLocalDateString(nextDate), at: nextValue };
}

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
  const settings = getTimeSettings();
  const schedule = readSchedule(task, settings);
  const occurrenceDate = scheduleWorkDate(schedule);
  const savedDue = schedule.kind === "period" ? fromLocalISO(schedule.period.start) : parseTaskDueDate(occurrenceDate);
  const hasRepeatHour = typeof rule.byhour === "number";
  const isAllDay = !hasRepeatHour && schedule.kind !== "datetime";
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
    // The next occurrence keeps the same kind of schedule (period, day or exact time).
    ...schedulePatch(nextSchedule(schedule, nextDate, nextDueDateStr, isAllDay, calendarDaysShift, settings), settings),
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

  // Prepare the descendants owned by this occurrence. A recurring child owns
  // its entire subtree, so the parent's cadence must stop at that boundary.
  const subtaskPatches: (Partial<Task> & { id: string })[] = [];
  try {
    let allTasks = options?.allKnownTasks || (await getCachedTasks(userId));
    if (!allTasks || allTasks.length === 0) {
      const { data } = await firebaseStore.from("tasks").select("*").eq("user_id", userId);
      allTasks = (data as Task[]) || [];
    }

    const childrenMap = buildTaskChildrenMap(allTasks || []);
    const plainSubtasks: Task[] = [];
    const visited = new Set([task.id]);
    const collectOwned = (parentId: string) => {
      for (const child of childrenMap[parentId] || []) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        if (isRecurringTask(child)) continue;
        plainSubtasks.push(child);
        collectOwned(child.id);
      }
    };
    collectOwned(task.id);
    for (const sub of plainSubtasks) {
      const subPatch: Partial<Task> & { id: string } = {
        id: sub.id,
        completed: false,
        status: "todo",
        completed_at: null,
        description: resetDescriptionCheckboxes(sub.description),
        updated_at: new Date().toISOString(),
      };

      const subSchedule = readSchedule(sub, settings);
      if (subSchedule.kind !== "none") {
        let shifted: TaskSchedule = subSchedule;
        if (subSchedule.kind === "datetime") {
          const at = new Date(new Date(subSchedule.at).getTime() + deltaMs);
          shifted = { kind: "datetime", date: getLocalDateString(at), at: at.toISOString() };
        } else if (subSchedule.kind === "day") {
          shifted = { kind: "day", date: toLocalISO(addDaysLocal(fromLocalISO(subSchedule.date), calendarDaysShift)) };
        } else {
          shifted = { kind: "period", period: shiftPeriodByDays(subSchedule.period, calendarDaysShift, settings) };
        }
        Object.assign(subPatch, schedulePatch(shifted, settings));
      }

      subtaskPatches.push(subPatch);
    }
  } catch (err) {
    return { success: false, error: err };
  }

  // A Firestore transaction commits the parent, its owned descendants and
  // checklist steps together. Transactions fail while offline; do not queue
  // independent task writes, which could replay as a partial occurrence.
  let updatedSubtaskCount = 0;
  try {
    const taskPatches = [taskPatch, ...subtaskPatches].map(patch => normalizeTaskWrite(patch));
    const { data: stepLists, error: listError } = await firebaseStore
      .from("task_step_lists" as any)
      .select("id")
      .in("task_id", taskPatches.map(patch => patch.id));
    if (listError) throw listError;
    const listIds = Array.isArray(stepLists) ? stepLists.map((list: { id: string }) => list.id) : [];
    let stepIds: string[] = [];
    if (listIds.length) {
      const { data: steps, error: stepError } = await firebaseStore
        .from("task_steps" as any)
        .select("id")
        .in("list_id", listIds);
      if (stepError) throw stepError;
      stepIds = Array.isArray(steps) ? steps.map((step: { id: string }) => step.id) : [];
    }
    if (taskPatches.length + stepIds.length > 500) throw new Error("Recurring task exceeds Firestore transaction write limit");

    await runTransaction(db, async transaction => {
      updatedSubtaskCount = 0;
      const taskRefs = taskPatches.map(patch => doc(db, "users", userId, "tasks", patch.id));
      const stepRefs = stepIds.map(id => doc(db, "users", userId, "task_steps", id));
      // Complete every read before the first write, as Firestore transactions require.
      const snapshots = await Promise.all([...taskRefs, ...stepRefs].map(ref => transaction.get(ref)));
      // The recurring parent is the transaction's required record. A descendant
      // can have been deleted on another device after the local tree was read;
      // that must not prevent advancing the still-existing parent occurrence.
      if (!snapshots[0]?.exists()) throw new Error("Recurring task changed before it could be advanced");
      const currentParent = snapshots[0].data() as Partial<Task> | undefined;
      if (currentParent && JSON.stringify(readSchedule(currentParent, settings)) !== JSON.stringify(schedule)) {
        throw new Error("Recurring task schedule changed before it could be advanced");
      }
      taskPatches.forEach((patch, index) => {
        if (!snapshots[index]?.exists()) return;
        const fields = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        transaction.update(taskRefs[index], { ...fields, user_id: userId });
        if (index > 0) updatedSubtaskCount += 1;
      });
      stepRefs.forEach((ref, index) => {
        if (snapshots[taskRefs.length + index]?.exists()) transaction.update(ref, { completed: false });
      });
    });
  } catch (error) {
    return { success: false, error };
  }

  showMascotMoment("celebrate");

  // 4. Log activity
  await logTaskActivity(task.id, userId, "recurrence_advanced", {
    next_due: nextDueDateStr,
    previous_due: occurrenceDate ?? (schedule.kind === "period" ? `${schedule.period.start}..${schedule.period.end}` : null),
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
    updatedSubtaskCount,
  };
}
