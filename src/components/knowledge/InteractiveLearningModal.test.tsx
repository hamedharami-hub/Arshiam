import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveLearningModal } from "./InteractiveLearningModal";

const { mockGenerateInteractiveContent, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockGenerateInteractiveContent: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true }) }));
vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  },
}));
vi.mock("@/lib/interactiveLearningHelper", async () => {
  const actual = await vi.importActual<typeof import("@/lib/interactiveLearningHelper")>("@/lib/interactiveLearningHelper");
  return {
    ...actual,
    attachInteractiveListeners: vi.fn(() => () => {}),
    generateInteractiveContent: mockGenerateInteractiveContent,
  };
});

describe("InteractiveLearningModal format selection", () => {
  beforeEach(() => {
    mockGenerateInteractiveContent.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("exposes practice formats as keyboard-operable toggle buttons", () => {
    render(
      <InteractiveLearningModal
        open
        onOpenChange={vi.fn()}
        documentTitle="Sample lesson"
        documentContent="Sample source content"
        onInsertContent={vi.fn()}
      />,
    );

    const flashcards = screen.getByRole("button", { name: /3D Flip Cards/ });
    expect(flashcards).toHaveAttribute("type", "button");
    expect(flashcards).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(flashcards);
    expect(flashcards).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(flashcards);
    expect(flashcards).toHaveAttribute("aria-pressed", "true");
  });

  it("clears generated content when the source lesson changes", async () => {
    mockGenerateInteractiveContent.mockResolvedValueOnce(
      '<div class="interactive-learning-block"><div class="interactive-flip-card">First lesson</div></div>',
    );
    const firstLesson = {
      open: true,
      onOpenChange: vi.fn(),
      documentId: "doc-first",
      documentTitle: "First lesson",
      documentContent: "First source content",
      onInsertContent: vi.fn(),
      presentationMode: "standalone" as const,
      languageOverride: "en" as const,
    };
    const { rerender } = render(<InteractiveLearningModal {...firstLesson} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate Interactive Module" }));
    await waitFor(() => expect(mockGenerateInteractiveContent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: /Live Preview/ })).toBeEnabled());
    expect(screen.queryByRole("button", { name: /Copy HTML|کپی HTML/i })).not.toBeInTheDocument();

    rerender(
      <InteractiveLearningModal
        {...firstLesson}
        documentId="doc-second"
        documentTitle="Second lesson"
        documentContent="Second source content"
      />,
    );

    expect(screen.getByRole("button", { name: /Live Preview/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate Interactive Module" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Start study session" })).not.toBeInTheDocument();
  }, 15000);

  it("ignores a generation response that arrives after changing the source lesson", async () => {
    let resolveGeneration!: (html: string) => void;
    mockGenerateInteractiveContent.mockReturnValueOnce(new Promise<string>((resolve) => {
      resolveGeneration = resolve;
    }));
    const firstLesson = {
      open: true,
      onOpenChange: vi.fn(),
      documentId: "doc-first",
      documentTitle: "First lesson",
      documentContent: "First source content",
      onInsertContent: vi.fn(),
      presentationMode: "standalone" as const,
      languageOverride: "en" as const,
    };
    const { rerender } = render(<InteractiveLearningModal {...firstLesson} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate Interactive Module" }));
    await waitFor(() => expect(mockGenerateInteractiveContent).toHaveBeenCalledTimes(1));
    rerender(
      <InteractiveLearningModal
        {...firstLesson}
        documentId="doc-second"
        documentTitle="Second lesson"
        documentContent="Second source content"
      />,
    );

    await act(async () => {
      resolveGeneration('<div class="interactive-learning-block"><div class="interactive-flip-card">Stale lesson</div></div>');
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /Live Preview/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate Interactive Module" })).toBeEnabled();
    expect(screen.queryByText("Stale lesson")).not.toBeInTheDocument();
  }, 15000);

  it("passes bilingual language mode and both English and Persian fields to generator", async () => {
    mockGenerateInteractiveContent.mockResolvedValueOnce(
      '<div class="interactive-learning-block"><div class="interactive-flip-card"><div class="flip-text"><span class="flip-lang-fa">فارسی</span><span class="flip-lang-en">English</span></div></div></div>',
    );

    render(
      <InteractiveLearningModal
        open
        onOpenChange={vi.fn()}
        documentId="doc-bilingual"
        documentTitle="عنوان فارسی"
        documentContent="متن فارسی"
        documentTitleEn="English Title"
        documentContentEn="English Content"
        languageOverride="bilingual"
        onInsertContent={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Generate Interactive Module|تولید ماژول تعاملی/i }));

    await waitFor(() => {
      expect(mockGenerateInteractiveContent).toHaveBeenCalledWith(expect.objectContaining({
        language: "bilingual",
        title: "عنوان فارسی",
        content: "متن فارسی",
        titleEn: "English Title",
        contentEn: "English Content",
      }));
    });
  });

  describe("save coordination and error handling", () => {
    it("awaits async onInsertContent, displays success toast and closes modal only upon resolution", async () => {
      mockGenerateInteractiveContent.mockResolvedValueOnce(
        '<div class="interactive-learning-block"><div class="interactive-flip-card">Card</div></div>',
      );
      let resolveInsert!: () => void;
      const onInsertContent = vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        }),
      );
      const onOpenChange = vi.fn();

      render(
        <InteractiveLearningModal
          open
          onOpenChange={onOpenChange}
          documentId="doc-test"
          documentTitle="Test Title"
          documentContent="Test Content"
          onInsertContent={onInsertContent}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Generate Interactive Module" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Append to Lesson" })).toBeInTheDocument());

      const appendBtn = screen.getByRole("button", { name: "Append to Lesson" });
      fireEvent.click(appendBtn);

      expect(onInsertContent).toHaveBeenCalledTimes(1);
      expect(appendBtn).toBeDisabled();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(mockToastSuccess).not.toHaveBeenCalledWith(expect.stringContaining("Interactive widgets appended"));

      await act(async () => {
        resolveInsert();
        await Promise.resolve();
      });

      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("Interactive widgets appended"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it("keeps modal open and shows error toast when onInsertContent rejects", async () => {
      mockGenerateInteractiveContent.mockResolvedValueOnce(
        '<div class="interactive-learning-block"><div class="interactive-flip-card">Card</div></div>',
      );
      const onInsertContent = vi.fn().mockRejectedValue(new Error("Document storage update failed"));
      const onOpenChange = vi.fn();

      render(
        <InteractiveLearningModal
          open
          onOpenChange={onOpenChange}
          documentId="doc-test"
          documentTitle="Test Title"
          documentContent="Test Content"
          onInsertContent={onInsertContent}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Generate Interactive Module" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Append to Lesson" })).toBeInTheDocument());

      const appendBtn = screen.getByRole("button", { name: "Append to Lesson" });
      fireEvent.click(appendBtn);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Document storage update failed");
      });

      expect(onOpenChange).not.toHaveBeenCalled();
      expect(mockToastSuccess).not.toHaveBeenCalledWith(expect.stringContaining("Interactive widgets appended"));
      expect(appendBtn).toBeEnabled();
    });

    it("supports synchronous onInsertContent in standalone mode without error", async () => {
      mockGenerateInteractiveContent.mockResolvedValueOnce(
        '<div class="interactive-learning-block"><div class="interactive-flip-card">Card</div></div>',
      );
      const onInsertContent = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <InteractiveLearningModal
          open
          onOpenChange={onOpenChange}
          documentId="doc-test"
          documentTitle="Test Title"
          documentContent="Test Content"
          onInsertContent={onInsertContent}
          presentationMode="standalone"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Generate Interactive Module" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Start study session" })).toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: "Start study session" }));

      await waitFor(() => {
        expect(onInsertContent).toHaveBeenCalledTimes(1);
        expect(mockToastSuccess).toHaveBeenCalledWith("Interactive study session is ready.");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
