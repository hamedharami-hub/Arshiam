import { auth } from "@/lib/firebase";
import { firebaseStore } from "@/lib/firebaseStore";
import { cacheGet, cacheSet, canReplayForOwner, enqueueOp, enqueueOps, getPendingOps } from "@/lib/offlineQueue";
import { saveNoteTaskLinkWithOutcome, deleteEntityFromFirestore } from "@/lib/firestoreSync";
import { makeNoteTaskLinkId, type NoteTaskLink } from "./noteTaskLinkTypes";

export type NoteTaskEndpoint = "note_id" | "task_id";

export function getNoteTaskLinksCacheKey(userId: string): string {
  return `note_task_links_${userId}`;
}

/**
 * The relationship ID is an injective encoding of the note/task pair. Its
 * owner-scoped Firestore path makes retries idempotent without a random ID.
 */
export { makeNoteTaskLinkId } from "./noteTaskLinkTypes";

const mutationTails = new Map<string, Promise<unknown>>();

async function withPairLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = mutationTails.get(key);
  const current = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(operation);
  mutationTails.set(key, current);
  try {
    return await current;
  } finally {
    if (mutationTails.get(key) === current) mutationTails.delete(key);
  }
}

function assertActiveOwner(userId: string): void {
  if (!userId || auth.currentUser?.uid !== userId) {
    throw new Error("The active account does not own this note-task relationship.");
  }
}

function makeLink(userId: string, noteId: string, taskId: string): NoteTaskLink {
  return {
    id: makeNoteTaskLinkId(noteId, taskId),
    user_id: userId,
    note_id: noteId,
    task_id: taskId,
    created_at: new Date().toISOString(),
  };
}

async function updateCachedLink(userId: string, link: NoteTaskLink, exists: boolean): Promise<void> {
  const key = getNoteTaskLinksCacheKey(userId);
  const links = (await cacheGet<NoteTaskLink[]>(key)) || [];
  const next = exists
    ? links.some((item) => item.id === link.id) ? links : [...links, link]
    : links.filter((item) => item.id !== link.id);
  await cacheSet(key, next);
}

function hasPendingEntityWrite(
  operations: Awaited<ReturnType<typeof getPendingOps>>,
  userId: string,
  id: string,
): boolean {
  return operations.some((operation) => {
    if (!canReplayForOwner(operation, userId) || operation.op === "delete") return false;
    const payload = operation.payload && typeof operation.payload === "object"
      ? operation.payload as Record<string, unknown>
      : {};
    return payload.id === id;
  });
}

export async function getNoteTaskLinks(userId: string): Promise<NoteTaskLink[]> {
  if (!userId || auth.currentUser?.uid !== userId) return [];
  const key = getNoteTaskLinksCacheKey(userId);
  const cached = (await cacheGet<NoteTaskLink[]>(key)) || [];
  if (auth.currentUser?.uid !== userId) return [];
  if (typeof navigator !== "undefined" && !navigator.onLine) return auth.currentUser?.uid === userId ? cached : [];

  try {
    const result = await firebaseStore.from("note_task_links", userId)
      .select("*")
      .eq("user_id", userId);
    assertActiveOwner(userId);
    if (result.error || !Array.isArray(result.data)) return cached;
    const pending = await getPendingOps("note_task_links");
    assertActiveOwner(userId);
    const rows = new Map((result.data as NoteTaskLink[]).map((link) => [link.id, link]));
    for (const operation of pending.filter((item) => canReplayForOwner(item, userId)).sort((a, b) => a.createdAt - b.createdAt)) {
      const payload = operation.payload && typeof operation.payload === "object"
        ? operation.payload as Partial<NoteTaskLink>
        : undefined;
      if (operation.op === "delete") {
        for (const [id, link] of rows) {
          if ((operation.match?.id === id) ||
            (typeof operation.match?.note_id === "string" && link.note_id === operation.match.note_id) ||
            (typeof operation.match?.task_id === "string" && link.task_id === operation.match.task_id)) rows.delete(id);
        }
      } else if (payload?.id) {
        rows.set(payload.id, { ...(rows.get(payload.id) || {}), ...payload } as NoteTaskLink);
      }
    }
    const merged = Array.from(rows.values());
    await cacheSet(key, merged);
    return auth.currentUser?.uid === userId ? merged : [];
  } catch {
    return auth.currentUser?.uid === userId ? cached : [];
  }
}

export async function linkNoteToTask(userId: string, noteId: string, taskId: string): Promise<"saved" | "queued"> {
  if (!userId || !noteId || !taskId) throw new Error("User, note, and task IDs are required.");
  assertActiveOwner(userId);
  const link = makeLink(userId, noteId, taskId);
  return withPairLock(`${userId}/${link.id}`, async () => {
    assertActiveOwner(userId);
    const pending = await getPendingOps("note_task_links");
    const relevantMutations = pending.map((operation, index) => ({ operation, index }))
      .filter(({ operation }) => {
        if (!canReplayForOwner(operation, userId)) return false;
        if (operation.op === "delete") {
          return operation.match?.id === link.id || operation.match?.note_id === noteId || operation.match?.task_id === taskId;
        }
        return (operation.payload as Partial<NoteTaskLink> | undefined)?.id === link.id;
      })
      .sort((left, right) => left.operation.createdAt - right.operation.createdAt || left.index - right.index);
    const latestMutation = relevantMutations.at(-1)?.operation;
    const pendingCreate = latestMutation && latestMutation.op !== "delete" &&
      (latestMutation.payload as Partial<NoteTaskLink> | undefined)?.id === link.id
      ? latestMutation
      : undefined;
    const pendingDelete = latestMutation?.op === "delete";
    if (pendingCreate) {
      await updateCachedLink(userId, { ...link, ...(pendingCreate.payload as Partial<NoteTaskLink>) }, true);
      return "queued";
    }

    const [pendingNotes, pendingTasks] = await Promise.all([getPendingOps("notes"), getPendingOps("tasks")]);
    assertActiveOwner(userId);
    const endpointQueued = hasPendingEntityWrite(pendingNotes, userId, noteId) ||
      hasPendingEntityWrite(pendingTasks, userId, taskId) || pendingDelete;

    await updateCachedLink(userId, link, true);
    if ((typeof navigator === "undefined" || navigator.onLine) && !endpointQueued) {
      let outcome: Awaited<ReturnType<typeof saveNoteTaskLinkWithOutcome>> | undefined;
      try {
        outcome = await saveNoteTaskLinkWithOutcome(userId, link);
      } catch (error) {
        if (auth.currentUser?.uid !== userId) {
          await updateCachedLink(userId, link, false).catch(() => undefined);
          throw error;
        }
        console.warn("[NoteTaskLink] Direct relationship write failed; queueing for replay:", error);
      }
      try {
        assertActiveOwner(userId);
      } catch (error) {
        await updateCachedLink(userId, link, false).catch(() => undefined);
        throw error;
      }
      if (outcome === "saved") return "saved";
      if (outcome === "missing-endpoint" || outcome === "failed" || outcome === "stale") {
        await updateCachedLink(userId, link, false);
        throw new Error(outcome === "missing-endpoint"
          ? "The note or task no longer exists in this account."
          : "The note-task relationship was rejected by the current data state.");
      }
    }

    assertActiveOwner(userId);
    const queued = await enqueueOp({
      ownerId: userId,
      table: "note_task_links",
      op: "upsert",
      payload: link,
      match: { id: link.id },
    });
    assertActiveOwner(userId);
    if (!queued) {
      await updateCachedLink(userId, link, false);
      throw new Error("The note-task relationship could not be saved or queued.");
    }
    return "queued";
  });
}

export async function unlinkNoteFromTask(userId: string, noteId: string, taskId: string): Promise<"saved" | "queued"> {
  if (!userId || !noteId || !taskId) return "saved";
  assertActiveOwner(userId);
  const link = makeLink(userId, noteId, taskId);
  return withPairLock(`${userId}/${link.id}`, async () => {
    const key = getNoteTaskLinksCacheKey(userId);
    const previous = (await cacheGet<NoteTaskLink[]>(key)) || [];
    await cacheSet(key, previous.filter((item) => item.id !== link.id));
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        if (await deleteEntityFromFirestore(userId, "note_task_links", link.id)) return "saved";
      } catch {}
    }
    assertActiveOwner(userId);
    const queued = await enqueueOp({
      ownerId: userId,
      table: "note_task_links",
      op: "delete",
      match: { id: link.id },
    });
    assertActiveOwner(userId);
    if (!queued) {
      await cacheSet(key, previous);
      throw new Error("The note-task relationship could not be removed or queued.");
    }
    return "queued";
  });
}

/** Delete links for one endpoint; offline deletion is a durable owner-scoped sweep. */
export async function deleteNoteTaskLinksFor(
  userId: string,
  endpoint: NoteTaskEndpoint,
  endpointId: string,
): Promise<boolean> {
  return deleteNoteTaskLinksForEndpoints(userId, { [endpoint]: [endpointId] });
}

/** Remove links for a task/note set with bounded indexed queries and durable sweeps. */
export async function deleteNoteTaskLinksForEndpoints(
  userId: string,
  endpoints: Partial<Record<NoteTaskEndpoint, string[]>>,
  options: { durableSweep?: boolean } = {},
): Promise<boolean> {
  if (!userId) return false;
  const targets = {
    note_id: Array.from(new Set((endpoints.note_id || []).filter(Boolean))),
    task_id: Array.from(new Set((endpoints.task_id || []).filter(Boolean))),
  };
  const entries = (Object.entries(targets) as Array<[NoteTaskEndpoint, string[]]>).filter(([, ids]) => ids.length > 0);
  if (entries.length === 0) return true;

  const key = getNoteTaskLinksCacheKey(userId);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  let mustQueue = offline || auth.currentUser?.uid !== userId;

  if (!mustQueue) {
    try {
      const pending = await getPendingOps("note_task_links");
      mustQueue = auth.currentUser?.uid !== userId || pending.some((operation) => {
        if (!canReplayForOwner(operation, userId) || operation.op === "delete") return false;
        const payload = operation.payload && typeof operation.payload === "object"
          ? operation.payload as Partial<NoteTaskLink>
          : {};
        return (typeof payload.note_id === "string" && targets.note_id.includes(payload.note_id)) ||
          (typeof payload.task_id === "string" && targets.task_id.includes(payload.task_id));
      });
      if (!mustQueue) {
        const links = new Map<string, NoteTaskLink>();
        for (const [endpoint, ids] of entries) {
          for (let index = 0; index < ids.length; index += 10) {
            if (auth.currentUser?.uid !== userId) { mustQueue = true; break; }
            const batch = ids.slice(index, index + 10);
            const result = await firebaseStore.from("note_task_links", userId)
              .select("id,user_id,note_id,task_id")
              .eq("user_id", userId)
              .in(endpoint, batch);
            if (auth.currentUser?.uid !== userId || result.error || !Array.isArray(result.data)) {
              mustQueue = true;
              break;
            }
            for (const link of result.data as NoteTaskLink[]) {
              if (link.id && link.user_id === userId && ids.includes(link[endpoint])) links.set(link.id, link);
            }
          }
          if (mustQueue) break;
        }
        if (!mustQueue) {
          for (const link of links.values()) {
            if (auth.currentUser?.uid !== userId || !await deleteEntityFromFirestore(userId, "note_task_links", link.id)) {
              mustQueue = true;
              break;
            }
          }
        }
      }
    } catch {
      mustQueue = true;
    }
  }

  // Keep an owner-scoped sweep in the outbox for destructive cascades too. The
  // direct delete above handles the current rows; the queued sweep closes the
  // small race with a relationship created immediately before its endpoint is
  // removed. Replaying it after endpoint removal is safe and idempotent.
  if (mustQueue || options.durableSweep) {
    const operations = entries.flatMap(([endpoint, ids]) => ids.map((id) => ({
      ownerId: userId,
      table: "note_task_links",
      op: "delete" as const,
      match: { user_id: userId, [endpoint]: id },
    })));
    let queued = false;
    try { queued = await enqueueOps(operations); } catch { queued = false; }
    if (!queued) return false;
  }

  const cached = (await cacheGet<NoteTaskLink[]>(key)) || [];
  await cacheSet(key, cached.filter((link) =>
    !targets.note_id.includes(link.note_id) && !targets.task_id.includes(link.task_id)));
  return true;
}

export async function removeNoteTaskLinksFromCache(
  userId: string,
  endpoint: NoteTaskEndpoint,
  endpointIds: string[],
): Promise<void> {
  if (!userId || endpointIds.length === 0) return;
  try {
    const key = getNoteTaskLinksCacheKey(userId);
    const links = (await cacheGet<NoteTaskLink[]>(key)) || [];
    const removed = new Set(endpointIds);
    await cacheSet(key, links.filter((link) => !removed.has(link[endpoint])));
  } catch (error) {
    console.warn("[NoteTaskLink] Could not update the local relationship cache:", error);
  }
}

export type { NoteTaskLink } from "./noteTaskLinkTypes";
