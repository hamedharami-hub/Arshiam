import { showMascotMoment } from "./mascot";
import { reconcileRemoteRowsWithPending } from "./offlineReconcile";
import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
} from "./firebase";
import { cacheGet, cacheSet, enqueueOp, enqueueOps, getPendingOps } from "./offlineQueue";
import { deleteNoteTaskLinksFor, removeNoteTaskLinksFromCache } from "./noteTaskLinkService";
import {
  extractTasksFromCache,
  createTaskCacheEnvelope,
  withTaskCacheMutationLock,
} from "@/features/tasks/taskCache";
import type { Task } from "./taskTypes";

import { taskWorkDate } from "@/lib/taskDate";
import { normalizeTaskWrite } from "@/lib/taskSchedule";
export interface FolderItem {
  id: string;
  user_id?: string;
  name: string;
  parent_id: string | null;
  color: string;
  emoji?: string | null;
  position?: number;
}

export interface TagItem {
  id: string;
  user_id?: string;
  name: string;
  color: string;
}

export interface NoteItem {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  pinned: boolean;
  updated_at: string;
  created_at?: string;
  task_id?: string | null;
  folder_id?: string | null;
  tag_ids?: string[];
  kind?: string;
}

export interface HabitItem {
  id: string;
  user_id?: string;
  title: string;
  frequency?: string;
  color?: string;
  created_at?: string;
  streak?: number;
  completedDates?: string[];
  [key: string]: any;
}

export interface DailyCheckinItem {
  id: string;
  user_id?: string;
  checkin_date: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  sleep_quality: number | null;
  stress: number | null;
  sleep_hours: number | null;
  notes: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface ThoughtRecordItem {
  id: string;
  user_id?: string;
  situation: string;
  automatic_thought: string;
  emotion_intensity_before?: number;
  emotion_intensity_after?: number | null;
  emotions?: string[];
  evidence_for?: string[];
  evidence_against?: string[];
  alternative_thought?: string | null;
  distortions?: string[];
  created_at?: string;
  [key: string]: any;
}

export interface AbcRecordItem {
  id: string;
  user_id?: string;
  trigger: string;
  belief: string;
  consequences?: string[];
  duration_minutes?: number | null;
  regret_level?: number;
  created_at?: string;
  [key: string]: any;
}

export interface AssessmentResultItem {
  id: string;
  user_id?: string;
  assessment_type: string;
  scores: any;
  analysis?: any;
  completed_at?: string;
  created_at?: string;
  [key: string]: any;
}

const CACHE_KEYS = {
  tasks: (uid: string) => `tasks:all:${uid}`,
  folders: (uid: string) => `folders:all:${uid}`,
  tags: (uid: string) => `tags:all:${uid}`,
  notes: (uid: string) => `notes:all:${uid}`,
  habits: (uid: string) => `habits:all:${uid}`,
  checkins: (uid: string) => `checkins:all:${uid}`,
  thoughtRecords: (uid: string) => `thoughtRecords:all:${uid}`,
  abcRecords: (uid: string) => `abcRecords:all:${uid}`,
  assessmentResults: (uid: string, type?: string) => `assessmentResults:${type || "all"}:${uid}`,
  mindValues: (uid: string) => `mindValues:all:${uid}`,
  mindGoals: (uid: string) => `mindGoals:all:${uid}`,
};

// ==================== TASKS ====================

export function subscribeTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
  onInitialError?: (error: Error) => void,
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let hasReceivedSnapshot = false;
  let active = true;
  let knownTasks: Task[] = [];

  // 1. Immediately provide cached tasks if available
  cacheGet<unknown>(CACHE_KEYS.tasks(userId)).catch(() => undefined).then((cached) => {
    const tasks = extractTasksFromCache(cached);
    if (active && !hasReceivedSnapshot && tasks.length) {
      const merged = new Map(tasks.map(task => [task.id, task]));
      knownTasks.forEach(task => merged.set(task.id, task));
      knownTasks = [...merged.values()];
      onUpdate(knownTasks);
    }
  });

  // 2. Realtime listener to Firestore subcollection
  try {
    const tasksCol = collection(db, "users", userId, "tasks");
    const unsub = onSnapshot(
      tasksCol,
      { includeMetadataChanges: true },
      (snap) => {
        if (!active) return;
        const fromCache = snap.metadata?.fromCache === true;
        if (!fromCache) hasReceivedSnapshot = true;
        const items: Task[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });

        // Sort: pinned first, then position, then created_at desc
        items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          const posA = (a as any).position ?? 0;
          const posB = (b as any).position ?? 0;
          if (posA !== posB) return posA - posB;
          return new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
        });

        // The task service reconciles this snapshot with owner-scoped pending
        // operations before committing it to the shared cache.
        if (fromCache) {
          // A local snapshot may contain only part of the collection.
          const merged = new Map(knownTasks.map(task => [task.id, task]));
          items.forEach(task => merged.set(task.id, task));
          knownTasks = [...merged.values()];
          if (knownTasks.length) onUpdate(knownTasks);
        } else {
          knownTasks = items;
          onUpdate(items);
        }
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeTasks notice:", err?.message);
        if (!active || hasReceivedSnapshot) return;
        const cached = await cacheGet<unknown>(CACHE_KEYS.tasks(userId)).catch(() => undefined);
        const tasks = extractTasksFromCache(cached);
        if (!active) return;
        if (tasks.length) {
          const merged = new Map(tasks.map(task => [task.id, task]));
          knownTasks.forEach(task => merged.set(task.id, task));
          knownTasks = [...merged.values()];
          onUpdate(knownTasks);
          return;
        }
        if (knownTasks.length) {
          onUpdate(knownTasks);
          return;
        }
        onInitialError?.(err instanceof Error ? err : new Error("Task data could not be loaded."));
      }
    );
    return () => { active = false; unsub(); };
  } catch (err) {
    console.warn("[FirestoreData] Failed to subscribe to tasks:", err);
    const initialError = err instanceof Error ? err : new Error("Task data could not be loaded.");
    void cacheGet<unknown>(CACHE_KEYS.tasks(userId)).catch(() => undefined).then((cached) => {
      if (!active || hasReceivedSnapshot) return;
      const tasks = extractTasksFromCache(cached);
      if (tasks.length) {
        knownTasks = tasks;
        onUpdate(tasks);
      } else if (knownTasks.length) onUpdate(knownTasks);
      else onInitialError?.(initialError);
    });
    return () => { active = false; };
  }
}

export type TaskPersistenceStatus = "saved" | "queued" | "failed";

class ConcurrentEditError extends Error {
  constructor() { super("The cloud record changed since this device last read it."); }
}

/**
 * A write conflicts only when this device's base revision is known *and* the cloud
 * copy provably carries a different one. Without a base revision (first save from
 * this device) or without a cloud revision (legacy row), the write rebases onto the
 * current cloud copy instead of locking the user out of saving forever.
 */
async function writeWithRevision(
  ref: ReturnType<typeof doc>,
  data: Record<string, unknown>,
  expected: string | undefined,
  wasKnownLocal: boolean,
): Promise<void> {
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const remote = snapshot.data();
      const remoteRevision = remote?.updated_at ?? remote?.updatedAt;
      if (typeof expected === "string" && typeof remoteRevision === "string" && remoteRevision !== expected) {
        throw new ConcurrentEditError();
      }
    } else if (wasKnownLocal) {
      // The row this device edited was removed elsewhere; do not resurrect it.
      throw new ConcurrentEditError();
    }
    transaction.set(ref, data, { merge: true });
  });
}

async function deleteWithRevision(
  ref: ReturnType<typeof doc>,
  expected: string | undefined,
): Promise<void> {
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return;
    const remote = snapshot.data();
    const revision = remote?.updated_at ?? remote?.updatedAt;
    // Same rule as writes: only a known base that differs from the cloud revision
    // is a conflict. An unknown base must not make deletion impossible.
    if (typeof expected === "string" && typeof revision === "string" && revision !== expected) {
      throw new ConcurrentEditError();
    }
    transaction.delete(ref);
  });
}

function sameTaskValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

/** Roll back only the optimistic fields that still match this failed write. */
async function rollbackOptimisticTaskWrite(
  userId: string,
  taskId: string,
  optimisticTask: Partial<Task> & { id: string } | null,
  previousTask: Task | undefined,
  previousIndex: number,
): Promise<void> {
  const cacheKey = CACHE_KEYS.tasks(userId);
  try {
    await withTaskCacheMutationLock(userId, async () => {
      const latest = extractTasksFromCache(await cacheGet<unknown>(cacheKey));
      const currentIndex = latest.findIndex((candidate) => candidate.id === taskId);
      const current = currentIndex >= 0 ? latest[currentIndex] : undefined;

      // A concurrent removal/update wins; don't resurrect or overwrite it.
      if (optimisticTask && current) {
        if (!previousTask) {
          if (sameTaskValue(current, optimisticTask)) {
            latest.splice(currentIndex, 1);
            await cacheSet(cacheKey, createTaskCacheEnvelope(latest));
          }
          return;
        }

        if (sameTaskValue(current, optimisticTask)) {
          latest[currentIndex] = previousTask;
        } else {
          const restored = { ...current } as Task & Record<string, unknown>;
          for (const key of Object.keys(optimisticTask) as Array<keyof Task>) {
            if (key === "id" || !sameTaskValue(current[key], optimisticTask[key])) continue;
            if (Object.prototype.hasOwnProperty.call(previousTask, key)) {
              restored[key] = previousTask[key] as never;
            } else {
              delete restored[key];
            }
          }
          latest[currentIndex] = restored;
        }
        await cacheSet(cacheKey, createTaskCacheEnvelope(latest));
        return;
      }

      if (!optimisticTask && previousTask && !current) {
        latest.splice(Math.max(0, Math.min(previousIndex, latest.length)), 0, previousTask);
        await cacheSet(cacheKey, createTaskCacheEnvelope(latest));
      }
    });
  } catch (rollbackError) {
    console.warn("[FirestoreData] could not restore task cache after failed write:", rollbackError);
  }
}

/**
 * Saves a task to Firestore and reports whether the cloud write completed now
 * or has been safely placed in the device outbox for a later retry.
 */
export async function persistTask(
  userId: string,
  task: Partial<Task> & { id: string },
  options: { quietCompanion?: boolean; expectedValues?: Partial<Task> } = {},
): Promise<TaskPersistenceStatus> {
  if (!userId || !task.id) return "failed";
  let normalizedTask: typeof task;
  try { normalizedTask = normalizeTaskWrite(task); }
  catch (error) {
    console.warn("[FirestoreData] Invalid task schedule:", error);
    return "failed";
  }
  const dataToSave = {
    ...normalizedTask,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // 1. Update local cache optimistically first so task is never lost
  let previousTask: Task | undefined;
  let previousIndex = -1;
  let expectedValuesMismatch = false;
  try {
    await withTaskCacheMutationLock(userId, async () => {
      const cachedRaw = await cacheGet<unknown>(CACHE_KEYS.tasks(userId));
      const cached = extractTasksFromCache(cachedRaw);
      const index = cached.findIndex((t) => t.id === task.id);
      previousIndex = index;
      previousTask = index >= 0 ? cached[index] : undefined;
      if (options.expectedValues && (!previousTask || !Object.entries(options.expectedValues).every(([key, expected]) => {
        const actual = (previousTask as unknown as Record<string, unknown>)[key];
        try { return JSON.stringify(actual ?? null) === JSON.stringify(expected ?? null); }
        catch { return Object.is(actual, expected); }
      }))) {
        expectedValuesMismatch = true;
        return;
      }
      let next: Task[];
      if (index >= 0) {
        next = [...cached];
        next[index] = { ...next[index], ...dataToSave } as Task;
      } else {
        next = [dataToSave as Task, ...cached];
      }
      await cacheSet(CACHE_KEYS.tasks(userId), createTaskCacheEnvelope(next));
    });
  } catch (cacheErr) {
    console.warn("[FirestoreData] upsertTask cache warning:", cacheErr);
    if (options.expectedValues) expectedValuesMismatch = true;
  }

  // Undo/redo may pass a field-level precondition so a stale snapshot cannot
  // overwrite a later local edit. Cloud revision checks below cover remote races.
  if (expectedValuesMismatch) return "failed";

  // 2. Persist to Firestore
  const celebrateAcceptedChange = () => {
    if (!previousTask || options.quietCompanion) return;
    if (task.completed === true && !previousTask.completed) showMascotMoment("celebrate");
    else if (taskWorkDate(task) && taskWorkDate(task) !== taskWorkDate(previousTask)) {
      const scheduled = taskWorkDate(task)!;
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const localDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      const date = new Date(scheduled);
      const taskDate = scheduled.length === 10 ? scheduled : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (taskDate === localDate) showMascotMoment("tomorrow");
    }
  };
  try {
    const taskRef = doc(db, "users", userId, "tasks", task.id);
    await writeWithRevision(taskRef, dataToSave, previousTask?.updated_at ?? (previousTask as any)?.updatedAt, !!previousTask);
    celebrateAcceptedChange();
    return "saved";
  } catch (err) {
    if (err instanceof ConcurrentEditError) {
      await rollbackOptimisticTaskWrite(userId, task.id, dataToSave, previousTask, previousIndex);
      console.warn("[FirestoreData] task save rejected because the cloud revision changed:", task.id);
      return "failed";
    }
    console.warn("[FirestoreData] task write deferred to offline outbox:", err);
    let queued = false;
    try {
      await withTaskCacheMutationLock(userId, async () => {
        queued = await enqueueOp({
          ownerId: userId,
          table: "tasks",
          op: "upsert",
          payload: dataToSave,
          match: { id: task.id },
          expectedRevision: previousTask?.updated_at ?? (previousTask as any)?.updatedAt,
        });
        if (!queued) return;

        // Keep the accepted outbox mutation and its optimistic cache update in
        // the same critical section as cascaded deletes for deterministic order.
        const latest = extractTasksFromCache(await cacheGet<unknown>(CACHE_KEYS.tasks(userId)));
        const index = latest.findIndex((candidate) => candidate.id === task.id);
        if (index >= 0) latest[index] = { ...latest[index], ...dataToSave } as Task;
        else latest.unshift(dataToSave as Task);
        await cacheSet(CACHE_KEYS.tasks(userId), createTaskCacheEnvelope(latest));
      });
    } catch (queueError) {
      console.warn("[FirestoreData] task could not be queued after write failure:", queueError);
    }
    if (!queued) {
      await rollbackOptimisticTaskWrite(userId, task.id, dataToSave, previousTask, previousIndex);
    }
    if (queued) celebrateAcceptedChange();
    return queued ? "queued" : "failed";
  }
}

// Existing creation flows only need a success/failure result. Keep that public
// contract while TaskDetail uses persistTask to display the precise state.
export async function upsertTask(userId: string, task: Partial<Task> & { id: string }): Promise<boolean> {
  return (await persistTask(userId, task)) !== "failed";
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  if (!userId || !taskId) return false;
  // Keep the device view coherent first. If cloud deletion is unavailable, the
  // owner-bound outbox below retains the deletion for a later replay.
  let previousTask: Task | undefined;
  let previousIndex = -1;
  try {
    await withTaskCacheMutationLock(userId, async () => {
      const cachedRaw = await cacheGet<unknown>(CACHE_KEYS.tasks(userId));
      const cached = extractTasksFromCache(cachedRaw);
      previousIndex = cached.findIndex((task) => task.id === taskId);
      previousTask = previousIndex >= 0 ? cached[previousIndex] : undefined;
      await cacheSet(CACHE_KEYS.tasks(userId), createTaskCacheEnvelope(cached.filter((task) => task.id !== taskId)));
    });
  } catch (cacheErr) {
    console.warn("[FirestoreData] deleteTask cache warning:", cacheErr);
  }
  try {
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    await deleteWithRevision(taskRef, previousTask?.updated_at ?? (previousTask as any)?.updatedAt);
    return true;
  } catch (err) {
    if (err instanceof ConcurrentEditError) {
      await rollbackOptimisticTaskWrite(userId, taskId, null, previousTask, previousIndex);
      return false;
    }
    console.warn("[FirestoreData] task delete deferred to offline outbox:", err);
    let queued = false;
    try {
      await withTaskCacheMutationLock(userId, async () => {
        queued = await enqueueOp({ ownerId: userId, table: "tasks", op: "delete", match: { id: taskId }, expectedRevision: previousTask?.updated_at ?? (previousTask as any)?.updatedAt });
        if (!queued) return;
        const latest = extractTasksFromCache(await cacheGet<unknown>(CACHE_KEYS.tasks(userId)));
        await cacheSet(
          CACHE_KEYS.tasks(userId),
          createTaskCacheEnvelope(latest.filter((task) => task.id !== taskId)),
        );
      });
    } catch (queueError) {
      console.warn("[FirestoreData] task deletion could not be queued after write failure:", queueError);
    }
    if (!queued) {
      await rollbackOptimisticTaskWrite(userId, taskId, null, previousTask, previousIndex);
    }
    return queued;
  }
}

// ==================== FOLDERS ====================

export function subscribeFolders(
  userId: string,
  onUpdate: (folders: FolderItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let serial = Promise.resolve();
  const emit = (remote?: FolderItem[]) => {
    serial = serial.then(async () => {
      if (!active) return;
      const [cached, pending] = await Promise.all([cacheGet<FolderItem[]>(CACHE_KEYS.folders(userId)), getPendingOps("folders")]);
      const items = reconcileRemoteRowsWithPending(remote ?? cached ?? [], cached ?? [], pending, "folders", userId);
      items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      if (!active) return;
      await cacheSet(CACHE_KEYS.folders(userId), items);
      if (active) onUpdate(items);
    }).catch(error => console.warn("[FirestoreData] subscribeFolders:", error));
  };
  emit();

  try {
    const foldersCol = collection(db, "users", userId, "folders");
    const unsub = onSnapshot(
      foldersCol,
      (snap) => {
        const items: FolderItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        emit(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeFolders notice:", err?.message);
        emit();
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function upsertFolder(userId: string, folder: FolderItem): Promise<boolean> {
  if (!userId || !folder.id) return false;
  try {
    const folderRef = doc(db, "users", userId, "folders", folder.id);
    await setDoc(folderRef, { ...folder, user_id: userId }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertFolder error:", err);
    return false;
  }
}

export async function deleteFolder(userId: string, folderId: string): Promise<boolean> {
  if (!userId || !folderId) return false;
  try {
    const folderRef = doc(db, "users", userId, "folders", folderId);
    await deleteDoc(folderRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteFolder error:", err);
    return false;
  }
}

// ==================== TAGS ====================

export function subscribeTags(
  userId: string,
  onUpdate: (tags: TagItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let serial = Promise.resolve();
  const emit = (remote?: TagItem[]) => {
    serial = serial.then(async () => {
      if (!active) return;
      const [cached, pending] = await Promise.all([cacheGet<TagItem[]>(CACHE_KEYS.tags(userId)), getPendingOps("tags")]);
      const items = reconcileRemoteRowsWithPending(remote ?? cached ?? [], cached ?? [], pending, "tags", userId);
      items.sort((a, b) => a.name.localeCompare(b.name));
      if (!active) return;
      await cacheSet(CACHE_KEYS.tags(userId), items);
      if (active) onUpdate(items);
    }).catch(error => console.warn("[FirestoreData] subscribeTags:", error));
  };
  emit();

  try {
    const tagsCol = collection(db, "users", userId, "tags");
    const unsub = onSnapshot(
      tagsCol,
      (snap) => {
        const items: TagItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        emit(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeTags notice:", err?.message);
        emit();
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function upsertTag(userId: string, tag: TagItem): Promise<boolean> {
  if (!userId || !tag.id) return false;
  try {
    const tagRef = doc(db, "users", userId, "tags", tag.id);
    await setDoc(tagRef, { ...tag, user_id: userId }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertTag error:", err);
    return false;
  }
}

export async function deleteTag(userId: string, tagId: string): Promise<boolean> {
  if (!userId || !tagId) return false;
  try {
    const tagRef = doc(db, "users", userId, "tags", tagId);
    await deleteDoc(tagRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteTag error:", err);
    return false;
  }
}

// ==================== NOTES ====================

export function subscribeNotes(
  userId: string,
  onUpdate: (notes: NoteItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let snapshotVersion = 0;
  cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId)).then((cached) => {
    if (active && snapshotVersion === 0 && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const notesCol = collection(db, "users", userId, "notes");
    const unsub = onSnapshot(
      notesCol,
      async (snap) => {
        const version = ++snapshotVersion;
        const items: NoteItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        });
        const [cached, pending] = await Promise.all([
          cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId)), getPendingOps("notes"),
        ]);
        if (!active || version !== snapshotVersion) return;
        const merged = reconcileRemoteRowsWithPending(items, Array.isArray(cached) ? cached : [], pending, "notes", userId);
        await cacheSet(CACHE_KEYS.notes(userId), merged);
        if (active && version === snapshotVersion) onUpdate(merged);
      },
      async (err) => {
        const version = ++snapshotVersion;
        console.warn("[FirestoreData] subscribeNotes notice:", err?.message);
        const cached = await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId));
        if (active && version === snapshotVersion && cached) onUpdate(cached);
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    active = false;
    return () => {};
  }
}

function sameNoteValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

/** Restore only fields that still contain this failed optimistic write. */
async function rollbackOptimisticNoteWrite(
  userId: string,
  noteId: string,
  optimisticNote: Record<string, unknown>,
  previousNote: NoteItem | undefined,
): Promise<void> {
  const cacheKey = CACHE_KEYS.notes(userId);
  try {
    const cached = await cacheGet<NoteItem[]>(cacheKey);
    if (!Array.isArray(cached)) return;
    const index = cached.findIndex((candidate) => candidate.id === noteId);
    if (index < 0) return;
    const current = cached[index] as NoteItem & Record<string, unknown>;
    const restored = { ...current };

    for (const [key, optimisticValue] of Object.entries(optimisticNote)) {
      if (key === "id" || !sameNoteValue(current[key], optimisticValue)) continue;
      if (previousNote && Object.prototype.hasOwnProperty.call(previousNote, key)) {
        restored[key] = (previousNote as unknown as Record<string, unknown>)[key];
      } else {
        delete restored[key];
      }
    }

    if (!previousNote && Object.keys(optimisticNote).every((key) =>
      key === "id" || sameNoteValue(current[key], optimisticNote[key]))) {
      cached.splice(index, 1);
    } else {
      cached[index] = restored;
    }
    await cacheSet(cacheKey, cached);
  } catch (rollbackError) {
    console.warn("[FirestoreData] could not restore note cache after failed write:", rollbackError);
  }
}

/** Explicit outcome for callers that display sync state; legacy callers keep boolean acceptance. */
export type NoteSaveOutcome = "synced" | "queued" | "failed";
export async function upsertNote(userId: string, note: Partial<NoteItem> & { id: string }): Promise<boolean> {
  return (await persistNote(userId, note)) !== "failed";
}

export async function persistNote(userId: string, note: Partial<NoteItem> & { id: string }): Promise<NoteSaveOutcome> {
  if (!userId || !note.id) return "failed";
  const dataToSave = {
    ...note,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // 1. Update local cache optimistically
  let previousNote: NoteItem | undefined;
  let cacheSnapshotRead = false;
  let cacheUpdated = false;
  try {
    const snapshot = await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId));
    cacheSnapshotRead = true;
    const cachedBefore = Array.isArray(snapshot) ? snapshot : [];
    const index = cachedBefore.findIndex((n) => n.id === note.id);
    previousNote = index >= 0 ? cachedBefore[index] : undefined;
    let next: NoteItem[];
    if (index >= 0) {
      next = [...cachedBefore];
      next[index] = { ...next[index], ...dataToSave } as NoteItem;
    } else {
      next = [dataToSave as NoteItem, ...cachedBefore];
    }
    await cacheSet(CACHE_KEYS.notes(userId), next);
    cacheUpdated = true;
  } catch (cacheErr) {
    console.warn("[FirestoreData] upsertNote cache warning:", cacheErr);
  }

  // 2. Persist to Firestore
  try {
    const noteRef = doc(db, "users", userId, "notes", note.id);
    await writeWithRevision(noteRef, dataToSave, previousNote?.updated_at ?? (previousNote as any)?.updatedAt, !!previousNote);
    return "synced";
  } catch (err) {
    if (err instanceof ConcurrentEditError) {
      if (cacheUpdated && cacheSnapshotRead) await rollbackOptimisticNoteWrite(userId, note.id, dataToSave, previousNote);
      console.warn("[FirestoreData] note save rejected because the cloud revision changed:", note.id);
      return "failed";
    }
    console.warn("[FirestoreData] upsertNote remote save failed, falling back to offline queue:", err);
    try {
      const { enqueueOp } = await import("@/lib/offlineQueue");
      const ok = await enqueueOp({
        ownerId: userId,
        table: "notes",
        op: "upsert",
        payload: dataToSave,
        match: { id: note.id },
        expectedRevision: previousNote?.updated_at ?? (previousNote as any)?.updatedAt,
      });
      if (!ok && cacheUpdated && cacheSnapshotRead) await rollbackOptimisticNoteWrite(userId, note.id, dataToSave, previousNote);
      return ok ? "queued" : "failed";
    } catch {
      if (cacheUpdated && cacheSnapshotRead) await rollbackOptimisticNoteWrite(userId, note.id, dataToSave, previousNote);
      return "failed";
    }
  }
}

export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  if (!userId || !noteId) return false;
  const cachedBeforeDelete = await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId)).catch(() => undefined);
  const expectedRevision = Array.isArray(cachedBeforeDelete)
    ? (cachedBeforeDelete.find((note) => note.id === noteId)?.updated_at ?? (cachedBeforeDelete.find((note) => note.id === noteId) as any)?.updatedAt)
    : undefined;
  try {
    const noteRef = doc(db, "users", userId, "notes", noteId);
    await deleteWithRevision(noteRef, expectedRevision);

    const cached = (await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId))) || [];
    const next = cached.filter((n) => n.id !== noteId);
    await cacheSet(CACHE_KEYS.notes(userId), next);
    // Delete the note first, then sweep its relation collection. New links are
    // transactionally rejected once this endpoint no longer exists.
    const linksCleaned = await deleteNoteTaskLinksFor(userId, "note_id", noteId);
    if (!linksCleaned) console.warn("[FirestoreData] Note-task link cleanup remains pending:", noteId);
    return true;
  } catch (err) {
    if (err instanceof ConcurrentEditError) return false;
    console.warn("[FirestoreData] deleteNote error, queuing delete:", err);
    try {
      const ok = await enqueueOps([
        {
          ownerId: userId,
          table: "notes",
          op: "delete",
          match: { id: noteId },
          expectedRevision,
        },
        {
          ownerId: userId,
          table: "note_task_links",
          op: "delete",
          match: { user_id: userId, note_id: noteId },
        },
      ]);
      if (ok) {
        const cached = (await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId))) || [];
        await cacheSet(CACHE_KEYS.notes(userId), cached.filter((note) => note.id !== noteId));
        await removeNoteTaskLinksFromCache(userId, "note_id", [noteId]);
      }
      return ok;
    } catch {
      return false;
    }
  }
}

// ==================== HABITS ====================

export function subscribeHabits(
  userId: string,
  onUpdate: (habits: HabitItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let snapshotSeen = false;

  cacheGet<HabitItem[]>(CACHE_KEYS.habits(userId)).then((cached) => {
    if (active && !snapshotSeen && cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const habitsCol = collection(db, "users", userId, "habits");
    const unsub = onSnapshot(
      habitsCol,
      (snap) => {
        if (!active) return;
        snapshotSeen = true;
        const items: HabitItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        cacheSet(CACHE_KEYS.habits(userId), items);
        onUpdate(items);
      },
      async () => {
        if (!active || snapshotSeen) return;
        const cached = await cacheGet<HabitItem[]>(CACHE_KEYS.habits(userId));
        if (active && !snapshotSeen && cached) onUpdate(cached);
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function upsertHabit(userId: string, habit: HabitItem): Promise<boolean> {
  if (!userId || !habit.id) return false;
  try {
    const habitRef = doc(db, "users", userId, "habits", habit.id);
    await setDoc(habitRef, { ...habit, user_id: userId }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertHabit error:", err);
    return false;
  }
}

export async function deleteHabit(userId: string, habitId: string): Promise<boolean> {
  if (!userId || !habitId) return false;
  try {
    const habitRef = doc(db, "users", userId, "habits", habitId);
    await deleteDoc(habitRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteHabit error:", err);
    return false;
  }
}

// ==================== DAILY CHECKINS ====================

export function subscribeDailyCheckins(
  userId: string,
  onUpdate: (checkins: DailyCheckinItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let snapshotSeen = false;

  cacheGet<DailyCheckinItem[]>(CACHE_KEYS.checkins(userId)).then((cached) => {
    if (active && !snapshotSeen && cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "daily_checkins");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!active) return;
        snapshotSeen = true;
        const items: DailyCheckinItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => (b.checkin_date || "").localeCompare(a.checkin_date || ""));
        cacheSet(CACHE_KEYS.checkins(userId), items);
        onUpdate(items);
      },
      async () => {
        if (!active || snapshotSeen) return;
        const cached = await cacheGet<DailyCheckinItem[]>(CACHE_KEYS.checkins(userId));
        if (active && !snapshotSeen && cached) onUpdate(cached);
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function getDailyCheckin(userId: string, date: string): Promise<DailyCheckinItem | null> {
  if (!userId || !date) return null;
  try {
    const docRef = doc(db, "users", userId, "daily_checkins", date);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) };
    }
  } catch (err) {
    console.warn("[FirestoreData] getDailyCheckin error:", err);
  }
  // Check local cache
  const cachedList = await cacheGet<DailyCheckinItem[]>(CACHE_KEYS.checkins(userId));
  return cachedList?.find((c) => c.checkin_date === date || c.id === date) || null;
}

export async function upsertDailyCheckin(userId: string, checkin: Partial<DailyCheckinItem> & { checkin_date: string }): Promise<boolean> {
  if (!userId || !checkin.checkin_date) return false;
  const docId = checkin.checkin_date;
  try {
    const docRef = doc(db, "users", userId, "daily_checkins", docId);
    await setDoc(docRef, { ...checkin, id: docId, user_id: userId, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertDailyCheckin error:", err);
    return false;
  }
}

// ==================== THOUGHT RECORDS (CBT) ====================

export function subscribeThoughtRecords(
  userId: string,
  onUpdate: (records: ThoughtRecordItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let snapshotSeen = false;

  cacheGet<ThoughtRecordItem[]>(CACHE_KEYS.thoughtRecords(userId)).then((cached) => {
    if (active && !snapshotSeen && cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "thought_records");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!active) return;
        snapshotSeen = true;
        const items: ThoughtRecordItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.thoughtRecords(userId), items);
        onUpdate(items);
      },
      async () => {
        if (!active || snapshotSeen) return;
        const cached = await cacheGet<ThoughtRecordItem[]>(CACHE_KEYS.thoughtRecords(userId));
        if (active && !snapshotSeen && cached) onUpdate(cached);
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function upsertThoughtRecord(userId: string, record: Partial<ThoughtRecordItem>): Promise<string | null> {
  if (!userId) return null;
  const id = record.id || `thought_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const docRef = doc(db, "users", userId, "thought_records", id);
    const now = new Date().toISOString();
    await setDoc(
      docRef,
      {
        ...record,
        id,
        user_id: userId,
        created_at: record.created_at || now,
        updated_at: now,
      },
      { merge: true }
    );
    return id;
  } catch (err) {
    console.warn("[FirestoreData] upsertThoughtRecord error:", err);
    return null;
  }
}

export async function deleteThoughtRecord(userId: string, id: string): Promise<boolean> {
  if (!userId || !id) return false;
  try {
    const docRef = doc(db, "users", userId, "thought_records", id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteThoughtRecord error:", err);
    return false;
  }
}

// ==================== ABC RECORDS ====================

export function subscribeAbcRecords(
  userId: string,
  onUpdate: (records: AbcRecordItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let snapshotSeen = false;

  cacheGet<AbcRecordItem[]>(CACHE_KEYS.abcRecords(userId)).then((cached) => {
    if (active && !snapshotSeen && cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "abc_records");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!active) return;
        snapshotSeen = true;
        const items: AbcRecordItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.abcRecords(userId), items);
        onUpdate(items);
      },
      async () => {
        if (!active || snapshotSeen) return;
        const cached = await cacheGet<AbcRecordItem[]>(CACHE_KEYS.abcRecords(userId));
        if (active && !snapshotSeen && cached) onUpdate(cached);
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function upsertAbcRecord(userId: string, record: Partial<AbcRecordItem>): Promise<string | null> {
  if (!userId) return null;
  const id = record.id || `abc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const docRef = doc(db, "users", userId, "abc_records", id);
    const now = new Date().toISOString();
    await setDoc(
      docRef,
      {
        ...record,
        id,
        user_id: userId,
        created_at: record.created_at || now,
        updated_at: now,
      },
      { merge: true }
    );
    return id;
  } catch (err) {
    console.warn("[FirestoreData] upsertAbcRecord error:", err);
    return null;
  }
}

export async function deleteAbcRecord(userId: string, recordId: string): Promise<boolean> {
  if (!userId || !recordId) return false;
  try {
    const docRef = doc(db, "users", userId, "abc_records", recordId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteAbcRecord error:", err);
    return false;
  }
}

// ==================== ASSESSMENTS & SCREENERS ====================

export function subscribeAssessmentResults(
  userId: string,
  type: string | undefined,
  onUpdate: (results: AssessmentResultItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let snapshotSeen = false;

  cacheGet<AssessmentResultItem[]>(CACHE_KEYS.assessmentResults(userId, type)).then((cached) => {
    if (active && !snapshotSeen && cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "assessment_results");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!active) return;
        snapshotSeen = true;
        let items: AssessmentResultItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        if (type) {
          items = items.filter((x) => x.assessment_type === type);
        }
        items.sort((a, b) => new Date(b.completed_at || b.created_at || 0).getTime() - new Date(a.completed_at || a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.assessmentResults(userId, type), items);
        onUpdate(items);
      },
      async () => {
        if (!active || snapshotSeen) return;
        const cached = await cacheGet<AssessmentResultItem[]>(CACHE_KEYS.assessmentResults(userId, type));
        if (active && !snapshotSeen && cached) onUpdate(cached);
      }
    );
    return () => { active = false; unsub(); };
  } catch {
    return () => { active = false; };
  }
}

export async function upsertAssessmentResult(
  userId: string,
  result: Partial<AssessmentResultItem>
): Promise<AssessmentResultItem | null> {
  if (!userId || !result.assessment_type) return null;
  const id = result.id || `result_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const payload: AssessmentResultItem = {
    id,
    user_id: userId,
    assessment_type: result.assessment_type,
    scores: result.scores || {},
    analysis: result.analysis || {},
    completed_at: result.completed_at || now,
    created_at: result.created_at || now,
    ...result,
  };

  try {
    const docRef = doc(db, "users", userId, "assessment_results", id);
    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (err) {
    console.warn("[FirestoreData] upsertAssessmentResult error:", err);
    return null;
  }
}

export async function getAssessmentProgress(
  userId: string,
  type: string
): Promise<{ responses: Record<number, number>; currentIndex: number; completed: boolean } | null> {
  if (!userId || !type) return null;
  try {
    const docRef = doc(db, "users", userId, "assessment_progress", type);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as any;
    }
  } catch (err) {
    console.warn("[FirestoreData] getAssessmentProgress error:", err);
  }
  return null;
}

export async function saveAssessmentProgress(
  userId: string,
  type: string,
  responses: Record<number, number>,
  currentIndex: number,
  completed: boolean
): Promise<boolean> {
  if (!userId || !type) return false;
  try {
    const docRef = doc(db, "users", userId, "assessment_progress", type);
    await setDoc(
      docRef,
      {
        user_id: userId,
        assessment_type: type,
        responses,
        current_index: currentIndex,
        completed,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[FirestoreData] saveAssessmentProgress error:", err);
    return false;
  }
}

// ==================== MIND VALUES & GOALS (ACT) ====================

export interface MindGoalItem {
  id: string;
  user_id?: string;
  domain: string;
  text: string;
  /** Goal level. `quarter` = season. Absent when the goal has no level (never silently turned into a month). */
  horizon?: "today" | "week" | "month" | "quarter" | "year";
  created_at: string;
  [key: string]: any;
}

export type MindValuesMeta = { source: "cache" | "server"; error?: boolean };

export function subscribeMindValues(
  userId: string,
  onUpdate: (values: Record<string, any>, meta: MindValuesMeta) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!userId) {
    onUpdate({}, { source: "server" });
    return () => {};
  }

  let active = true;
  let snapshotSeen = false;
  let serverSeen = false;

  cacheGet<Record<string, any>>(CACHE_KEYS.mindValues(userId)).then((cached) => {
    if (active && !snapshotSeen && !serverSeen && cached && typeof cached === "object" && !Array.isArray(cached)) {
      onUpdate(cached, { source: "cache" });
    }
  }).catch(() => {});

  try {
    const docRef = doc(db, "users", userId, "mind_settings", "values");
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (!active) return;
        snapshotSeen = true;
        const raw = snap.exists() ? snap.data()?.values : null;
        const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, any> : {};
        const source = snap.metadata?.fromCache ? "cache" : "server";
        if (source === "server") serverSeen = true;
        void cacheSet(CACHE_KEYS.mindValues(userId), data).catch(() => {});
        onUpdate(data, { source });
      },
      async (error: unknown) => {
        if (!active) return;
        onError?.(error);
        if (serverSeen) return;
        try {
          const cached = await cacheGet<Record<string, any>>(CACHE_KEYS.mindValues(userId));
          if (active && cached && typeof cached === "object" && !Array.isArray(cached)) onUpdate(cached, { source: "cache", error: true });
        } catch {}
      }
    );
    return () => { active = false; unsub(); };
  } catch (error) {
    onError?.(error);
    return () => { active = false; };
  }
}

export async function saveMindValues(userId: string, values: Record<string, any>): Promise<boolean> {
  if (!userId) return false;
  cacheSet(CACHE_KEYS.mindValues(userId), values);
  try {
    const docRef = doc(db, "users", userId, "mind_settings", "values");
    await setDoc(docRef, { values, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] saveMindValues error:", err);
    return false;
  }
}

export type MindGoalsMeta = { source: "cache" | "server"; error?: boolean };
/**
 * Live goals of one user. An empty server result is a real "no goals" and clears the cache too.
 * A late cache read never overwrites fresher server data; errors are reported, not shown as "empty".
 */
export function subscribeMindGoals(
  userId: string,
  onUpdate: (goals: MindGoalItem[], meta: MindGoalsMeta) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!userId) {
    onUpdate([], { source: "server" });
    return () => {};
  }
  let active = true;
  let fromServer = false;

  cacheGet<MindGoalItem[]>(CACHE_KEYS.mindGoals(userId)).then((cached) => {
    if (active && !fromServer && cached && Array.isArray(cached)) onUpdate(cached, { source: "cache" });
  });

  try {
    const colRef = collection(db, "users", userId, "mind_goals");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!active) return;
        const items: MindGoalItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        if (!snap.metadata.fromCache) fromServer = true;
        cacheSet(CACHE_KEYS.mindGoals(userId), items);
        onUpdate(items, { source: snap.metadata.fromCache ? "cache" : "server" });
      },
      (error) => {
        if (!active) return;
        onError?.(error);
      }
    );
    return () => { active = false; unsub(); };
  } catch (error) {
    onError?.(error);
    return () => { active = false; };
  }
}

export async function upsertMindGoal(userId: string, goal: Partial<MindGoalItem> & { id: string }): Promise<boolean> {
  if (!userId || !goal.id) return false;
  try {
    const docRef = doc(db, "users", userId, "mind_goals", goal.id);
    await setDoc(docRef, { ...goal, user_id: userId, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertMindGoal error:", err);
    return false;
  }
}

export async function deleteMindGoal(userId: string, goalId: string): Promise<boolean> {
  if (!userId || !goalId) return false;
  try {
    const docRef = doc(db, "users", userId, "mind_goals", goalId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteMindGoal error:", err);
    return false;
  }
}

// ==================== LEGACY SOCRATIC SESSION (read-only archive) ====================

export interface SocraticMessageItem {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  provenance?: "user_report" | "ai_suggestion";
}

export interface SocraticSessionItem {
  id: string;
  user_id: string;
  messages: SocraticMessageItem[];
  summary?: string | null;
  draft_text?: string;
  updated_at: string;
  created_at?: string;
}

export function subscribeSocraticSession(
  userId: string,
  onUpdate: (session: SocraticSessionItem | null) => void
): () => void {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  cacheGet<SocraticSessionItem>(`socratic:session:${userId}`).then((cached) => {
    if (cached) onUpdate(cached);
  });

  try {
    const docRef = doc(db, "users", userId, "socratic_sessions", "current");
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...(snap.data() as any) } as SocraticSessionItem;
          cacheSet(`socratic:session:${userId}`, data);
          onUpdate(data);
        } else {
          onUpdate(null);
        }
      },
      async () => {
        const cached = await cacheGet<SocraticSessionItem>(`socratic:session:${userId}`);
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}
