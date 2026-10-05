/**
 * One-time, automatic, idempotent conversion of stored tasks to the single schedule (schedule_v = 2).
 * The old values are kept on the same task as `schedule_legacy` (inside users/{uid}/tasks, same account).
 * A task already on v2 is never touched again, so a cleared schedule cannot come back.
 */
import { persistTask } from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";
import { getTimeSettings } from "@/lib/timeHorizon";
import { scheduleMigrationPatch } from "@/lib/taskSchedule";

const running = new Map<string, Promise<number>>();
const attempted = new Set<string>();

export function pendingScheduleMigrations(tasks: Task[]): Array<{ id: string; patch: Partial<Task> }> {
  const settings = getTimeSettings();
  const out: Array<{ id: string; patch: Partial<Task> }> = [];
  for (const task of tasks) {
    if (!task?.id || attempted.has(task.id)) continue;
    const patch = scheduleMigrationPatch(task, settings);
    if (patch) out.push({ id: task.id, patch });
  }
  return out;
}

/** Writes the migration for tasks that still use legacy fields. Returns how many were saved or queued. */
export function migrateTaskSchedules(userId: string, tasks: Task[]): Promise<number> {
  if (!userId) return Promise.resolve(0);
  const existing = running.get(userId);
  if (existing) return existing;
  const todo = pendingScheduleMigrations(tasks);
  if (!todo.length) return Promise.resolve(0);
  const job = (async () => {
    let done = 0;
    for (const { id, patch } of todo) {
      attempted.add(id);
      const status = await persistTask(userId, { id, ...patch }, { quietCompanion: true });
      if (status === "failed") attempted.delete(id);
      else done += 1;
    }
    if (done) console.info(`[ScheduleMigration] converted ${done} task(s) to schedule v2`);
    return done;
  })().finally(() => running.delete(userId));
  running.set(userId, job);
  return job;
}

/** Test helper. */
export function resetScheduleMigrationState() {
  running.clear();
  attempted.clear();
}
