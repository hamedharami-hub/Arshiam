import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet } from "./offlineQueue";
import { saveEntityToFirestore } from "./firestoreSync";
import type { KnowledgeDocument, KnowledgeFolder } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";
import { getDocsCacheKey, getFoldersCacheKey, isOnline } from "./knowledgeService";
import { calculateNextReviewDate, getLeitnerCardsCacheKey } from "./leitnerService";
import { PHARMACY_ROOT_FOLDER_ID } from "./pharmacyConstants";

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
  legacy: LegacySeedData["PHARMACY_SEED_DOCUMENTS"][number],
): boolean {
  return current.title === legacy.title &&
    current.title_en === legacy.title_en &&
    current.folder_id === legacy.folder_id &&
    current.content_html === legacy.content_html &&
    current.content_en === legacy.content_en &&
    JSON.stringify(current.tags || []) === JSON.stringify(legacy.tags || []);
}

function getUpgradeableDocuments(seed: SeedData, legacy: LegacySeedData, remote: Snapshot): KnowledgeDocument[] {
  const newById = new Map(seed.PHARMACY_SEED_DOCUMENTS.map((item) => [item.id, item]));
  const oldById = new Map(legacy.PHARMACY_SEED_DOCUMENTS.map((item) => [item.id, item]));
  return remote.documents.filter((doc) => {
    const old = oldById.get(doc.id);
    const next = newById.get(doc.id);
    return old && next && matchesUneditedLegacy(doc, old) &&
      (doc.content_html !== next.content_html || doc.content_en !== next.content_en || doc.folder_id !== next.folder_id);
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

function mergePreservingExisting<T extends { id: string }>(
  remote: T[], local: T[], additions: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of additions) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    const existing = map.get(item.id) as (T & { updated_at?: string }) | undefined;
    const localUpdated = (item as T & { updated_at?: string }).updated_at;
    if (!existing || (localUpdated && new Date(localUpdated).getTime() > new Date(existing.updated_at || 0).getTime())) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
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
 * are never overwritten. Local-only rows are uploaded in preference to seed copies.
 * A partial failure is safe to retry: the next run checks the server again.
 */
export async function importPharmacyKnowledge(
  userId: string,
  options?: { importCards?: boolean; force?: boolean; onProgress?: (completed: number, total: number) => void },
): Promise<PharmacyImportResult> {
  assertUser(userId);
  const [seed, legacy] = await Promise.all([import("./pharmacySeedData"), import("./pharmacyLegacySeedData")]);
  const remote = await readRemote(userId);
  const now = new Date().toISOString();

  const [localFolders, localDocs, localCards] = await Promise.all([
    cacheGet<KnowledgeFolder[]>(getFoldersCacheKey(userId)).then((items) => items || []),
    cacheGet<KnowledgeDocument[]>(getDocsCacheKey(userId)).then((items) => items || []),
    cacheGet<LeitnerCard[]>(getLeitnerCardsCacheKey(userId)).then((items) => items || []),
  ]);
  const localFolderMap = new Map(localFolders.map((item) => [item.id, item]));
  const localDocMap = new Map(localDocs.map((item) => [item.id, item]));
  const localCardMap = new Map(localCards.map((item) => [item.id, item]));
  const remoteFolderIds = new Set(remote.folders.map((item) => item.id));
  const remoteDocIds = new Set(remote.documents.map((item) => item.id));
  const remoteCardIds = new Set(remote.cards.map((item) => item.id));
  const legacyRoot = remote.folders.find((item) => item.id !== PHARMACY_ROOT_FOLDER_ID &&
    (item.name.includes("دایره‌المعارف و آموزش دارویی") || item.name.includes("Pharmacy Knowledge")));

  const folders = seed.PHARMACY_SEED_FOLDERS
    .filter((item) => !remoteFolderIds.has(item.id))
    .map((item) => localFolderMap.get(item.id) || {
      ...item,
      parent_id: item.id === PHARMACY_ROOT_FOLDER_ID && legacyRoot ? legacyRoot.id : item.parent_id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    });
  const documents = seed.PHARMACY_SEED_DOCUMENTS
    .filter((item) => !remoteDocIds.has(item.id))
    .map((item) => localDocMap.get(item.id) || {
      ...item,
      user_id: userId,
      plain_text: plainText(item),
      created_at: now,
      updated_at: now,
    });
  const seedDocMap = new Map(seed.PHARMACY_SEED_DOCUMENTS.map((item) => [item.id, item]));
  const upgradedDocuments = getUpgradeableDocuments(seed, legacy, remote).map((old) => {
    const next = seedDocMap.get(old.id)!;
    return {
      ...old,
      folder_id: next.folder_id,
      title: next.title,
      title_en: next.title_en,
      content_html: next.content_html,
      content_en: next.content_en,
      plain_text: plainText(next),
      tags: next.tags,
      source_url: next.source_url,
      updated_at: now,
    };
  });
  const cards = options?.importCards === false ? [] : seed.PHARMACY_SEED_CARDS
    .filter((item) => !remoteCardIds.has(item.id))
    .map((item) => localCardMap.get(item.id) || {
      ...item,
      user_id: userId,
      document_id: item.document_id && (
        remoteDocIds.has(item.document_id) || seed.PHARMACY_SEED_DOCUMENTS.some((doc) => doc.id === item.document_id)
      ) ? item.document_id : null,
      next_review_at: calculateNextReviewDate(1),
      created_at: now,
      updated_at: now,
    });

  const progress = { completed: 0, total: folders.length + documents.length + upgradedDocuments.length + cards.length };
  try {
    await saveMissing(userId, "knowledge_folders", folders, options?.onProgress, progress);
    await saveMissing(userId, "knowledge_documents", documents, options?.onProgress, progress);
    await saveMissing(userId, "knowledge_documents", upgradedDocuments, options?.onProgress, progress);
    await saveMissing(userId, "leitner_cards", cards, options?.onProgress, progress);
  } finally {
    // Refresh the cache from confirmed remote state even if a batch stopped midway.
    const verified = await readRemote(userId);
    await Promise.all([
      cacheSet(getFoldersCacheKey(userId), mergePreservingExisting(verified.folders, localFolders, [])),
      cacheSet(getDocsCacheKey(userId), mergePreservingExisting(verified.documents, localDocs, [])),
      cacheSet(getLeitnerCardsCacheKey(userId), mergePreservingExisting(verified.cards, localCards, [])),
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
