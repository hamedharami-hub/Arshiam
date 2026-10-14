import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import NeedsSessionView from "./NeedsSessionView";
import NeedsMyView from "./NeedsMyView";
import { workspaceDraftKey } from "@/lib/mind/workspaceDraft";
import type { NeedsResult, NeedsSession } from "@/lib/needs/types";

const mocks = vi.hoisted(() => ({ owner: "A", save: vi.fn(), result: vi.fn(), local: vi.fn(), questions: vi.fn(), suggest: vi.fn(), convert: vi.fn(), subscribe: vi.fn(), remove: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.owner } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/aiSettings", () => ({ getOpConfig: () => ({ provider: "test-provider", model: "test-model" }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/needs/NeedsBits", () => ({ Back: ({ to, label }: { to: string; label: string }) => <Link to={to}>{label}</Link>, SafetyNotice: () => null, MethodCard: () => null, PackSection: () => null, checkInfo: () => null }));
vi.mock("@/lib/needs/service", () => ({
  hasAI: () => true, localResult: mocks.local, makeQuestions: mocks.questions, makeResult: mocks.result, suggestTopics: mocks.suggest,
  saveSession: mocks.save, subscribeSessions: mocks.subscribe, deleteSession: mocks.remove,
  convertSuggestion: mocks.convert, needsDestinationId: (id: string, suggestion: string, kind: string) => `${kind}-${id}-${suggestion}`,
  needsSafetyNotice: () => false, newSessionId: () => "stable-session",
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
const result: NeedsResult = { summary: "Local guidance", causes: [], suggestions: [{ id: "step", text: "Small public step", kind: "task" }, { id: "habit", text: "Reflect", kind: "habit" }], methodIds: [], reflections: [], checkIds: [], source: "local" };
const saved: NeedsSession = { id: "saved", category: "unknown", topic: null, detail: null, text: "Saved private text", qa: [], questions: [], result: null, lang: "en", created_at: "2026-10-15", updated_at: "2026-10-15" };
function page(path = "/app/mind/session/new") {
  return <MemoryRouter initialEntries={[path]}><Link to="/app/mind/session/new?cat=mood">Change query</Link><Link to="/app/mind/session/saved">Change session</Link><Routes><Route path="/app/mind/session/:id" element={<NeedsSessionView />} /><Route path="/app/mind/my-needs" element={<NeedsMyView />} /></Routes></MemoryRouter>;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
async function shortResult() {
  fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Private writing" } });
  fireEvent.click(screen.getByTestId("needs-continue"));
  await screen.findByTestId("needs-result");
  await act(async () => {});
}

describe("Needs owner-scoped workspace", () => {
  beforeEach(() => {
    localStorage.clear(); mocks.owner = "A";
    mocks.save.mockReset().mockResolvedValue(true); mocks.result.mockReset().mockResolvedValue(result);
    mocks.local.mockReset().mockReturnValue({ ...result, suggestions: [{ id: "local-small", text: "One small library instruction", reason: "Low-capacity local idea, not a diagnosis", kind: "note", methodId: "grounding", source: "local" }] });
    mocks.questions.mockReset().mockResolvedValue(["Optional question one", "Optional question two"]);
    mocks.suggest.mockReset().mockResolvedValue([]); mocks.convert.mockReset().mockResolvedValue(true);
    mocks.subscribe.mockReset().mockReturnValue(vi.fn()); mocks.remove.mockReset().mockResolvedValue(true);
    mocks.success.mockReset(); mocks.error.mockReset(); vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("restores all writing, mode and intensity after refresh and isolates A→B→A", () => {
    const view = render(page());
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "A private draft" } });
    fireEvent.click(screen.getByRole("radio", { name: "Explore more" }));
    mocks.owner = "B"; view.rerender(page()); expect(screen.getByTestId("needs-text")).toHaveValue("");
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "B private draft" } });
    mocks.owner = "A"; view.rerender(page());
    expect(screen.getByTestId("needs-text")).toHaveValue("A private draft");
    expect(screen.getByRole("radio", { name: "Explore more" })).toBeChecked();
    view.unmount(); render(page()); expect(screen.getByTestId("needs-text")).toHaveValue("A private draft");
  });

  it("remounts for query/session identities without leaking an earlier draft", async () => {
    render(page()); fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Original query text" } });
    fireEvent.click(screen.getByText("Change query")); expect(screen.getByTestId("needs-text")).toHaveValue("");
    fireEvent.click(screen.getByText("Change session"));
    await act(async () => mocks.subscribe.mock.calls[0][1]([saved]));
    expect(screen.getByTestId("needs-text")).toHaveValue(saved.text);
  });

  it("short mode has no required category/question, defaults local and can finish without a task", async () => {
    render(page()); await shortResult();
    expect(mocks.questions).not.toHaveBeenCalled(); expect(mocks.suggest).not.toHaveBeenCalled();
    expect(mocks.result.mock.calls[0][1]).toMatchObject({ useAI: false });
    expect(window.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("needs-finish")); await act(async () => {});
    expect(mocks.save).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(workspaceDraftKey("A", "needs:new:"))!).value.s).toMatchObject({ finished: true });
    expect(mocks.convert).not.toHaveBeenCalled();
  });

  it("keeps calculated guidance on account-save failure and retries the same session", async () => {
    mocks.save.mockResolvedValueOnce(false); render(page()); await shortResult();
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save / retry account saving" })); await act(async () => {});
    expect(screen.getByTestId("needs-save-status")).toHaveTextContent("Account saving failed");
    expect(screen.getByTestId("needs-result")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save / retry account saving" })); await act(async () => {});
    expect(mocks.save.mock.calls[0][1].id).toBe(mocks.save.mock.calls[1][1].id);
    expect(screen.getByTestId("needs-save-status")).toHaveTextContent("This version is saved to your account");
  });

  it("does not report an old save as success for newer text", async () => {
    const pending = deferred<boolean>(); mocks.save.mockReturnValueOnce(pending.promise);
    render(page()); fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Old text" } });
    fireEvent.click(screen.getByRole("button", { name: "Save / retry account saving" })); await act(async () => {});
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Newer text" } });
    await act(async () => pending.resolve(true));
    expect(screen.getByTestId("needs-text")).toHaveValue("Newer text");
    expect(screen.getByTestId("needs-save-status")).not.toHaveTextContent("This version is saved to your account");
  });

  it("requires service/fields consent and ignores AI after cancellation and account changes", async () => {
    const pending = deferred<NeedsResult>(); mocks.result.mockReturnValueOnce(pending.promise);
    const view = render(page());
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Private AI draft" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Use AI/ }));
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByTestId("needs-continue")); expect(mocks.result).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("needs-continue"));
    expect(window.confirm).toHaveBeenLastCalledWith(expect.stringContaining("test-provider / test-model"));
    expect(mocks.result.mock.calls[0][1]).toMatchObject({ useAI: true });
    const signal = mocks.result.mock.calls[0][1].signal as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: /Cancel response/ })); expect(signal.aborted).toBe(true);
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Newer draft" } });
    mocks.owner = "B"; view.rerender(page()); mocks.owner = "A"; view.rerender(page());
    await act(async () => pending.resolve({ ...result, summary: "STALE" }));
    expect(screen.queryByText("STALE")).not.toBeInTheDocument(); expect(screen.getByTestId("needs-text")).toHaveValue("Newer draft");
  });

  it("restores the asking stage and an unfinished answer, clearly marked reflective", async () => {
    const view = render(page("/app/mind/session/new?cat=mood&topic=anxiety"));
    fireEvent.click(screen.getByRole("radio", { name: "Explore more" }));
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Private situation" } });
    fireEvent.click(screen.getByTestId("needs-continue")); await screen.findByTestId("needs-asking");
    fireEvent.change(screen.getByTestId("needs-answer"), { target: { value: "Unfinished answer" } });
    view.unmount(); render(page("/app/mind/session/new?cat=mood&topic=anxiety"));
    expect(screen.getByTestId("needs-answer")).toHaveValue("Unfinished answer");
    expect(screen.getByText(/Optional reflection/)).toBeInTheDocument();
  });

  it("recovers the last submitted answer after cancelling a pending result and retries without duplicating it", async () => {
    const pending = deferred<NeedsResult>(); mocks.questions.mockResolvedValue(["Reflect?"]); mocks.result.mockReturnValueOnce(pending.promise);
    const view = render(page("/app/mind/session/new?cat=mood&topic=anxiety"));
    fireEvent.click(screen.getByRole("radio", { name: "Explore more" }));
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Situation" } });
    fireEvent.click(screen.getByTestId("needs-continue")); await screen.findByTestId("needs-asking");
    fireEvent.change(screen.getByTestId("needs-answer"), { target: { value: "My final answer" } });
    fireEvent.click(screen.getByTestId("needs-next")); await screen.findByTestId("needs-working");
    view.unmount(); render(page("/app/mind/session/new?cat=mood&topic=anxiety"));
    expect(screen.getByTestId("needs-question")).toHaveTextContent("Your answers are retained");
    fireEvent.click(screen.getByTestId("needs-next")); await screen.findByTestId("needs-result");
    expect(mocks.result.mock.calls[1][0].qa).toEqual([{ q: "Reflect?", a: "My final answer" }]);
    await act(async () => pending.resolve({ ...result, summary: "Old result" }));
    expect(screen.queryByText("Old result")).not.toBeInTheDocument();
  });

  it("keeps a dirty cloud session unchanged when subscription data arrives", async () => {
    render(page("/app/mind/session/saved"));
    act(() => mocks.subscribe.mock.calls[0][1]([saved]));
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "My dirty edit" } });
    act(() => mocks.subscribe.mock.calls[0][1]([{ ...saved, text: "Remote edit", updated_at: "2026-10-16" }]));
    expect(screen.getByTestId("needs-text")).toHaveValue("My dirty edit");
    expect(screen.getByRole("button", { name: "Save / retry account saving" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Accept other version" }));
    expect(screen.getByTestId("needs-text")).toHaveValue("Remote edit");
  });

  it("retains quota-failed writing and warns on reload", () => {
    render(page()); vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
    fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Unsaved private writing" } });
    expect(screen.getByTestId("needs-save-status")).toHaveTextContent("Device retention is not confirmed");
    expect(screen.getByTestId("needs-text")).toHaveValue("Unsaved private writing");
    const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
  });

  it("retains local text on foreign-tab conflict until an explicit choice", () => {
    render(page()); fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "My writing" } });
    const key = workspaceDraftKey("A", "needs:new:"); const remote = JSON.parse(localStorage.getItem(key)!);
    remote.value.answer = "Foreign writing"; localStorage.setItem(key, JSON.stringify(remote));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key })));
    expect(screen.getByTestId("needs-text")).toHaveValue("My writing");
    fireEvent.click(screen.getByRole("button", { name: "Accept other version" }));
    expect(screen.getByTestId("needs-text")).toHaveValue("Foreign writing");
  });

  it("persists edited conversion preview and successful links, with safe defaults", async () => {
    const view = render(page()); await shortResult(); fireEvent.click(screen.getByTestId("needs-convert-0"));
    expect(mocks.convert).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Reviewed step" } });
    view.unmount(); render(page()); expect(screen.getByLabelText("Title")).toHaveValue("Reviewed step");
    fireEvent.click(screen.getByRole("button", { name: "Confirm and create" })); await act(async () => {});
    expect(mocks.convert.mock.calls[0][3]).toMatchObject({ suggestionId: "step", title: "Reviewed step", privateNotes: "", dueDate: null });
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/app/tasks/task-stable-session-step");
    cleanup(); render(page()); expect(screen.queryByTestId("needs-convert-0")).not.toBeInTheDocument();
  });

  it("does not create a habit until recurrence is explicitly chosen", async () => {
    render(page()); await shortResult(); fireEvent.click(screen.getByTestId("needs-convert-1"));
    expect(screen.getByRole("button", { name: "Confirm and create" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "weekly" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and create" })); await act(async () => {});
    expect(mocks.convert.mock.calls[0][3]).toMatchObject({ frequency: "weekly" });
  });

  it("recovers optional preferences and leaves short mode category/question-free", async () => {
    const view = render(page());
    expect(screen.getByRole("radio", { name: "No goal preference" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "No capacity preference" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Feel calmer" }));
    fireEvent.click(screen.getByRole("radio", { name: "Low energy — one small instruction" }));
    view.unmount(); render(page());
    expect(screen.getByRole("radio", { name: "Feel calmer" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Low energy — one small instruction" })).toBeChecked();
    await shortResult();
    expect(mocks.result.mock.calls[0][0].preferences).toEqual({ goal: "calm", capacity: "low" });
    expect(mocks.questions).not.toHaveBeenCalled(); expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it.each(["irrelevant", "no_energy", "other"] as const)("%s control stores a local decision without overwriting original AI/text", async (feedback) => {
    mocks.result.mockResolvedValue({ ...result, source: "ai" });
    render(page()); await shortResult();
    fireEvent.click(screen.getByTestId(`needs-feedback-0-${feedback}`)); await act(async () => {});
    expect(mocks.result).toHaveBeenCalledTimes(1); expect(mocks.questions).not.toHaveBeenCalled(); expect(mocks.suggest).not.toHaveBeenCalled();
    const savedSession = JSON.parse(localStorage.getItem(workspaceDraftKey("A", "needs:new:"))!).value.s as NeedsSession;
    expect(savedSession.text).toBe("Private writing"); expect(savedSession.result).toEqual({ ...result, source: "ai" });
    expect(savedSession.decisionHistory).toEqual([expect.objectContaining({ feedback, suggestionId: "step", suggestion: result.suggestions[0], alternative: expect.objectContaining({ source: "local", id: "local-small" }) })]);
    expect(screen.getByTestId("needs-suggestion-0")).toHaveTextContent("One small library instruction");
    expect(screen.getByTestId("needs-suggestion-0")).toHaveTextContent("no new AI request");
    expect(screen.getByTestId("needs-decision-history")).toHaveTextContent("Small public step");
    expect(mocks.convert).not.toHaveBeenCalled();
  });

  it("restores feedback alternatives and stops honestly when the local branch is exhausted", async () => {
    const view = render(page()); await shortResult();
    fireEvent.click(screen.getByTestId("needs-feedback-0-other")); await act(async () => {});
    view.unmount(); render(page()); expect(screen.getByTestId("needs-suggestion-0")).toHaveTextContent("One small library instruction");
    mocks.local.mockReturnValueOnce({ ...result, suggestions: [] });
    fireEvent.click(screen.getByTestId("needs-feedback-0-irrelevant")); await act(async () => {});
    expect(screen.getByTestId("needs-suggestion-0")).toHaveTextContent("No further reviewed option remains");
    const savedSession = JSON.parse(localStorage.getItem(workspaceDraftKey("A", "needs:new:"))!).value.s as NeedsSession;
    expect(savedSession.decisionHistory).toHaveLength(2); expect(savedSession.result).toEqual(result);
    expect(mocks.result).toHaveBeenCalledTimes(1);
  });

  it("keeps temporary preference/feedback changes out of account saves", async () => {
    render(page()); fireEvent.click(screen.getByText("Draft retention & privacy"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Temporary mode; subsequent edits stay in memory" }));
    fireEvent.click(screen.getByRole("radio", { name: "Choose a step" }));
    await shortResult(); fireEvent.click(screen.getByTestId("needs-feedback-0-no_energy")); await act(async () => {});
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.convert).not.toHaveBeenCalled();
    expect(screen.getByTestId("needs-suggestion-0")).toHaveTextContent("One small library instruction");
  });
  it("does not initiate an account save when a late result arrives after enabling temporary mode", async () => {
    const pending = deferred<NeedsResult>(); mocks.result.mockReturnValueOnce(pending.promise);
    render(page()); fireEvent.change(screen.getByTestId("needs-text"), { target: { value: "Deferred private writing" } });
    fireEvent.click(screen.getByTestId("needs-continue"));
    fireEvent.click(screen.getByText("Draft retention & privacy"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Temporary mode; subsequent edits stay in memory" }));
    await act(async () => pending.resolve(result));
    expect(screen.getByTestId("needs-result")).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save / retry account saving" })).toBeDisabled();
  });
});

describe("Needs saved list", () => {
  beforeEach(() => {
    mocks.owner = "A"; mocks.subscribe.mockReset().mockReturnValue(vi.fn()); mocks.remove.mockReset().mockResolvedValue(false);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it("distinguishes errors from empty and clears owner state immediately", async () => {
    const view = render(page("/app/mind/my-needs"));
    act(() => mocks.subscribe.mock.calls[0][2](new Error("Offline")));
    expect(screen.getByTestId("needs-my-error")).toBeInTheDocument(); expect(screen.queryByTestId("needs-my-empty")).not.toBeInTheDocument();
    act(() => mocks.subscribe.mock.calls[0][1]([saved])); expect(screen.getByTestId("needs-my-item-saved")).toBeInTheDocument();
    mocks.owner = "B"; view.rerender(page("/app/mind/my-needs")); expect(screen.queryByText("Saved private text")).not.toBeInTheDocument();
    act(() => mocks.subscribe.mock.calls[0][1]([saved])); expect(screen.queryByText("Saved private text")).not.toBeInTheDocument();
  });
  it("confirms deletion and reports failure without dropping the session", async () => {
    render(page("/app/mind/my-needs")); act(() => mocks.subscribe.mock.calls[0][1]([saved]));
    vi.mocked(window.confirm).mockReturnValueOnce(false); fireEvent.click(screen.getByTestId("needs-my-delete-saved")); expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("needs-my-delete-saved"));
    await waitFor(() => expect(screen.getByTestId("needs-my-error")).toHaveTextContent("Deletion failed"));
    expect(screen.getByTestId("needs-my-item-saved")).toBeInTheDocument();
  });
});
