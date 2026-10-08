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
  it("publishes selected note text and clears it when the selection collapses", async () => {
    const onSelectedTextChange = vi.fn();
    render(<RichEditor initialMarkdown="Select these words" showVoiceButton={false} onSelectedTextChange={onSelectedTextChange} />);
    await waitFor(() => expect(observed.editor).not.toBeNull());
    act(() => { observed.editor!.commands.setTextSelection({ from: 1, to: 7 }); });
    expect(onSelectedTextChange).toHaveBeenLastCalledWith("Select");
    act(() => { observed.editor!.commands.setTextSelection(1); });
    expect(onSelectedTextChange).toHaveBeenLastCalledWith("");
  });

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

  it("keeps legacy tables, YouTube embeds, and base64 images after an edit and Markdown save", async () => {
    const ref = createRef<RichEditorHandle>();
    const legacyHtml = '<p>Before the legacy content</p><table class="legacy-grid" style="width: 420px"><thead><tr><th scope="col" style="color: red">Step</th><th>Owner</th></tr></thead><tbody><tr><td rowspan="2">Review</td><td>Sam</td></tr><tr><td><strong>Rae</strong></td></tr></tbody></table><div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/abc123" title="Legacy video" width="640" height="360"></iframe></div><p><img alt="old scan" src="data:image/png;base64,aGVsbG8="></p>';
    const first = render(<RichEditor ref={ref} initialHtml={legacyHtml} showVoiceButton={false} />);

    await waitFor(() => expect(ref.current?.getHtml()).toContain("legacy-grid"));
    const loaded = ref.current!.getHtml();
    const loadedHtml = document.createElement("div");
    loadedHtml.innerHTML = loaded;
    expect(loaded).toContain("scope=\"col\"");
    expect(loaded).toContain("<th");
    expect(loaded).toContain("rowspan=\"2\"");
    expect(loadedHtml.querySelector("table")?.style.width).toBe("420px");
    expect(loadedHtml.querySelector("th")?.style.color).toBe("red");
    expect(loaded).toContain("data-youtube-video");
    expect(loaded).toContain("abc123");
    expect(loaded).toContain('title="Legacy video"');
    expect(loaded).toContain("data:image/png;base64,aGVsbG8=");

    act(() => {
      observed.editor!.commands.setTextSelection(1);
      observed.editor!.commands.insertContent("Edited ");
    });
    const saved = ref.current!.getMarkdown();
    expect(saved).toContain("Edited");
    expect(saved).toContain('<table class="legacy-grid"');
    expect(saved).toContain("data-youtube-video");
    expect(saved).toContain("data:image/png;base64,aGVsbG8=");

    first.unmount();
    const reopened = createRef<RichEditorHandle>();
    render(<RichEditor ref={reopened} initialMarkdown={saved} showVoiceButton={false} />);
    await waitFor(() => expect(reopened.current?.getHtml()).toContain("legacy-grid"));
    const roundTrip = reopened.current!.getHtml();
    expect(roundTrip).toContain("scope=\"col\"");
    expect(roundTrip).toContain("Review");
    expect(roundTrip).toContain("abc123");
    expect(roundTrip).toContain('title="Legacy video"');
    expect(roundTrip).toContain("data:image/png;base64,aGVsbG8=");
  });

  it("keeps inline code and code blocks explicitly left-to-right", async () => {
    const ref = createRef<RichEditorHandle>();
    render(<RichEditor ref={ref} initialMarkdown={'Persian `let value = 1;`\n\n```js\nconst result = 2;\n```'} showVoiceButton={false} />);
    await waitFor(() => expect(ref.current?.getHtml()).toContain("let value"));
    expect(ref.current?.getHtml()).toContain('<code dir="ltr">');
    expect(ref.current?.getHtml()).toContain('<pre dir="ltr">');
  });
});
