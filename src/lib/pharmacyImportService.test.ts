import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheGet, cacheSet } from "./offlineQueue";
import { getDocsCacheKey, getFoldersCacheKey } from "./knowledgeService";
import { getLeitnerCardsCacheKey } from "./leitnerService";
import { PHARMACY_ROOT_FOLDER_ID, PHARMACY_SEED_CARDS, PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_FOLDERS } from "./pharmacySeedData";
import { PHARMACY_SEED_DOCUMENTS as LEGACY_DOCUMENTS } from "./pharmacyLegacySeedData";
import { comparePharmacySeed, getPharmacyImportStatus, importPharmacyKnowledge, isPharmacyImported } from "./pharmacyImportService";

const remote = vi.hoisted(() => ({
  knowledge_folders: new Map<string, Record<string, unknown>>(),
  knowledge_documents: new Map<string, Record<string, unknown>>(),
  leitner_cards: new Map<string, Record<string, unknown>>(),
  failId: "",
}));
type MockCollection = "knowledge_folders" | "knowledge_documents" | "leitner_cards";

vi.mock("./firebaseStore", () => ({
  firebaseStore: {
    from: (table: MockCollection) => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [...remote[table].values()], error: null }),
      }),
    }),
  },
}));

vi.mock("./firestoreSync", () => ({
  saveEntityToFirestore: vi.fn(async (_userId: string, table: MockCollection, id: string, data: Record<string, unknown>) => {
    if (id === remote.failId) return false;
    remote[table].set(id, data);
    return true;
  }),
}));

describe("pharmacyImportService", () => {
  const userId = "test-pharmacy-user-123";

  beforeEach(async () => {
    remote.knowledge_folders.clear();
    remote.knowledge_documents.clear();
    remote.leitner_cards.clear();
    remote.failId = "";
    await cacheSet(getFoldersCacheKey(userId), []);
    await cacheSet(getDocsCacheKey(userId), []);
    await cacheSet(getLeitnerCardsCacheKey(userId), []);
  });

  it("compares exact seed IDs, not the presence of a legacy root", async () => {
    expect(PHARMACY_ROOT_FOLDER_ID).toBe("folder-pharmacy-root");
    remote.knowledge_folders.set("legacy-root", {
      id: "legacy-root", user_id: userId, parent_id: null,
      name: "دایره‌المعارف و آموزش دارویی (Pharmacy Knowledge)",
    });
    const status = await getPharmacyImportStatus(userId);
    expect(status.legacyDetected).toBe(true);
    expect(status.foldersMissing).toBe(PHARMACY_SEED_FOLDERS.length);
    expect(status.docsMissing).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect(await isPharmacyImported(userId)).toBe(false);
    await importPharmacyKnowledge(userId, { importCards: false });
    expect(remote.knowledge_folders.get(PHARMACY_ROOT_FOLDER_ID)?.parent_id).toBe("legacy-root");
    expect(remote.knowledge_folders.get("legacy-root")?.name).toContain("Pharmacy Knowledge");
  });

  it("generates complete source categories with valid folder and document links", () => {
    expect(PHARMACY_SEED_FOLDERS).toHaveLength(34);
    expect(PHARMACY_SEED_DOCUMENTS).toHaveLength(362);
    const folderIds = new Set(PHARMACY_SEED_FOLDERS.map((item) => item.id));
    const docIds = new Set(PHARMACY_SEED_DOCUMENTS.map((item) => item.id));
    expect(docIds.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
    for (const doc of PHARMACY_SEED_DOCUMENTS) {
      expect(folderIds.has(doc.folder_id || "")).toBe(true);
      for (const match of `${doc.content_html} ${doc.content_en}`.matchAll(/data-doc-link="([^"]+)"/g)) {
        expect(docIds.has(match[1]), `Broken link in ${doc.id}: ${match[1]}`).toBe(true);
      }
    }
    for (const card of PHARMACY_SEED_CARDS) {
      if (card.document_id) expect(docIds.has(card.document_id)).toBe(true);
    }
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-core-disease-"))).toHaveLength(15);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-study-track-"))).toHaveLength(5);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-practice-question-"))).toHaveLength(7);
  });

  it("imports missing rows and verifies them on the server", async () => {
    const result = await importPharmacyKnowledge(userId);
    expect(result).toMatchObject({
      foldersCount: PHARMACY_SEED_FOLDERS.length,
      docsCount: PHARMACY_SEED_DOCUMENTS.length,
      cardsCount: PHARMACY_SEED_CARDS.length,
    });
    expect(result.status).toMatchObject({ foldersMissing: 0, docsMissing: 0, cardsMissing: 0 });
    expect(remote.knowledge_documents.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect((await cacheGet<unknown[]>(getDocsCacheKey(userId)))?.length).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect(await isPharmacyImported(userId)).toBe(true);
  });

  it("preserves existing edits and review progress even when force is requested", async () => {
    const doc = { ...PHARMACY_SEED_DOCUMENTS[0], user_id: userId, title: "My edited title" };
    const card = { ...PHARMACY_SEED_CARDS[0], user_id: userId, box: 5, review_count: 19 };
    remote.knowledge_documents.set(doc.id, doc);
    remote.leitner_cards.set(card.id, card);
    const result = await importPharmacyKnowledge(userId, { force: true });
    expect(result.docsCount).toBe(PHARMACY_SEED_DOCUMENTS.length - 1);
    expect(result.cardsCount).toBe(PHARMACY_SEED_CARDS.length - 1);
    expect(remote.knowledge_documents.get(doc.id)?.title).toBe("My edited title");
    expect(remote.leitner_cards.get(card.id)?.box).toBe(5);
    expect(remote.leitner_cards.get(card.id)?.review_count).toBe(19);
    const second = await importPharmacyKnowledge(userId);
    expect(second).toMatchObject({ foldersCount: 0, docsCount: 0, cardsCount: 0 });
  });

  it("prefers a locally edited copy over a seed copy when the server lacks that ID", async () => {
    const local = { ...PHARMACY_SEED_DOCUMENTS[0], user_id: userId, title: "Saved offline edit" };
    await cacheSet(getDocsCacheKey(userId), [local]);
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(local.id)?.title).toBe("Saved offline edit");
  });

  it("refreshes only an unchanged legacy document and retains personal reading state", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    const next = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === old.id)!;
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, read_count: 12, is_favorite: true });
    expect((await getPharmacyImportStatus(userId)).docsUpgradeable).toBeGreaterThan(0);
    const result = await importPharmacyKnowledge(userId);
    expect(result.docsUpdated).toBeGreaterThan(0);
    expect(remote.knowledge_documents.get(old.id)?.content_html).toBe(next.content_html);
    expect(remote.knowledge_documents.get(old.id)?.read_count).toBe(12);
    expect(remote.knowledge_documents.get(old.id)?.is_favorite).toBe(true);
  });

  it("does not replace a legacy document whose authored content was edited", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, content_html: `${old.content_html}<p>My note</p>` });
    await importPharmacyKnowledge(userId);
    expect(String(remote.knowledge_documents.get(old.id)?.content_html)).toContain("My note");
  });

  it("fails visibly on partial server writes and safely resumes", async () => {
    remote.failId = PHARMACY_SEED_DOCUMENTS[0].id;
    await expect(importPharmacyKnowledge(userId)).rejects.toThrow(/Could not save knowledge_documents/);
    expect(remote.knowledge_documents.size).toBeLessThan(PHARMACY_SEED_DOCUMENTS.length);
    remote.failId = "";
    const resumed = await importPharmacyKnowledge(userId);
    expect(resumed.status.docsMissing).toBe(0);
    expect(remote.knowledge_documents.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
  });

  it("does not mistake a cache-only import for confirmed server data", () => {
    const status = comparePharmacySeed(
      { PHARMACY_SEED_FOLDERS, PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_CARDS, PHARMACY_ROOT_FOLDER_ID },
      { folders: [], documents: [], cards: [] },
    );
    expect(status.docsMissing).toBe(PHARMACY_SEED_DOCUMENTS.length);
  });
});
