import type { Task } from "@/lib/taskTypes";

export const TASK_CACHE_TTL_MS = 5 * 60 * 1000;

const taskCacheMutationTails = new Map<string, Promise<void>>();

/** Serialize read/modify/write operations for one user's persisted task cache. */
export async function withTaskCacheMutationLock<T>(
  userId: string,
  mutation: () => T | Promise<T>,
): Promise<T> {
  const previous = taskCacheMutationTails.get(userId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => current);
  taskCacheMutationTails.set(userId, tail);

  await previous.catch(() => {});
  try {
    return await mutation();
  } finally {
    release();
    if (taskCacheMutationTails.get(userId) === tail) taskCacheMutationTails.delete(userId);
  }
}

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

export function extractTasksFromCache(value: unknown): Task[] {
  if (Array.isArray(value)) return value.filter(Boolean) as Task[];
  if (value && typeof value === "object" && Array.isArray((value as any).tasks)) {
    return (value as any).tasks.filter(Boolean) as Task[];
  }
  return [];
}
