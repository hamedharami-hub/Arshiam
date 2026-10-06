import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp, getPendingOps } from "./offlineQueue";
import { getFirestoreConflictSnapshot, replayQueuedEntityWithOutcome } from "./firestoreSync";
import { reconcileRemoteRowsWithPending } from "./offlineReconcile";
import type { TaskNote } from "./taskTypes";

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function isOnline(): boolean {
  if (typeof window !== "undefined" && window.navigator && typeof window.navigator.onLine === "boolean") {
    return window.navigator.onLine;
  }
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

export function getTaskNotesCacheKey(userId: string, taskId: string): string {
  return `task_notes_${userId}_${taskId}`;
}

export function getAllNotesCacheKey(userId: string): string {
  return `notes:all:${userId}`;
}

function getUserMutationQueueKey(userId: string): string {
  return `task-notes:user:${userId}`;
}

function sortNotes(notes: TaskNote[]): TaskNote[] {
  return [...notes].sort((a, b) =>
    new Date(b.updated_at || b.created_at || 0).getTime() -
    new Date(a.updated_at || a.created_at || 0).getTime()
  );
}

async function persistNoteOrQueue(
  userId: string,
  operation: "insert" | "update" | "delete",
  note: TaskNote,
  expectedRevision?: string,
): Promise<void> {
  const mutation = {
    op: operation,
    ...(operation === "delete" ? {} : { payload: note as unknown as Record<string, unknown> }),
    createdAt: Date.now(),
    expectedRevision: operation === "delete" ? note.updated_at : expectedRevision,
    mutationId: operation === "insert" ? `create-note:${note.id}` : makeId(),
  };
  if (isOnline()) {
    let outcome: "saved" | "stale" | "failed" = "failed";
    try {
      outcome = await replayQueuedEntityWithOutcome(userId, "notes", note.id, mutation);
    } catch { /* An unavailable service can use the durable outbox below. */ }
    if (outcome === "saved") return;
    if (outcome === "stale") throw new Error("The cloud note changed. Your previous data was restored; reload before editing again.");
  }

  const queued = await enqueueOp({
    ownerId: userId,
    mutationId: mutation.mutationId,
    table: "notes",
    op: operation,
    ...(operation === "delete" ? {} : { payload: note }),
    match: { id: note.id },
    ...(operation === "delete" ? { expectedRevision: note.updated_at }
      : operation === "update" ? { expectedRevision } : {}),
  });
  if (!queued) {
    throw new Error("Could not safely save this note: sync queue storage is unavailable. Your previous data was restored.");
  }
}

const queueMap = new Map<string, Promise<unknown>>();

async function runSynchronized<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queueMap.get(key) || Promise.resolve();
  let resolveNext: () => void;
  const next = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });
  queueMap.set(key, next);

  try {
    await previous;
    return await task();
  } finally {
    resolveNext!();
    if (queueMap.get(key) === next) {
      queueMap.delete(key);
    }
  }
}

/**
 * Retrieves all notes associated with a given Task.
 * Cache-first with background remote sync and safe local merge.
 */
export async function getTaskNotes(taskId: string, userId: string): Promise<TaskNote[]> {
  if (!taskId || !userId) return [];
  const cacheKey = getTaskNotesCacheKey(userId, taskId);

  // Share a per-account lock with note mutations so a slow remote read cannot
  // overwrite an optimistic edit or race the all-notes cache for another task.
  return runSynchronized(getUserMutationQueueKey(userId), async () => {
    const cached = (await cacheGet<TaskNote[]>(cacheKey)) || [];
    let pending: Awaited<ReturnType<typeof getPendingOps>>;
    try {
      pending = await getPendingOps("notes");
    } catch (error) {
      console.warn("Could not inspect pending task-note changes; keeping the local cache:", error);
      return sortNotes(cached);
    }

    if (isOnline()) {
      try {
        const { data, error } = await firebaseStore
          .from("notes")
          .select("*")
          .eq("user_id", userId)
          .eq("task_id", taskId);

        if (!error && Array.isArray(data)) {
          const merged = sortNotes(reconcileRemoteRowsWithPending(
            data as TaskNote[],
            cached,
            pending,
            "notes",
            userId,
          ));
          try {
            await cacheSet(cacheKey, merged);
          } catch (cacheError) {
            console.warn("Could not cache refreshed task notes:", cacheError);
          }
          return merged;
        }
      } catch (error) {
        console.warn("Failed to fetch task notes remotely; falling back to cache", error);
      }
    }

    // Without an authoritative remote read, keep the cached snapshot as the
    // base and overlay the outbox; an empty base would drop older cached notes.
    const merged = sortNotes(reconcileRemoteRowsWithPending(cached, cached, pending, "notes", userId));
    try {
      await cacheSet(cacheKey, merged);
    } catch (error) {
      console.warn("Could not cache pending task notes:", error);
    }
    return merged;
  });
}

/**
 * Creates a new independent Note for a Task.
 * NEVER creates empty records — caller must supply valid title or content.
 */
export async function createTaskNote(
  userId: string,
  taskId: string,
  data: { id?: string; title?: string; content?: string }
): Promise<TaskNote> {
  if (!userId || !taskId) {
    throw new Error("userId and taskId are required");
  }

  const rawTitle = (data.title || "").trim();
  const rawContent = (data.content || "").trim();

  if (!rawTitle && !rawContent) {
    throw new Error("نوت نمی‌تواند کاملاً خالی باشد / Note cannot be completely empty");
  }

  const now = new Date().toISOString();
  const note: TaskNote = {
    id: data.id || makeId(),
    user_id: userId,
    task_id: taskId,
    title: rawTitle || rawContent.slice(0, 40) || "یادداشت",
    content: rawContent,
    created_at: now,
    updated_at: now,
  };

  const taskKey = getTaskNotesCacheKey(userId, taskId);

  return runSynchronized(getUserMutationQueueKey(userId), async () => {
    // 1. A conversion caller can reuse its stable ID after a partial success.
    const currentTaskNotes = (await cacheGet<TaskNote[]>(taskKey)) || [];
    if (data.id) {
      let existing = currentTaskNotes.find(candidate => candidate.id === data.id);
      if (!existing && isOnline()) {
        try {
          const snapshot = await getFirestoreConflictSnapshot(userId, "notes", data.id);
          if (snapshot.exists) existing = snapshot.data as unknown as TaskNote;
        } catch { /* The guarded write/outbox still handles an unavailable read. */ }
      }
      if (existing) {
        if (existing.task_id !== taskId || existing.title !== note.title || existing.content !== note.content) {
          throw new Error("A different note already uses this id.");
        }
        await cacheSet(taskKey, [existing, ...currentTaskNotes.filter(candidate => candidate.id !== existing!.id)]);
        const allKey = getAllNotesCacheKey(userId);
        const allNotes = (await cacheGet<TaskNote[]>(allKey)) || [];
        await cacheSet(allKey, [existing, ...allNotes.filter(candidate => candidate.id !== existing!.id)]);
        return existing;
      }
    }
    const updatedTaskNotes = [note, ...currentTaskNotes.filter((n) => n.id !== note.id)];
    await cacheSet(taskKey, updatedTaskNotes);

    const allKey = getAllNotesCacheKey(userId);
    const allNotes = (await cacheGet<any[]>(allKey)) || [];
    await cacheSet(allKey, [note, ...allNotes.filter((n) => n.id !== note.id)]);

    // 2. Persist to Firestore or durable outbox. Roll back if neither accepts it.
    try {
      await persistNoteOrQueue(userId, "insert", note);
    } catch (error) {
      await cacheSet(taskKey, currentTaskNotes);
      await cacheSet(allKey, allNotes);
      throw error;
    }

    return note;
  });
}

/**
 * Updates an existing TaskNote.
 * Only touches notes table, NEVER alters task.
 */
export async function updateTaskNote(
  userId: string,
  noteId: string,
  taskId: string,
  patch: Partial<Omit<TaskNote, "id" | "user_id" | "task_id" | "created_at">>
): Promise<TaskNote> {
  if (!userId || !noteId || !taskId) {
    throw new Error("userId, noteId, and taskId are required");
  }

  const taskKey = getTaskNotesCacheKey(userId, taskId);

  return runSynchronized(getUserMutationQueueKey(userId), async () => {
    const currentTaskNotes = (await cacheGet<TaskNote[]>(taskKey)) || [];
    const existing = currentTaskNotes.find((n) => n.id === noteId);

    const now = new Date().toISOString();
    const updated: TaskNote = {
      ...(existing || { id: noteId, user_id: userId, task_id: taskId, title: "", content: "", created_at: now }),
      ...patch,
      updated_at: now,
    };

    // 1. Optimistic cache updates
    const updatedList = currentTaskNotes.map((n) => (n.id === noteId ? updated : n));
    if (!existing) updatedList.unshift(updated);
    await cacheSet(taskKey, updatedList);

    const allKey = getAllNotesCacheKey(userId);
    const allNotes = (await cacheGet<any[]>(allKey)) || [];
    await cacheSet(allKey, allNotes.map((n) => (n.id === noteId ? { ...n, ...updated } : n)));

    // 2. Persist to Firestore or durable outbox. Roll back if neither accepts it.
    try {
      await persistNoteOrQueue(userId, "update", updated, existing?.updated_at);
    } catch (error) {
      await cacheSet(taskKey, currentTaskNotes);
      await cacheSet(allKey, allNotes);
      throw error;
    }

    return updated;
  });
}

/**
 * Deletes a TaskNote.
 * Only removes the note record, NEVER deletes or alters the task.
 */
export async function deleteTaskNote(
  userId: string,
  noteId: string,
  taskId: string
): Promise<boolean> {
  if (!userId || !noteId || !taskId) return false;

  const taskKey = getTaskNotesCacheKey(userId, taskId);

  return runSynchronized(getUserMutationQueueKey(userId), async () => {
    // 1. Optimistic cache updates
    const currentTaskNotes = (await cacheGet<TaskNote[]>(taskKey)) || [];
    await cacheSet(taskKey, currentTaskNotes.filter((n) => n.id !== noteId));

    const allKey = getAllNotesCacheKey(userId);
    const allNotes = (await cacheGet<any[]>(allKey)) || [];
    await cacheSet(allKey, allNotes.filter((n) => n.id !== noteId));

    // 2. Persist delete to Firestore or durable outbox; restore caches on failure.
    const noteToDelete = currentTaskNotes.find((note) => note.id === noteId) || {
      id: noteId,
      user_id: userId,
      task_id: taskId,
      title: "",
      content: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await persistNoteOrQueue(userId, "delete", noteToDelete);
    } catch (error) {
      await cacheSet(taskKey, currentTaskNotes);
      await cacheSet(allKey, allNotes);
      throw error;
    }

    return true;
  });
}
