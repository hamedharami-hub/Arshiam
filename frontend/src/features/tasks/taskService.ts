import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hasServerSnapshot, liveRows } from "@/lib/firestoreLive";
import { firebaseStore } from "@/lib/firebaseStore";
import {
  cacheGet,
  cacheSet,
  canReplayForOwner,
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
  withTaskCacheMutationLock,
} from "./taskCache";
import { applyTaskOperations } from "./taskOperations";
import { buildTaskChildrenMap, collectTaskDescendantIds } from "./taskTree";
import { syncAndroidWidget } from "@/lib/androidWidget";
import { getTaskKnowledgeCacheKey } from "@/lib/taskKnowledgeService";
import { deleteNoteTaskLinksFor, removeNoteTaskLinksFromCache, type NoteTaskLink } from "@/lib/noteTaskLinkService";
import { normalizeTaskPriority } from "@/lib/priority";

const TASKS_CACHE_PREFIX = "tasks:all:";
const taskCache = new Map<string, Task[]>();
const taskCacheTimestamps = new Map<string, number>();
const serverAuthoritativeUsers = new Set<string>();
const taskFetchVersions = new Map<string, number>();

export const taskCacheKey = (userId: string) => `${TASKS_CACHE_PREFIX}${userId}`;
export const taskMemoryCache = taskCache;

function setTaskCache(userId: string, tasks: Task[], cachedAt = Date.now()): void {
  taskCache.set(userId, tasks);
  taskCacheTimestamps.set(userId, cachedAt);
}

export function isTaskCacheFreshForUser(userId: string): boolean {
  return isTaskCacheFresh(taskCacheTimestamps.get(userId));
}

/** True only after task rows were read from the live API or a non-cache Firestore snapshot. */
export function hasServerAuthoritativeTasks(userId: string): boolean {
  return serverAuthoritativeUsers.has(userId);
}

function sortTasks(tasks: Task[]): Task[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter(Boolean).map((task) => ({ ...task, priority: normalizeTaskPriority(task.priority) })).sort((a, b) => {
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
  // Task edits are written to the durable cache by firestoreDataService.
  // The in-memory list can still contain the pre-edit row; reading it first
  // makes task badges appear unchanged until a full page refresh.
  const persisted = await cacheGet<unknown>(taskCacheKey(userId));
  const envelope = readTaskCacheEnvelope(persisted);
  if (envelope) {
    setTaskCache(userId, envelope.tasks, envelope.cachedAt);
    return envelope.tasks;
  }
  return taskCache.get(userId) || [];
}

export async function applyPendingTaskOperations(base: Task[], userId: string): Promise<Task[]> {
  const operations = await getPendingOps("tasks");
  return applyTaskOperations(
    base,
    operations.filter((operation) => canReplayForOwner(operation, userId)),
  );
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  const fetchVersion = (taskFetchVersions.get(userId) || 0) + 1;
  taskFetchVersions.set(userId, fetchVersion);
  serverAuthoritativeUsers.delete(userId);
  try {
    const live = await liveRows(userId, "tasks");
    const snapshot = live ? null : await getDocs(collection(db, "users", userId, "tasks"));
    const isOnline = typeof navigator === "undefined" || navigator.onLine;
    if (taskFetchVersions.get(userId) === fetchVersion && isOnline && ((live && hasServerSnapshot(userId, "tasks")) || (snapshot && !snapshot.metadata.fromCache))) {
      serverAuthoritativeUsers.add(userId);
    }
    // A successful snapshot query (even if empty) is authoritative.
    const rawTasks = (live as Task[] | null) ?? snapshot!.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Task),
    }));
    // Offline getDocs results can be incomplete; only server data confirms deletions.
    const base = snapshot?.metadata?.fromCache
      ? [...new Map([...(await getCachedTasks(userId)), ...rawTasks].map(task => [task.id, task])).values()]
      : rawTasks;
    const merged = await applyPendingTaskOperations(base, userId);
    const tasks = sortTasks(merged);
    const accepted = await withTaskCacheMutationLock(userId, async () => {
      if (taskFetchVersions.get(userId) !== fetchVersion) return false;
      setTaskCache(userId, tasks);
      await cacheSet(taskCacheKey(userId), createTaskCacheEnvelope(tasks));
      return true;
    });
    if (!accepted) return getCachedTasks(userId);
    // Widget sync must never be able to fail a completed fetch: Promise.resolve
    // tolerates a non-promise (or throwing) implementation, matching line below.
    void Promise.resolve(syncAndroidWidget(tasks, userId)).catch(() => {});
    return tasks;
  } catch (error) {
    if (taskFetchVersions.get(userId) === fetchVersion) serverAuthoritativeUsers.delete(userId);
    console.warn("[TaskService] Firestore fetch warning:", error);
  }

  // Only if direct fetch threw an error (e.g. offline or permission), fall back to cached tasks merged with pending ops
  const cachedTasks = await getCachedTasks(userId);
  const withPending = await applyPendingTaskOperations(cachedTasks, userId);
  void Promise.resolve(syncAndroidWidget(withPending, userId)).catch(() => {});
  return withPending;
}

export function subscribeToTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
  onInitialError?: (error: Error) => void,
): () => void {
  let newestSnapshot = 0;
  let isActive = true;
  const unsubscribe = subscribeFirestoreTasks(userId, (snapshotTasks) => {
    if (!isActive) return;
    const snapshotVersion = ++newestSnapshot;
    void withTaskCacheMutationLock(userId, async () => {
      if (!isActive || snapshotVersion !== newestSnapshot) return null;
      const pending = await getPendingOps("tasks");
      if (!isActive || snapshotVersion !== newestSnapshot) return null;
      const tasks = sortTasks(applyTaskOperations(
        snapshotTasks,
        pending.filter((operation) => canReplayForOwner(operation, userId)),
      ));
      setTaskCache(userId, tasks);
      await cacheSet(taskCacheKey(userId), createTaskCacheEnvelope(tasks));
      return tasks;
    }).then((tasks) => {
      if (!tasks || !isActive || snapshotVersion !== newestSnapshot) return;
      void syncAndroidWidget(tasks, userId).catch(() => {});
      onUpdate(tasks);
      // Migration writes are deliberately not triggered by subscriptions.
      // Enable only through the reviewed dry-run/conflict/CAS flow (phase 3).
    }).catch((error) => {
      console.warn("[TaskService] Could not reconcile a task snapshot:", error);
    });
  }, onInitialError);
  return () => {
    isActive = false;
    newestSnapshot += 1;
    unsubscribe();
  };
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
  const taskById = new Map((tasks || []).map((item) => [item.id, item]));

  const deleteOperations = idsToDelete.flatMap((id) => [
    { ownerId: userId, table: "tasks", op: "delete" as const, match: { id }, expectedRevision: taskById.get(id)?.updated_at },
    { ownerId: userId, table: "task_tags", op: "delete" as const, match: { task_id: id } },
    { ownerId: userId, table: "task_knowledge_links", op: "delete" as const, match: { task_id: id } },
    { ownerId: userId, table: "note_task_links", op: "delete" as const, match: { user_id: userId, task_id: id } },
  ]);
  const removeFromLatestLocalCache = async () => {
    // Caller holds this user's mutation lock, so queue order and cache order
    // stay aligned while the cascade is accepted and committed locally.
    let cached: unknown;
    try {
      cached = await cacheGet<unknown>(taskCacheKey(userId));
    } catch {
      // Preserve the in-memory fallback if local storage is temporarily unavailable.
    }
    const persistedTasks = readTaskCacheEnvelope(cached)?.tasks;
    const latestTasks = persistedTasks ?? taskCache.get(userId) ?? tasks ?? [];
    const next = latestTasks.filter((task) => !idsToDelete.includes(task.id));
    setTaskCache(userId, next);
    await Promise.all([
      cacheSet(taskCacheKey(userId), createTaskCacheEnvelope(next)),
      ...idsToDelete.map((id) => cacheSet(getTaskKnowledgeCacheKey(userId, id), [])),
      removeNoteTaskLinksFromCache(userId, "task_id", idsToDelete),
    ]);
    return next;
  };
  const commitLocalRemoval = () => withTaskCacheMutationLock(userId, removeFromLatestLocalCache);
  const queueCascadeAndCommit = () => withTaskCacheMutationLock(userId, async () => {
    if (!await enqueueOps(deleteOperations)) return false;
    await removeFromLatestLocalCache();
    return true;
  });
  const publishLocalRemoval = (remaining: Task[]) => {
    void syncAndroidWidget(remaining, userId).catch(() => {});
    window.dispatchEvent(new Event("tasks-changed"));
  };

  // Queue the whole cascade atomically before hiding it from the user's task list.
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (isOffline) {
    if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
    publishLocalRemoval(taskCache.get(userId) || []);
    return { success: true, deletedIds: idsToDelete };
  }

  // Firestore batches are atomic and capped at 500 writes. Larger trees are
  // durably queued as one local transaction and replayed idempotently.
  if (idsToDelete.length > 500) {
    if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
    publishLocalRemoval(taskCache.get(userId) || []);
    return { success: true, deletedIds: idsToDelete };
  }

  let linkedKnowledge: Array<{ id: string }>;
  let linkedNoteTasks: Array<Pick<NoteTaskLink, "id" | "user_id" | "task_id" | "note_id">>;
  try {
    const result = await firebaseStore
      .from("task_knowledge_links")
      .select("id,task_id,user_id")
      .eq("user_id", userId)
      .in("task_id", idsToDelete);
    if (result.error || !Array.isArray(result.data)) {
      throw result.error || new Error("Task knowledge links could not be verified.");
    }
    linkedKnowledge = result.data as Array<{ id: string }>;

    const noteTaskResult = await firebaseStore
      .from("note_task_links")
      .select("id,user_id,task_id,note_id")
      .eq("user_id", userId)
      .in("task_id", idsToDelete);
    if (noteTaskResult.error || !Array.isArray(noteTaskResult.data)) {
      throw noteTaskResult.error || new Error("Note-task links could not be verified.");
    }
    linkedNoteTasks = noteTaskResult.data as typeof linkedNoteTasks;

    // Local unsynced inserts must be ordered before a durable task-scoped
    // delete, otherwise they could be replayed later and resurrect the link.
    const pendingLinks = await getPendingOps("task_knowledge_links");
    const hasPendingLinkWrite = (pendingLinks || []).some((operation) => {
      if (!canReplayForOwner(operation, userId) || operation.op === "delete") return false;
      const payload = operation.payload && typeof operation.payload === "object"
        ? operation.payload as Record<string, unknown>
        : {};
      const taskId = payload.task_id ?? operation.match?.task_id;
      return typeof taskId === "string" && idsToDelete.includes(taskId);
    });
    if (hasPendingLinkWrite) {
      if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
      publishLocalRemoval(taskCache.get(userId) || []);
      return { success: true, deletedIds: idsToDelete };
    }

    const pendingNoteTaskLinks = await getPendingOps("note_task_links");
    const hasPendingNoteTaskLinkWrite = pendingNoteTaskLinks.some((operation) => {
      if (!canReplayForOwner(operation, userId) || operation.op === "delete") return false;
      const payload = operation.payload && typeof operation.payload === "object"
        ? operation.payload as Record<string, unknown>
        : {};
      const taskId = payload.task_id ?? operation.match?.task_id;
      return typeof taskId === "string" && idsToDelete.includes(taskId);
    });
    if (hasPendingNoteTaskLinkWrite) {
      if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
      publishLocalRemoval(taskCache.get(userId) || []);
      return { success: true, deletedIds: idsToDelete };
    }
  } catch (error) {
    console.warn("[TaskService] Could not verify task knowledge links; queuing the complete cascade:", error);
    if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
    publishLocalRemoval(taskCache.get(userId) || []);
    return { success: true, deletedIds: idsToDelete };
  }

  if (idsToDelete.length + linkedKnowledge.length + linkedNoteTasks.length > 500) {
    if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
    publishLocalRemoval(taskCache.get(userId) || []);
    return { success: true, deletedIds: idsToDelete };
  }

  try {
    const batch = writeBatch(db);
    for (const id of idsToDelete) batch.delete(doc(db, "users", userId, "tasks", id));
    for (const link of linkedKnowledge) {
      batch.delete(doc(db, "users", userId, "task_knowledge_links", link.id));
    }
    for (const link of linkedNoteTasks) {
      batch.delete(doc(db, "users", userId, "note_task_links", link.id));
    }
    await batch.commit();
  } catch (error) {
    console.warn("[TaskService] Atomic Firestore cascade delete failed, enqueuing for sync:", error);
    if (!await queueCascadeAndCommit()) return { success: false, deletedIds: [] };
    publishLocalRemoval(taskCache.get(userId) || []);
    return { success: true, deletedIds: idsToDelete };
  }

  // Sweep again after deleting the endpoint. This closes the small window in
  // which a cross-device link could commit after the initial query; new links
  // are rejected by their transaction once the task document is gone.
  for (const id of idsToDelete) {
    const cleaned = await deleteNoteTaskLinksFor(userId, "task_id", id).catch(() => false);
    if (!cleaned) console.warn("[TaskService] Note-task relationship cleanup remains pending.", id);
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
  const remaining = await commitLocalRemoval();
  publishLocalRemoval(remaining);
  return { success: true, deletedIds: idsToDelete };
}

export async function deleteTask(userId: string, taskId: string, knownTasks?: Task[]): Promise<boolean> {
  const res = await deleteTaskCascade(userId, taskId, knownTasks);
  return res.success;
}

export const removeTask = deleteTask;
export const saveTask = upsertFirestoreTask;
