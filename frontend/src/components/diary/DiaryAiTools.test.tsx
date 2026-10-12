import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { aiMock, auth } = vi.hoisted(() => ({ aiMock: vi.fn(), auth: { uid: "owner-1" } }));

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/ai", () => ({ callAI: aiMock, getAILanguage: () => "en" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: auth.uid } }) }));

import { DiaryAiTools } from "./DiaryAiTools";

const openImprove = async () => {
  fireEvent.keyDown(screen.getByRole("button", { name: "Writing assistant" }), { key: "Enter" });
  const item = await screen.findByRole("menuitem", { name: "Polish the writing, keep my voice" });
  await act(async () => { fireEvent.click(item); });
};

const tools = (entryId: string, content: string, onApplyContent: (markdown: string) => void, revision = 0) => (
  <DiaryAiTools entryId={entryId} revision={revision} content={content} title="" onApplyContent={onApplyContent} onApplyTitle={() => {}} />
);

describe("DiaryAiTools entry/revision scoping", () => {
  beforeEach(() => { aiMock.mockReset(); auth.uid = "owner-1"; });

  it("reviews a title before Apply and rejects it after a title edit", async () => {
    aiMock.mockResolvedValue({ text: '"A new title"' });
    const applyTitle = vi.fn();
    const props = { entryId: "entry-1", revision: 0, content: "hello world", title: "Old title", onApplyContent: vi.fn(), onApplyTitle: applyTitle };
    const rendered = render(<DiaryAiTools {...props} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Writing assistant" }), { key: "Enter" });
    fireEvent.click(await screen.findByTestId("diary-ai-title"));
    expect(await screen.findByTestId("diary-ai-proposal")).toHaveTextContent("A new title");
    expect(applyTitle).not.toHaveBeenCalled();
    rendered.rerender(<DiaryAiTools {...props} title="My edited title" />);
    expect(screen.queryByTestId("diary-ai-proposal")).toBeNull();
    expect(applyTitle).not.toHaveBeenCalled();
  });

  it("applies a title only on approval and offers scoped title undo", async () => {
    aiMock.mockResolvedValue({ text: '"A new title"' });
    const applyTitle = vi.fn();
    const props = { entryId: "entry-1", revision: 0, content: "hello world", title: "Old title", onApplyContent: vi.fn(), onApplyTitle: applyTitle };
    const rendered = render(<DiaryAiTools {...props} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Writing assistant" }), { key: "Enter" });
    fireEvent.click(await screen.findByTestId("diary-ai-title"));
    fireEvent.click(await screen.findByTestId("diary-ai-apply"));
    expect(applyTitle).toHaveBeenCalledWith("A new title");
    rendered.rerender(<DiaryAiTools {...props} title="A new title" revision={1} />);
    fireEvent.click(screen.getByTestId("diary-ai-undo"));
    expect(applyTitle).toHaveBeenLastCalledWith("Old title");
  });

  it("ignores a pending title result after switching owner even with the same entry and revision", async () => {
    let resolve!: (value: { text: string }) => void;
    aiMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    const applyTitle = vi.fn();
    const props = { entryId: "entry-1", revision: 0, content: "hello world", title: "", onApplyContent: vi.fn(), onApplyTitle: applyTitle };
    const rendered = render(<DiaryAiTools {...props} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Writing assistant" }), { key: "Enter" });
    fireEvent.click(await screen.findByTestId("diary-ai-title"));
    auth.uid = "owner-2";
    rendered.rerender(<DiaryAiTools {...props} />);
    await act(async () => resolve({ text: "Private title" }));
    expect(applyTitle).not.toHaveBeenCalled();
    expect(screen.queryByTestId("diary-ai-proposal")).toBeNull();
  });

  it("ignores an AI result that resolves after the open entry switched", async () => {
    aiMock.mockResolvedValue({ text: "polished" });
    const onApplyContent = vi.fn();
    const rendered = render(tools("entry-1", "hello world", onApplyContent));
    fireEvent.keyDown(screen.getByRole("button", { name: "Writing assistant" }), { key: "Enter" });
    const item = await screen.findByRole("menuitem", { name: "Polish the writing, keep my voice" });

    // The request starts and the user switches entries before it resolves.
    await act(async () => {
      fireEvent.click(item);
      rendered.rerender(tools("entry-2", "another entry", onApplyContent));
    });

    expect(onApplyContent).not.toHaveBeenCalled();
    expect(screen.queryByTestId("diary-ai-proposal")).toBeNull();
  });

  it("offers a reviewable proposal instead of applying immediately, and undo restores the scoped base", async () => {
    aiMock.mockResolvedValue({ text: "polished" });
    const onApplyContent = vi.fn();
    const rendered = render(tools("entry-1", "hello world", onApplyContent));
    await openImprove();

    expect(onApplyContent).not.toHaveBeenCalled();
    expect(await screen.findByTestId("diary-ai-proposal")).toHaveTextContent("polished");

    fireEvent.click(screen.getByTestId("diary-ai-apply"));
    expect(onApplyContent).toHaveBeenCalledWith("polished");

    // The parent applies the content; undo restores the exact previous text.
    rendered.rerender(tools("entry-1", "polished", onApplyContent));
    fireEvent.click(await screen.findByTestId("diary-ai-undo"));
    expect(onApplyContent).toHaveBeenLastCalledWith("hello world");
  });

  it("hides undo once the entry content is edited", async () => {
    aiMock.mockResolvedValue({ text: "polished" });
    const onApplyContent = vi.fn();
    const rendered = render(tools("entry-1", "hello world", onApplyContent));
    await openImprove();
    fireEvent.click(await screen.findByTestId("diary-ai-apply"));

    rendered.rerender(tools("entry-1", "polished", onApplyContent));
    expect(await screen.findByTestId("diary-ai-undo")).toBeInTheDocument();

    rendered.rerender(tools("entry-1", "polished edited", onApplyContent));
    expect(screen.queryByTestId("diary-ai-undo")).toBeNull();
  });
});
