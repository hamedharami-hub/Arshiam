import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveLearningModal } from "./InteractiveLearningModal";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true }) }));

describe("InteractiveLearningModal format selection", () => {
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
});
