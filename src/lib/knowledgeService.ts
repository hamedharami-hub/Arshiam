import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp, getPendingOps } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { KnowledgeFolder, KnowledgeDocument, KnowledgeFolderNode } from "./knowledgeTypes";
import { reconcileRemoteRowsWithPending } from "./offlineReconcile";
import { hasCompleteKnowledgeReviewEvidence } from "./knowledgeReviewEvidence";

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

export function getFoldersCacheKey(userId: string): string {
  return `knowledge_folders:${userId}`;
}

export function getDocsCacheKey(userId: string): string {
  return `knowledge_documents:${userId}`;
}

function stripHtmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type KnowledgeCollection = "knowledge_folders" | "knowledge_documents";

async function saveKnowledgeRowOrQueue(
  userId: string,
  collection: KnowledgeCollection,
  op: "insert" | "update",
  item: { id: string },
): Promise<boolean> {
  if (isOnline()) {
    try {
      if (await saveEntityToFirestore(userId, collection, item.id, item)) return true;
    } catch {
      // A failed server write can still be safely accepted by the outbox.
    }
  }
  return enqueueOp({
    ownerId: userId,
    table: collection,
    op,
    payload: item,
    match: op === "update" ? { id: item.id } : undefined,
  });
}

async function deleteKnowledgeRowOrQueue(userId: string, collection: KnowledgeCollection, id: string): Promise<boolean> {
  if (isOnline()) {
    try {
      if (await deleteEntityFromFirestore(userId, collection, id)) return true;
    } catch {
      // A failed server delete can still be safely accepted by the outbox.
    }
  }
  return enqueueOp({ ownerId: userId, table: collection, op: "delete", match: { id } });
}

function requireMutationAccepted(accepted: boolean, action: string): void {
  if (!accepted) throw new Error(`${action} was not confirmed or safely queued. Your local data was not changed.`);
}

/* ==========================================================================
   FOLDERS CRUD
   ========================================================================== */

export async function getKnowledgeFolders(userId: string): Promise<KnowledgeFolder[]> {
  if (!userId) return [];
  const cacheKey = getFoldersCacheKey(userId);
  const cached = (await cacheGet<KnowledgeFolder[]>(cacheKey)) || [];

  if (isOnline()) {
    try {
      const res = await firebaseStore
        .from("knowledge_folders")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true });

      if (!res.error && Array.isArray(res.data)) {
        const remote = res.data as KnowledgeFolder[];
        const pending = await getPendingOps("knowledge_folders");
        const merged = reconcileRemoteRowsWithPending(
          remote,
          cached,
          pending,
          "knowledge_folders",
          userId,
        ).sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name)
        );
        await cacheSet(cacheKey, merged);
        return merged;
      }
    } catch (e) {
      console.warn("Failed to fetch knowledge_folders remote, falling back to cache", e);
    }
  }

  return cached;
}

export async function createKnowledgeFolder(
  userId: string,
  data: { name: string; parent_id?: string | null; icon?: string; color?: string }
): Promise<KnowledgeFolder> {
  if (!userId) throw new Error("User ID is required");
  const trimmed = data.name.trim();
  if (!trimmed) throw new Error("Folder name cannot be empty");

  const now = new Date().toISOString();
  const folder: KnowledgeFolder = {
    id: makeId(),
    user_id: userId,
    parent_id: data.parent_id || null,
    name: trimmed,
    icon: data.icon || "Folder",
    color: data.color || "#10b981",
    position: Date.now(),
    created_at: now,
    updated_at: now,
  };

  requireMutationAccepted(
    await saveKnowledgeRowOrQueue(userId, "knowledge_folders", "insert", folder),
    "Folder creation",
  );

  const cacheKey = getFoldersCacheKey(userId);
  const existing = (await cacheGet<KnowledgeFolder[]>(cacheKey)) || [];
  await cacheSet(cacheKey, [...existing, folder]);

  return folder;
}

export async function updateKnowledgeFolder(
  userId: string,
  folderId: string,
  patch: Partial<KnowledgeFolder>
): Promise<KnowledgeFolder> {
  if (!userId || !folderId) throw new Error("User ID and Folder ID are required");

  const cacheKey = getFoldersCacheKey(userId);
  const existing = (await cacheGet<KnowledgeFolder[]>(cacheKey)) || [];
  const idx = existing.findIndex((f) => f.id === folderId);
  if (idx === -1) throw new Error("Folder not found");

  const updated: KnowledgeFolder = {
    ...existing[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };

  requireMutationAccepted(
    await saveKnowledgeRowOrQueue(userId, "knowledge_folders", "update", updated),
    "Folder update",
  );

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  return updated;
}

export async function deleteKnowledgeFolder(userId: string, folderId: string): Promise<boolean> {
  if (!userId || !folderId) return false;

  const folderCacheKey = getFoldersCacheKey(userId);
  const docsCacheKey = getDocsCacheKey(userId);
  const existingFolders = (await cacheGet<KnowledgeFolder[]>(folderCacheKey)) || [];
  const existingDocs = (await cacheGet<KnowledgeDocument[]>(docsCacheKey)) || [];
  const folder = existingFolders.find((item) => item.id === folderId);
  if (!folder) return false;

  // Deleting a knowledge folder must never implicitly delete its content.
  // Keep direct documents and child folders by moving them to the deleted
  // folder's parent (or the root when deleting a root folder).
  const destinationFolderId = folder.parent_id || null;
  const now = new Date().toISOString();
  const movedFolders = existingFolders
    .filter((item) => item.parent_id === folderId)
    .map((item) => ({ ...item, parent_id: destinationFolderId, updated_at: now }));
  const movedDocuments = existingDocs
    .filter((item) => item.folder_id === folderId)
    .map((item) => ({ ...item, folder_id: destinationFolderId, updated_at: now }));

  // Update related rows before deleting the parent. Bounded batches avoid
  // flooding Firestore when a large imported knowledge folder is removed.
  const relatedUpdates = [
    ...movedFolders.map((item) => ({ collection: "knowledge_folders" as const, item })),
    ...movedDocuments.map((item) => ({ collection: "knowledge_documents" as const, item })),
  ];
  const batchSize = 8;
  for (let start = 0; start < relatedUpdates.length; start += batchSize) {
    const batch = relatedUpdates.slice(start, start + batchSize);
    const accepted = await Promise.all(batch.map(({ collection, item }) =>
      saveKnowledgeRowOrQueue(userId, collection, "update", item)
    ));
    if (accepted.some((ok) => !ok)) {
      throw new Error("Could not safely preserve all knowledge items; the folder was not removed. Retry after storage is available.");
    }
  }

  const folderDeleted = await deleteKnowledgeRowOrQueue(userId, "knowledge_folders", folderId);
  if (!folderDeleted) {
    throw new Error("Could not confirm or queue folder removal. Your knowledge items were kept; retry when storage is available.");
  }

  const nextFolders = existingFolders
    .filter((item) => item.id !== folderId)
    .map((item) => movedFolders.find((moved) => moved.id === item.id) || item);
  const nextDocuments = existingDocs.map((item) =>
    movedDocuments.find((moved) => moved.id === item.id) || item
  );
  await cacheSet(folderCacheKey, nextFolders);
  await cacheSet(docsCacheKey, nextDocuments);

  return true;
}

/* ==========================================================================
   DOCUMENTS CRUD
   ========================================================================== */

export async function getKnowledgeDocuments(
  userId: string,
  folderId?: string | null
): Promise<KnowledgeDocument[]> {
  if (!userId) return [];
  const cacheKey = getDocsCacheKey(userId);
  const cached = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];

  if (isOnline()) {
    try {
      const res = await firebaseStore
        .from("knowledge_documents")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!res.error && Array.isArray(res.data)) {
        const remote = res.data as KnowledgeDocument[];
        const pending = await getPendingOps("knowledge_documents");
        const merged = reconcileRemoteRowsWithPending(
          remote,
          cached,
          pending,
          "knowledge_documents",
          userId,
        ).sort(
          (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        await cacheSet(cacheKey, merged);

        if (folderId !== undefined) {
          return merged.filter((d) => d.folder_id === folderId);
        }
        return merged;
      }
    } catch (e) {
      console.warn("Failed to fetch knowledge_documents remote, using cache", e);
    }
  }

  if (folderId !== undefined) {
    return cached.filter((d) => d.folder_id === folderId);
  }
  return cached;
}

export async function getKnowledgeDocument(
  userId: string,
  docId: string
): Promise<KnowledgeDocument | null> {
  if (!userId || !docId) return null;
  const docs = await getKnowledgeDocuments(userId);
  return docs.find((d) => d.id === docId) || null;
}

export async function createKnowledgeDocument(
  userId: string,
  data: {
    folder_id?: string | null;
    title: string;
    title_en?: string;
    content_html: string;
    content_en?: string;
    preferred_language?: "fa" | "en" | "bilingual";
    direction?: "rtl" | "ltr" | "auto";
    tags?: string[];
    source_url?: string;
    content_review_status?: KnowledgeDocument["content_review_status"];
    content_review_evidence?: KnowledgeDocument["content_review_evidence"];
  }
): Promise<KnowledgeDocument> {
  if (!userId) throw new Error("User ID is required");
  if (data.content_review_status === "reviewed" &&
    !hasCompleteKnowledgeReviewEvidence(data.content_review_evidence)) {
    throw new Error("Review status requires complete review evidence.");
  }
  const titleTrimmed = data.title.trim() || "Untitled Document";
  const now = new Date().toISOString();
  const plainText = stripHtmlToPlainText(data.content_html);

  const doc: KnowledgeDocument = {
    id: makeId(),
    user_id: userId,
    folder_id: data.folder_id || null,
    title: titleTrimmed,
    title_en: data.title_en?.trim(),
    content_html: data.content_html,
    content_en: data.content_en,
    preferred_language: data.preferred_language,
    direction: data.direction,
    plain_text: plainText,
    tags: data.tags || [],
    source_url: data.source_url || "",
    ...(data.content_review_status ? { content_review_status: data.content_review_status } : {}),
    ...(data.content_review_evidence ? { content_review_evidence: data.content_review_evidence } : {}),
    is_favorite: false,
    view_count: 0,
    created_at: now,
    updated_at: now,
  };

  requireMutationAccepted(
    await saveKnowledgeRowOrQueue(userId, "knowledge_documents", "insert", doc),
    "Document creation",
  );

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  await cacheSet(cacheKey, [doc, ...existing]);

  return doc;
}

export async function updateKnowledgeDocument(
  userId: string,
  docId: string,
  patch: Partial<KnowledgeDocument>
): Promise<KnowledgeDocument> {
  if (!userId || !docId) throw new Error("User ID and Document ID are required");

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  const idx = existing.findIndex((d) => d.id === docId);
  if (idx === -1) throw new Error("Document not found");

  const current = existing[idx];
  const contentChanged =
    (patch.title !== undefined && patch.title !== current.title) ||
    (patch.title_en !== undefined && patch.title_en !== current.title_en) ||
    (patch.content_html !== undefined && patch.content_html !== current.content_html) ||
    (patch.content_en !== undefined && patch.content_en !== current.content_en);
  if (patch.content_review_status === "reviewed" &&
    !hasCompleteKnowledgeReviewEvidence(patch.content_review_evidence)) {
    throw new Error("Review status requires complete review evidence.");
  }
  const safePatch = contentChanged && patch.content_review_status !== "reviewed"
    ? { ...patch, content_review_status: "unreviewed" as const }
    : patch;
  const nextHtml = safePatch.content_html !== undefined ? safePatch.content_html : current.content_html;
  const plainText = safePatch.content_html !== undefined ? stripHtmlToPlainText(nextHtml) : current.plain_text;

  const updated: KnowledgeDocument = {
    ...current,
    ...safePatch,
    plain_text: plainText,
    updated_at: new Date().toISOString(),
  };

  requireMutationAccepted(
    await saveKnowledgeRowOrQueue(userId, "knowledge_documents", "update", updated),
    "Document update",
  );

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  return updated;
}

export async function deleteKnowledgeDocument(userId: string, docId: string): Promise<boolean> {
  if (!userId || !docId) return false;

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  if (!existing.some((document) => document.id === docId)) return false;

  requireMutationAccepted(
    await deleteKnowledgeRowOrQueue(userId, "knowledge_documents", docId),
    "Document deletion",
  );

  const filtered = existing.filter((d) => d.id !== docId);
  await cacheSet(cacheKey, filtered);

  return true;
}

/* ==========================================================================
   TREE HIERARCHY BUILDER
   ========================================================================== */

export function buildFolderTree(
  folders: KnowledgeFolder[],
  documents: KnowledgeDocument[]
): KnowledgeFolderNode[] {
  const docCounts = new Map<string, number>();
  for (const doc of documents) {
    if (doc.folder_id) {
      docCounts.set(doc.folder_id, (docCounts.get(doc.folder_id) || 0) + 1);
    }
  }

  const nodeMap = new Map<string, KnowledgeFolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, {
      ...f,
      children: [],
      document_count: docCounts.get(f.id) || 0,
    });
  }

  const rootNodes: KnowledgeFolderNode[] = [];

  for (const f of folders) {
    const node = nodeMap.get(f.id)!;
    if (f.parent_id && nodeMap.has(f.parent_id)) {
      nodeMap.get(f.parent_id)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

export async function searchKnowledgeDocuments(
  userId: string,
  query: string
): Promise<KnowledgeDocument[]> {
  const docs = await getKnowledgeDocuments(userId);
  const q = query.trim().toLowerCase();
  if (!q) return docs;

  return docs.filter((d) => {
    return (
      d.title.toLowerCase().includes(q) ||
      (d.title_en && d.title_en.toLowerCase().includes(q)) ||
      (d.plain_text && d.plain_text.toLowerCase().includes(q)) ||
      (d.content_en && stripHtmlToPlainText(d.content_en).toLowerCase().includes(q)) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });
}
