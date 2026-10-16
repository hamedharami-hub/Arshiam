import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HtmlCodeEditor } from "./HtmlCodeEditor";

const t = (_fa: string, en: string) => en;
function Editor({ initial = "<p>one</p>\n<p>two</p>", onSave = () => {} }: { initial?: string; onSave?: () => void }) {
  const [value, setValue] = useState(initial);
  return <HtmlCodeEditor value={value} onChange={setValue} onSave={onSave} t={t} />;
}
afterEach(() => vi.restoreAllMocks());
const input = () => screen.getByLabelText("Edit HTML source") as HTMLTextAreaElement;

describe("HTML code editor", () => {
  it("shows line numbers and retains an accessible LTR textarea", () => {
    const { container } = render(<Editor />);
    expect(input()).toHaveAttribute("dir", "ltr");
    expect(input()).toHaveAttribute("wrap", "off");
    const gutter = container.querySelector('[data-testid="html-code-editor"] > div[dir="ltr"] > div')!;
    expect(within(gutter as HTMLElement).getByText("1")).toBeInTheDocument();
    expect(within(gutter as HTMLElement).getByText("2")).toBeInTheDocument();
  });
  it("finds literal matches, moves between them and replaces all without regex substitution", () => {
    render(<Editor initial="one ONE one" />);
    fireEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    fireEvent.change(screen.getByLabelText("Find in code"), { target: { value: "one" } });
    fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    expect(input().selectionStart).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    expect(input().selectionStart).toBe(input().value.indexOf("ONE"));
    fireEvent.change(screen.getByLabelText("Replacement text"), { target: { value: "$&" } });
    fireEvent.click(screen.getByRole("button", { name: "Replace all" }));
    expect(input()).toHaveValue("$& $& $&");
  });
  it("respects case sensitivity and wraps backwards through matches", () => {
    render(<Editor initial="x X x" />);
    fireEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    fireEvent.change(screen.getByLabelText("Find in code"), { target: { value: "x" } });
    fireEvent.click(screen.getByLabelText("Match case"));
    fireEvent.click(screen.getByRole("button", { name: "Previous match" }));
    expect(input().selectionStart).toBe(input().value.lastIndexOf("x"));
    fireEvent.change(screen.getByLabelText("Replacement text"), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(input()).toHaveValue("x X ok");
  });
  it("supports undo/redo for code edits and keyboard shortcuts", () => {
    const save = vi.fn();
    render(<Editor initial="original" onSave={save} />);
    fireEvent.change(input(), { target: { value: "changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Undo code edit" }));
    expect(input()).toHaveValue("original");
    fireEvent.click(screen.getByRole("button", { name: "Redo code edit" }));
    expect(input()).toHaveValue("changed");
    fireEvent.keyDown(input(), { key: "z", ctrlKey: true });
    expect(input()).toHaveValue("original");
    fireEvent.keyDown(input(), { key: "z", ctrlKey: true, shiftKey: true });
    expect(input()).toHaveValue("changed");
    fireEvent.keyDown(input(), { key: "s", metaKey: true });
    expect(save).toHaveBeenCalledOnce();
  });
  it("indents and outdents a multiline selection while keeping the selection usable", async () => {
    render(<Editor initial={"a\nb\nc"} />);
    input().setSelectionRange(0, 4);
    fireEvent.keyDown(input(), { key: "Tab" });
    expect(input()).toHaveValue("  a\n  b\nc");
    await waitFor(() => expect(input().selectionEnd).toBe(8));
    fireEvent.keyDown(input(), { key: "Tab", shiftKey: true });
    expect(input()).toHaveValue("a\nb\nc");
  });
  it("opens search with Ctrl+F and navigates to a requested line", () => {
    render(<Editor initial={"first\nsecond\nthird"} />);
    input().setSelectionRange(0, 5);
    fireEvent.keyDown(input(), { key: "f", ctrlKey: true });
    expect(screen.getByLabelText("Find in code")).toHaveValue("first");
    fireEvent.click(screen.getByRole("button", { name: "Close code search" }));
    fireEvent.change(screen.getByLabelText("Line number"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to line" }));
    expect(input().selectionStart).toBe(input().value.indexOf("second"));
    expect(input()).toHaveFocus();
  });
  it("jumps to mapped runtime locations without changing code", () => {
    const value = "first\nsecond\nthird";
    render(<HtmlCodeEditor value={value} onChange={vi.fn()} onSave={vi.fn()} t={t} jumpTo={{ line: 2, column: 2, requestId: 1 }} />);
    expect(input().selectionStart).toBe(value.indexOf("second") + 1);
    expect(input()).toHaveValue(value);
  });
  it("virtualizes line numbers for large source and synchronizes scrolling", () => {
    const { container } = render(<Editor initial={"line\n".repeat(10_000)} />);
    const gutter = container.querySelector('[data-testid="html-code-editor"] > div[dir="ltr"] > div') as HTMLElement;
    expect(gutter.querySelectorAll(".absolute").length).toBeLessThan(40);
    fireEvent.scroll(input(), { target: { scrollTop: 2400 } });
    expect(gutter.scrollTop).toBe(2400);
    expect(within(gutter).queryByText("1")).not.toBeInTheDocument();
    expect(within(gutter).getByText("101")).toBeInTheDocument();
  });
});
