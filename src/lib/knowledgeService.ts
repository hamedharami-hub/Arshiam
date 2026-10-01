import { normalizeLearningWorkspace } from "./learningWorkspace";
import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, canReplayForOwner, enqueueOp, getPendingOps } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { KnowledgeFolder, KnowledgeDocument, KnowledgeFolderNode } from "./knowledgeTypes";
import type { TaskKnowledgeLink } from "./taskKnowledgeTypes";
import { reconcileRemoteRowsWithPending } from "./offlineReconcile";
import { getSafeKnowledgeExternalUrl, hasCompleteKnowledgeReviewEvidence } from "./knowledgeReviewEvidence";
import { sanitizeKnowledgeHtml } from "./knowledgeHtmlSanitizer";

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

export function normalizeKnowledgeMediaAttachments(value: unknown, ownerId?: string): KnowledgeDocument["attachments"] {
  if (!Array.isArray(value)) return [];
  return value.filter((attachment) =>
    attachment && typeof attachment === "object" &&
    (attachment.provider === "google_drive" || (attachment.provider === "firebase" && typeof attachment.storage_path === "string" && /^users\/[A-Za-z0-9_-]+\/task-attachments\/knowledge-[^/]+\/[A-Za-z0-9_-]+$/.test(attachment.storage_path) && (!ownerId || attachment.storage_path.startsWith(`users/${ownerId}/task-attachments/knowledge-`)))) &&
    typeof attachment.file_id === "string" && /^[A-Za-z0-9_-]{5,200}$/.test(attachment.file_id) &&
    typeof attachment.name === "string" && attachment.name.trim().length > 0 && attachment.name.length <= 255 &&
    typeof attachment.mime_type === "string" && (attachment.provider === "google_drive" ? /^(image|video)\/[a-z0-9.+-]+$/i.test(attachment.mime_type) : /^(image\/(jpeg|png|gif|webp|heic|heif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|audio\/(mpeg|mp4|x-m4a|m4a|wav|x-wav|ogg|webm)|video\/(mp4|quicktime|webm)|text\/plain)$/.test(attachment.mime_type)) &&
    Number.isSafeInteger(attachment.size_bytes) && attachment.size_bytes > 0 && (attachment.provider !== "firebase" || attachment.size_bytes <= 25 * 1024 * 1024) &&
    typeof attachment.added_at === "string",
  );
}

export function normalizeKnowledgeDocument(document: KnowledgeDocument): KnowledgeDocument {
  const contentHtml = sanitizeKnowledgeHtml(typeof document.content_html === "string" ? document.content_html : "");
  const contentEn = typeof document.content_en === "string"
    ? sanitizeKnowledgeHtml(document.content_en)
    : document.content_en;
  const contentPlain = typeof document.content_plain === "string" ? document.content_plain : "";
  const attachments = document.attachments === undefined
    ? undefined
    : normalizeKnowledgeMediaAttachments(document.attachments, document.user_id);

  let workspace = document.learning_workspace;
  let unavailable = false;
  try { workspace = normalizeLearningWorkspace(workspace); } catch { unavailable = true; workspace = undefined; }
  return {
    ...document,
    ...(document.learning_workspace !== undefined ? { learning_workspace: workspace } : {}),
    ...(unavailable ? { learning_workspace_unavailable: true } : {}),
    content_html: contentHtml,
    content_en: contentEn,
    plain_text: stripHtmlToPlainText(contentHtml) || stripHtmlToPlainText(contentPlain),
    source_url: getSafeKnowledgeExternalUrl(document.source_url) || undefined,
    ...(document.attachments !== undefined ? { attachments } : {}),
  };
}

function normalizeSourceUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const safeUrl = getSafeKnowledgeExternalUrl(trimmed);
  if (!safeUrl) throw new Error("Source URL must be a valid HTTP or HTTPS link without credentials.");
  return safeUrl;
}

type KnowledgeCollection = "knowledge_folders" | "knowledge_documents";

export class KnowledgeDocumentDeletionError extends Error {
  constructor(
    readonly reason: "offline" | "verify-cards" | "pending-cards" | "linked-cards" |
      "verify-task-links" | "pending-task-links" | "linked-tasks",
    readonly linkedCardCount = 0,
    readonly linkedTaskCount = 0,
  ) {
    super(reason);
    this.name = "KnowledgeDocumentDeletionError";
  }
}

async function saveKnowledgeRowOrQueueWithPersistence(
  userId: string,
  collection: KnowledgeCollection,
  op: "insert" | "update",
  item: { id: string },
): Promise<{ accepted: boolean; persistence: "synced" | "queued" }> {
  if (isOnline()) {
    try {
      if (await saveEntityToFirestore(userId, collection, item.id, item)) {
        return { accepted: true, persistence: "synced" };
      }
    } catch {
      // A failed server write can still be safely accepted by the outbox.
    }
  }
  const accepted = await enqueueOp({
    ownerId: userId,
    table: collection,
    op,
    payload: item,
    match: op === "update" ? { id: item.id } : undefined,
  });
  return { accepted, persistence: "queued" };
}

async function saveKnowledgeRowOrQueue(
  userId: string,
  collection: KnowledgeCollection,
  op: "insert" | "update",
  item: { id: string },
): Promise<boolean> {
  return (await saveKnowledgeRowOrQueueWithPersistence(userId, collection, op, item)).accepted;
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

async function loadCurrentKnowledgeForFolderDeletion(userId: string): Promise<{
  folders: KnowledgeFolder[];
  documents: KnowledgeDocument[];
  pendingFolderOps: Awaited<ReturnType<typeof getPendingOps>>;
  pendingDocumentOps: Awaited<ReturnType<typeof getPendingOps>>;
}> {
  if (!isOnline()) {
    throw new Error("Reconnect before deleting a folder so all linked lessons and subfolders can be verified.");
  }

  const [cachedFolders, cachedDocuments, folderResult, documentResult, pendingFolderOps, pendingDocumentOps] =
    await Promise.all([
      cacheGet<KnowledgeFolder[]>(getFoldersCacheKey(userId)),
      cacheGet<KnowledgeDocument[]>(getDocsCacheKey(userId)),
      firebaseStore.from("knowledge_folders").select("*").eq("user_id", userId),
      firebaseStore.from("knowledge_documents").select("*").eq("user_id", userId),
      getPendingOps("knowledge_folders"),
      getPendingOps("knowledge_documents"),
    ]);

  if (folderResult.error || !Array.isArray(folderResult.data) ||
      documentResult.error || !Array.isArray(documentResult.data)) {
    throw new Error("Could not load the current knowledge folders and lessons. Nothing was deleted; retry when storage is available.");
  }

  return {
    folders: reconcileRemoteRowsWithPending(
      folderResult.data as KnowledgeFolder[],
      cachedFolders || [],
      pendingFolderOps,
      "knowledge_folders",
      userId,
    ),
    documents: reconcileRemoteRowsWithPending(
      (documentResult.data as KnowledgeDocument[]).map(normalizeKnowledgeDocument),
      (cachedDocuments || []).map(normalizeKnowledgeDocument),
      pendingDocumentOps,
      "knowledge_documents",
      userId,
    ).map(normalizeKnowledgeDocument),
    pendingFolderOps,
    pendingDocumentOps,
  };
}

async function verifyFolderHasNoDirectContents(userId: string, folderId: string): Promise<void> {
  const [folderResult, documentResult] = await Promise.all([
    firebaseStore.from("knowledge_folders").select("*").eq("user_id", userId),
    firebaseStore.from("knowledge_documents").select("*").eq("user_id", userId),
  ]);

  if (folderResult.error || !Array.isArray(folderResult.data) ||
      documentResult.error || !Array.isArray(documentResult.data)) {
    throw new Error("Could not verify that all lessons and subfolders were moved. The folder was kept; retry when storage is available.");
  }

  const hasDirectChildren = (folderResult.data as KnowledgeFolder[])
    .some((item) => item.parent_id === folderId);
  const hasDirectDocuments = (documentResult.data as KnowledgeDocument[])
    .some((item) => item.folder_id === folderId);
  if (hasDirectChildren || hasDirectDocuments) {
    throw new Error("Some lessons or subfolders are still linked to this folder. They were kept; sync changes and retry.");
  }
}

export async function deleteKnowledgeFolder(userId: string, folderId: string): Promise<boolean> {
  if (!userId || !folderId) return false;

  const folderCacheKey = getFoldersCacheKey(userId);
  const docsCacheKey = getDocsCacheKey(userId);
  const current = await loadCurrentKnowledgeForFolderDeletion(userId);
  const existingFolders = current.folders;
  const existingDocs = current.documents;
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

  // A queued mutation for one of the rows being moved could replay later and
  // restore its old parent/folder relation. Require the queue to settle first.
  const movedFolderIds = new Set([folderId, ...movedFolders.map((item) => item.id)]);
  const movedDocumentIds = new Set(movedDocuments.map((item) => item.id));
  const hasConflictingPendingWrite = [
    ...current.pendingFolderOps.filter((op) => canReplayForOwner(op, userId)),
    ...current.pendingDocumentOps.filter((op) => canReplayForOwner(op, userId)),
  ].some((op) => {
    const id = typeof op.payload === "object" && op.payload !== null && "id" in op.payload
      ? String((op.payload as { id?: unknown }).id || "")
      : String(op.match?.id || "");
    return op.table === "knowledge_folders"
      ? movedFolderIds.has(id)
      : op.table === "knowledge_documents" && movedDocumentIds.has(id);
  });
  if (hasConflictingPendingWrite) {
    throw new Error("Sync pending changes to this folder or its direct contents before deleting it.");
  }

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

  // The write helper may safely queue a failed write. Verify the live remote
  // relationships before deleting the parent so queued updates cannot leave
  // orphaned references when the parent delete succeeds first.
  await verifyFolderHasNoDirectContents(userId, folderId);

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
  const cachedRaw = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  const cached = cachedRaw.map(normalizeKnowledgeDocument);
  if (JSON.stringify(cachedRaw) !== JSON.stringify(cached)) {
    // Migrate older local cache entries to the sanitized representation too.
    await cacheSet(cacheKey, cached);
  }

  if (isOnline()) {
    try {
      const res = await firebaseStore
        .from("knowledge_documents")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!res.error && Array.isArray(res.data)) {
        const remote = (res.data as KnowledgeDocument[]).map(normalizeKnowledgeDocument);
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

async function createKnowledgeDocumentUnlocked(
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
  const contentHtml = sanitizeKnowledgeHtml(data.content_html);
  const contentEn = data.content_en === undefined ? undefined : sanitizeKnowledgeHtml(data.content_en);
  const plainText = stripHtmlToPlainText(contentHtml);

  const doc: KnowledgeDocument = {
    id: makeId(),
    user_id: userId,
    folder_id: data.folder_id || null,
    title: titleTrimmed,
    title_en: data.title_en?.trim(),
    content_html: contentHtml,
    content_en: contentEn,
    preferred_language: data.preferred_language,
    direction: data.direction,
    plain_text: plainText,
    tags: data.tags || [],
    source_url: normalizeSourceUrl(data.source_url),
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

async function updateKnowledgeDocumentWithPersistenceUnlocked(
  userId: string,
  docId: string,
  patch: Partial<KnowledgeDocument>
): Promise<{ document: KnowledgeDocument; persistence: "synced" | "queued" }> {
  if (!userId || !docId) throw new Error("User ID and Document ID are required");

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  const idx = existing.findIndex((d) => d.id === docId);
  if (idx === -1) throw new Error("Document not found");

  const current = existing[idx];
  const normalizedPatch: Partial<KnowledgeDocument> = {
    ...patch,
    ...(patch.learning_workspace !== undefined ? { learning_workspace: normalizeLearningWorkspace(patch.learning_workspace) } : {}),
    ...(patch.content_html !== undefined ? { content_html: sanitizeKnowledgeHtml(patch.content_html) } : {}),
    ...(patch.content_en !== undefined ? { content_en: sanitizeKnowledgeHtml(patch.content_en) } : {}),
    ...(patch.source_url !== undefined ? { source_url: normalizeSourceUrl(patch.source_url) } : {}),
    ...(patch.attachments !== undefined ? { attachments: normalizeKnowledgeMediaAttachments(patch.attachments, userId) } : {}),
  };
  const contentChanged =
    (normalizedPatch.title !== undefined && normalizedPatch.title !== current.title) ||
    (normalizedPatch.title_en !== undefined && normalizedPatch.title_en !== current.title_en) ||
    (normalizedPatch.content_html !== undefined && normalizedPatch.content_html !== current.content_html) ||
    (normalizedPatch.content_en !== undefined && normalizedPatch.content_en !== current.content_en);
  if (normalizedPatch.content_review_status === "reviewed" &&
    !hasCompleteKnowledgeReviewEvidence(normalizedPatch.content_review_evidence)) {
    throw new Error("Review status requires complete review evidence.");
  }
  const safePatch = contentChanged && normalizedPatch.content_review_status !== "reviewed"
    ? { ...normalizedPatch, content_review_status: "unreviewed" as const }
    : normalizedPatch;
  const nextHtml = safePatch.content_html !== undefined ? safePatch.content_html : current.content_html;
  const plainText = safePatch.content_html !== undefined ? stripHtmlToPlainText(nextHtml) : current.plain_text;

  const updated: KnowledgeDocument = {
    ...current,
    ...safePatch,
    _learning_patch_only: patch._learning_patch_only === true,
    _expected_learning_revision: patch._expected_learning_revision ?? current.learning_workspace?.revision ?? '',
    _expected_document_updated_at: patch._expected_document_updated_at ?? current.updated_at,
    last_mutation_id: makeId(),
    plain_text: plainText,
    updated_at: new Date().toISOString(),
  };

  const saveResult = await saveKnowledgeRowOrQueueWithPersistence(
    userId,
    "knowledge_documents",
    "update",
    updated,
  );
  requireMutationAccepted(saveResult.accepted, "Document update");

  if (saveResult.persistence === "synced") { delete updated._expected_learning_revision; delete updated._learning_patch_only; delete updated._expected_document_updated_at; }
  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  return { document: updated, persistence: saveResult.persistence };
}

export async function updateKnowledgeDocument(
  userId: string,
  docId: string,
  patch: Partial<KnowledgeDocument>
): Promise<KnowledgeDocument> {
  const result = await updateKnowledgeDocumentWithPersistence(userId, docId, patch);
  return result.document;
}

async function deleteKnowledgeDocumentUnlocked(userId: string, docId: string): Promise<boolean> {
  if (!userId || !docId) return false;

  const cacheKey = getDocsCacheKey(userId);
  const existing = (await cacheGet<KnowledgeDocument[]>(cacheKey)) || [];
  if (!existing.some((document) => document.id === docId)) return false;

  // A lesson can be the source for Leitner cards. Never delete it based only
  // on a local cache: an uncached/remote card would retain a broken document_id.
  if (!isOnline()) {
    throw new KnowledgeDocumentDeletionError("offline");
  }

  let remoteCards: unknown;
  try {
    const result = await firebaseStore
      .from("leitner_cards")
      .select("*")
      .eq("user_id", userId)
      .order("next_review_at", { ascending: true });
    if (result.error || !Array.isArray(result.data)) {
      throw new Error("Leitner card read failed");
    }
    remoteCards = result.data;
  } catch {
    throw new KnowledgeDocumentDeletionError("verify-cards");
  }

  let pendingCards: Awaited<ReturnType<typeof getPendingOps>>;
  try {
    pendingCards = await getPendingOps("leitner_cards");
  } catch {
    throw new KnowledgeDocumentDeletionError("pending-cards");
  }

  const currentCards = reconcileRemoteRowsWithPending(
    remoteCards as Array<{ id: string; document_id?: string | null }>,
    [],
    pendingCards,
    "leitner_cards",
    userId,
  );
  const linkedCardCount = currentCards.filter((card) => card.document_id === docId).length;
  if (linkedCardCount > 0) {
    throw new KnowledgeDocumentDeletionError("linked-cards", linkedCardCount);
  }

  // Task links are another durable reference to a lesson. Verify them from
  // the server and replay the owner's outbox before deleting the source.
  let remoteTaskLinks: TaskKnowledgeLink[];
  try {
    const result = await firebaseStore
      .from("task_knowledge_links")
      .select("*")
      .eq("user_id", userId);
    if (result.error || !Array.isArray(result.data)) {
      throw new Error("Task knowledge link read failed");
    }
    remoteTaskLinks = result.data as TaskKnowledgeLink[];
  } catch {
    throw new KnowledgeDocumentDeletionError("verify-task-links");
  }

  let pendingTaskLinks: Awaited<ReturnType<typeof getPendingOps>>;
  try {
    pendingTaskLinks = await getPendingOps("task_knowledge_links");
  } catch {
    throw new KnowledgeDocumentDeletionError("pending-task-links");
  }

  const currentTaskLinks = reconcileRemoteRowsWithPending(
    remoteTaskLinks,
    [],
    pendingTaskLinks,
    "task_knowledge_links",
    userId,
  );
  const linkedTaskCount = currentTaskLinks.filter((link) => link.document_id === docId).length;
  if (linkedTaskCount > 0) {
    throw new KnowledgeDocumentDeletionError("linked-tasks", 0, linkedTaskCount);
  }

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

  const parentById = getSafeFolderParentMap(folders);
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
    const parentId = parentById.get(f.id);
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

/**
 * Returns a deterministic acyclic parent map. Missing parents become roots;
 * for each malformed cycle, the lexicographically smallest folder ID is
 * detached so every folder and its documents remain reachable.
 */
function getSafeFolderParentMap(folders: KnowledgeFolder[]): Map<string, string | null> {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const parentById = new Map<string, string | null>();
  for (const folder of folders) {
    parentById.set(
      folder.id,
      folder.parent_id && folderById.has(folder.parent_id) ? folder.parent_id : null,
    );
  }

  const checkedIds = new Set<string>();
  for (const folder of [...folders].sort((a, b) => a.id.localeCompare(b.id))) {
    const path: string[] = [];
    const indexById = new Map<string, number>();
    let cursor: string | null = folder.id;

    while (cursor && !checkedIds.has(cursor)) {
      const seenAt = indexById.get(cursor);
      if (seenAt !== undefined) {
        const cycleIds = path.slice(seenAt);
        const cutId = [...cycleIds].sort((a, b) => a.localeCompare(b))[0];
        if (cutId) parentById.set(cutId, null);
        break;
      }

      indexById.set(cursor, path.length);
      path.push(cursor);
      cursor = parentById.get(cursor) ?? null;
    }

    path.forEach((id) => checkedIds.add(id));
  }

  return parentById;
}

/** Returns the selected folder and its ancestors once, even for corrupt cycles. */
export function getFolderAncestorIds(
  folderId: string | null | undefined,
  folders: KnowledgeFolder[],
): string[] {
  if (!folderId) return [];
  const parentById = getSafeFolderParentMap(folders);
  const ancestors: string[] = [];
  const seenIds = new Set<string>();
  let currentId: string | null = folderId;

  while (currentId && parentById.has(currentId) && !seenIds.has(currentId)) {
    seenIds.add(currentId);
    ancestors.push(currentId);
    currentId = parentById.get(currentId) ?? null;
  }

  return ancestors;
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

// Serialise document cache read-modify-write operations for one owner, including
// updates to different lessons that share the same cached document array.
const knowledgeMutationTails = new Map<string, Promise<unknown>>();
async function withKnowledgeMutation<T>(owner: string, action: () => Promise<T>): Promise<T> {
  const previous = knowledgeMutationTails.get(owner) || Promise.resolve();
  const next = previous.catch(() => undefined).then(action); knowledgeMutationTails.set(owner, next);
  try { return await next; } finally { if (knowledgeMutationTails.get(owner) === next) knowledgeMutationTails.delete(owner); }
}
export const createKnowledgeDocument = (...args: Parameters<typeof createKnowledgeDocumentUnlocked>) => withKnowledgeMutation(args[0], () => createKnowledgeDocumentUnlocked(...args));
export const updateKnowledgeDocumentWithPersistence = (...args: Parameters<typeof updateKnowledgeDocumentWithPersistenceUnlocked>) => withKnowledgeMutation(args[0], () => updateKnowledgeDocumentWithPersistenceUnlocked(...args));
export const deleteKnowledgeDocument = (...args: Parameters<typeof deleteKnowledgeDocumentUnlocked>) => withKnowledgeMutation(args[0], () => deleteKnowledgeDocumentUnlocked(...args));
