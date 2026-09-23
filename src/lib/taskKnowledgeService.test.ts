import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  linkTaskKnowledge,
  unlinkTaskKnowledge,
  getTaskKnowledgeLinks,
  getTaskKnowledgeDocs,
} from "./taskKnowledgeService";
import { clearQueue } from "./offlineQueue";
import { createKnowledgeDocument } from "./knowledgeService";

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
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

describe("taskKnowledgeService", () => {
  const userId = "user-task-kb-test";
  const taskId = "task-sample-123";

  beforeEach(async () => {
    localStorage.clear();
    await clearQueue();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    localStorage.clear();
    await clearQueue();
  });

  it("1. links a knowledge document to a task without duplicates", async () => {
    const doc = await createKnowledgeDocument(userId, {
      title: "پروتکل تجویز سرترالین",
      content_html: "<p>راهنمای دوز</p>",
    });

    const link = await linkTaskKnowledge(userId, taskId, doc.id, "مرجع بررسی دوز");
    expect(link.id).toBeDefined();
    expect(link.task_id).toBe(taskId);
    expect(link.document_id).toBe(doc.id);
    expect(link.note_or_context).toBe("مرجع بررسی دوز");

    // Second link with same document ID should return existing link without duplicates
    const duplicate = await linkTaskKnowledge(userId, taskId, doc.id);
    expect(duplicate.id).toBe(link.id);

    const links = await getTaskKnowledgeLinks(taskId, userId);
    expect(links.length).toBe(1);

    const docs = await getTaskKnowledgeDocs(taskId, userId);
    expect(docs.length).toBe(1);
    expect(docs[0].title).toBe("پروتکل تجویز سرترالین");
  });

  it("2. unlinks a document from a task safely", async () => {
    const doc = await createKnowledgeDocument(userId, {
      title: "سند موقت",
      content_html: "<p>متن</p>",
    });

    await linkTaskKnowledge(userId, taskId, doc.id);
    const unlinked = await unlinkTaskKnowledge(userId, taskId, doc.id);
    expect(unlinked).toBe(true);

    const remaining = await getTaskKnowledgeLinks(taskId, userId);
    expect(remaining.length).toBe(0);
  });
});
