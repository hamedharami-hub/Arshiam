import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { aiMock } = vi.hoisted(() => ({ aiMock: vi.fn() }));

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/ai", () => ({ callAI: aiMock, getAILanguage: () => "en" }));

import { DiaryAiTools } from "./DiaryAiTools";

const openImprove = async () => {
  fireEvent.keyDown(screen.getByRole("button", { name: "Writing assistant" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Polish the writing, keep my voice" }));
};

const tools = (entryId: string, content: string, onApplyContent: (markdown: string) => void, revision = 0) => (
  <DiaryAiTools entryId={entryId} revision={revision} content={content} title="" onApplyContent={onApplyContent} onApplyTitle={() => {}} />
);

describe("DiaryAiTools entry/revision scoping", () => {
  beforeEach(() => aiMock.mockReset());

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
