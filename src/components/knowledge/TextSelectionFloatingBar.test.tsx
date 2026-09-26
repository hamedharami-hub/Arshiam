import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TextSelectionFloatingBar } from "./TextSelectionFloatingBar";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

describe("TextSelectionFloatingBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. does not render when no text is selected", () => {
    render(<TextSelectionFloatingBar />);
    expect(screen.queryByRole("button", { name: /copy|کپی/i })).not.toBeInTheDocument();
  });

  it("shows only the requested AI action when text is selected", async () => {
    const onGenerateQuestions = vi.fn();

    // Mock window.getSelection
    window.getSelection = vi.fn().mockReturnValue({
      isCollapsed: false,
      toString: () => "Fluoxetine 20mg",
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          top: 100,
          left: 200,
          width: 50,
          height: 20,
        }),
      }),
      removeAllRanges: vi.fn(),
    });

    render(
      <TextSelectionFloatingBar
        onGenerateQuestions={onGenerateQuestions}
      />
    );

    // Trigger selection check via mouseup wrapped in act
    await act(async () => {
      fireEvent.mouseUp(document);
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.queryByRole("button", { name: /copy|کپی/i })).not.toBeInTheDocument();

    const aiBtns = screen.getAllByTitle(/تولید کارت‌های لایتنر/i);
    expect(aiBtns.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(aiBtns[0]);
    });
    expect(onGenerateQuestions).toHaveBeenCalledWith("Fluoxetine 20mg");
  });
});
