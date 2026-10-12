import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ai: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/ai", () => ({ callAI: mocks.ai }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner-1" } }) }));
vi.mock("@/components/AngelCompanion", () => ({ MascotCharacter: () => null }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));
import FolderAIChat from "./FolderAIChat";

describe("Folder chat payload scope", () => {
  const originalScrollTo = HTMLElement.prototype.scrollTo;
  afterEach(() => { HTMLElement.prototype.scrollTo = originalScrollTo; vi.unstubAllGlobals(); });
  beforeEach(() => {
    mocks.ai.mockReset().mockResolvedValue({ text: "Next question" });
    mocks.from.mockReset();
    HTMLElement.prototype.scrollTo = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  });

  it("disables personalization and excludes task reads by default", async () => {
    render(<FolderAIChat open onOpenChange={() => {}} folderId="folder-1" folderName="Project" />);
    fireEvent.click(screen.getByRole("button", { name: /لیست ساده/ }));
    fireEvent.change(screen.getByPlaceholderText("پاسخ به سوال AI…"), { target: { value: "Plan my project" } });
    fireEvent.click(screen.getByRole("button", { name: "ارسال" }));
    await waitFor(() => expect(mocks.ai).toHaveBeenCalledTimes(1));
    expect(mocks.ai.mock.calls[0][5]).toEqual(expect.objectContaining({ skipPersonalization: true }));
    expect(JSON.parse(mocks.ai.mock.calls[0][2])).toEqual(expect.objectContaining({ projectName: "Project", folderTasks: null }));
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
