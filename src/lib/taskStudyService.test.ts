import { describe, it, expect, vi } from "vitest";
import { createStudyTask, getStudyTaskNavigation } from "./taskStudyService";

vi.mock("@/lib/firestoreDataService", () => ({
  upsertTask: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/taskKnowledgeService", () => ({
  linkTaskToDocument: vi.fn().mockResolvedValue(true),
}));

describe("taskStudyService", () => {
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
});
