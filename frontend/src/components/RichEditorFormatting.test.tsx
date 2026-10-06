import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { RichEditor, type RichEditorHandle } from "./RichEditor";

const observed = vi.hoisted(() => ({ editor: null as Editor | null }));
vi.mock("@tiptap/react", async importOriginal => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  return { ...actual, useEditor: (...args: Parameters<typeof actual.useEditor>) => { const editor = actual.useEditor(...args); observed.editor = editor; return editor; } };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/ai", () => ({ callAI: vi.fn(), getAILanguage: () => "en" }));
vi.mock("@/components/VoiceInputButton", () => ({ VoiceInputButton: () => null }));
beforeEach(() => {
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }) });
});

describe("rich formatting selection", () => {
  it("keeps selected text on toolbar press and persists formatting through markdown", async () => {
    const ref = createRef<RichEditorHandle>();
    const view = render(<RichEditor ref={ref} initialMarkdown="Select these words" showVoiceButton={false} />);
    await waitFor(() => expect(observed.editor).not.toBeNull());
    act(() => { observed.editor!.commands.setTextSelection({ from: 1, to: 7 }); });
    const bold = within(screen.getByTestId("rich-editor-toolbar")).getByRole("button", { name: "Bold" });
    const press = createEvent.mouseDown(bold, { bubbles: true, cancelable: true });
    fireEvent(bold, press);
    expect(press.defaultPrevented).toBe(true);
    fireEvent.click(bold);
    expect(ref.current?.getHtml()).toContain("<strong>Select</strong> these words");
    const saved = ref.current!.getMarkdown();
    view.unmount();
    const reopened = createRef<RichEditorHandle>();
    render(<RichEditor ref={reopened} initialMarkdown={saved} showVoiceButton={false} />);
    await waitFor(() => expect(reopened.current?.getHtml()).toContain("<strong>Select</strong>"));
  });
  it("restores original selection after a modal link takes focus", async () => {
    const ref = createRef<RichEditorHandle>();
    render(<RichEditor ref={ref} initialMarkdown="Select these words" showVoiceButton={false} />);
    await waitFor(() => expect(observed.editor).not.toBeNull());
    act(() => { observed.editor!.chain().focus().setTextSelection({ from: 1, to: 7 }).run(); });
    const selectionToolbar = await screen.findByRole("toolbar", { name: "Selection formatting", hidden: true });
    fireEvent.click(within(selectionToolbar).getByLabelText("Link"));
    fireEvent.change(screen.getByTestId("link-dialog-url"), { target: { value: "https://example.test" } });
    act(() => { observed.editor!.commands.setTextSelection(19); });
    fireEvent.click(screen.getByTestId("link-dialog-submit"));
    expect(ref.current?.getHtml()).toMatch(/<a [^>]*href="https:\/\/example.test\/"[^>]*>Select<\/a> these words/);
  });
});
