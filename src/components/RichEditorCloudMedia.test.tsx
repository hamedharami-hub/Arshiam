import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RichEditor, type RichEditorHandle } from "./RichEditor";
import type { UploadedMedia } from "@/lib/uploadMedia";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/lib/uploadMedia", () => ({ uploadMediaFull: mocks.upload }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/ai", () => ({ callAI: vi.fn(), getAILanguage: () => "en" }));
const media: UploadedMedia = { url: "https://example.test/private-file", path: "users/owner/task-attachments/note-media/file", name: '<img src=x onerror="alert(1)">.pdf', kind: "file", mime: "application/pdf", size: 100 };
beforeEach(() => {
  mocks.upload.mockReset();
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }) });
});
describe("inline cloud attachment editor", () => {
  it("inserts a file with an escaped filename and reports metadata after upload", async () => {
    mocks.upload.mockResolvedValue(media);
    const uploaded = vi.fn(); const ref = createRef<RichEditorHandle>();
    render(<RichEditor ref={ref} initialHtml="<p>A memory</p>" attachmentScopeId="entry-1" onAttachmentUploaded={uploaded} showVoiceButton={false} />);
    await waitFor(() => expect(ref.current?.getHtml()).toContain("A memory"));
    fireEvent.change(screen.getByLabelText("Choose an attachment to insert in the text"), { target: { files: [new File(["file"], "file.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(uploaded).toHaveBeenCalledWith(media));
    expect(ref.current?.getHtml()).toContain("&lt;img");
    expect(document.querySelector('.tiptap img[src="x"]')).toBeNull();
    expect(document.querySelector('.tiptap a')).toHaveAttribute("href", media.url);
  });
  it("does not insert a late upload into a different entry", async () => {
    let finish!: (value: UploadedMedia) => void;
    mocks.upload.mockImplementation(() => new Promise<UploadedMedia>(resolve => { finish = resolve; }));
    const uploaded = vi.fn(); const ref = createRef<RichEditorHandle>();
    const view = render(<RichEditor ref={ref} attachmentScopeId="entry-1" onAttachmentUploaded={uploaded} showVoiceButton={false} />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    fireEvent.change(screen.getByLabelText("Choose an attachment to insert in the text"), { target: { files: [new File(["file"], "file.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    view.rerender(<RichEditor ref={ref} attachmentScopeId="entry-2" onAttachmentUploaded={uploaded} showVoiceButton={false} />);
    await act(async () => finish(media));
    expect(uploaded).not.toHaveBeenCalled();
    expect(ref.current?.getHtml()).not.toContain("private-file");
  });
});
