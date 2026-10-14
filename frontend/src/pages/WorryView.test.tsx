import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import WorryView from "./WorryView";

const mocks = vi.hoisted(() => ({ owner: "owner-A", save: vi.fn(), ai: vi.fn(), task: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.owner } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/aiSettings", () => ({ getOpConfig: () => ({ provider: "synthetic-provider", model: "synthetic-model" }) }));
vi.mock("@/lib/mindAI", () => ({ createMindAIContext: (value: unknown) => value, executeMindAI: mocks.ai }));
vi.mock("@/lib/firestoreDataService", () => ({ upsertThoughtRecord: mocks.save }));
vi.mock("@/lib/taskFromMind", () => ({ createTaskFromMind: mocks.task }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

function page() { return <MemoryRouter><WorryView /></MemoryRouter>; }
function solve() {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private worry" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to Triage" }));
  fireEvent.click(screen.getByRole("button", { name: /Actionable/ }));
  fireEvent.change(screen.getByPlaceholderText("Solution 1"), { target: { value: "My original solution" } });
  fireEvent.click(screen.getByTitle("Select solution"));
}
function confirm() { solve(); fireEvent.click(screen.getByRole("button", { name: "Review & Confirm Task" })); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const output = { data: { control_level_recognized: "partial", clarifying_question: "What can you influence?", suggested_options: [{ id: "option", title: "AI option", isWithinUserControl: true, estimatedEffort: "low" }], acceptance_note: "Some outcomes remain uncertain" } };

describe("Worry workspace safety", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    localStorage.clear(); mocks.owner = "owner-A"; mocks.save.mockReset().mockResolvedValue("record");
    mocks.task.mockReset().mockResolvedValue({ ok: true, task: { id: "task" } }); mocks.ai.mockReset().mockResolvedValue(output);
    mocks.success.mockReset(); mocks.error.mockReset();
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("recovers stage, selected solution and edited task preview after remount", () => {
    const view = render(page()); confirm();
    fireEvent.change(screen.getByPlaceholderText("Actionable step..."), { target: { value: "Edited public title" } });
    fireEvent.click(screen.getByRole("button", { name: "In 3 days" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Also copy private text into task details" }));
    fireEvent.change(screen.getByLabelText("Private details"), { target: { value: "Chosen private detail" } });
    view.unmount(); render(page());
    expect(screen.getByDisplayValue("Edited public title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chosen private detail")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Also copy private text into task details" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel / Edit Solution" }));
    expect(screen.getByDisplayValue("My original solution")).toBeInTheDocument();
  });

  it("creates only after confirmation, with no due date or private description by default", async () => {
    render(page()); confirm();
    expect(mocks.task).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    await act(async () => {});
    expect(mocks.task).toHaveBeenCalledWith(expect.objectContaining({ title: "My original solution", due_in_days: null, description: undefined }));
  });

  it("serializes saves and retains the latest edit instead of switching it to done", async () => {
    const pending = deferred<string>(); mocks.save.mockReturnValueOnce(pending.promise);
    render(page()); confirm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByPlaceholderText("Actionable step..."), { target: { value: "Newer step" } });
    await act(async () => pending.resolve("record"));
    expect(screen.getByDisplayValue("Newer step")).toBeInTheDocument();
    expect(screen.queryByText("Exercise Completed")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    await act(async () => {});
    expect(mocks.save.mock.calls[0][1].id).toBe(mocks.save.mock.calls[1][1].id);
  });

  it("keeps local solutions while showing AI control, effort and clarification separately", async () => {
    render(page()); solve();
    fireEvent.click(screen.getByRole("button", { name: "Brainstorm with AI (Optional)" }));
    expect(mocks.ai).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "I agree to send this text" }));
    await act(async () => {});
    expect(screen.getByDisplayValue("My original solution")).toBeInTheDocument();
    expect(screen.getByText(/Estimated effort:/)).toHaveTextContent("low");
    fireEvent.change(screen.getByLabelText("What can you influence?"), { target: { value: "My preparation" } });
    fireEvent.click(screen.getByRole("button", { name: "Brainstorm with AI (Optional)" }));
    fireEvent.click(screen.getByRole("button", { name: "I agree to send this text" }));
    await act(async () => {});
    expect(mocks.ai.mock.calls[1][0].fields.clarification.value).toBe("My preparation");
    fireEvent.click(screen.getByRole("button", { name: "Append and choose, without replacing writing" }));
    expect(screen.getByDisplayValue("My original solution")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI option")).toBeInTheDocument();
  });

  it("rejects late AI after cancellation and A→B→A", async () => {
    const pending = deferred<typeof output>(); mocks.ai.mockReturnValueOnce(pending.promise);
    const view = render(page()); solve();
    fireEvent.click(screen.getByRole("button", { name: "Brainstorm with AI (Optional)" }));
    fireEvent.click(screen.getByRole("button", { name: "I agree to send this text" }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel waiting/ }));
    expect(mocks.ai.mock.calls[0][1].signal.aborted).toBe(true);
    mocks.owner = "owner-B"; view.rerender(page());
    expect(screen.queryByDisplayValue("Private worry")).not.toBeInTheDocument();
    mocks.owner = "owner-A"; view.rerender(page());
    expect(screen.getByDisplayValue("My original solution")).toBeInTheDocument();
    await act(async () => pending.resolve(output));
    expect(screen.queryByText("AI option")).not.toBeInTheDocument();
  });

  it("allows finishing without a task and does not fabricate an acceptance answer", async () => {
    render(page()); solve();
    fireEvent.click(screen.getByRole("button", { name: "Enough for now; save without a task" }));
    await act(async () => {});
    expect(mocks.task).not.toHaveBeenCalled();
    expect(mocks.save.mock.calls[0][1].alternative_thought).toBe("My original solution");
  });

  it("leaves optional acceptance and ratings absent rather than inventing answers", async () => {
    render(page());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Outside my control" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Triage" }));
    fireEvent.click(screen.getByRole("button", { name: /Uncontrollable \/ Unsure/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save to Thought Records" }));
    await act(async () => {});
    expect(mocks.save).toHaveBeenCalledWith("owner-A", expect.objectContaining({ alternative_thought: null, emotion_intensity_before: null, emotion_intensity_after: null }));
    expect(mocks.task).not.toHaveBeenCalled();
  });

  it("retains the confirmation and stable destination after task creation fails", async () => {
    mocks.task.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, task: { id: "task" } });
    render(page()); confirm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    await act(async () => {});
    expect(screen.getByDisplayValue("My original solution")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    await act(async () => {});
    expect(mocks.task.mock.calls[0][0].id).toBe(mocks.task.mock.calls[1][0].id);
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Worry saved, but the task could not be created"));
  });

  it("warns on reload when draft storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    render(page()); solve();
    expect(screen.getByRole("status")).toHaveTextContent("Draft is only in memory");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("isolates a pending save across A→B→A without overlapping the restored session", async () => {
    const pending = deferred<string>(); mocks.save.mockReturnValueOnce(pending.promise);
    const view = render(page()); confirm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    mocks.owner = "owner-B"; view.rerender(page());
    expect(screen.queryByDisplayValue("My original solution")).not.toBeInTheDocument();
    mocks.owner = "owner-A"; view.rerender(page());
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve("record"));
    expect(screen.getByDisplayValue("My original solution")).toBeInTheDocument();
    expect(mocks.task).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save as Task" }));
    await act(async () => {});
    expect(mocks.save.mock.calls[0][1].id).toBe(mocks.save.mock.calls[1][1].id);
  });
});
