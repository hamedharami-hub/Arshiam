/**
 * Shared complete / reopen used by every planning surface (Plan tab, horizon views).
 * Uses the same recurrence service as Tasks, so finishing a repeating task from Plan creates the next occurrence.
 */
import { persistTask, type TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { advanceRecurringTask, isRecurringTask } from "@/lib/recurringTaskService";
import { getStudyTaskNavigation, isLeitnerStudyTask } from "@/lib/taskStudyService";
import { logTaskActivity } from "@/lib/taskActivity";
import { awardTaskWatering } from "@/lib/garden";
import type { Task, TaskOutcome } from "@/lib/taskTypes";
import { listTaskOutcomes } from "@/lib/taskOutcomes";

export type CompletionOutcome =
  | { kind: "saved" | "queued"; patch: Partial<Task> }
  | { kind: "advanced"; patch: Partial<Task>; nextLabel: string }
  | { kind: "study"; navUrl: string }
  | { kind: "outcomes"; outcomes: TaskOutcome[] }
  | { kind: "failed" };

// A stale row can submit the same recurring occurrence twice before the UI
// receives its next schedule. Reward that successful occurrence only once in
// this runtime; this is not a cross-device reward ledger.
const rewardedOccurrences = new Set<string>();

export async function setTaskCompletion(
  userId: string,
  task: Task,
  done: boolean,
  options: { allKnownTasks?: Task[]; outcomes?: TaskOutcome[]; outcomeConfirmed?: boolean } = {},
): Promise<CompletionOutcome> {
  if (!userId || !task?.id) return { kind: "failed" };
  if (done && isLeitnerStudyTask(task)) return { kind: "study", navUrl: getStudyTaskNavigation(task).navUrl };

  if (done && isRecurringTask(task)) {
    let res: Awaited<ReturnType<typeof advanceRecurringTask>>;
    try { res = await advanceRecurringTask(userId, task, { allKnownTasks: options.allKnownTasks }); }
    catch { return { kind: "failed" }; }
    if (res.success === true && res.patch) {
      const receipt = JSON.stringify([userId, task.id, task.work_date, task.due_date,
        task.planning_start, task.planning_end, task.period_start, task.period_end,
        task.due_at, task.updated_at]);
      if (!rewardedOccurrences.has(receipt)) {
        rewardedOccurrences.add(receipt);
        awardTaskWatering(task.title, Boolean(task.parent_id));
      }
      return { kind: "advanced", patch: res.patch, nextLabel: res.formattedNextDate || "" };
    }
    return { kind: "failed" };
  }

  // A task with configured outcomes pauses completion so the user can pick one
  // (after study/recurrence preflight), instead of silently marking it done.
  if (done && !options.outcomeConfirmed) {
    let outcomes: TaskOutcome[];
    try {
      outcomes = options.outcomes ?? await listTaskOutcomes(task.id);
      if (!Array.isArray(outcomes)) return { kind: "failed" };
    } catch {
      // Unknown is not the same as no configured outcomes. Keep the task open.
      return { kind: "failed" };
    }
    if (outcomes.length > 0) return { kind: "outcomes", outcomes };
  }

  const patch: Partial<Task> = done
    ? { completed: true, status: "done", completed_at: new Date().toISOString() }
    : { completed: false, status: "todo", completed_at: null };
  let status: TaskPersistenceStatus;
  try { status = await persistTask(userId, { id: task.id, ...patch }); }
  catch { return { kind: "failed" }; }
  if (status !== "saved" && status !== "queued") return { kind: "failed" };
  if (done && !task.completed) awardTaskWatering(task.title, Boolean(task.parent_id));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("tasks-changed"));
  void logTaskActivity(task.id, userId, done ? "completed" : "reopened", patch as Record<string, unknown>).catch(() => {});
  return { kind: status, patch };
}
