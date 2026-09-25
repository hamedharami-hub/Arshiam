import { firebaseStore } from "./firebaseStore";
import { cacheSet, getPendingOps } from "./offlineQueue";
import { saveEntityToFirestore } from "./firestoreSync";
import type { KnowledgeDocument, KnowledgeFolder } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";
import { getDocsCacheKey, getFoldersCacheKey, isOnline, normalizeKnowledgeDocument } from "./knowledgeService";
import { calculateNextReviewDate, getLeitnerCardsCacheKey } from "./leitnerService";
import { PHARMACY_ROOT_FOLDER_ID } from "./pharmacyConstants";
import { getSafeKnowledgeExternalUrl } from "./knowledgeReviewEvidence";

type SeedData = typeof import("./pharmacySeedData");
type LegacySeedData = typeof import("./pharmacyLegacySeedData");
type CollectionName = "knowledge_folders" | "knowledge_documents" | "leitner_cards";

export interface PharmacyImportStatus {
  foldersTotal: number;
  docsTotal: number;
  cardsTotal: number;
  foldersMissing: number;
  docsMissing: number;
  docsUpgradeable: number;
  cardsMissing: number;
  legacyDetected: boolean;
}

export interface PharmacyImportResult {
  foldersCount: number;
  docsCount: number;
  cardsCount: number;
  docsUpdated: number;
  status: PharmacyImportStatus;
}

type Snapshot = {
  folders: KnowledgeFolder[];
  documents: KnowledgeDocument[];
  cards: LeitnerCard[];
};

export function normalizePharmacySeedDocument(document: KnowledgeDocument): KnowledgeDocument {
  const sourceUrl = getSafeKnowledgeExternalUrl(document.source_url);
  if (!sourceUrl?.startsWith("https://")) {
    throw new Error(`Pharmacy source URL is missing or invalid for ${document.id}.`);
  }
  return normalizeKnowledgeDocument({ ...document, source_url: sourceUrl });
}

export function normalizePharmacySeedData(seed: SeedData): SeedData {
  return { ...seed, PHARMACY_SEED_DOCUMENTS: seed.PHARMACY_SEED_DOCUMENTS.map(normalizePharmacySeedDocument) };
}

function assertUser(userId: string): void {
  if (!userId || userId === "anonymous-kb-user") {
    throw new Error("Sign in before importing pharmacy knowledge.");
  }
  if (!isOnline()) {
    throw new Error("A verified connection is required to import pharmacy knowledge. Try again when online.");
  }
}

async function readCollection<T>(userId: string, collection: CollectionName): Promise<T[]> {
  const result = await firebaseStore.from(collection).select("*").eq("user_id", userId);
  if (result.error || !Array.isArray(result.data)) {
    throw result.error || new Error(`Could not read ${collection} from the server.`);
  }
  return result.data as T[];
}

async function readRemote(userId: string): Promise<Snapshot> {
  const [folders, documents, cards] = await Promise.all([
    readCollection<KnowledgeFolder>(userId, "knowledge_folders"),
    readCollection<KnowledgeDocument>(userId, "knowledge_documents"),
    readCollection<LeitnerCard>(userId, "leitner_cards"),
  ]);
  return { folders, documents, cards };
}

export function comparePharmacySeed(seed: SeedData, remote: Snapshot): PharmacyImportStatus {
  const folderIds = new Set(remote.folders.map((item) => item.id));
  const docIds = new Set(remote.documents.map((item) => item.id));
  const cardIds = new Set(remote.cards.map((item) => item.id));
  return {
    foldersTotal: seed.PHARMACY_SEED_FOLDERS.length,
    docsTotal: seed.PHARMACY_SEED_DOCUMENTS.length,
    cardsTotal: seed.PHARMACY_SEED_CARDS.length,
    foldersMissing: seed.PHARMACY_SEED_FOLDERS.filter((item) => !folderIds.has(item.id)).length,
    docsMissing: seed.PHARMACY_SEED_DOCUMENTS.filter((item) => !docIds.has(item.id)).length,
    docsUpgradeable: 0,
    cardsMissing: seed.PHARMACY_SEED_CARDS.filter((item) => !cardIds.has(item.id)).length,
    legacyDetected: remote.folders.some(
      (item) => item.id !== PHARMACY_ROOT_FOLDER_ID &&
        (item.name.includes("دایره‌المعارف و آموزش دارویی") || item.name.includes("Pharmacy Knowledge")),
    ),
  };
}

function matchesUneditedLegacy(
  current: KnowledgeDocument,
  legacy: LegacySeedData["PHARMACY_SEED_DOCUMENTS"][number] & {
    source_url?: string;
    content_review_status?: KnowledgeDocument["content_review_status"];
  },
): boolean {
  return current.title === legacy.title &&
    current.title_en === legacy.title_en &&
    current.folder_id === legacy.folder_id &&
    current.content_html === legacy.content_html &&
    current.content_en === legacy.content_en &&
    JSON.stringify(current.tags || []) === JSON.stringify(legacy.tags || []) &&
    (current.source_url || undefined) === (legacy.source_url || undefined) &&
    current.content_review_status === legacy.content_review_status;
}

function getUpgradeableDocuments(seed: SeedData, legacy: LegacySeedData, remote: Snapshot): KnowledgeDocument[] {
  const newById = new Map(seed.PHARMACY_SEED_DOCUMENTS.map((item) => [item.id, item]));
  const oldById = new Map(legacy.PHARMACY_SEED_DOCUMENTS.map((item) => [item.id, item]));
  return remote.documents.filter((doc) => {
    const old = oldById.get(doc.id);
    const next = newById.get(doc.id);
    return old && next && matchesUneditedLegacy(doc, old) &&
      (doc.content_html !== next.content_html || doc.content_en !== next.content_en ||
        doc.folder_id !== next.folder_id || doc.title !== next.title || doc.title_en !== next.title_en ||
        JSON.stringify(doc.tags || []) !== JSON.stringify(next.tags || []) || doc.source_url !== next.source_url ||
        doc.content_review_status !== next.content_review_status);
  });
}

export async function getPharmacyImportStatus(userId: string): Promise<PharmacyImportStatus> {
  assertUser(userId);
  const [seed, legacy, remote] = await Promise.all([
    import("./pharmacySeedData"), import("./pharmacyLegacySeedData"), readRemote(userId),
  ]);
  const status = comparePharmacySeed(seed, remote);
  status.docsUpgradeable = getUpgradeableDocuments(seed, legacy, remote).length;
  return status;
}

export async function isPharmacyImported(userId: string): Promise<boolean> {
  if (!userId || userId === "anonymous-kb-user") return false;
  const status = await getPharmacyImportStatus(userId);
  return status.foldersMissing === 0 && status.docsMissing === 0 && status.docsUpgradeable === 0 && status.cardsMissing === 0;
}

function plainText(document: KnowledgeDocument): string {
  return `${document.content_html || ""} ${document.content_en || ""}`
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function saveMissing<T extends { id: string }>(
  userId: string,
  collection: CollectionName,
  items: T[],
  onProgress?: (completed: number, total: number) => void,
  progress?: { completed: number; total: number },
): Promise<void> {
  const batchSize = 8;
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    const results = await Promise.allSettled(batch.map(async (item) => {
      // Firestore rejects undefined, including optional fields inherited from legacy seed rows.
      const firestoreItem = JSON.parse(JSON.stringify(item)) as T;
      const ok = await saveEntityToFirestore(userId, collection, item.id, firestoreItem);
      if (!ok) throw new Error(`Could not save ${collection}/${item.id}`);
    }));
    const failed = results.find((result) => result.status === "rejected");
    if (progress) {
      progress.completed += results.filter((result) => result.status === "fulfilled").length;
      onProgress?.(progress.completed, progress.total);
    }
    if (failed?.status === "rejected") throw failed.reason;
  }
}

/**
 * Adds only IDs absent from the server. Existing server documents and Leitner progress
 * are never overwritten. Pending offline edits must sync before an import starts.
 * A partial failure is safe to retry: the next run checks the server again.
 */
export async function importPharmacyKnowledge(
  userId: string,
  options?: { importCards?: boolean; force?: boolean; onProgress?: (completed: number, total: number) => void },
): Promise<PharmacyImportResult> {
  assertUser(userId);
  const pending = await getPendingOps();
  if (pending.some((op) => op.ownerId === userId &&
    (op.table === "knowledge_folders" || op.table === "knowledge_documents" || op.table === "leitner_cards"))) {
    throw new Error("Sync pending knowledge changes before importing pharmacy content.");
  }
  const [seed, legacy] = await Promise.all([import("./pharmacySeedData"), import("./pharmacyLegacySeedData")]);
  const remote = await readRemote(userId);
  const now = new Date().toISOString();
  const remoteFolderIds = new Set(remote.folders.map((item) => item.id));
  const remoteDocIds = new Set(remote.documents.map((item) => item.id));
  const remoteCardIds = new Set(remote.cards.map((item) => item.id));
  const legacyRoot = remote.folders.find((item) => item.id !== PHARMACY_ROOT_FOLDER_ID &&
    (item.name.includes("دایره‌المعارف و آموزش دارویی") || item.name.includes("Pharmacy Knowledge")));

  const folders = seed.PHARMACY_SEED_FOLDERS
    .filter((item) => !remoteFolderIds.has(item.id))
    .map((item) => ({
      ...item,
      parent_id: item.id === PHARMACY_ROOT_FOLDER_ID && legacyRoot ? legacyRoot.id : item.parent_id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    }));
  const documents = seed.PHARMACY_SEED_DOCUMENTS
    .filter((item) => !remoteDocIds.has(item.id))
    .map((item) => {
      const safeDocument = normalizePharmacySeedDocument(item);
      return {
        ...safeDocument,
        user_id: userId,
        plain_text: plainText(safeDocument),
        created_at: now,
        updated_at: now,
      };
    });
  const seedDocMap = new Map(seed.PHARMACY_SEED_DOCUMENTS.map((item) => [item.id, item]));
  const upgradedDocuments = getUpgradeableDocuments(seed, legacy, remote).map((old) => {
    const next = seedDocMap.get(old.id)!;
    const normalizedNext = normalizePharmacySeedDocument(next);
    return {
      ...old,
      folder_id: next.folder_id,
      title: next.title,
      title_en: next.title_en,
      content_html: normalizedNext.content_html,
      content_en: normalizedNext.content_en,
      plain_text: plainText(normalizedNext),
      tags: normalizedNext.tags,
      source_url: normalizedNext.source_url,
      content_review_status: normalizedNext.content_review_status,
      updated_at: now,
    };
  });
  const cards = options?.importCards === false ? [] : seed.PHARMACY_SEED_CARDS
    .filter((item) => !remoteCardIds.has(item.id))
    .map((item) => ({
      ...item,
      user_id: userId,
      document_id: item.document_id && (
        remoteDocIds.has(item.document_id) || seed.PHARMACY_SEED_DOCUMENTS.some((doc) => doc.id === item.document_id)
      ) ? item.document_id : null,
      next_review_at: calculateNextReviewDate(1),
      created_at: now,
      updated_at: now,
    }));

  const progress = { completed: 0, total: folders.length + documents.length + upgradedDocuments.length + cards.length };
  try {
    await saveMissing(userId, "knowledge_folders", folders, options?.onProgress, progress);
    await saveMissing(userId, "knowledge_documents", documents, options?.onProgress, progress);
    await saveMissing(userId, "knowledge_documents", upgradedDocuments, options?.onProgress, progress);
    await saveMissing(userId, "leitner_cards", cards, options?.onProgress, progress);
  } finally {
    // A successful remote read is authoritative; stale cache rows must not
    // reappear after an import or after a deletion on another device.
    const verified = await readRemote(userId);
    await Promise.all([
      cacheSet(getFoldersCacheKey(userId), verified.folders),
      cacheSet(getDocsCacheKey(userId), verified.documents),
      cacheSet(getLeitnerCardsCacheKey(userId), verified.cards),
    ]);
  }

  const verified = await readRemote(userId);
  const status = comparePharmacySeed(seed, verified);
  status.docsUpgradeable = getUpgradeableDocuments(seed, legacy, verified).length;
  const remaining = status.foldersMissing + status.docsMissing + status.docsUpgradeable +
    (options?.importCards === false ? 0 : status.cardsMissing);
  if (remaining > 0) {
    throw new Error(`${remaining} pharmacy items were not verified on the server. Retry to resume safely.`);
  }

  return {
    foldersCount: folders.length,
    docsCount: documents.length,
    cardsCount: cards.length,
    docsUpdated: upgradedDocuments.length,
    status,
  };
}
