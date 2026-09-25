import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveLearningModal } from "./InteractiveLearningModal";

const { mockGenerateInteractiveContent } = vi.hoisted(() => ({
  mockGenerateInteractiveContent: vi.fn(),
}));

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true }) }));
vi.mock("@/lib/interactiveLearningHelper", async () => {
  const actual = await vi.importActual<typeof import("@/lib/interactiveLearningHelper")>("@/lib/interactiveLearningHelper");
  return {
    ...actual,
    attachInteractiveListeners: vi.fn(() => () => {}),
    generateInteractiveContent: mockGenerateInteractiveContent,
  };
});

describe("InteractiveLearningModal format selection", () => {
  beforeEach(() => mockGenerateInteractiveContent.mockReset());

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
  });
});
