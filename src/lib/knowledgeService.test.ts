import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getKnowledgeFolders,
  createKnowledgeFolder,
  updateKnowledgeFolder,
  deleteKnowledgeFolder,
  getKnowledgeDocuments,
  getKnowledgeDocument,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  buildFolderTree,
  getFolderAncestorIds,
  searchKnowledgeDocuments,
  getFoldersCacheKey,
  getDocsCacheKey,
} from "./knowledgeService";
import { cacheGet, cacheSet, clearQueue, enqueueOp, getPendingOps } from "./offlineQueue";
import { deleteEntityFromFirestore, saveEntityToFirestore } from "./firestoreSync";
import type { KnowledgeDocument } from "./knowledgeTypes";

const { remoteKnowledgeRows, remoteFolderRows, remoteLeitnerRows, remoteReadFailure } = vi.hoisted(() => ({
  remoteKnowledgeRows: [] as Record<string, unknown>[],
  remoteFolderRows: [] as Record<string, unknown>[],
  remoteLeitnerRows: [] as Record<string, unknown>[],
  remoteReadFailure: { value: false },
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          const result = remoteReadFailure.value
            ? { data: null, error: new Error("remote read failed") }
            : {
                data: table === "knowledge_folders"
                  ? remoteFolderRows
                  : table === "leitner_cards"
                    ? remoteLeitnerRows
                    : remoteKnowledgeRows,
                error: null,
              };
          const promise = Promise.resolve(result);
          return {
            order: () => promise,
            then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
              promise.then(resolve, reject),
          };
        },
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn().mockResolvedValue(true),
  deleteEntityFromFirestore: vi.fn().mockResolvedValue(true),
}));

function mockSuccessfulFirestoreWrites() {
  vi.mocked(saveEntityToFirestore).mockImplementation(async (_userId, collection, id, data) => {
    const rows = collection === "knowledge_folders"
      ? remoteFolderRows
      : collection === "leitner_cards"
        ? remoteLeitnerRows
        : remoteKnowledgeRows;
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) rows[index] = { ...rows[index], ...(data || {}) };
    return true;
  });
  vi.mocked(deleteEntityFromFirestore).mockImplementation(async (_userId, collection, id) => {
    const rows = collection === "knowledge_folders"
      ? remoteFolderRows
      : collection === "leitner_cards"
        ? remoteLeitnerRows
        : remoteKnowledgeRows;
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) rows.splice(index, 1);
    return true;
  });
}

describe("knowledgeService", () => {
  const userId = "user-kb-test";

  beforeEach(async () => {
    localStorage.clear();
    remoteKnowledgeRows.length = 0;
    remoteFolderRows.length = 0;
    remoteLeitnerRows.length = 0;
    remoteReadFailure.value = false;
    await clearQueue();
    vi.clearAllMocks();
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
  });

  afterEach(async () => {
    localStorage.clear();
    await clearQueue();
    vi.restoreAllMocks();
  });

  it("1. creates folders and subfolders hierarchically", async () => {
    const rootFolder = await createKnowledgeFolder(userId, {
      name: "داروها (Medications)",
      icon: "Pill",
      color: "#3b82f6",
    });

    expect(rootFolder.id).toBeDefined();
    expect(rootFolder.name).toBe("داروها (Medications)");
    expect(rootFolder.parent_id).toBeNull();

    const subFolder = await createKnowledgeFolder(userId, {
      name: "ضد افسردگی‌ها (Antidepressants)",
      parent_id: rootFolder.id,
      icon: "Smile",
    });

    expect(subFolder.id).toBeDefined();
    expect(subFolder.parent_id).toBe(rootFolder.id);

    const allFolders = await getKnowledgeFolders(userId);
    expect(allFolders.length).toBe(2);
  });

  it("2. creates HTML document with title and html content, and extracts plain text", async () => {
    const doc = await createKnowledgeDocument(userId, {
      title: "فلوکستین (Fluoxetine)",
      content_html: "<h1>فلوکستین</h1><p>داروی مهارکننده بازجذب سروتونین (SSRI) برای درمان افسردگی.</p>",
      tags: ["SSRI", "Depression"],
    });

    expect(doc.id).toBeDefined();
    expect(doc.title).toBe("فلوکستین (Fluoxetine)");
    expect(doc.content_html).toContain("<h1>فلوکستین</h1>");
    expect(doc.plain_text).toBe("فلوکستین داروی مهارکننده بازجذب سروتونین (SSRI) برای درمان افسردگی.");

    const singleDoc = await getKnowledgeDocument(userId, doc.id);
    expect(singleDoc).not.toBeNull();
    expect(singleDoc?.id).toBe(doc.id);
  });

  it("sanitizes imported lesson HTML before caching or queuing a write", async () => {
    const payload = '<p>Safe lesson text</p><script>window.compromised = true</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">unsafe link</a>';
    const document = await createKnowledgeDocument(userId, {
      title: "Imported HTML",
      content_html: payload,
      content_en: payload,
    });

    for (const content of [document.content_html, document.content_en || ""]) {
      expect(content).toContain("Safe lesson text");
      expect(content).not.toMatch(/<script|onerror|javascript:/i);
    }
    const pending = await getPendingOps("knowledge_documents");
    const queued = pending.find((item) => (item.payload as Partial<KnowledgeDocument> | undefined)?.id === document.id);
    const queuedPayload = queued?.payload as Partial<KnowledgeDocument> | undefined;
    expect(queuedPayload?.content_html).toBe(document.content_html);
    expect(queuedPayload?.content_en).toBe(document.content_en);
  });

  it("sanitizes remote legacy documents before returning or caching them", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    remoteKnowledgeRows.push({
      id: "remote-html-1",
      user_id: userId,
      folder_id: null,
      title: "Legacy import",
      content_html: '<p>Readable</p><img src=x onerror="alert(1)"><script>bad()</script>',
      content_en: '<a href="javascript:alert(1)">bad</a>',
      source_url: "javascript:alert(1)",
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    });

    const documents = await getKnowledgeDocuments(userId);
    expect(documents).toHaveLength(1);
    expect(documents[0].content_html).toContain("Readable");
    expect(documents[0].content_html).not.toMatch(/<script|onerror/i);
    expect(documents[0].content_en).not.toContain("javascript:");
    expect(documents[0].source_url).toBeUndefined();
    const cached = await cacheGet<KnowledgeDocument[]>(getDocsCacheKey(userId));
    expect(cached?.[0].content_html).toBe(documents[0].content_html);
    expect(cached?.[0].source_url).toBeUndefined();
  });

  it("migrates unsafe legacy HTML out of the existing local cache", async () => {
    const legacyDocument: KnowledgeDocument = {
      id: "cached-html-1",
      user_id: userId,
      folder_id: null,
      title: "Cached legacy import",
      content_html: '<p>Cached lesson</p><script>bad()</script>',
      content_en: '<img src=x onerror="alert(1)">',
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    };
    await cacheSet(getDocsCacheKey(userId), [legacyDocument]);

    const documents = await getKnowledgeDocuments(userId);
    const migratedCache = await cacheGet<KnowledgeDocument[]>(getDocsCacheKey(userId));

    expect(documents[0].content_html).toContain("Cached lesson");
    expect(documents[0].content_html).not.toMatch(/<script/i);
    expect(documents[0].content_en).not.toMatch(/onerror/i);
    expect(migratedCache?.[0].content_html).toBe(documents[0].content_html);
    expect(migratedCache?.[0].content_en).toBe(documents[0].content_en);
  });

  it("rejects active script URLs as document sources before accepting the save", async () => {
    await expect(createKnowledgeDocument(userId, {
      title: "Unsafe source",
      content_html: "<p>Lesson</p>",
      source_url: "javascript:alert(1)",
    })).rejects.toThrow("valid HTTP or HTTPS link");
    expect(await getPendingOps("knowledge_documents")).toHaveLength(0);
  });

  it("uses the user-scoped Firestore CRUD contract for online document mutations", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    mockSuccessfulFirestoreWrites();

    const document = await createKnowledgeDocument(userId, {
      title: "Persistence contract",
      content_html: "<p>Original</p>",
    });
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId,
      "knowledge_documents",
      document.id,
      expect.objectContaining({ id: document.id, user_id: userId }),
    );

    const updated = await updateKnowledgeDocument(userId, document.id, { title: "Updated title" });
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId,
      "knowledge_documents",
      document.id,
      expect.objectContaining({ id: document.id, title: "Updated title" }),
    );

    await expect(deleteKnowledgeDocument(userId, updated.id)).resolves.toBe(true);
    expect(deleteEntityFromFirestore).toHaveBeenCalledWith(userId, "knowledge_documents", document.id);
    const pendingForDocument = (await getPendingOps("knowledge_documents")).filter((item) =>
      (item.payload as Partial<KnowledgeDocument> | undefined)?.id === document.id ||
      item.match?.id === document.id,
    );
    expect(pendingForDocument).toHaveLength(0);
  });

  it("keeps a rejected online write in the durable owner-scoped outbox", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.mocked(saveEntityToFirestore).mockResolvedValue(false);

    const document = await createKnowledgeDocument(userId, {
      title: "Pending sync",
      content_html: "<p>Keep this change until Firestore accepts it</p>",
    });

    const pending = (await getPendingOps("knowledge_documents")).find((item) =>
      (item.payload as Partial<KnowledgeDocument> | undefined)?.id === document.id,
    );
    expect(pending).toEqual(expect.objectContaining({
      ownerId: userId,
      table: "knowledge_documents",
      op: "insert",
    }));
    expect(pending?.payload).toEqual(expect.objectContaining({
      id: document.id,
      title: "Pending sync",
      user_id: userId,
    }));
  });

  it("persists structured review evidence without adding it to documents that do not opt in", async () => {
    const evidence = {
      reviewer_role: "Registered pharmacist",
      jurisdiction: "NSW, Australia",
      scope: "Clinical triage",
      reviewed_at: "2026-09-20",
      references: [{
        title: "Example primary source",
        url: "https://example.org/clinical-reference",
        accessed_at: "2026-09-19",
      }],
    };
    const reviewed = await createKnowledgeDocument(userId, {
      title: "Reviewed lesson",
      content_html: "<p>Reviewed content</p>",
      content_review_status: "reviewed",
      content_review_evidence: evidence,
    });
    const ordinary = await createKnowledgeDocument(userId, {
      title: "Ordinary note",
      content_html: "<p>Personal note</p>",
    });

    expect(reviewed.content_review_status).toBe("reviewed");
    expect(reviewed.content_review_evidence).toEqual(evidence);
    expect((await getKnowledgeDocument(userId, reviewed.id))?.content_review_evidence).toEqual(evidence);
    expect(ordinary).not.toHaveProperty("content_review_status");
    expect(ordinary).not.toHaveProperty("content_review_evidence");

    const edited = await updateKnowledgeDocument(userId, reviewed.id, {
      content_html: "<p>Changed content requiring another review</p>",
    });
    expect(edited.content_review_status).toBe("unreviewed");
    expect(edited.content_review_evidence).toEqual(evidence);

    const reReviewed = await updateKnowledgeDocument(userId, reviewed.id, {
      content_review_status: "reviewed",
      content_review_evidence: evidence,
    });
    expect(reReviewed.content_review_status).toBe("reviewed");
  });

  it("rejects reviewed documents without complete evidence before any write", async () => {
    await expect(createKnowledgeDocument(userId, {
      title: "Invalid review record",
      content_html: "<p>Content</p>",
      content_review_status: "reviewed",
    })).rejects.toThrow("Review status requires complete review evidence.");

    const doc = await createKnowledgeDocument(userId, {
      title: "Unreviewed document",
      content_html: "<p>Content</p>",
    });
    await expect(updateKnowledgeDocument(userId, doc.id, {
      title: "Reviewed without evidence",
      content_review_status: "reviewed",
    })).rejects.toThrow("Review status requires complete review evidence.");
    expect((await getKnowledgeDocument(userId, doc.id))?.title).toBe("Unreviewed document");
  });

  it("3. searches documents by title, plain text, and tags", async () => {
    await createKnowledgeDocument(userId, {
      title: "سرترالین (Sertraline)",
      content_html: "<p>درمان وسواس فکری-عملی (OCD) و هراس.</p>",
      tags: ["OCD", "SSRI"],
    });

    await createKnowledgeDocument(userId, {
      title: "دیازپام (Diazepam)",
      content_html: "<p>بنزودیازپین برای اضطراب و تشنج.</p>",
      tags: ["Benzodiazepine", "Anxiety"],
    });

    const results = await searchKnowledgeDocuments(userId, "وسواس");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("سرترالین (Sertraline)");

    const tagResults = await searchKnowledgeDocuments(userId, "Benzodiazepine");
    expect(tagResults.length).toBe(1);
    expect(tagResults[0].title).toBe("دیازپام (Diazepam)");

    // Older imports indexed Persian in plain_text but not the English body.
    await updateKnowledgeDocument(userId, tagResults[0].id, {
      content_en: "<p>Enteral administration reference</p>",
    });
    const englishResults = await searchKnowledgeDocuments(userId, "Enteral administration");
    expect(englishResults.map((item) => item.id)).toContain(tagResults[0].id);
  });

  it("4. builds folder tree with document counts", async () => {
    const f1 = await createKnowledgeFolder(userId, { name: "Root Folder" });
    const f2 = await createKnowledgeFolder(userId, { name: "Child Folder", parent_id: f1.id });

    const doc1 = await createKnowledgeDocument(userId, {
      folder_id: f2.id,
      title: "Nested Doc",
      content_html: "<p>Content</p>",
    });

    const folders = await getKnowledgeFolders(userId);
    const docs = await getKnowledgeDocuments(userId);
    const tree = buildFolderTree(folders, docs);

    expect(tree.length).toBe(1);
    expect(tree[0].id).toBe(f1.id);
    expect(tree[0].children.length).toBe(1);
    expect(tree[0].children[0].id).toBe(f2.id);
    expect(tree[0].children[0].document_count).toBe(1);
  });

  it("keeps malformed cyclic and orphaned folder relationships reachable", () => {
    const folders = [
      { id: "folder-b", user_id: userId, parent_id: "folder-a", name: "B", created_at: "2026-09-01", updated_at: "2026-09-01" },
      { id: "folder-a", user_id: userId, parent_id: "folder-b", name: "A", created_at: "2026-09-01", updated_at: "2026-09-01" },
      { id: "folder-c", user_id: userId, parent_id: "folder-b", name: "C", created_at: "2026-09-01", updated_at: "2026-09-01" },
      { id: "folder-orphan", user_id: userId, parent_id: "deleted-parent", name: "Orphan", created_at: "2026-09-01", updated_at: "2026-09-01" },
    ];
    const documents = [{
      id: "doc-cycle",
      user_id: userId,
      folder_id: "folder-b",
      title: "Cycle lesson",
      content_html: "<p>Keep me</p>",
      created_at: "2026-09-01",
      updated_at: "2026-09-01",
    }];

    const tree = buildFolderTree(folders, documents);
    const rootA = tree.find((folder) => folder.id === "folder-a");
    const orphanRoot = tree.find((folder) => folder.id === "folder-orphan");

    expect(rootA?.children.map((folder) => folder.id)).toContain("folder-b");
    expect(rootA?.children[0].children.map((folder) => folder.id)).toContain("folder-c");
    expect(rootA?.children[0].document_count).toBe(1);
    expect(orphanRoot).toBeDefined();
    expect(getFolderAncestorIds("folder-c", folders)).toEqual(["folder-c", "folder-b", "folder-a"]);
    expect(getFolderAncestorIds("missing-folder", folders)).toEqual([]);
  });

  it("5. updates and deletes documents cleanly", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    mockSuccessfulFirestoreWrites();
    const doc = await createKnowledgeDocument(userId, {
      title: "Draft Doc",
      content_html: "<p>Old Content</p>",
    });

    const updated = await updateKnowledgeDocument(userId, doc.id, {
      title: "Updated Doc",
      content_html: "<p>New Content with pearls</p>",
    });

    expect(updated.title).toBe("Updated Doc");
    expect(updated.plain_text).toBe("New Content with pearls");

    const deleted = await deleteKnowledgeDocument(userId, doc.id);
    expect(deleted).toBe(true);

    const single = await getKnowledgeDocument(userId, doc.id);
    expect(single).toBeNull();
  });

  it("keeps a lesson when remote Leitner cards still reference it", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const doc: KnowledgeDocument = {
      id: "linked-lesson",
      user_id: userId,
      folder_id: null,
      title: "Linked lesson",
      content_html: "<p>Keep the source lesson</p>",
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    };
    remoteKnowledgeRows.push(doc as unknown as Record<string, unknown>);
    remoteLeitnerRows.push({ id: "linked-card", user_id: userId, document_id: doc.id });
    await cacheSet(getDocsCacheKey(userId), [doc]);

    await expect(deleteKnowledgeDocument(userId, doc.id)).rejects.toMatchObject({
      reason: "linked-cards",
      linkedCardCount: 1,
    });

    expect(remoteKnowledgeRows).toContainEqual(doc);
    expect(deleteEntityFromFirestore).not.toHaveBeenCalledWith(userId, "knowledge_documents", doc.id);
  });

  it("also blocks deletion for a linked card waiting in the durable outbox", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const doc: KnowledgeDocument = {
      id: "queued-card-lesson",
      user_id: userId,
      folder_id: null,
      title: "Queued card lesson",
      content_html: "<p>Keep the source lesson</p>",
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    };
    remoteKnowledgeRows.push(doc as unknown as Record<string, unknown>);
    await cacheSet(getDocsCacheKey(userId), [doc]);
    await enqueueOp({
      ownerId: userId,
      table: "leitner_cards",
      op: "insert",
      payload: { id: "queued-card", user_id: userId, document_id: doc.id },
    });

    await expect(deleteKnowledgeDocument(userId, doc.id)).rejects.toMatchObject({
      reason: "linked-cards",
      linkedCardCount: 1,
    });
    expect(deleteEntityFromFirestore).not.toHaveBeenCalledWith(userId, "knowledge_documents", doc.id);
  });

  it("fails closed when linked cards cannot be checked, including while offline", async () => {
    const doc: KnowledgeDocument = {
      id: "unverified-lesson",
      user_id: userId,
      folder_id: null,
      title: "Unverified lesson",
      content_html: "<p>Keep the source lesson</p>",
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    };
    await cacheSet(getDocsCacheKey(userId), [doc]);

    await expect(deleteKnowledgeDocument(userId, doc.id)).rejects.toMatchObject({ reason: "offline" });
    expect(deleteEntityFromFirestore).not.toHaveBeenCalledWith(userId, "knowledge_documents", doc.id);

    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    remoteReadFailure.value = true;
    await expect(deleteKnowledgeDocument(userId, doc.id)).rejects.toMatchObject({ reason: "verify-cards" });
    expect(deleteEntityFromFirestore).not.toHaveBeenCalledWith(userId, "knowledge_documents", doc.id);
  });

  it("reparents knowledge documents and child folders before deleting a folder", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const parent = { id: "parent", user_id: userId, parent_id: null, name: "Parent", created_at: "2026-09-01", updated_at: "2026-09-01" };
    const target = { id: "target", user_id: userId, parent_id: parent.id, name: "To remove", created_at: "2026-09-02", updated_at: "2026-09-02" };
    const child = { id: "child", user_id: userId, parent_id: target.id, name: "Keep child", created_at: "2026-09-03", updated_at: "2026-09-03" };
    const nested = { id: "nested", user_id: userId, parent_id: child.id, name: "Keep nested", created_at: "2026-09-04", updated_at: "2026-09-04" };
    const doc = {
      id: "document", user_id: userId, folder_id: target.id, title: "Keep this knowledge",
      content_html: "<p>Preserved content</p>", created_at: "2026-09-05", updated_at: "2026-09-05",
    };
    remoteFolderRows.push(parent, target, child, nested);
    remoteKnowledgeRows.push(doc);
    await cacheSet(getFoldersCacheKey(userId), [parent, target, child, nested]);
    await cacheSet(getDocsCacheKey(userId), [doc]);
    mockSuccessfulFirestoreWrites();

    expect(await deleteKnowledgeFolder(userId, target.id)).toBe(true);

    const folders = await cacheGet<typeof remoteFolderRows>(getFoldersCacheKey(userId));
    const documents = await cacheGet<KnowledgeDocument[]>(getDocsCacheKey(userId));
    expect(folders.some((item) => item.id === target.id)).toBe(false);
    expect(folders.find((item) => item.id === child.id)?.parent_id).toBe(parent.id);
    expect(folders.find((item) => item.id === nested.id)?.parent_id).toBe(child.id);
    expect(documents.find((item) => item.id === doc.id)?.folder_id).toBe(parent.id);
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId, "knowledge_folders", child.id, expect.objectContaining({ parent_id: parent.id }),
    );
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId, "knowledge_documents", doc.id, expect.objectContaining({ folder_id: parent.id }),
    );
    expect(deleteEntityFromFirestore).toHaveBeenCalledWith(userId, "knowledge_folders", target.id);
  });

  it("loads the current remote subtree before deleting so uncached linked content is preserved", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const parent = {
      id: "fresh-parent", user_id: userId, parent_id: null, name: "Current parent",
      created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z",
    };
    const remoteChild = {
      id: "fresh-child", user_id: userId, parent_id: parent.id, name: "Not in cache",
      created_at: "2026-09-21T00:00:00.000Z", updated_at: "2026-09-21T00:00:00.000Z",
    };
    const remoteDocument = {
      id: "fresh-document", user_id: userId, folder_id: parent.id, title: "Remote-only lesson",
      content_html: "<p>Keep this lesson</p>", created_at: "2026-09-22T00:00:00.000Z",
      updated_at: "2026-09-22T00:00:00.000Z",
    };
    remoteFolderRows.push(parent, remoteChild);
    remoteKnowledgeRows.push(remoteDocument);
    await cacheSet(getFoldersCacheKey(userId), [parent]);
    await cacheSet(getDocsCacheKey(userId), []);
    mockSuccessfulFirestoreWrites();

    await expect(deleteKnowledgeFolder(userId, parent.id)).resolves.toBe(true);

    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId, "knowledge_folders", remoteChild.id, expect.objectContaining({ parent_id: null }),
    );
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId, "knowledge_documents", remoteDocument.id, expect.objectContaining({ folder_id: null }),
    );
    expect(deleteEntityFromFirestore).toHaveBeenCalledWith(userId, "knowledge_folders", parent.id);
  });

  it("does not delete a folder offline when it cannot verify all remote descendants", async () => {
    const parent = {
      id: "offline-parent", user_id: userId, parent_id: null, name: "Cached parent",
      created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z",
    };
    await cacheSet(getFoldersCacheKey(userId), [parent]);

    await expect(deleteKnowledgeFolder(userId, parent.id)).rejects.toThrow(/reconnect/i);
    expect(saveEntityToFirestore).not.toHaveBeenCalled();
    expect(deleteEntityFromFirestore).not.toHaveBeenCalled();
  });

  it("keeps a folder intact when a fresh remote subtree read fails", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    remoteReadFailure.value = true;
    const parent = {
      id: "unreadable-parent", user_id: userId, parent_id: null, name: "Unreadable parent",
      created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z",
    };
    await cacheSet(getFoldersCacheKey(userId), [parent]);

    await expect(deleteKnowledgeFolder(userId, parent.id)).rejects.toThrow(/current knowledge/i);
    expect(saveEntityToFirestore).not.toHaveBeenCalled();
    expect(deleteEntityFromFirestore).not.toHaveBeenCalled();
  });

  it("waits for queued mutations to sync before moving folder contents", async () => {
    const pendingFolder = await createKnowledgeFolder(userId, { name: "Pending folder" });
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);

    await expect(deleteKnowledgeFolder(userId, pendingFolder.id)).rejects.toThrow(/sync pending changes/i);
    expect(saveEntityToFirestore).not.toHaveBeenCalled();
    expect(deleteEntityFromFirestore).not.toHaveBeenCalled();
  });

  it("keeps the parent folder when a reparent write is queued but not yet remote", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const parent = {
      id: "verify-parent", user_id: userId, parent_id: null, name: "Parent",
      created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z",
    };
    const child = {
      id: "verify-child", user_id: userId, parent_id: parent.id, name: "Child",
      created_at: "2026-09-21T00:00:00.000Z", updated_at: "2026-09-21T00:00:00.000Z",
    };
    remoteFolderRows.push(parent, child);
    await cacheSet(getFoldersCacheKey(userId), [parent, child]);
    vi.mocked(saveEntityToFirestore).mockResolvedValue(false);

    await expect(deleteKnowledgeFolder(userId, parent.id)).rejects.toThrow(/still linked/i);
    expect(deleteEntityFromFirestore).not.toHaveBeenCalled();
    expect(remoteFolderRows).toContainEqual(expect.objectContaining({ id: child.id, parent_id: parent.id }));
  });
});
