import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SelectionActionToolbar } from "./SelectionActionToolbar";
vi.mock("@/lib/ai", () => ({ callAI: vi.fn(), getAILanguage: () => "en" }));

function TaskText() {
  const [text, setText] = useState("Choose this text");
  return <div role="dialog"><div data-rich-selection><textarea aria-label="Text" value={text} onChange={event => setText(event.target.value)} /></div><SelectionActionToolbar /></div>;
}

describe("selection toolbar target", () => {
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
