import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectionActionToolbar } from "./SelectionActionToolbar";
vi.mock("@/lib/ai", () => ({ callAI: vi.fn(), getAILanguage: () => "en" }));
afterEach(() => vi.unstubAllGlobals());

function TaskText() {
  const [text, setText] = useState("Choose this text");
  return <div role="dialog"><div data-rich-selection><textarea aria-label="Text" value={text} onChange={event => setText(event.target.value)} /></div><SelectionActionToolbar /></div>;
}

describe("selection toolbar target", () => {
  it("constrains the toolbar to the visual viewport when the keyboard reduces available space", async () => {
    vi.stubGlobal("visualViewport", { width: 240, height: 300, offsetLeft: 10, offsetTop: 20, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<TaskText />);
    const field = screen.getByLabelText("Text") as HTMLTextAreaElement;
    field.focus(); field.setSelectionRange(0, 6);
    fireEvent(document, new Event("selectionchange"));
    const toolbar = await screen.findByRole("toolbar", { name: "Selected text actions" });
    expect(toolbar.style.maxWidth).toBe("224px");
    expect(Number.parseFloat(toolbar.style.top)).toBeGreaterThanOrEqual(28);
    expect(toolbar).toHaveClass("flex-wrap");
  });
  it("formats the saved textarea range after focus moves and remains inside its modal", async () => {
    render(<TaskText />);
    const field = screen.getByLabelText("Text") as HTMLTextAreaElement;
    field.focus(); field.setSelectionRange(0, 6);
    fireEvent(document, new Event("selectionchange"));
    const bold = await screen.findByTitle("Bold");
    expect(screen.getByRole("dialog")).toContainElement(bold);
    field.blur();
    fireEvent.click(bold);
    await waitFor(() => expect(field).toHaveValue("**Choose** this text"));
  });
  it("does not replace the wrong text if a pending selection was edited", async () => {
    render(<TaskText />);
    const field = screen.getByLabelText("Text") as HTMLTextAreaElement;
    field.focus(); field.setSelectionRange(0, 6);
    fireEvent(document, new Event("selectionchange"));
    const bold = await screen.findByTitle("Bold");
    fireEvent.change(field, { target: { value: "Changed content" } });
    fireEvent.click(bold);
    expect(field).toHaveValue("Changed content");
  });
});
