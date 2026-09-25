import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheGet, cacheSet, getPendingOps } from "./offlineQueue";
import { getDocsCacheKey, getFoldersCacheKey } from "./knowledgeService";
import { getLeitnerCardsCacheKey } from "./leitnerService";
import { PHARMACY_ROOT_FOLDER_ID, PHARMACY_SEED_CARDS, PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_FOLDERS } from "./pharmacySeedData";
import { PHARMACY_SEED_DOCUMENTS as LEGACY_DOCUMENTS } from "./pharmacyLegacySeedData";
import { comparePharmacySeed, getPharmacyImportStatus, importPharmacyKnowledge, isPharmacyImported, normalizePharmacySeedData } from "./pharmacyImportService";
import { sanitizeKnowledgeHtml } from "./knowledgeHtmlSanitizer";

const remote = vi.hoisted(() => ({
  knowledge_folders: new Map<string, Record<string, unknown>>(),
  knowledge_documents: new Map<string, Record<string, unknown>>(),
  leitner_cards: new Map<string, Record<string, unknown>>(),
  failId: "",
}));
type MockCollection = "knowledge_folders" | "knowledge_documents" | "leitner_cards";

vi.mock("./offlineQueue", async (importOriginal) => {
  const original = await importOriginal<typeof import("./offlineQueue")>();
  return { ...original, getPendingOps: vi.fn(async () => []) };
});

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
    const hasUndefined = (value: unknown): boolean => value === undefined ||
      (value !== null && typeof value === "object" && Object.values(value).some(hasUndefined));
    if (hasUndefined(data)) return false;
    remote[table].set(id, data);
    return true;
  }),
}));

describe("pharmacyImportService", () => {
  const userId = "test-pharmacy-user-123";

  beforeEach(async () => {
    vi.mocked(getPendingOps).mockResolvedValue([]);
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
  }, 15_000);

  it("generates complete source categories with valid folder and document links", () => {
    expect(PHARMACY_SEED_FOLDERS).toHaveLength(34);
    expect(PHARMACY_SEED_DOCUMENTS).toHaveLength(432);
    const folderIds = new Set(PHARMACY_SEED_FOLDERS.map((item) => item.id));
    const docIds = new Set(PHARMACY_SEED_DOCUMENTS.map((item) => item.id));
    const cardIds = new Set(PHARMACY_SEED_CARDS.map((item) => item.id));
    expect(folderIds.size).toBe(PHARMACY_SEED_FOLDERS.length);
    expect(docIds.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect(cardIds.size).toBe(PHARMACY_SEED_CARDS.length);
    for (const folder of PHARMACY_SEED_FOLDERS) {
      if (folder.parent_id) expect(folderIds.has(folder.parent_id), `Broken parent in ${folder.id}`).toBe(true);
    }
    const sourceCommits = new Set(
      PHARMACY_SEED_DOCUMENTS.map((doc) => doc.source_url?.match(/\/blob\/([a-f0-9]{40})\//)?.[1] || "")
    );
    expect(sourceCommits.size).toBe(1);
    expect(sourceCommits.has("")).toBe(false);
    let internalLinkCount = 0;
    for (const doc of PHARMACY_SEED_DOCUMENTS) {
      expect(folderIds.has(doc.folder_id || "")).toBe(true);
      expect(doc.source_url).toMatch(/^https:\/\/github\.com\/hamedharami-hub\/pharmacy\/blob\/[a-f0-9]{40}\//);
      expect(doc.content_review_status).toBe("unreviewed");
      for (const match of `${doc.content_html} ${doc.content_en}`.matchAll(/data-doc-link="([^"]+)"/g)) {
        internalLinkCount += 1;
        expect(docIds.has(match[1]), `Broken link in ${doc.id}: ${match[1]}`).toBe(true);
      }
    }
    expect(internalLinkCount).toBe(808);
    for (const card of PHARMACY_SEED_CARDS) {
      if (card.document_id) expect(docIds.has(card.document_id)).toBe(true);
      if (card.folder_id) expect(folderIds.has(card.folder_id)).toBe(true);
    }
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-core-disease-"))).toHaveLength(15);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-study-track-"))).toHaveLength(5);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-practice-question-"))).toHaveLength(7);
    const productDocuments = PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-product-"));
    expect(productDocuments).toHaveLength(121);
    for (const schedule of ["S2", "S3", "S4", "S8"]) {
      expect(productDocuments.some((item) => item.tags?.includes(`Schedule ${schedule}`))).toBe(true);
    }
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-mechanism-sub-"))).toHaveLength(14);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) =>
      item.id.startsWith("doc-mechanism-") && !item.id.startsWith("doc-mechanism-sub-")
    )).toHaveLength(70);
    const safeScriptCase = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-scenario-clinical-safescript-early-refill-s8");
    expect(safeScriptCase?.content_en).toContain("Pharmacist assessment questions");
    expect(safeScriptCase?.content_en).toContain("Clinical rationale:");
    expect(safeScriptCase?.content_en).toContain("Red flags and escalation cues");
    expect(safeScriptCase?.content_en).toContain("Administrative / jurisdiction note");
    expect(safeScriptCase?.content_en).toContain("Referral handover template");
    expect(safeScriptCase?.content_en).not.toMatch(/[\u0600-\u06ff]/);
    const scenarioDocuments = PHARMACY_SEED_DOCUMENTS.filter((item) =>
      item.id.startsWith("doc-scenario-clinical-") || item.id.startsWith("doc-scenario-slang-")
    );
    expect(scenarioDocuments).toHaveLength(28);
    for (const scenario of scenarioDocuments) {
      expect(scenario.content_en).toContain("English study view");
      expect(scenario.content_en).not.toMatch(/[\u0600-\u06ff]/);
    }
    expect(PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-cyp-cyp2d6")?.title).toBe("\u0633\u06cc\u062a\u0648\u06a9\u0631\u0648\u0645 CYP2D6: \u062a\u062f\u0627\u062e\u0644\u0627\u062a \u0648 \u0645\u0647\u0627\u0631\u06a9\u0646\u0646\u062f\u0647\u200c\u0647\u0627");
  });

  it("sanitizes untrusted bilingual seed HTML while retaining internal knowledge links", () => {
    const fixture = {
      PHARMACY_SEED_DOCUMENTS: [{
        ...PHARMACY_SEED_DOCUMENTS[0],
        id: "doc-synthetic-import",
        content_html: '<p>Safe lesson</p><a data-doc-link="doc-synthetic-import" href="javascript:alert(1)">related</a><script>bad()</script>',
        content_en: '<img src="x" onerror="alert(1)"><p>English lesson</p>',
      }],
    } as Parameters<typeof normalizePharmacySeedData>[0];

    const normalized = normalizePharmacySeedData(fixture).PHARMACY_SEED_DOCUMENTS[0];

    expect(normalized.id).toBe("doc-synthetic-import");
    expect(normalized.content_html).toContain("Safe lesson");
    expect(normalized.content_html).toContain('data-doc-link="doc-synthetic-import"');
    expect(normalized.content_html).not.toMatch(/<script|javascript:/i);
    expect(normalized.content_en).toContain("English lesson");
    expect(normalized.content_en).not.toMatch(/onerror/i);
    expect(normalized.source_url).toBe(PHARMACY_SEED_DOCUMENTS[0].source_url);
  });

  it("rejects seed provenance links that are missing or unsafe", () => {
    const fixture = {
      PHARMACY_SEED_DOCUMENTS: [{
        ...PHARMACY_SEED_DOCUMENTS[0],
        id: "doc-synthetic-import",
        source_url: "javascript:alert(1)",
      }],
    } as Parameters<typeof normalizePharmacySeedData>[0];

    expect(() => normalizePharmacySeedData(fixture)).toThrow(/source URL is missing or invalid/i);
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
    const importedExample = remote.knowledge_documents.get(PHARMACY_SEED_DOCUMENTS[0].id);
    expect(importedExample?.content_html).toBe(sanitizeKnowledgeHtml(PHARMACY_SEED_DOCUMENTS[0].content_html));
    expect(importedExample?.content_en).toBe(sanitizeKnowledgeHtml(PHARMACY_SEED_DOCUMENTS[0].content_en || ""));
    expect(await isPharmacyImported(userId)).toBe(true);
  }, 15_000);

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
  }, 15_000);

  it("does not resurrect a stale cached copy when the server lacks that ID", async () => {
    const local = { ...PHARMACY_SEED_DOCUMENTS[0], user_id: userId, title: "Saved offline edit" };
    await cacheSet(getDocsCacheKey(userId), [local]);
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(local.id)?.title).toBe(PHARMACY_SEED_DOCUMENTS[0].title);
    expect((await cacheGet<typeof local[]>(getDocsCacheKey(userId)))?.find((doc) => doc.id === local.id)?.title)
      .toBe(PHARMACY_SEED_DOCUMENTS[0].title);
  }, 15_000);

  it("stops before writing when this user's knowledge changes are pending offline", async () => {
    vi.mocked(getPendingOps).mockResolvedValue([{
      table: "knowledge_documents", op: "update", ownerId: userId,
      payload: { id: PHARMACY_SEED_DOCUMENTS[0].id, title: "Pending edit" },
      createdAt: 1, attempts: 0,
    }]);
    await expect(importPharmacyKnowledge(userId)).rejects.toThrow(/Sync pending knowledge changes/);
    expect(remote.knowledge_folders.size).toBe(0);
    expect(remote.knowledge_documents.size).toBe(0);
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
  }, 15_000);

  it("does not replace a legacy document whose authored content was edited", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, content_html: `${old.content_html}<p>My note</p>` });
    await importPharmacyKnowledge(userId);
    expect(String(remote.knowledge_documents.get(old.id)?.content_html)).toContain("My note");
  }, 15_000);

  it("preserves a custom source link on a legacy document", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    const personalSource = "https://example.com/my-clinical-reference";
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, source_url: personalSource });
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(old.id)?.source_url).toBe(personalSource);
  }, 15_000);

  it("preserves the manual content-review status and evidence on a legacy document", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    const reviewEvidence = {
      reviewer_role: "Registered pharmacist",
      jurisdiction: "NSW, Australia",
      scope: "Clinical content",
      reviewed_at: "2026-09-20",
      references: [{
        title: "Example test reference",
        url: "https://example.org/clinical-reference",
        accessed_at: "2026-09-19",
      }],
    };
    remote.knowledge_documents.set(old.id, {
      ...old,
      user_id: userId,
      content_review_status: "reviewed",
      content_review_evidence: reviewEvidence,
    });
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(old.id)?.content_review_status).toBe("reviewed");
    expect(remote.knowledge_documents.get(old.id)?.content_review_evidence).toEqual(reviewEvidence);
  }, 15_000);

  it("fails visibly on partial server writes and safely resumes", async () => {
    remote.failId = PHARMACY_SEED_DOCUMENTS[0].id;
    await expect(importPharmacyKnowledge(userId)).rejects.toThrow(/Could not save knowledge_documents/);
    expect(remote.knowledge_documents.size).toBeLessThan(PHARMACY_SEED_DOCUMENTS.length);
    remote.failId = "";
    const resumed = await importPharmacyKnowledge(userId);
    expect(resumed.status.docsMissing).toBe(0);
    expect(remote.knowledge_documents.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
  }, 15_000);

  it("does not mistake a cache-only import for confirmed server data", () => {
    const status = comparePharmacySeed(
      { PHARMACY_SEED_FOLDERS, PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_CARDS, PHARMACY_ROOT_FOLDER_ID },
      { folders: [], documents: [], cards: [] },
    );
    expect(status.docsMissing).toBe(PHARMACY_SEED_DOCUMENTS.length);
  });
});
