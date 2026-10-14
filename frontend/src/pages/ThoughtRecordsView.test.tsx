import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ThoughtRecordsView from "./ThoughtRecordsView";
const mocks = vi.hoisted(() => ({ owner: "synthetic-user", provider: "synthetic-provider", save: vi.fn(), ai: vi.fn(), task: vi.fn(), records: [] as any[], callbacks: [] as ((records: any[]) => void)[], success: vi.fn(), error: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: mocks.owner }, loading: false }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }),
}));

vi.mock("@/pages/ABCView", () => ({ default: () => <div>Short exercise</div> }));
vi.mock("@/lib/aiSettings", () => ({ getOpConfig: () => ({ provider: mocks.provider, model: "synthetic-model" }) }));
vi.mock("@/lib/mindAI", () => ({ createMindAIContext: (value: unknown) => value, executeMindAI: mocks.ai }));
vi.mock("@/lib/taskFromMind", () => ({ createTaskFromMind: mocks.task }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

vi.mock("@/lib/firestoreDataService", () => ({
  subscribeThoughtRecords: (_userId: string, onChange: (records: unknown[]) => void) => {
    mocks.callbacks.push(onChange);
    onChange(mocks.records);
    return vi.fn();
  },
  upsertThoughtRecord: mocks.save,
  deleteThoughtRecord: vi.fn(),
}));

function page() { return <MemoryRouter initialEntries={["/app/thoughts"]}><ThoughtRecordsView /></MemoryRouter>; }
function begin() {
  fireEvent.click(screen.getByRole("button", { name: "New Record" }));
  fireEvent.change(screen.getByPlaceholderText("Where were you, who was there, what happened objectively..."), { target: { value: "Original situation" } });
  fireEvent.change(screen.getByPlaceholderText("The immediate sentence that crossed your mind..."), { target: { value: "Original thought" } });
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const analysis = { data: { possible_patterns: [], observations: [], missing_information: [], alternative_perspective: "Old suggestion" } };

describe("ThoughtRecordsView route", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    localStorage.clear(); mocks.owner = "synthetic-user"; mocks.provider = "synthetic-provider"; mocks.records = []; mocks.callbacks = [];
    mocks.save.mockReset().mockResolvedValue("saved-record"); mocks.ai.mockReset().mockResolvedValue(analysis);
    mocks.task.mockReset().mockResolvedValue({ ok: true, task: { id: "task-record" } }); mocks.error.mockReset(); mocks.success.mockReset();
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("renders when opened directly at /app/thoughts", () => {
    render(
      <MemoryRouter initialEntries={["/app/thoughts"]}>
        <Routes>
          <Route path="/app/thoughts" element={<ThoughtRecordsView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Think it through" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Record" })).toBeInTheDocument();
  });

  it("recovers all written fields after remount without relying on the shared legacy text", () => {
    const first = render(page()); begin();
    const boxes = screen.getAllByRole("textbox");
    fireEvent.change(boxes[2], { target: { value: "Supporting evidence" } });
    fireEvent.change(boxes[3], { target: { value: "Contradicting evidence" } });
    fireEvent.change(boxes[4], { target: { value: "My balanced perspective" } });
    fireEvent.change(boxes[5], { target: { value: "My takeaway" } });
    fireEvent.change(boxes[6], { target: { value: "Optional step" } });
    first.unmount(); render(page());
    ["Original situation", "Original thought", "Supporting evidence", "Contradicting evidence", "My balanced perspective", "My takeaway", "Optional step"].forEach(value => expect(screen.getByDisplayValue(value)).toBeInTheDocument());
  });

  it("serializes saves, preserves a newer edit and reuses the record id on retry", async () => {
    const pending = deferred<string>(); mocks.save.mockReturnValueOnce(pending.promise);
    render(page()); begin();
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByDisplayValue("Original situation"), { target: { value: "Newer situation" } });
    await act(async () => pending.resolve("saved-record"));
    expect(screen.getByDisplayValue("Newer situation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    await act(async () => {});
    expect(mocks.save.mock.calls[0][1].id).toBe(mocks.save.mock.calls[1][1].id);
    expect(mocks.task).not.toHaveBeenCalled();
  });

  it("isolates A→B→A and ignores a pending save from the first mount", async () => {
    const pending = deferred<string>(); mocks.save.mockReturnValueOnce(pending.promise);
    const view = render(page()); begin(); fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    mocks.owner = "account-B"; view.rerender(page());
    expect(screen.queryByDisplayValue("Original situation")).not.toBeInTheDocument();
    mocks.owner = "synthetic-user"; view.rerender(page());
    expect(screen.getByDisplayValue("Original situation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve("saved-record"));
    expect(screen.getByDisplayValue("Original situation")).toBeInTheDocument();
    act(() => mocks.callbacks[0]([{ id: "foreign", situation: "Old subscription" }]));
    expect(screen.queryByText("Old subscription")).not.toBeInTheDocument();
  });

  it("requires a sending preview, and ignores AI arriving after input changes", async () => {
    const pending = deferred<typeof analysis>(); mocks.ai.mockReturnValueOnce(pending.promise);
    render(page()); begin();
    fireEvent.click(screen.getByRole("button", { name: "Suggest Distortions & Alternative with AI (Optional)" }));
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "AI sending preview" })).toHaveTextContent("Original thought");
    fireEvent.click(screen.getByRole("button", { name: "I agree to send this text" }));
    expect(mocks.ai.mock.calls[0][1].cacheScope).toContain("synthetic-user:");
    fireEvent.change(screen.getByDisplayValue("Original thought"), { target: { value: "New thought" } });
    expect(mocks.ai.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => pending.resolve(analysis));
    expect(screen.queryByText("«Old suggestion»")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("New thought")).toBeInTheDocument();
  });

  it("previews an editable task with no private details or due date by default", async () => {
    mocks.records = [{ id: "record", created_at: "2026-10-15", situation: "Private situation", automatic_thought: "Private thought", next_step: "Public step", distortions: [] }];
    render(page()); fireEvent.click(screen.getByRole("button", { name: "Preview step in Tasks" }));
    expect(mocks.task).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Edited step" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm step creation" }));
    await act(async () => {});
    expect(mocks.task).toHaveBeenCalledWith(expect.objectContaining({ id: "task_record", title: "Edited step", description: undefined, due_in_days: null }));
  });

  it("does not seed a worry-path legacy draft into thoughts", () => {
    localStorage.setItem("mind_draft_v1_synthetic-user", JSON.stringify({ text: "Other exercise", path: "worry", updatedAt: 1 }));
    render(page());
    expect(screen.queryByDisplayValue("Other exercise")).not.toBeInTheDocument();
  });

  it("warns on reload if quota fails, including after pausing the editor", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    render(page()); begin();
    expect(screen.getByRole("status")).toHaveTextContent("Draft is only in memory");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("preserves visible edits on an external draft conflict and lets the user choose", () => {
    render(page()); begin();
    const key = "arshiam:mind:workspace:v1:synthetic-user:thoughts";
    const remote = JSON.parse(localStorage.getItem(key)!);
    remote.value.form.situation = "Remote situation";
    localStorage.setItem(key, JSON.stringify(remote));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key })));
    expect(screen.getByDisplayValue("Original situation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Record" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Use other version" }));
    expect(screen.getByDisplayValue("Remote situation")).toBeInTheDocument();
  });

  it("does not clear a newer legacy draft when an older session finishes saving", async () => {
    localStorage.setItem("mind_draft_v1_synthetic-user", JSON.stringify({ text: "Seeded situation", path: "think", updatedAt: 1 }));
    const pending = deferred<string>(); mocks.save.mockReturnValueOnce(pending.promise);
    render(page());
    fireEvent.change(screen.getByPlaceholderText("The immediate sentence that crossed your mind..."), { target: { value: "Thought" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    localStorage.setItem("mind_draft_v1_synthetic-user", JSON.stringify({ text: "Another session", path: "worry", updatedAt: 2 }));
    await act(async () => pending.resolve("saved-record"));
    expect(JSON.parse(localStorage.getItem("mind_draft_v1_synthetic-user")!).text).toBe("Another session");
  });

  it("refreshes consent after the provider changes and does not infer realism from no patterns", async () => {
    render(page()); begin();
    fireEvent.click(screen.getByRole("button", { name: "Suggest Distortions & Alternative with AI (Optional)" }));
    mocks.provider = "changed-provider";
    fireEvent.click(screen.getByRole("button", { name: "I agree to send this text" }));
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("changed-provider");
    fireEvent.click(screen.getByRole("button", { name: "I agree to send this text" }));
    await act(async () => {});
    expect(mocks.success).toHaveBeenCalledWith("No clear pattern suggested; this does not establish that the thought is realistic");
  });

  it("preserves a failed record and retries with the same id without reporting success", async () => {
    mocks.save.mockResolvedValueOnce(null).mockResolvedValueOnce("saved-record");
    render(page()); begin();
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    await act(async () => {});
    expect(screen.getByDisplayValue("Original situation")).toBeInTheDocument();
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));
    await act(async () => {});
    expect(mocks.save.mock.calls[0][1].id).toBe(mocks.save.mock.calls[1][1].id);
  });

  it("recovers an edited task preview and preserves newer edits during conversion", async () => {
    mocks.records = [{ id: "record", created_at: "2026-10-15", situation: "Private situation", automatic_thought: "Private thought", next_step: "Public step", distortions: [] }];
    const view = render(page());
    fireEvent.click(screen.getByRole("button", { name: "Preview step in Tasks" }));
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Edited preview" } });
    view.unmount(); render(page());
    expect(screen.getByDisplayValue("Edited preview")).toBeInTheDocument();
    const pending = deferred<{ ok: boolean; task: { id: string } }>(); mocks.task.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Confirm step creation" }));
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Newer preview" } });
    await act(async () => pending.resolve({ ok: true, task: { id: "task-record" } }));
    expect(screen.getByDisplayValue("Newer preview")).toBeInTheDocument();
  });
});
