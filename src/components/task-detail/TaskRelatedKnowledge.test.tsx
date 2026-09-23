import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskRelatedKnowledge } from "./TaskRelatedKnowledge";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

vi.mock("./TaskKnowledgeReaderDialog", () => ({
  TaskKnowledgeReaderDialog: ({ open, document }: { open: boolean; document: any }) =>
    open ? <div data-testid="reader-dialog">{document?.title}</div> : null,
}));

describe("TaskRelatedKnowledge", () => {
  const mockDocs: KnowledgeDocument[] = [
    {
      id: "doc-1",
      user_id: "user-1",
      folder_id: "f-1",
      title: "راهنمای داروی فلوکستین",
      content_html: "<p>اطلاعات دارویی</p>",
      content_plain: "اطلاعات دارویی",
      tags: ["SSRI"],
      is_pinned: false,
      is_archived: false,
      read_count: 0,
      created_at: "2026-09-23T10:00:00.000Z",
      updated_at: "2026-09-23T10:00:00.000Z",
    },
    {
      id: "doc-2",
      user_id: "user-1",
      folder_id: "f-1",
      title: "پروتکل مدیریت استرس",
      content_html: "<p>مراحل تنفس عمیق</p>",
      content_plain: "مراحل تنفس عمیق",
      tags: ["CBT"],
      is_pinned: false,
      is_archived: false,
      read_count: 0,
      created_at: "2026-09-23T10:00:00.000Z",
      updated_at: "2026-09-23T10:00:00.000Z",
    },
  ];

  it("renders nothing when documents list is empty", () => {
    const { container } = render(
      <TaskRelatedKnowledge documents={[]} onOpenLinkModal={vi.fn()} onUnlink={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders list of linked documents with count badge", () => {
    render(
      <TaskRelatedKnowledge documents={mockDocs} onOpenLinkModal={vi.fn()} onUnlink={vi.fn()} />
    );
    expect(screen.getByText("اسناد آموزشی و بالینی مرتبط")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("راهنمای داروی فلوکستین")).toBeDefined();
    expect(screen.getByText("پروتکل مدیریت استرس")).toBeDefined();
  });

  it("triggers onOpenLinkModal when Link Guide button is clicked", () => {
    const onOpenLinkModal = vi.fn();
    render(
      <TaskRelatedKnowledge documents={mockDocs} onOpenLinkModal={onOpenLinkModal} onUnlink={vi.fn()} />
    );
    fireEvent.click(screen.getByText("اتصال سند"));
    expect(onOpenLinkModal).toHaveBeenCalledOnce();
  });

  it("triggers onUnlink with docId when unlink button is clicked", () => {
    const onUnlink = vi.fn();
    render(
      <TaskRelatedKnowledge documents={mockDocs} onOpenLinkModal={vi.fn()} onUnlink={onUnlink} />
    );
    const unlinkButtons = screen.getAllByTitle("قطع ارتباط");
    fireEvent.click(unlinkButtons[0]);
    expect(onUnlink).toHaveBeenCalledWith("doc-1");
  });

  it("opens in-task reader dialog when clicking a document card", () => {
    render(
      <TaskRelatedKnowledge documents={mockDocs} onOpenLinkModal={vi.fn()} onUnlink={vi.fn()} />
    );
    expect(screen.queryByTestId("reader-dialog")).toBeNull();
    fireEvent.click(screen.getByText("راهنمای داروی فلوکستین"));
    expect(screen.getByTestId("reader-dialog")).toBeDefined();
    expect(screen.getAllByText("راهنمای داروی فلوکستین").length).toBeGreaterThanOrEqual(2);
  });
});
