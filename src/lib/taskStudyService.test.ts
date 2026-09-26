import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  createStudyTask,
  getNextLeitnerReviewAt,
  getStudyTaskNavigation,
  isLeitnerStudyTask,
  rescheduleLeitnerStudyTaskAfterSession,
} from "./taskStudyService";

const mocks = vi.hoisted(() => ({
  upsertTask: vi.fn(),
  persistTask: vi.fn(),
  linkTaskToDocument: vi.fn(),
  db: {},
  doc: vi.fn(),
  getDoc: vi.fn(),
  getCachedTasks: vi.fn(),
}));

vi.mock("@/lib/firestoreDataService", () => ({
  upsertTask: mocks.upsertTask,
  persistTask: mocks.persistTask,
}));

vi.mock("@/lib/firebase", () => ({
  db: mocks.db,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
}));

vi.mock("@/features/tasks/taskService", () => ({
  getCachedTasks: mocks.getCachedTasks,
}));

vi.mock("@/lib/taskKnowledgeService", () => ({
  linkTaskToDocument: mocks.linkTaskToDocument,
}));

describe("taskStudyService", () => {
  beforeEach(() => {
    mocks.upsertTask.mockReset().mockResolvedValue(true);
    mocks.persistTask.mockReset().mockResolvedValue("saved");
    mocks.linkTaskToDocument.mockReset().mockResolvedValue(true);
    mocks.doc.mockReset().mockImplementation((...segments: string[]) => segments.join("/"));
    mocks.getDoc.mockReset().mockResolvedValue({
      exists: () => true,
      data: () => ({ source_type: "leitner", source_id: "doc-7", completed: false }),
    });
    mocks.getCachedTasks.mockReset().mockResolvedValue([
      { id: "task-7", source_type: "leitner", source_id: "doc-7", completed: false },
    ]);
  });

  it("does not create a task without a real user and target identifier", async () => {
    const missingUser = await createStudyTask({
      userId: "   ",
      targetType: "knowledge_doc",
      targetId: "doc-1",
      targetTitle: "A lesson",
    });
    const missingTarget = await createStudyTask({
      userId: "u123",
      targetType: "knowledge_doc",
      targetId: "  ",
      targetTitle: "A lesson",
    });

    expect(missingUser).toMatchObject({ ok: false });
    expect(missingUser.task).toBeUndefined();
    expect(missingTarget).toMatchObject({ ok: false });
    expect(missingTarget.task).toBeUndefined();
    expect(mocks.upsertTask).not.toHaveBeenCalled();
  });

  it("does not return an unsaved task as if it were created", async () => {
    mocks.upsertTask.mockResolvedValueOnce(false);

    const res = await createStudyTask({
      userId: "u123",
      targetType: "knowledge_doc",
      targetId: "doc-1",
      targetTitle: "A lesson",
    });

    expect(res).toMatchObject({ ok: false });
    expect(res.task).toBeUndefined();
    expect(mocks.linkTaskToDocument).not.toHaveBeenCalled();
  });

  it("creates a knowledge folder study task with smart default title", async () => {
    const res = await createStudyTask({
      userId: "u123",
      targetType: "knowledge_folder",
      targetId: "f456",
      targetTitle: "داروشناسی",
      dueDate: "2026-09-25T10:00:00Z",
    });

    expect(res.ok).toBe(true);
    expect(res.task).toBeDefined();
    expect(res.task?.title).toBe("مطالعه شاخه: داروشناسی");
    expect(res.task?.source_type).toBe("knowledge_folder");
    expect(res.task?.source_id).toBe("f456");
  });

  it("creates a mind map study task with centered target", async () => {
    const res = await createStudyTask({
      userId: "u123",
      targetType: "mindmap_folder",
      targetId: "f789",
      targetTitle: "اعصاب و روان",
      priority: "high",
    });

    expect(res.ok).toBe(true);
    expect(res.task?.title).toBe("مرور نقشه ذهنی: اعصاب و روان");
    expect(res.task?.source_type).toBe("mindmap_folder");
    expect(res.task?.priority).toBe("high");
  });

  it("resolves navigation and metadata correctly for folder, doc, and mind map tasks", () => {
    const folderNav = getStudyTaskNavigation({
      source_type: "knowledge_folder",
      source_id: "fold-1",
    });
    expect(folderNav.isStudyTask).toBe(true);
    expect(folderNav.isKnowledge).toBe(true);
    expect(folderNav.navUrl).toBe("/app/knowledge?folderId=fold-1");

    const docNav = getStudyTaskNavigation({
      source_type: "knowledge_doc",
      source_id: "doc-99",
    });
    expect(docNav.isStudyTask).toBe(true);
    expect(docNav.navUrl).toBe("/app/knowledge?docId=doc-99");

    const mmNav = getStudyTaskNavigation({
      source_type: "mindmap_folder",
      source_id: "fold-2",
    });
    expect(mmNav.isStudyTask).toBe(true);
    expect(mmNav.isMindMap).toBe(true);
    expect(mmNav.navUrl).toBe("/app/review?tab=mindmap&folderId=fold-2");

    const leitnerNav = getStudyTaskNavigation({
      source_type: "leitner",
      source_id: "all",
    });
    expect(leitnerNav.isStudyTask).toBe(true);
    expect(leitnerNav.navUrl).toBe("/app/review?tab=leitner");
    expect(leitnerNav.badgeLabelFa).toBe("مرور لایتنر");

    const scopedLeitnerNav = getStudyTaskNavigation({
      id: "task/42",
      source_type: "leitner",
      source_id: "lesson / 1",
    });
    expect(scopedLeitnerNav.navUrl).toBe("/app/review?tab=leitner&studyDocId=lesson%20%2F%201&studyTaskId=task%2F42");

    const folderLeitnerNav = getStudyTaskNavigation({
      id: "folder-review-task",
      source_type: "leitner_folder",
      source_id: "folder-cardiology",
    });
    expect(folderLeitnerNav.isStudyTask).toBe(true);
    expect(folderLeitnerNav.navUrl).toBe("/app/review?tab=leitner&studyFolderId=folder-cardiology&studyTaskId=folder-review-task");

    const noneNav = getStudyTaskNavigation({
      source_type: "cbt_thought",
      source_id: "cbt-1",
    });
    expect(noneNav.isStudyTask).toBe(false);
  });

  it("creates a leitner study task with default title", async () => {
    const res = await createStudyTask({
      userId: "u123",
      targetType: "leitner",
      targetId: "all",
      targetTitle: "کارت‌های لایتنر",
    });
    expect(res.ok).toBe(true);
    expect(res.task?.title).toBe("خواندن و مرور کارت‌های لایتنر");
    expect(res.task?.source_type).toBe("leitner");
  });

  it("creates a folder-scoped Leitner task with its explicit source type and branch target", async () => {
    const res = await createStudyTask({
      userId: "u123",
      targetType: "leitner_folder",
      targetId: "folder-cardio",
      targetTitle: "داروشناسی / قلب",
    });

    expect(res.ok).toBe(true);
    expect(res.task).toMatchObject({
      title: "خواندن و مرور کارت‌های لایتنر",
      source_type: "leitner_folder",
      source_id: "folder-cardio",
    });
  });

  it("finds the earliest next review date within the selected lesson", () => {
    expect(getNextLeitnerReviewAt([
      { document_id: "doc-7", next_review_at: "2026-09-28T09:00:00.000Z" },
      { document_id: "doc-7", next_review_at: "2026-09-27T09:00:00.000Z" },
      { document_id: "doc-8", next_review_at: "2026-09-26T09:00:00.000Z" },
      { document_id: "doc-7", next_review_at: "invalid" },
    ], "doc-7")).toBe("2026-09-27T09:00:00.000Z");
    expect(getNextLeitnerReviewAt([
      { document_id: "doc-7", next_review_at: "2026-09-28T09:00:00.000Z" },
      { document_id: "doc-8", next_review_at: "2026-09-26T09:00:00.000Z" },
    ], "all")).toBe("2026-09-26T09:00:00.000Z");
    expect(getNextLeitnerReviewAt([], "all")).toBeNull();
  });

  it("moves only the matching, active Leitner task after a completed session", async () => {
    const nextReviewAt = "2026-09-28T09:00:00.000Z";
    const result = await rescheduleLeitnerStudyTaskAfterSession({
      userId: "u123",
      taskId: "task-7",
      targetType: "leitner",
      targetId: "doc-7",
      nextReviewAt,
    });

    expect(mocks.doc).toHaveBeenCalledWith(mocks.db, "users", "u123", "tasks", "task-7");
    expect(mocks.persistTask).toHaveBeenCalledWith("u123", {
      id: "task-7",
      due_date: nextReviewAt,
      completed: false,
      status: "todo",
      completed_at: null,
    });
    expect(result).toEqual({ ok: true, status: "saved", dueDate: nextReviewAt });
  });

  it("moves a folder review task only when the linked task type and folder still match", async () => {
    const nextReviewAt = "2026-10-04T09:30:00.000Z";
    mocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ source_type: "leitner_folder", source_id: "folder-cardio", completed: false }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ source_type: "leitner", source_id: "folder-cardio", completed: false }),
      });

    const matching = await rescheduleLeitnerStudyTaskAfterSession({
      userId: "u123",
      taskId: "folder-task",
      targetType: "leitner_folder",
      targetId: "folder-cardio",
      nextReviewAt,
    });
    const mismatched = await rescheduleLeitnerStudyTaskAfterSession({
      userId: "u123",
      taskId: "legacy-doc-task",
      targetType: "leitner_folder",
      targetId: "folder-cardio",
      nextReviewAt,
    });

    expect(matching).toEqual({ ok: true, status: "saved", dueDate: nextReviewAt });
    expect(mismatched).toMatchObject({ ok: false });
    expect(mocks.persistTask).toHaveBeenCalledTimes(1);
  });

  it("does not change tasks that are unrelated, completed, or have invalid dates", async () => {
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ source_type: "knowledge_doc", source_id: "doc-7", completed: false }),
    });
    const unrelated = await rescheduleLeitnerStudyTaskAfterSession({
      userId: "u123", taskId: "task-7", targetType: "leitner", targetId: "doc-7", nextReviewAt: "2026-09-28T09:00:00.000Z",
    });
    const invalid = await rescheduleLeitnerStudyTaskAfterSession({
      userId: "u123", taskId: "task-7", targetType: "leitner", targetId: "doc-7", nextReviewAt: "not-a-date",
    });

    expect(unrelated.ok).toBe(false);
    expect(invalid.ok).toBe(false);
    expect(mocks.persistTask).not.toHaveBeenCalled();
  });

  it("recognizes document and folder Leitner tasks without treating other study tasks as Leitner", () => {
    expect(isLeitnerStudyTask({ source_type: "leitner" })).toBe(true);
    expect(isLeitnerStudyTask({ source_type: "leitner_folder" })).toBe(true);
    expect(isLeitnerStudyTask({ source_type: "knowledge_doc" })).toBe(false);
    expect(isLeitnerStudyTask({})).toBe(false);
  });

  it("recognizes document and folder Leitner tasks without treating other study tasks as Leitner", () => {
    expect(isLeitnerStudyTask({ source_type: "leitner" })).toBe(true);
    expect(isLeitnerStudyTask({ source_type: "leitner_folder" })).toBe(true);
    expect(isLeitnerStudyTask({ source_type: "knowledge_doc" })).toBe(false);
    expect(isLeitnerStudyTask({})).toBe(false);
  });

  it("validates a cached owned study task and queues its next date while offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    mocks.persistTask.mockResolvedValueOnce("queued");

    const result = await rescheduleLeitnerStudyTaskAfterSession({
      userId: "u123",
      taskId: "task-7",
      targetType: "leitner",
      targetId: "doc-7",
      nextReviewAt: "2026-09-28T09:00:00.000Z",
    });

    expect(mocks.getCachedTasks).toHaveBeenCalledWith("u123");
    expect(mocks.getDoc).not.toHaveBeenCalled();
    expect(mocks.persistTask).toHaveBeenCalledWith("u123", expect.objectContaining({
      id: "task-7",
      due_date: "2026-09-28T09:00:00.000Z",
    }));
    expect(result).toMatchObject({ ok: true, status: "queued" });
    vi.unstubAllGlobals();
  });
});
