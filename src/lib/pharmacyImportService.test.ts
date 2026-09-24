import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isPharmacyImported,
  importPharmacyKnowledge,
} from "./pharmacyImportService";
import {
  PHARMACY_ROOT_FOLDER_ID,
  PHARMACY_SEED_FOLDERS,
  PHARMACY_SEED_DOCUMENTS,
  PHARMACY_SEED_CARDS,
} from "./pharmacySeedData";
import { cacheGet, cacheSet } from "./offlineQueue";
import { getFoldersCacheKey, getDocsCacheKey } from "./knowledgeService";
import { getLeitnerCardsCacheKey } from "./leitnerService";

describe("pharmacyImportService", () => {
  const testUserId = "test-pharmacy-user-123";

  beforeEach(async () => {
    // Clear in-memory caches before each test
    await cacheSet(getFoldersCacheKey(testUserId), []);
    await cacheSet(getDocsCacheKey(testUserId), []);
    await cacheSet(getLeitnerCardsCacheKey(testUserId), []);
  });

  it("should have valid pharmacy seed constants", () => {
    expect(PHARMACY_ROOT_FOLDER_ID).toBe("folder-pharmacy-root");
    expect(PHARMACY_SEED_FOLDERS.length).toBe(5); // Root + 4 categories
    expect(PHARMACY_SEED_DOCUMENTS.length).toBe(97); // 36 modules + 43 OTC + 6 CYP + 12 cases
    expect(PHARMACY_SEED_CARDS.length).toBe(17); // 17 flashcards

    // Verify root folder structure
    const root = PHARMACY_SEED_FOLDERS.find((f) => f.id === PHARMACY_ROOT_FOLDER_ID);
    expect(root).toBeDefined();
    expect(root?.parent_id).toBeNull();

    // Verify subfolders point to root
    const subfolders = PHARMACY_SEED_FOLDERS.filter((f) => f.id !== PHARMACY_ROOT_FOLDER_ID);
    expect(subfolders.length).toBe(4);
    for (const sub of subfolders) {
      expect(sub.parent_id).toBe(PHARMACY_ROOT_FOLDER_ID);
    }
  });

  it("correctly identifies unimported status initially", async () => {
    const imported = await isPharmacyImported(testUserId);
    expect(imported).toBe(false);
  });

  it("successfully imports all folders, documents, and flashcards", async () => {
    const result = await importPharmacyKnowledge(testUserId, { importCards: true });

    expect(result.foldersCount).toBe(5);
    expect(result.docsCount).toBe(97);
    expect(result.cardsCount).toBe(17);

    // Verify isPharmacyImported returns true now
    const importedAfter = await isPharmacyImported(testUserId);
    expect(importedAfter).toBe(true);

    // Verify cached folders
    const cachedFolders = (await cacheGet<any[]>(getFoldersCacheKey(testUserId))) || [];
    expect(cachedFolders.length).toBe(5);
    const rootFolder = cachedFolders.find((f) => f.id === PHARMACY_ROOT_FOLDER_ID);
    expect(rootFolder).toBeDefined();
    expect(rootFolder.user_id).toBe(testUserId);

    // Verify cached documents
    const cachedDocs = (await cacheGet<any[]>(getDocsCacheKey(testUserId))) || [];
    expect(cachedDocs.length).toBe(97);
    for (const d of cachedDocs) {
      expect(d.user_id).toBe(testUserId);
      expect(d.folder_id).toBeTruthy();
      expect(d.content_html).toBeTruthy();
    }

    // Verify cached Leitner cards
    const cachedCards = (await cacheGet<any[]>(getLeitnerCardsCacheKey(testUserId))) || [];
    expect(cachedCards.length).toBe(17);
    for (const c of cachedCards) {
      expect(c.user_id).toBe(testUserId);
      expect(c.front).toBeTruthy();
      expect(c.back).toBeTruthy();
      expect(c.review_count).toBe(0);
    }
  });

  it("does not duplicate on repeated import without force", async () => {
    await importPharmacyKnowledge(testUserId);
    const secondCall = await importPharmacyKnowledge(testUserId, { force: false });

    expect(secondCall.docsCount).toBe(97);
    const cachedDocs = (await cacheGet<any[]>(getDocsCacheKey(testUserId))) || [];
    expect(cachedDocs.length).toBe(97);
  });
});
