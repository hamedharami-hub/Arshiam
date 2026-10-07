import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskAIPanel } from "./TaskAIPanel";

const mocks = vi.hoisted(() => ({
  callAI: vi.fn(),
  persistTask: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({ callAI: mocks.callAI, getAILanguage: () => "en" }));
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: mocks.persistTask }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/components/PomodoroTimer", () => ({ default: () => null }));
vi.mock("@/components/AILangToggle", () => ({ AILangToggle: () => null }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ i18n: { language: "en" } }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

describe("TaskAIPanel proposals", () => {
  const task = {
    id: "task-1", title: "Review report 2026-10-08", description: "", priority: "none" as const,
    work_date: null, schedule_v: 2,
  };

  beforeEach(() => {
    mocks.callAI.mockReset().mockResolvedValue({ data: {
      title: "Review the quarterly report", small_step: "Open the report and mark missing values",
      if_then: { if: "I finish lunch", then: "open the report" }, priority: "p1",
      work_date: "2026-10-08", schedule_reason: "The task text names this day.", reason: "The title was broad.",
    } });
    mocks.persistTask.mockReset().mockResolvedValue("saved");
    mocks.from.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
  });

  async function getProposal(onApplyPatch = vi.fn().mockResolvedValue("saved")) {
    render(<TaskAIPanel task={task} open onOpenChange={vi.fn()} onApplyPatch={onApplyPatch} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Suggest" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Suggest" }));
    await screen.findByText("Review the quarterly report");
    return onApplyPatch;
  }

  it("keeps generated suggestions local until the user accepts them through the shared save callback", async () => {
    const onApplyPatch = vi.fn().mockResolvedValue("saved");
    await getProposal(onApplyPatch);
    expect(onApplyPatch).not.toHaveBeenCalled();
    expect(mocks.persistTask).not.toHaveBeenCalled();
    expect(screen.getByText(/Unscheduled →/)).toBeInTheDocument();
    expect(screen.getByText(/finish lunch/)).toBeInTheDocument();
    expect(screen.getByText(/open the report/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply suggestions" }));
    await waitFor(() => expect(onApplyPatch).toHaveBeenCalledTimes(1));
    const patch = onApplyPatch.mock.calls[0][0];
    expect(patch).toMatchObject({
      title: "Review the quarterly report", priority: "high", work_date: "2026-10-08",
      implementation_intention: { if: "I finish lunch", then: "open the report" }, schedule_v: 2,
    });
    expect(patch).not.toHaveProperty("start_at");
    expect(patch).not.toHaveProperty("estimated_minutes");
  });

  it("creates a suggested small step as a child only after its separate acceptance", async () => {
    await getProposal();
    expect(mocks.persistTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Add step as subtask" }));
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(1));
    expect(mocks.persistTask.mock.calls[0][1]).toMatchObject({
      user_id: "user-1", title: "Open the report and mark missing values", parent_id: "task-1",
      status: "todo", completed: false, priority: "none",
    });
  });

  it("reuses child IDs across retries after a partial subtask save", async () => {
    mocks.callAI.mockResolvedValueOnce({ data: { subtasks: ["Collect the figures", "Review the totals"] } });
    mocks.persistTask
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("saved");
    render(<TaskAIPanel task={task} open onOpenChange={vi.fn()} onApplyPatch={vi.fn().mockResolvedValue("saved")} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate steps (Subtasks)" }));
    await screen.findByText("Collect the figures");
    const add = screen.getByRole("button", { name: "Add selected" });
    fireEvent.click(add);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    fireEvent.click(add);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(4));
    expect(mocks.persistTask.mock.calls.slice(2).map(([_, draft]) => draft.id))
      .toEqual(mocks.persistTask.mock.calls.slice(0, 2).map(([_, draft]) => draft.id));
  });

  it("reuses the suggested small-step ID after a failed save", async () => {
    mocks.persistTask.mockResolvedValueOnce("failed").mockResolvedValueOnce("saved");
    await getProposal();
    const addStep = screen.getByRole("button", { name: "Add step as subtask" });
    fireEvent.click(addStep);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(1));
    fireEvent.click(addStep);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    expect(mocks.persistTask.mock.calls[1][1].id).toBe(mocks.persistTask.mock.calls[0][1].id);
  });

  it("does not apply a model-invented calendar day when the task text has none", async () => {
    mocks.callAI.mockResolvedValueOnce({ data: { work_date: "2026-10-10", reason: "A suggested day" } });
    const onApplyPatch = vi.fn().mockResolvedValue("saved");
    render(<TaskAIPanel task={{ ...task, title: "Review report" }} open onOpenChange={vi.fn()} onApplyPatch={onApplyPatch} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Suggest" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Suggest" }));
    await screen.findByText(/A suggested day/);
    expect(screen.queryByText(/Schedule change:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apply suggestions" }));
    expect(onApplyPatch).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
  });

  it("preserves current recurrence and ignores malformed model recurrence proposals", async () => {
    mocks.callAI.mockResolvedValueOnce({ data: {
      title: "Prepare the weekly report",
      recurrence_rule: { freq: "hourly", interval: 0, byweekday: ["MO", "MO"], byhour: 30 },
    } });
    const onApplyPatch = vi.fn().mockResolvedValue("saved");
    render(<TaskAIPanel
      task={{ ...task, title: "Every Monday review report", recurrence_rule: { freq: "weekly", interval: 1 } }}
      open onOpenChange={vi.fn()} onApplyPatch={onApplyPatch}
    />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Suggest" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Suggest" }));
    await screen.findByText("Prepare the weekly report");
    expect(screen.queryByText(/Repeat:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apply suggestions" }));
    await waitFor(() => expect(onApplyPatch).toHaveBeenCalledTimes(1));
    expect(onApplyPatch.mock.calls[0][0]).toEqual({ title: "Prepare the weekly report" });
  });

  it("sends only explicitly opted-in, uid-scoped work task summaries and never queries notes", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [
      { id: "owned", user_id: "user-1", title: "Owned work", priority: "high", completed: false, status: "todo", work_date: "2026-10-08", schedule_v: 2 },
      { id: "foreign", user_id: "user-2", title: "Foreign work", priority: "none", completed: false, status: "todo" },
      { id: "mind", user_id: "user-1", title: "Sensitive mind item", priority: "none", completed: false, status: "todo", source_type: "cbt_thought" },
    ], error: null });
    mocks.from.mockReturnValue(query);
    mocks.callAI.mockResolvedValue({ text: "Answer" });
    render(<TaskAIPanel task={task} open onOpenChange={vi.fn()} onApplyPatch={vi.fn().mockResolvedValue("saved")} />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Chat" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    const chatInput = screen.getByPlaceholderText("Ask...");
    fireEvent.change(chatInput, { target: { value: "What next?" } });
    fireEvent.keyDown(chatInput, { key: "Enter" });

    await screen.findByText("Answer");
    expect(mocks.from).toHaveBeenCalledWith("tasks");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    const context = mocks.callAI.mock.calls.at(-1)?.[2] as string;
    expect(context).toContain("Owned work");
    expect(context).not.toContain("Foreign work");
    expect(context).not.toContain("Sensitive mind item");
    expect(mocks.from).not.toHaveBeenCalledWith("notes");
  });

  it("ignores a suggestion response after the selected task changes", async () => {
    let resolveAI!: (result: unknown) => void;
    mocks.callAI.mockImplementationOnce(() => new Promise((resolve) => { resolveAI = resolve; }));
    const props = { open: true, onOpenChange: vi.fn(), onApplyPatch: vi.fn().mockResolvedValue("saved") };
    const view = render(<TaskAIPanel task={task} {...props} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Suggest" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("tab", { name: "Suggest" }));
    fireEvent.click(screen.getByRole("button", { name: "Suggest" }));
    await waitFor(() => expect(resolveAI).toBeTypeOf("function"));

    view.rerender(<TaskAIPanel task={{ ...task, id: "task-2", title: "Different task" }} {...props} />);
    resolveAI({ data: { title: "Stale title", priority: "high" } });

    expect(screen.queryByText("Stale title")).not.toBeInTheDocument();
    expect(props.onApplyPatch).not.toHaveBeenCalled();
  });
});
