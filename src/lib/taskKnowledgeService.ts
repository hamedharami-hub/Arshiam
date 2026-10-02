import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp, getPendingOps } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { TaskKnowledgeLink } from "./taskKnowledgeTypes";
import type { KnowledgeDocument } from "./knowledgeTypes";
import { getKnowledgeDocuments } from "./knowledgeService";
import { reconcileRemoteRowsWithPending } from "./offlineReconcile";

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

export function getTaskKnowledgeCacheKey(userId: string, taskId: string): string {
  return `task_knowledge_${userId}_${taskId}`;
}

const taskKnowledgeMutationTails = new Map<string, Promise<unknown>>();

async function withTaskKnowledgeLock<T>(cacheKey: string, operation: () => Promise<T>): Promise<T> {
  const previous = taskKnowledgeMutationTails.get(cacheKey);
  const current = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(operation);
  taskKnowledgeMutationTails.set(cacheKey, current);
  try {
    return await current;
  } finally {
    if (taskKnowledgeMutationTails.get(cacheKey) === current) taskKnowledgeMutationTails.delete(cacheKey);
  }
}

async function setCachedTaskKnowledgeLinkState(
  cacheKey: string,
  link: TaskKnowledgeLink,
  shouldExist: boolean,
): Promise<boolean> {
  try {
    const current = (await cacheGet<TaskKnowledgeLink[]>(cacheKey)) || [];
    const next = shouldExist
      ? current.some((item) => item.id === link.id) ? current : [...current, link]
      : current.filter((item) => item.id !== link.id);
    await cacheSet(cacheKey, next);
    return true;
  } catch (error) {
    console.warn("[TaskKnowledge] Could not reconcile optimistic link cache:", error);
    return false;
  }
}

async function enqueueTaskKnowledgeMutation(
  operation: Parameters<typeof enqueueOp>[0],
): Promise<boolean> {
  try {
    return await enqueueOp(operation);
  } catch (error) {
    console.warn("[TaskKnowledge] Could not queue link mutation:", error);
    return false;
  }
}

async function getTaskKnowledgeLinksUnlocked(
  taskId: string,
  userId: string
): Promise<TaskKnowledgeLink[]> {
  if (!taskId || !userId) return [];
  const cacheKey = getTaskKnowledgeCacheKey(userId, taskId);
  const cached = (await cacheGet<TaskKnowledgeLink[]>(cacheKey)) || [];

  if (isOnline()) {
    try {
      const res = await firebaseStore
        .from("task_knowledge_links")
        .select("*")
        .eq("user_id", userId)
        .eq("task_id", taskId);

      if (!res.error && Array.isArray(res.data)) {
        const remote = res.data as TaskKnowledgeLink[];
        const pending = await getPendingOps("task_knowledge_links");
        const merged = reconcileRemoteRowsWithPending(
          remote,
          cached,
          pending,
          "task_knowledge_links",
          userId,
        );
        await cacheSet(cacheKey, merged);
        return merged;
      }
    } catch (e) {
      console.warn("Failed to fetch task_knowledge_links remote, falling back to cache", e);
    }
  }

  return cached;
}

export function getTaskKnowledgeLinks(
  taskId: string,
  userId: string,
): Promise<TaskKnowledgeLink[]> {
  if (!taskId || !userId) return Promise.resolve([]);
  const cacheKey = getTaskKnowledgeCacheKey(userId, taskId);
  return withTaskKnowledgeLock(cacheKey, () => getTaskKnowledgeLinksUnlocked(taskId, userId));
}

export async function getTaskKnowledgeDocs(
  taskId: string,
  userId: string
): Promise<KnowledgeDocument[]> {
  const links = await getTaskKnowledgeLinks(taskId, userId);
  if (links.length === 0) return [];

  const allDocs = await getKnowledgeDocuments(userId);
  const docMap = new Map(allDocs.map((d) => [d.id, d]));

  return links
    .map((l) => docMap.get(l.document_id))
    .filter((d): d is KnowledgeDocument => Boolean(d));
}

async function linkTaskKnowledgeUnlocked(
  userId: string,
  taskId: string,
  documentId: string,
  noteOrContext?: string
): Promise<TaskKnowledgeLink> {
  if (!userId || !taskId || !documentId) {
    throw new Error("User ID, Task ID and Document ID are required");
  }

  const cacheKey = getTaskKnowledgeCacheKey(userId, taskId);
  const existing = (await cacheGet<TaskKnowledgeLink[]>(cacheKey)) || [];

  // Check if link already exists
  const alreadyLinked = existing.find((l) => l.document_id === documentId);
  if (alreadyLinked) {
    return alreadyLinked;
  }

  const now = new Date().toISOString();
  const link: TaskKnowledgeLink = {
    id: makeId(),
    user_id: userId,
    task_id: taskId,
    document_id: documentId,
    note_or_context: noteOrContext || "",
    created_at: now,
  };

  await cacheSet(cacheKey, [...existing, link]);

  let saved = false;
  if (isOnline()) {
    try {
      saved = await saveEntityToFirestore(userId, "task_knowledge_links", link.id, link);
    } catch (error) {
      console.warn("[TaskKnowledge] Direct link save failed; trying durable queue:", error);
    }
  }

  const queued = saved || await enqueueTaskKnowledgeMutation({
    ownerId: userId,
    table: "task_knowledge_links",
    op: "insert",
    payload: link,
  });
  if (!queued) {
    const rolledBack = await setCachedTaskKnowledgeLinkState(cacheKey, link, false);
    throw new Error(rolledBack
      ? "The task-to-lesson link could not be saved or queued; the local link was removed."
      : "The task-to-lesson link could not be saved or queued, and its cache could not be cleared. Refresh and retry.");
  }

  return link;
}

export function linkTaskKnowledge(
  userId: string,
  taskId: string,
  documentId: string,
  noteOrContext?: string,
): Promise<TaskKnowledgeLink> {
  const cacheKey = getTaskKnowledgeCacheKey(userId, taskId);
  return withTaskKnowledgeLock(cacheKey, () =>
    linkTaskKnowledgeUnlocked(userId, taskId, documentId, noteOrContext),
  );
}

export const linkTaskToDocument = linkTaskKnowledge;

async function unlinkTaskKnowledgeUnlocked(
  userId: string,
  taskId: string,
  documentId: string
): Promise<boolean> {
  if (!userId || !taskId || !documentId) return false;

  const cacheKey = getTaskKnowledgeCacheKey(userId, taskId);
  const existing = (await cacheGet<TaskKnowledgeLink[]>(cacheKey)) || [];
  const target = existing.find((l) => l.document_id === documentId);
  const filtered = existing.filter((l) => l.document_id !== documentId);
  await cacheSet(cacheKey, filtered);

  if (target) {
    let deleted = false;
    if (isOnline()) {
      try {
        deleted = await deleteEntityFromFirestore(userId, "task_knowledge_links", target.id);
      } catch (error) {
        console.warn("[TaskKnowledge] Direct link deletion failed; trying durable queue:", error);
      }
    }

    const queued = deleted || await enqueueTaskKnowledgeMutation({
      ownerId: userId,
      table: "task_knowledge_links",
      op: "delete",
      match: { id: target.id },
    });
    if (!queued) {
      const restored = await setCachedTaskKnowledgeLinkState(cacheKey, target, true);
      throw new Error(restored
        ? "The task-to-lesson link could not be removed or queued; the local link was restored."
        : "The task-to-lesson link could not be removed or queued, and its cache could not be restored. Refresh to reload it.");
    }
  }

  return true;
}

export function unlinkTaskKnowledge(
  userId: string,
  taskId: string,
  documentId: string,
): Promise<boolean> {
  const cacheKey = getTaskKnowledgeCacheKey(userId, taskId);
  return withTaskKnowledgeLock(cacheKey, () =>
    unlinkTaskKnowledgeUnlocked(userId, taskId, documentId),
  );
}
