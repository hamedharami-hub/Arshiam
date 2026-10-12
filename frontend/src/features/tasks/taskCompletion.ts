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

export type CompletionOutcome =
  | { kind: "saved" | "queued"; patch: Partial<Task> }
  | { kind: "advanced"; patch: Partial<Task>; nextLabel: string }
  | { kind: "study"; navUrl: string }
  | { kind: "outcomes"; outcomes: TaskOutcome[] }
  | { kind: "failed" };

export async function setTaskCompletion(
  userId: string,
  task: Task,
  done: boolean,
  options: { allKnownTasks?: Task[]; outcomes?: TaskOutcome[] } = {},
): Promise<CompletionOutcome> {
  if (!userId || !task?.id) return { kind: "failed" };
  if (done && isLeitnerStudyTask(task)) return { kind: "study", navUrl: getStudyTaskNavigation(task).navUrl };

  if (done && isRecurringTask(task)) {
    awardTaskWatering(task.title, Boolean(task.parent_id));
    const res = await advanceRecurringTask(userId, task, { allKnownTasks: options.allKnownTasks });
    if (res.success && res.patch) return { kind: "advanced", patch: res.patch, nextLabel: res.formattedNextDate || "" };
    return { kind: "failed" };
  }

  // A task with configured outcomes pauses completion so the user can pick one
  // (after study/recurrence preflight), instead of silently marking it done.
  if (done && options.outcomes && options.outcomes.length > 0) {
    return { kind: "outcomes", outcomes: options.outcomes };
  }

  const patch: Partial<Task> = done
    ? { completed: true, status: "done", completed_at: new Date().toISOString() }
    : { completed: false, status: "todo", completed_at: null };
  if (done) awardTaskWatering(task.title, Boolean(task.parent_id));
  const status: TaskPersistenceStatus = await persistTask(userId, { id: task.id, ...patch });
  if (status === "failed") return { kind: "failed" };
  if (typeof window !== "undefined") window.dispatchEvent(new Event("tasks-changed"));
  void logTaskActivity(task.id, userId, done ? "completed" : "reopened", patch as Record<string, unknown>).catch(() => {});
  return { kind: status, patch };
}
