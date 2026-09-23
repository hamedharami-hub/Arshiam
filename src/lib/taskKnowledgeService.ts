import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { TaskKnowledgeLink } from "./taskKnowledgeTypes";
import type { KnowledgeDocument } from "./knowledgeTypes";
import { getKnowledgeDocuments } from "./knowledgeService";

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

export async function getTaskKnowledgeLinks(
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
        const map = new Map<string, TaskKnowledgeLink>();
        for (const l of remote) map.set(l.id, l);
        for (const c of cached) {
          if (!map.has(c.id)) map.set(c.id, c);
        }
        const merged = Array.from(map.values());
        await cacheSet(cacheKey, merged);
        return merged;
      }
    } catch (e) {
      console.warn("Failed to fetch task_knowledge_links remote, falling back to cache", e);
    }
  }

  return cached;
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

export async function linkTaskKnowledge(
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

  if (isOnline()) {
    try {
      await saveEntityToFirestore("task_knowledge_links", link);
    } catch (e) {
      await enqueueOp({ table: "task_knowledge_links", op: "insert", payload: link });
    }
  } else {
    await enqueueOp({ table: "task_knowledge_links", op: "insert", payload: link });
  }

  return link;
}

export async function unlinkTaskKnowledge(
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
    if (isOnline()) {
      try {
        await deleteEntityFromFirestore("task_knowledge_links", target.id);
      } catch (e) {
        await enqueueOp({ table: "task_knowledge_links", op: "delete", match: { id: target.id } });
      }
    } else {
      await enqueueOp({ table: "task_knowledge_links", op: "delete", match: { id: target.id } });
    }
  }

  return true;
}
