import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { KnowledgeFolder, KnowledgeDocument, KnowledgeFolderNode } from "./knowledgeTypes";

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
        const map = new Map<string, KnowledgeFolder>();
        for (const f of remote) map.set(f.id, f);
        for (const c of cached) {
          if (!map.has(c.id)) map.set(c.id, c);
        }
        const merged = Array.from(map.values()).sort(
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

  const cacheKey = getFoldersCacheKey(userId);
  const existing = (await cacheGet<KnowledgeFolder[]>(cacheKey)) || [];
  await cacheSet(cacheKey, [...existing, folder]);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "knowledge_folders", folder.id, folder);
      if (!ok) {
        await enqueueOp({ table: "knowledge_folders", op: "insert", payload: folder });
      }
    } catch (e) {
      console.warn("Could not save folder to firestore immediately, enqueuing", e);
      await enqueueOp({ table: "knowledge_folders", op: "insert", payload: folder });
    }
  } else {
    await enqueueOp({ table: "knowledge_folders", op: "insert", payload: folder });
  }

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

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "knowledge_folders", folderId, updated);
      if (!ok) {
        await enqueueOp({ table: "knowledge_folders", op: "update", payload: updated, match: { id: folderId } });
      }
    } catch (e) {
      await enqueueOp({ table: "knowledge_folders", op: "update", payload: updated, match: { id: folderId } });
    }
  } else {
    await enqueueOp({ table: "knowledge_folders", op: "update", payload: updated, match: { id: folderId } });
  }

  return updated;
}

export async function deleteKnowledgeFolder(userId: string, folderId: string): Promise<boolean> {
  if (!userId || !folderId) return false;

  const cacheKey = getFoldersCacheKey(userId);
  const existing = (await cacheGet<KnowledgeFolder[]>(cacheKey)) || [];
  const filtered = existing.filter((f) => f.id !== folderId && f.parent_id !== folderId);
  await cacheSet(cacheKey, filtered);

  // Also move documents in this folder to root or delete them
  const docsCacheKey = getDocsCacheKey(userId);
  const existingDocs = (await cacheGet<KnowledgeDocument[]>(docsCacheKey)) || [];
  const updatedDocs = existingDocs.map((d) => (d.folder_id === folderId ? { ...d, folder_id: null } : d));
  await cacheSet(docsCacheKey, updatedDocs);

  if (isOnline()) {
    try {
      const ok = await deleteEntityFromFirestore(userId, "knowledge_folders", folderId);
      if (!ok) {
        await enqueueOp({ table: "knowledge_folders", op: "delete", match: { id: folderId } });
      }
    } catch (e) {
      await enqueueOp({ table: "knowledge_folders", op: "delete", match: { id: folderId } });
    }
  } else {
    await enqueueOp({ table: "knowledge_folders", op: "delete", match: { id: folderId } });
  }

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
        const map = new Map<string, KnowledgeDocument>();
        for (const d of remote) map.set(d.id, d);
        for (const c of cached) {
          if (!map.has(c.id)) map.set(c.id, c);
        }
        const merged = Array.from(map.values()).sort(
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
  }
): Promise<KnowledgeDocument> {
  if (!userId) throw new Error("User ID is required");
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
    is_favorite: false,
    view_count: 0,
    created_at: now,
    updated_at: now,
  };

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  await cacheSet(cacheKey, [doc, ...existing]);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "knowledge_documents", doc.id, doc);
      if (!ok) {
        await enqueueOp({ table: "knowledge_documents", op: "insert", payload: doc });
      }
    } catch (e) {
      await enqueueOp({ table: "knowledge_documents", op: "insert", payload: doc });
    }
  } else {
    await enqueueOp({ table: "knowledge_documents", op: "insert", payload: doc });
  }

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
  const nextHtml = patch.content_html !== undefined ? patch.content_html : current.content_html;
  const plainText = patch.content_html !== undefined ? stripHtmlToPlainText(nextHtml) : current.plain_text;

  const updated: KnowledgeDocument = {
    ...current,
    ...patch,
    plain_text: plainText,
    updated_at: new Date().toISOString(),
  };

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "knowledge_documents", docId, updated);
      if (!ok) {
        await enqueueOp({ table: "knowledge_documents", op: "update", payload: updated, match: { id: docId } });
      }
    } catch (e) {
      await enqueueOp({ table: "knowledge_documents", op: "update", payload: updated, match: { id: docId } });
    }
  } else {
    await enqueueOp({ table: "knowledge_documents", op: "update", payload: updated, match: { id: docId } });
  }

  return updated;
}

export async function deleteKnowledgeDocument(userId: string, docId: string): Promise<boolean> {
  if (!userId || !docId) return false;

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  const filtered = existing.filter((d) => d.id !== docId);
  await cacheSet(cacheKey, filtered);

  if (isOnline()) {
    try {
      const ok = await deleteEntityFromFirestore(userId, "knowledge_documents", docId);
      if (!ok) {
        await enqueueOp({ table: "knowledge_documents", op: "delete", match: { id: docId } });
      }
    } catch (e) {
      await enqueueOp({ table: "knowledge_documents", op: "delete", match: { id: docId } });
    }
  } else {
    await enqueueOp({ table: "knowledge_documents", op: "delete", match: { id: docId } });
  }

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
