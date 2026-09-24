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
  searchKnowledgeDocuments,
} from "./knowledgeService";
import { clearQueue } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
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

describe("knowledgeService", () => {
  const userId = "user-kb-test";

  beforeEach(async () => {
    localStorage.clear();
    await clearQueue();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    localStorage.clear();
    await clearQueue();
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

  it("5. updates and deletes documents cleanly", async () => {
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

  it("reparents knowledge documents and child folders before deleting a folder", async () => {
    const parent = await createKnowledgeFolder(userId, { name: "Parent" });
    const target = await createKnowledgeFolder(userId, { name: "To remove", parent_id: parent.id });
    const child = await createKnowledgeFolder(userId, { name: "Keep child", parent_id: target.id });
    const nested = await createKnowledgeFolder(userId, { name: "Keep nested", parent_id: child.id });
    const doc = await createKnowledgeDocument(userId, {
      folder_id: target.id,
      title: "Keep this knowledge",
      content_html: "<p>Preserved content</p>",
    });

    expect(await deleteKnowledgeFolder(userId, target.id)).toBe(true);

    const folders = await getKnowledgeFolders(userId);
    const documents = await getKnowledgeDocuments(userId);
    expect(folders.some((item) => item.id === target.id)).toBe(false);
    expect(folders.find((item) => item.id === child.id)?.parent_id).toBe(parent.id);
    expect(folders.find((item) => item.id === nested.id)?.parent_id).toBe(child.id);
    expect(documents.find((item) => item.id === doc.id)?.folder_id).toBe(parent.id);
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId,
      "knowledge_folders",
      child.id,
      expect.objectContaining({ parent_id: parent.id }),
    );
    expect(saveEntityToFirestore).toHaveBeenCalledWith(
      userId,
      "knowledge_documents",
      doc.id,
      expect.objectContaining({ folder_id: parent.id }),
    );
    expect(deleteEntityFromFirestore).toHaveBeenCalledWith(userId, "knowledge_folders", target.id);
  });
});
