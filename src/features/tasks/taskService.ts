import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseStore } from "@/lib/firebaseStore";
import {
  cacheGet,
  cacheSet,
  enqueueOps,
  getPendingOps,
} from "@/lib/offlineQueue";
import {
  subscribeTasks as subscribeFirestoreTasks,
  upsertTask as upsertFirestoreTask,
} from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";
import {
  createTaskCacheEnvelope,
  isTaskCacheFresh,
  readTaskCacheEnvelope,
} from "./taskCache";
import { applyTaskOperations } from "./taskOperations";
import { buildTaskChildrenMap, collectTaskDescendantIds } from "./taskTree";
import { syncAndroidWidget } from "@/lib/androidWidget";

const TASKS_CACHE_PREFIX = "tasks:all:";
const taskCache = new Map<string, Task[]>();
const taskCacheTimestamps = new Map<string, number>();

export const taskCacheKey = (userId: string) => `${TASKS_CACHE_PREFIX}${userId}`;
export const taskMemoryCache = taskCache;

function setTaskCache(userId: string, tasks: Task[], cachedAt = Date.now()): void {
  taskCache.set(userId, tasks);
  taskCacheTimestamps.set(userId, cachedAt);
}

export function isTaskCacheFreshForUser(userId: string): boolean {
  return isTaskCacheFresh(taskCacheTimestamps.get(userId));
}

function persistTaskCache(userId: string, tasks: Task[]): Promise<void> {
  return cacheSet(taskCacheKey(userId), createTaskCacheEnvelope(tasks));
}

function sortTasks(tasks: Task[]): Task[] {
  if (!Array.isArray(tasks)) return [];
  return [...tasks].filter(Boolean).sort((a, b) => {
    if (!a || !b) return 0;
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const positionA = (a as Task & { position?: number }).position ?? 0;
    const positionB = (b as Task & { position?: number }).position ?? 0;
    if (positionA !== positionB) return positionA - positionB;
    return new Date((b as Task & { created_at?: string }).created_at || 0).getTime()
      - new Date((a as Task & { created_at?: string }).created_at || 0).getTime();
  });
}

export async function getCachedTasks(userId: string): Promise<Task[]> {
  const memory = taskCache.get(userId);
  if (memory) return memory;
  const persisted = await cacheGet<unknown>(taskCacheKey(userId));
  const envelope = readTaskCacheEnvelope(persisted);
  const tasks = envelope?.tasks || [];
  setTaskCache(userId, tasks, envelope?.cachedAt);
  return tasks;
}

export async function applyPendingTaskOperations(base: Task[]): Promise<Task[]> {
  const operations = await getPendingOps("tasks");
  return applyTaskOperations(base, operations);
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "tasks"));
    // A successful snapshot query (even if empty) is authoritative.
    const rawTasks = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Task),
    }));
    const merged = await applyPendingTaskOperations(rawTasks);
    const tasks = sortTasks(merged);
    setTaskCache(userId, tasks);
    await persistTaskCache(userId, tasks);
    void syncAndroidWidget(tasks, userId).catch(() => {});
    return tasks;
  } catch (error) {
    console.warn("[TaskService] Firestore fetch warning:", error);
  }

  // Only if direct fetch threw an error (e.g. offline or permission), fall back to cached tasks merged with pending ops
  const cachedTasks = await getCachedTasks(userId);
  const withPending = await applyPendingTaskOperations(cachedTasks);
  void syncAndroidWidget(withPending, userId).catch(() => {});
  return withPending;
}

export function subscribeToTasks(userId: string, onUpdate: (tasks: Task[]) => void): () => void {
  return subscribeFirestoreTasks(userId, (tasks) => {
    setTaskCache(userId, tasks);
    void persistTaskCache(userId, tasks);
    void syncAndroidWidget(tasks, userId).catch(() => {});
    onUpdate(tasks);
  });
}

export async function deleteTaskCascade(
  userId: string,
  rootTaskId: string,
  knownTasks?: Task[]
): Promise<{ success: boolean; deletedIds: string[] }> {
  if (!userId || !rootTaskId) return { success: false, deletedIds: [] };

  let tasks = knownTasks;
  if (!tasks || tasks.length === 0) {
    tasks = taskCache.get(userId);
    if (!tasks || tasks.length === 0) {
      tasks = await getCachedTasks(userId);
    }
  }

  const childrenMap = buildTaskChildrenMap(tasks || []);
  const descendantIds = collectTaskDescendantIds(rootTaskId, childrenMap);
  const idsToDelete = Array.from(new Set([rootTaskId, ...descendantIds]));

  const deleteOperations = idsToDelete.flatMap((id) => [
    { ownerId: userId, table: "tasks", op: "delete" as const, match: { id } },
    { ownerId: userId, table: "task_tags", op: "delete" as const, match: { task_id: id } },
  ]);
  const commitLocalRemoval = async () => {
    const remaining = (tasks || []).filter((task) => !idsToDelete.includes(task.id));
    setTaskCache(userId, remaining);
    await persistTaskCache(userId, remaining);
    void syncAndroidWidget(remaining, userId).catch(() => {});
    window.dispatchEvent(new Event("tasks-changed"));
    return remaining;
  };

  // Queue the whole cascade atomically before hiding it from the user's task list.
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (isOffline) {
    if (!await enqueueOps(deleteOperations)) return { success: false, deletedIds: [] };
    await commitLocalRemoval();
    return { success: true, deletedIds: idsToDelete };
  }

  // Firestore batches are atomic and capped at 500 writes. Larger trees are
  // durably queued as one local transaction and replayed idempotently.
  if (idsToDelete.length > 500) {
    if (!await enqueueOps(deleteOperations)) return { success: false, deletedIds: [] };
    await commitLocalRemoval();
    return { success: true, deletedIds: idsToDelete };
  }

  try {
    const batch = writeBatch(db);
    for (const id of idsToDelete) batch.delete(doc(db, "users", userId, "tasks", id));
    await batch.commit();
  } catch (error) {
    console.warn("[TaskService] Atomic Firestore cascade delete failed, enqueuing for sync:", error);
    if (!await enqueueOps(deleteOperations)) return { success: false, deletedIds: [] };
    await commitLocalRemoval();
    return { success: true, deletedIds: idsToDelete };
  }

  const tagCleanupOperations = deleteOperations.filter((operation) => operation.table === "task_tags");
  try {
    const tagResult = await firebaseStore.from("task_tags").delete().in("task_id", idsToDelete);
    if (tagResult.error && !await enqueueOps(tagCleanupOperations)) {
      console.warn("[TaskService] Tasks were deleted, but task-tag cleanup could not be queued.", tagResult.error);
    }
  } catch (error) {
    if (!await enqueueOps(tagCleanupOperations)) {
      console.warn("[TaskService] Tasks were deleted, but task-tag cleanup could not be queued.", error);
    }
  }
  await commitLocalRemoval();
  return { success: true, deletedIds: idsToDelete };
}

export async function deleteTask(userId: string, taskId: string, knownTasks?: Task[]): Promise<boolean> {
  const res = await deleteTaskCascade(userId, taskId, knownTasks);
  return res.success;
}

export const removeTask = deleteTask;
export const saveTask = upsertFirestoreTask;
