import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QuickAddTask } from "./QuickAddTask";
import { enqueueOps } from "@/lib/offlineQueue";
import { toast } from "sonner";

const templateMocks = vi.hoisted(() => ({
  testUser: { id: "test-user-1" },
  list: vi.fn(() => Promise.resolve([] as any[])),
  save: vi.fn((..._args: any[]) => Promise.resolve(null as any)),
  remove: vi.fn(() => Promise.resolve()),
  persist: vi.fn((_userId: string, _task: any): Promise<"saved" | "queued" | "failed"> => Promise.resolve("saved")),
}));

vi.mock("@/lib/offlineQueue", () => ({
  enqueueOp: vi.fn(() => Promise.resolve(true)),
  enqueueOps: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: templateMocks.testUser }),
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (fa: string, en?: string) => en || fa,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => ({
      select: () => ({
        order: () => Promise.resolve({ data: table === "tags" ? [{ id: "tag-1", name: "Work", color: "#123456" }] : [] }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

vi.mock("@/lib/taskTemplates", () => ({
  listTaskTemplates: templateMocks.list,
  buildTaskFromTemplate: (t: any) => t,
  buildWorkflowTasksFromTemplate: (t: any) => t.payload?.workflow_tasks || [],
  saveTaskTemplate: templateMocks.save,
  deleteTaskTemplate: templateMocks.remove,
}));

vi.mock("@/lib/firestoreDataService", () => ({
  upsertTask: vi.fn(() => Promise.resolve(true)),
  persistTask: templateMocks.persist,
}));

describe("QuickAddTask component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    templateMocks.list.mockResolvedValue([]);
    templateMocks.save.mockResolvedValue(null as any);
    templateMocks.remove.mockResolvedValue();
    templateMocks.persist.mockReset();
    templateMocks.persist.mockResolvedValue("saved" as const);
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("an exact date and time replaces the view's period (one schedule) without changing the folder", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<MemoryRouter><QuickAddTask placeholder="+ Planned task" defaults={{ folder_id: "folder-1", work_date: "2026-06-10T10:00:00.000Z", planning: { horizon: "month", start: "2026-05-01", end: "2026-05-31" } }} /></MemoryRouter>);
    fireEvent.click(screen.getByText("+ Planned task"));
    fireEvent.change(screen.getByPlaceholderText("+ Planned task"), { target: { value: "Keep both times" } });
    fireEvent.click(screen.getByTitle("Add task (Enter)"));
    await waitFor(() => expect(enqueueOps).toHaveBeenCalled());
    expect(vi.mocked(enqueueOps).mock.calls[0][0][0].payload).toEqual(expect.objectContaining({ folder_id: "folder-1", work_date: "2026-06-10T10:00:00.000Z", planning_horizon: null, planning_start: null, schedule_v: 2 }));
  });
  it("retains folder, column status, priority, tags and bucket period when adding offline", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<MemoryRouter><QuickAddTask placeholder="+ Context task" defaults={{ folder_id: "folder-1", kanban_column_id: "goal-1", status: "in_progress", priority: "high", tag_ids: ["tag-1"], time: { horizon: "week", period_start: "2026-10-03", period_end: "2026-10-09", is_exact: false, due_at: null, postpone_count: 0 } }} /></MemoryRouter>);
    fireEvent.click(screen.getByText("+ Context task"));
    fireEvent.change(screen.getByPlaceholderText("+ Context task"), { target: { value: "Context task" } });
    fireEvent.click(screen.getByTitle("Add task (Enter)"));
    await waitFor(() => expect(enqueueOps).toHaveBeenCalled());
    const operations = vi.mocked(enqueueOps).mock.calls[0][0];
    expect(operations[0].payload).toEqual(expect.objectContaining({ folder_id: "folder-1", kanban_column_id: "goal-1", status: "in_progress", priority: "high", planning_horizon: "week", planning_start: "2026-10-03", planning_end: "2026-10-09", work_date: null }));
    expect(operations[1].payload).toEqual([expect.objectContaining({ tag_id: "tag-1" })]);
  });

  it("atomically queues an offline task and its tags before clearing the form", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const onCreated = vi.fn();
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" defaults={{ tag_id: "tag-1" }} onCreated={onCreated} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.change(screen.getByPlaceholderText("+ Add task"), { target: { value: "Offline task" } });
    fireEvent.click(screen.getByTitle("Add task (Enter)"));

    await waitFor(() => expect(enqueueOps).toHaveBeenCalledTimes(1));
    const [operations] = vi.mocked(enqueueOps).mock.calls[0];
    expect(operations.map(({ table }) => table)).toEqual(["tasks", "task_tags"]);
    expect(operations.every(({ ownerId }) => ownerId === "test-user-1")).toBe(true);
    expect(onCreated).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByPlaceholderText("+ Add task")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("will sync"));
  });

  it("keeps the offline form intact and reports failure when the queue rejects the write", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    vi.mocked(enqueueOps).mockResolvedValueOnce(false);
    const onCreated = vi.fn();
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" onCreated={onCreated} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText("+ Add task");
    fireEvent.change(input, { target: { value: "Keep this task" } });
    fireEvent.click(screen.getByTitle("Add task (Enter)"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Could not save offline")));
    expect(screen.getByPlaceholderText("+ Add task")).toHaveValue("Keep this task");
    expect(onCreated).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("renders collapsed initially and expands on click", () => {
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" />
      </MemoryRouter>
    );

    // Shows placeholder
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
    // Options such as Add button or priority are not visible initially
    expect(screen.queryByTitle("Add task (Enter)")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("+ Add task"));

    // Now options and input are expanded
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("collapses when clicking Cancel", () => {
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    // Collapses back to placeholder
    expect(screen.queryByTitle("Add task (Enter)")).not.toBeInTheDocument();
  });

  it("saves a Quick Add draft as a reusable template with an explicit relative offset", async () => {
    const savedTemplate = {
      id: "stable-template-1", user_id: "test-user-1", title: "Prepare report", priority: "high",
      folder_id: "folder-1", recurrence: "none", recurrence_rule: null, due_offset_hours: 24, tag_ids: [], payload: {},
    };
    templateMocks.save.mockResolvedValueOnce(savedTemplate as any);
    render(<MemoryRouter><QuickAddTask placeholder="+ Add task" defaults={{ folder_id: "folder-1", priority: "high" }} /></MemoryRouter>);

    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.change(screen.getByPlaceholderText("+ Add task"), { target: { value: "Prepare report" } });
    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    fireEvent.click(screen.getByText("Save this task as a template"));
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Prepare report" } });
    fireEvent.change(screen.getByLabelText("Relative time in hours (optional)"), { target: { value: "24" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(templateMocks.save).toHaveBeenCalledTimes(1));
    expect(templateMocks.save).toHaveBeenCalledWith("test-user-1", expect.objectContaining({
      title: "Prepare report", priority: "high", folder_id: "folder-1",
    }), expect.objectContaining({
      title: "Prepare report", dueOffsetHours: 24, id: expect.any(String),
    }));
    expect(templateMocks.save.mock.calls[0][2].id).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Template saved");

    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    expect(screen.getAllByText("Prepare report")).toHaveLength(2);
  });

  it("applies a saved template in Quick Add without creating a task until submit", async () => {
    templateMocks.list.mockResolvedValueOnce([{
      id: "template-1", user_id: "test-user-1", title: "Weekly review", priority: "medium",
      folder_id: null, recurrence: "weekly", recurrence_rule: { freq: "weekly", interval: 2 }, tag_ids: [],
    }] as any);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<MemoryRouter><QuickAddTask placeholder="+ Add task" /></MemoryRouter>);

    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByText("Weekly review"));

    expect(screen.getByPlaceholderText("+ Add task")).toHaveValue("Weekly review");
    expect(enqueueOps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle("Add task (Enter)"));
    await waitFor(() => expect(enqueueOps).toHaveBeenCalledTimes(1));
    expect(vi.mocked(enqueueOps).mock.calls[0][0][0].payload).toEqual(expect.objectContaining({
      title: "Weekly review", recurrence_rule: { freq: "weekly", interval: 2 }, recurrence: "weekly",
    }));
  });

  it("previews workflows without writes, then retries only failed IDs and gives each new use fresh IDs", async () => {
    templateMocks.list.mockResolvedValue([{
      id: "workflow-template", user_id: "test-user-1", title: "Prepare launch", priority: "none",
      payload: { workflow_tasks: [
        { id: "item-1", title: "Draft plan", priority: "medium", folder_id: null },
        { id: "item-2", title: "Review plan", priority: "high", folder_id: "folder-1" },
      ] },
    }] as any);
    templateMocks.persist
      .mockResolvedValueOnce("queued")
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("saved");
    const firstRender = render(<MemoryRouter><QuickAddTask placeholder="+ Add task" /></MemoryRouter>);

    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByText("Prepare launch"));

    const titleInput = await screen.findByLabelText("Task 2 title");
    fireEvent.change(titleInput, { target: { value: "Review the final plan" } });
    expect(templateMocks.persist).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create selected tasks" }));

    await waitFor(() => expect(templateMocks.persist).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Failed")).toBeInTheDocument();
    const firstUseCalls = templateMocks.persist.mock.calls.slice(0, 2);
    const firstUseIds = firstUseCalls.map(call => call[1].id);
    expect(firstUseIds[0]).not.toBe(firstUseIds[1]);
    expect(firstUseCalls[1][1]).toEqual(expect.objectContaining({ title: "Review the final plan", parent_id: null, status: "todo", completed: false }));
    const storedRun = JSON.parse(localStorage.getItem("quick_add_workflow_run_v1:test-user-1") || "null");
    expect(storedRun.tasks.map((task: any) => task.id)).toEqual(firstUseIds);
    expect(storedRun.tasks.map((task: any) => task.state)).toEqual(["queued", "failed"]);

    // Simulate a reload after partial completion. The draft and IDs are restored,
    // and a task already accepted by the offline queue is not sent again.
    firstRender.unmount();
    render(<MemoryRouter><QuickAddTask placeholder="+ Add task" /></MemoryRouter>);
    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByText(/Resume workflow/));
    expect(await screen.findByLabelText("Task 2 title")).toHaveValue("Review the final plan");

    fireEvent.click(screen.getByRole("button", { name: "Retry failed tasks" }));
    await waitFor(() => expect(templateMocks.persist).toHaveBeenCalledTimes(3));
    expect(templateMocks.persist.mock.calls[2][1].id).toBe(firstUseIds[1]);
    expect(templateMocks.persist.mock.calls.slice(0, 2).map(call => call[1].id)).toEqual(firstUseIds);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByText("Prepare launch"));
    fireEvent.click(await screen.findByRole("button", { name: "Create selected tasks" }));
    await waitFor(() => expect(templateMocks.persist).toHaveBeenCalledTimes(5));
    const nextUseIds = templateMocks.persist.mock.calls.slice(3, 5).map(call => call[1].id);
    expect(nextUseIds.every(id => !firstUseIds.includes(id))).toBe(true);
  });

  it("cancels a workflow preview without writing any task", async () => {
    templateMocks.list.mockResolvedValueOnce([{
      id: "workflow-template", user_id: "test-user-1", title: "Prepare launch", priority: "none",
      payload: { workflow_tasks: [
        { id: "item-1", title: "Draft plan", priority: "none", folder_id: null },
        { id: "item-2", title: "Review plan", priority: "none", folder_id: null },
      ] },
    }] as any);
    render(<MemoryRouter><QuickAddTask placeholder="+ Add task" /></MemoryRouter>);

    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.keyDown(screen.getByTitle("Task templates"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByText("Prepare launch"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Review workflow/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(templateMocks.persist).not.toHaveBeenCalled();
    expect(localStorage.getItem("quick_add_workflow_run_v1:test-user-1")).toBeNull();
  });

  it("collapses when clicking outside with minimal movement (< 10px)", () => {
    render(
      <MemoryRouter>
        <div>
          <div data-testid="outside-target">Outside Content</div>
          <QuickAddTask placeholder="+ Add task" />
        </div>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();

    const outside = screen.getByTestId("outside-target");

    // Simulate pointerdown and pointerup at same coordinate (a tap/click)
    fireEvent.pointerDown(outside, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(outside, { clientX: 102, clientY: 101 });

    // Should collapse
    expect(screen.queryByTitle("Add task (Enter)")).not.toBeInTheDocument();
  });

  it("does NOT collapse when scrolling (> 10px movement)", () => {
    render(
      <MemoryRouter>
        <div>
          <div data-testid="outside-scroll-area">Scrollable Tasks</div>
          <QuickAddTask placeholder="+ Add task" />
        </div>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();

    const scrollArea = screen.getByTestId("outside-scroll-area");

    // Simulate a scroll touch gesture with pointermove and displacement
    const downEv = new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 200 } as any);
    const moveEv = new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 150 } as any);
    const upEv = new MouseEvent("pointerup", { bubbles: true, clientX: 100, clientY: 120 } as any);
    scrollArea.dispatchEvent(downEv);
    scrollArea.dispatchEvent(moveEv);
    scrollArea.dispatchEvent(upEv);

    // Should remain expanded while scrolling tasks!
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();
  });
});
