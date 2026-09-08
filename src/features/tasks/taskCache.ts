import type { Task } from "@/lib/taskTypes";

export const TASK_CACHE_TTL_MS = 5 * 60 * 1000;

export type TaskCacheEnvelope = {
  tasks: Task[];
  cachedAt: number;
};

export function createTaskCacheEnvelope(tasks: Task[], cachedAt = Date.now()): TaskCacheEnvelope {
  return { tasks, cachedAt };
}

export function readTaskCacheEnvelope(
  value: unknown,
  now = Date.now(),
): { tasks: Task[]; cachedAt: number; fresh: boolean } | null {
  if (Array.isArray(value)) {
    const tasks = value as Task[];
    // Legacy arrays have no timestamp; serve them immediately but refresh remotely.
    return { tasks, cachedAt: 0, fresh: false };
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TaskCacheEnvelope>;
  if (!Array.isArray(candidate.tasks) || typeof candidate.cachedAt !== "number") return null;
  return {
    tasks: candidate.tasks,
    cachedAt: candidate.cachedAt,
    fresh: now - candidate.cachedAt <= TASK_CACHE_TTL_MS,
  };
}

export function isTaskCacheFresh(cachedAt: number | undefined, now = Date.now()): boolean {
  return typeof cachedAt === "number"
    && cachedAt <= now
    && now - cachedAt <= TASK_CACHE_TTL_MS;
}
