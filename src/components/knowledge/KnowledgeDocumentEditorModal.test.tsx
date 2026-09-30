import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeDocumentEditorModal } from "./KnowledgeDocumentEditorModal";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";

type EditorSaveData = {
  folder_id: string | null;
  title: string;
  title_en?: string;
  content_html: string;
  content_en?: string;
  tags: string[];
  source_url?: string;
  content_review_status?: KnowledgeDocument["content_review_status"];
  content_review_evidence?: KnowledgeDocument["content_review_evidence"];
};

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: false }) }));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: vi.fn(), info: vi.fn() },
}));

describe("KnowledgeDocumentEditorModal review evidence", () => {
  beforeEach(() => mocks.toastError.mockReset());

  const baseDocument: KnowledgeDocument = {
    id: "doc-review-test",
    user_id: "user-review-test",
    folder_id: null,
    title: "سناریوی آموزشی",
    content_html: "<p>متن درس</p>",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  function renderEditor(document: KnowledgeDocument, onSave = vi.fn(async (_data: EditorSaveData) => {})) {
    render(
      <KnowledgeDocumentEditorModal
        open
        onOpenChange={vi.fn()}
        document={document}
        initialFolderId={null}
        folders={[]}
        onSave={onSave}
      />
    );
    return onSave;
  }

  it("blocks a reviewed status until required review metadata and an HTTPS source are complete", async () => {
    const onSave = renderEditor(baseDocument);
    fireEvent.click(screen.getByText("وضعیت بازبینی و شواهد منابع"));
    fireEvent.change(screen.getByRole("combobox", { name: "وضعیت بازبینی" }), {
      target: { value: "reviewed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره سند" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      expect.stringContaining("برای ثبت بازبینی"),
    ));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves complete review evidence and preserves the reviewer/source caveat", async () => {
    const onSave = renderEditor(baseDocument);
    fireEvent.click(screen.getByText("وضعیت بازبینی و شواهد منابع"));
    fireEvent.change(screen.getByRole("combobox", { name: "وضعیت بازبینی" }), {
      target: { value: "reviewed" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "نقش بازبین" }), {
      target: { value: "داروساز ثبت‌شده" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "حوزهٔ قضایی" }), {
      target: { value: "NSW, Australia" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "دامنهٔ بازبینی" }), {
      target: { value: "Clinical triage" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "عنوان منبع 1" }), {
      target: { value: "Example primary source" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "نشانی HTTPS منبع 1" }), {
      target: { value: "https://example.org/clinical-guide" },
    });
    expect(screen.getByText(/به‌روز بودن مرجع را مستقلاً تأیید نمی‌کند/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ذخیره سند" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      content_review_status: "reviewed",
      content_review_evidence: expect.objectContaining({
        reviewer_role: "داروساز ثبت‌شده",
        jurisdiction: "NSW, Australia",
        scope: "Clinical triage",
        references: [expect.objectContaining({
          title: "Example primary source",
          url: "https://example.org/clinical-guide",
        })],
      }),
    })));
  });

  it("does not rewrite legacy review fields when they were not edited", async () => {
    const onSave = renderEditor({
      ...baseDocument,
      content_review_status: "reviewed",
    });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره سند" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("content_review_status");
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("content_review_evidence");
  });
});
