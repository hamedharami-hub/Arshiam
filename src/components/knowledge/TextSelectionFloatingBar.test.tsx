import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    expect(screen.queryByTitle(/کپی/i)).not.toBeInTheDocument();
  });

  it("2. shows actions when text is selected and handles copy", async () => {
    const onAddToNote = vi.fn();
    const onAddToTask = vi.fn();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

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
        onAddToNote={onAddToNote}
        onAddToTask={onAddToTask}
      />
    );

    // Trigger selection check via mouseup
    fireEvent.mouseUp(document);

    // Wait for debounce timer
    await new Promise((r) => setTimeout(r, 100));

    // Elements should now be visible
    const copyBtns = screen.getAllByTitle(/کپی/i);
    expect(copyBtns.length).toBeGreaterThan(0);

    fireEvent.click(copyBtns[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Fluoxetine 20mg");
  });
});
