import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ uid: "owner-1", call: vi.fn(), save: vi.fn(), load: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.uid } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/firebase", () => ({ auth: { get currentUser() { return { uid: mocks.uid }; } } }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {} }));
vi.mock("@/lib/ai", () => ({ callAI: mocks.call }));
vi.mock("@/lib/aiSettings", () => ({
  getOpConfig: () => ({ provider: "openai", model: "configured-model", apiKey: "secret" }),
  PROVIDER_INFO: { openai: { label: "OpenAI" } },
  isAIPersonalizationOptedIn: () => false, setAIPersonalizationOptedIn: vi.fn(),
}));
vi.mock("@/lib/aboutMe", () => ({
  ABOUT_SECTIONS: [{ emoji: "", title: "Answers", questions: [{ key: "goal", label: "Goal", type: "text" }] }],
  loadAboutMe: mocks.load, saveAboutMe: mocks.save, formatAboutMeForAI: () => [],
}));

import AboutMeView from "./AboutMeView";
const result = { data: { ai_analysis: { summary: "Proposed summary", themes: ["Focus"], strengths: [], risks: [] }, ai_suggestions: { folders: [], tags: [], tasks: [] } } };
const openPreview = async () => {
  await screen.findByRole("button", { name: "Next" });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Frozen goal" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("button", { name: "Run AI Analysis" });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private text" } });
  fireEvent.click(screen.getByRole("button", { name: "Run AI Analysis" }));
};

describe("About Me analysis consent", () => {
  beforeEach(() => {
    mocks.uid = "owner-1";
    mocks.load.mockReset().mockResolvedValue({ answers: {}, free_text: "" });
    mocks.save.mockReset().mockResolvedValue(undefined);
    mocks.call.mockReset().mockResolvedValue(result);
  });

  it("sends only the previewed payload after approval and saves analysis only after review", async () => {
    render(<AboutMeView />);
    await openPreview();
    expect(mocks.call).not.toHaveBeenCalled();
    expect(screen.getByText("OpenAI · configured-model")).toBeInTheDocument();
    const input = JSON.parse(screen.getByRole("dialog").querySelector("pre")!.textContent!);
    expect(screen.getByRole("dialog").textContent).not.toContain("secret");
    fireEvent.click(screen.getByRole("button", { name: "Approve & Send for Analysis" }));
    await screen.findByText("Review proposed analysis");
    expect(mocks.call).toHaveBeenCalledWith("about_me_analysis", input, undefined, undefined, "en", expect.objectContaining({ skipPersonalization: true }));
    expect(mocks.save.mock.calls.every(([, patch]) => !patch.ai_analysis)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Approve & Save Analysis" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("owner-1", expect.objectContaining({ ai_analysis: result.data.ai_analysis })));
  });

  it("cancel sends nothing and Save & Finish only saves answers", async () => {
    render(<AboutMeView />);
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Save & Finish" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("owner-1", { answers: { goal: "Frozen goal" }, free_text: "Private text" }));
    expect(mocks.call).not.toHaveBeenCalled();
  });

  it("invalidates consent on account change", async () => {
    const view = render(<AboutMeView />);
    await openPreview();
    mocks.uid = "owner-2";
    view.rerender(<AboutMeView />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.call).not.toHaveBeenCalled();
  });

  it("invalidates an unapproved preview when answers change", async () => {
    render(<AboutMeView />);
    await openPreview();
    fireEvent.change(document.querySelector("textarea")!, { target: { value: "New private text" } });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.call).not.toHaveBeenCalled();
  });

  it("rejecting a proposal never saves AI output", async () => {
    render(<AboutMeView />);
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Approve & Send for Analysis" }));
    await screen.findByText("Review proposed analysis");
    fireEvent.click(screen.getByRole("button", { name: "Reject Proposal" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.save.mock.calls.every(([, patch]) => !patch.ai_analysis)).toBe(true);
  });

  it.each(["input", "owner"])("ignores a late result after %s changes", async (change) => {
    let finish!: (value: typeof result) => void;
    mocks.call.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = render(<AboutMeView />);
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Approve & Send for Analysis" }));
    await waitFor(() => expect(mocks.call).toHaveBeenCalledOnce());
    if (change === "input") fireEvent.change(screen.getByRole("textbox"), { target: { value: "Changed text" } });
    else { mocks.uid = "owner-2"; view.rerender(<AboutMeView />); }
    await act(async () => finish(result));
    expect(screen.queryByText("Review proposed analysis")).toBeNull();
    expect(mocks.call.mock.calls[0][5].signal.aborted).toBe(true);
    expect(mocks.save.mock.calls.every(([, patch]) => !patch.ai_analysis)).toBe(true);
  });
});
