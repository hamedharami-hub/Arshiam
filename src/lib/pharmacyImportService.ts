import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { saveEntityToFirestore } from "./firestoreSync";
import type { KnowledgeFolder, KnowledgeDocument } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";
import { getFoldersCacheKey, getDocsCacheKey, isOnline } from "./knowledgeService";
import { getLeitnerCardsCacheKey, calculateNextReviewDate } from "./leitnerService";
import {
  PHARMACY_ROOT_FOLDER_ID,
  PHARMACY_SEED_FOLDERS,
  PHARMACY_SEED_DOCUMENTS,
  PHARMACY_SEED_CARDS,
} from "./pharmacySeedData";

/**
 * Checks whether the Pharmacy Knowledge Base has already been imported for this user.
 */
export async function isPharmacyImported(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const cacheKey = getFoldersCacheKey(userId);
    const cached = (await cacheGet<KnowledgeFolder[]>(cacheKey)) || [];
    return cached.some(
      (f) =>
        f.id === PHARMACY_ROOT_FOLDER_ID ||
        f.name.includes("دایره‌المعارف و آموزش دارویی") ||
        f.name.includes("Pharmacy Knowledge")
    );
  } catch (err) {
    console.warn("Error checking pharmacy import status:", err);
    return false;
  }
}

/**
 * Imports the complete Pharmacy Knowledge Base:
 * 1. 5 Structured Folders (Root + 4 Subcategories)
 * 2. 97 Comprehensive Bilingual Clinical Documents
 * 3. 17 High-Yield Leitner Spaced-Repetition Cards
 */
export async function importPharmacyKnowledge(
  userId: string,
  options?: { importCards?: boolean; force?: boolean }
): Promise<{ foldersCount: number; docsCount: number; cardsCount: number }> {
  if (!userId) throw new Error("User ID is required for importing pharmacy knowledge");

  const alreadyImported = await isPharmacyImported(userId);
  if (alreadyImported && !options?.force) {
    return {
      foldersCount: PHARMACY_SEED_FOLDERS.length,
      docsCount: PHARMACY_SEED_DOCUMENTS.length,
      cardsCount: PHARMACY_SEED_CARDS.length,
    };
  }

  const now = new Date().toISOString();

  // 1. Process and Insert Folders
  const foldersCacheKey = getFoldersCacheKey(userId);
  const existingFolders = (await cacheGet<KnowledgeFolder[]>(foldersCacheKey)) || [];

  const newFolders: KnowledgeFolder[] = PHARMACY_SEED_FOLDERS.map((f) => ({
    id: f.id,
    user_id: userId,
    parent_id: f.parent_id,
    name: f.name,
    icon: f.icon,
    color: f.color,
    position: f.position,
    created_at: now,
    updated_at: now,
  }));

  // Merge avoiding duplicates by ID
  const folderMap = new Map<string, KnowledgeFolder>();
  for (const f of existingFolders) folderMap.set(f.id, f);
  for (const f of newFolders) folderMap.set(f.id, f);
  const mergedFolders = Array.from(folderMap.values());
  await cacheSet(foldersCacheKey, mergedFolders);

  // 2. Process and Insert Documents
  const docsCacheKey = getDocsCacheKey(userId);
  const existingDocs = (await cacheGet<KnowledgeDocument[]>(docsCacheKey)) || [];

  const newDocs: KnowledgeDocument[] = PHARMACY_SEED_DOCUMENTS.map((d) => ({
    id: d.id,
    user_id: userId,
    folder_id: d.folder_id,
    title: d.title,
    title_en: d.title_en,
    content_html: d.content_html,
    content_en: d.content_en,
    preferred_language: d.preferred_language || "bilingual",
    direction: d.direction || "rtl",
    plain_text: d.content_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    tags: d.tags || ["Pharmacy"],
    is_favorite: false,
    is_pinned: false,
    is_archived: false,
    read_count: 0,
    view_count: 0,
    created_at: now,
    updated_at: now,
  }));

  const docMap = new Map<string, KnowledgeDocument>();
  for (const d of existingDocs) docMap.set(d.id, d);
  for (const d of newDocs) docMap.set(d.id, d);
  const mergedDocs = Array.from(docMap.values());
  await cacheSet(docsCacheKey, mergedDocs);

  // 3. Process and Insert Leitner Cards (if requested)
  let cardsCount = 0;
  let newCards: LeitnerCard[] = [];
  if (options?.importCards !== false) {
    const cardsCacheKey = getLeitnerCardsCacheKey(userId);
    const existingCards = (await cacheGet<LeitnerCard[]>(cardsCacheKey)) || [];

    newCards = PHARMACY_SEED_CARDS.map((c) => ({
      id: c.id,
      user_id: userId,
      front: c.front,
      back: c.back,
      clue: c.clue || undefined,
      box: c.box || 1,
      next_review_at: calculateNextReviewDate(c.box || 1),
      consecutive_correct: 0,
      review_count: 0,
      ease_factor: 2.5,
      interval_days: 1,
      lapse_count: 0,
      stability: 1.0,
      difficulty: 5.0,
      document_id: c.document_id || null,
      folder_id: c.folder_id || null,
      created_at: now,
      updated_at: now,
    }));

    const cardMap = new Map<string, LeitnerCard>();
    for (const c of existingCards) cardMap.set(c.id, c);
    for (const c of newCards) cardMap.set(c.id, c);
    const mergedCards = Array.from(cardMap.values());
    await cacheSet(cardsCacheKey, mergedCards);
    cardsCount = newCards.length;
  }

  // 4. Asynchronous Background Sync to Firestore / Firebase
  // Runs detached from the main thread so UI is instantly updated and responsive
  (async () => {
    // Folders
    for (const f of newFolders) {
      try {
        await firebaseStore.from("knowledge_folders").insert(f);
        if (isOnline()) {
          await saveEntityToFirestore(userId, "knowledge_folders", f.id, f);
        } else {
          await enqueueOp({ table: "knowledge_folders", op: "insert", payload: f });
        }
      } catch {
        enqueueOp({ table: "knowledge_folders", op: "insert", payload: f }).catch(() => {});
      }
    }

    // Documents in chunks
    const CHUNK_SIZE = 10;
    for (let i = 0; i < newDocs.length; i += CHUNK_SIZE) {
      const chunk = newDocs.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async (d) => {
          try {
            await firebaseStore.from("knowledge_documents").insert(d);
            if (isOnline()) {
              await saveEntityToFirestore(userId, "knowledge_documents", d.id, d);
            } else {
              await enqueueOp({ table: "knowledge_documents", op: "insert", payload: d });
            }
          } catch {
            await enqueueOp({ table: "knowledge_documents", op: "insert", payload: d });
          }
        })
      );
    }

    // Cards in chunks
    if (newCards.length > 0) {
      for (let i = 0; i < newCards.length; i += CHUNK_SIZE) {
        const chunk = newCards.slice(i, i + CHUNK_SIZE);
        await Promise.allSettled(
          chunk.map(async (c) => {
            try {
              await firebaseStore.from("leitner_cards").insert(c);
              if (isOnline()) {
                await saveEntityToFirestore(userId, "leitner_cards", c.id, c);
              } else {
                await enqueueOp({ table: "leitner_cards", op: "insert", payload: c });
              }
            } catch {
              await enqueueOp({ table: "leitner_cards", op: "insert", payload: c });
            }
          })
        );
      }
    }
  })().catch((err) => {
    console.warn("Background pharmacy sync finished with notices:", err);
  });

  return {
    foldersCount: newFolders.length,
    docsCount: newDocs.length,
    cardsCount,
  };
}
