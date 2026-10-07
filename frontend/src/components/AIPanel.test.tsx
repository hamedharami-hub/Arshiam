import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AIPanel } from "./AIPanel";

const mocks = vi.hoisted(() => ({
  callAI: vi.fn(),
  persistTask: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  from: vi.fn(),
  userId: "user-1",
}));

vi.mock("@/lib/ai", () => ({ callAI: mocks.callAI, getAILanguage: () => "en" }));
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: mocks.persistTask }));
vi.mock("@/lib/firebaseStore", () => ({ from: mocks.from, firebaseStore: { from: mocks.from } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/AILangToggle", () => ({ AILangToggle: () => null }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ i18n: { language: "en" } }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

describe("AIPanel suggestion retries", () => {
  beforeEach(() => {
    mocks.userId = "user-1";
    mocks.callAI.mockReset().mockResolvedValue({ data: { items: [
      { title: "First suggested task" },
      { title: "Second suggested task" },
    ] } });
    mocks.persistTask.mockReset();
    mocks.from.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
  });

  it("reuses each suggestion's task ID when retrying a partially failed save", async () => {
    mocks.persistTask
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("saved");

    render(<AIPanel open onOpenChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Suggest" }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByPlaceholderText("e.g. Starting an online business"), { target: { value: "Launch a shop" } });
    fireEvent.click(screen.getByRole("button", { name: "Get suggestions" }));
    await screen.findByText("First suggested task");
    fireEvent.click(screen.getByText("First suggested task"));
    fireEvent.click(screen.getByText("Second suggested task"));

    const add = screen.getByRole("button", { name: "Add selected to tasks" });
    fireEvent.click(add);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    fireEvent.click(add);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(3));

    const initialIds = mocks.persistTask.mock.calls.slice(0, 2).map(([_, task]) => task.id);
    const failedId = mocks.persistTask.mock.calls[1][1].id;
    const retryIds = mocks.persistTask.mock.calls.slice(2).map(([_, task]) => task.id);
    expect(initialIds).toContain(failedId);
    expect(retryIds).toEqual([failedId]);
  });

  it("reviews editable, source-grounded multiple task drafts before saving and preserves IDs for failed retries", async () => {
    mocks.callAI.mockResolvedValueOnce({ data: { items: [
      { source_text: "Call Sara tomorrow", title: "Call Sara", description: "Discuss the report", priority: "high" },
      { source_text: "Review the report", title: "Review report", description: "", priority: "none", work_date: "2099-01-01" },
    ] } });
    mocks.persistTask.mockResolvedValueOnce("failed").mockResolvedValueOnce("saved").mockResolvedValueOnce("saved");
    render(<AIPanel open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Call Sara tomorrow/), { target: { value: "Call Sara tomorrow\nReview the report" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare task drafts" }));

    await screen.findByTestId("ai-task-drafts");
    expect(mocks.persistTask).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Call Sara")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Call Sara"), { target: { value: "Call Sara about the report" } });
    fireEvent.click(screen.getByRole("button", { name: "Save selected drafts" }));
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    const firstFailedId = mocks.persistTask.mock.calls[0][1].id;
    expect(mocks.persistTask.mock.calls[0][1]).toMatchObject({
      user_id: "user-1", title: "Call Sara about the report", priority: "high", work_date: expect.any(String),
    });
    expect(mocks.persistTask.mock.calls[1][1]).not.toHaveProperty("work_date", "2099-01-01");

    fireEvent.click(screen.getByRole("button", { name: "Save selected drafts" }));
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(3));
    expect(mocks.persistTask.mock.calls[2][1].id).toBe(firstFailedId);
  });

  it("keeps a draft and its retry ID when the shared writer throws", async () => {
    mocks.callAI.mockResolvedValueOnce({ data: { items: [{ source_text: "Call Sara", title: "Call Sara" }] } });
    mocks.persistTask.mockRejectedValueOnce(new Error("network failure")).mockResolvedValueOnce("saved");
    render(<AIPanel open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Call Sara tomorrow/), { target: { value: "Call Sara" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare task drafts" }));
    await screen.findByTestId("ai-task-drafts");

    fireEvent.click(screen.getByRole("button", { name: "Save selected drafts" }));
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(1));
    const failedId = mocks.persistTask.mock.calls[0][1].id;
    expect(screen.getByTestId("ai-task-drafts")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save selected drafts" }));
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    expect(mocks.persistTask.mock.calls[1][1].id).toBe(failedId);
  });

  it("loads only the current user's scheduled work for an explicitly requested plan answer", async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const query = {
      select: vi.fn(), eq: vi.fn(), limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [
      { id: "owned", user_id: "user-1", title: "Owned task", priority: "high", completed: false, status: "todo", work_date: today, schedule_v: 2 },
      { id: "foreign", user_id: "user-2", title: "Foreign task", priority: "none", completed: false, status: "todo", work_date: today, schedule_v: 2 },
      { id: "sensitive", user_id: "user-1", title: "Mind task", priority: "none", completed: false, status: "todo", source_type: "cbt_thought", work_date: today, schedule_v: 2 },
    ], error: null });
    mocks.from.mockReturnValue(query);
    mocks.callAI.mockResolvedValue({ text: "A small plan." });
    render(<AIPanel open onOpenChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Chat" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    await screen.findByText("A small plan.");
    expect(mocks.from).toHaveBeenCalledWith("tasks");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("user_id"));
    const call = mocks.callAI.mock.calls.at(-1);
    expect(call?.[2]).toContain("Owned task");
    expect(call?.[2]).not.toContain("Foreign task");
    expect(call?.[2]).not.toContain("Mind task");
    expect(call?.[2]).toContain("basisLine");
    expect(call?.[5]?.systemPromptOverride).toContain("copying the exact `basisLine`");
    expect(screen.getByText(/Basis: .* complete list/)).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalledWith("notes");
  });

  it("drops an AI task response when the signed-in account changes", async () => {
    let resolveAI!: (result: unknown) => void;
    mocks.callAI.mockImplementationOnce(() => new Promise((resolve) => { resolveAI = resolve; }));
    const view = render(<AIPanel open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Call Sara tomorrow/), { target: { value: "Call Sara" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare task drafts" }));
    await waitFor(() => expect(resolveAI).toBeTypeOf("function"));

    mocks.userId = "user-2";
    view.rerender(<AIPanel open onOpenChange={vi.fn()} />);
    resolveAI({ data: { items: [{ source_text: "Call Sara", title: "Call Sara" }] } });

    await waitFor(() => expect(screen.queryByTestId("ai-task-drafts")).not.toBeInTheDocument());
    expect(mocks.persistTask).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
