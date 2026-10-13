import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskSubtasksInline } from "./TaskSubtasksInline";
import { getGardenState } from "@/lib/garden";
import type { ComponentProps } from "react";

const dnd = vi.hoisted(() => ({ end: undefined as ((event: { active: { id: string }; over: { id: string } }) => void) | undefined }));
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return { ...actual, DndContext: (props: ComponentProps<typeof actual.DndContext>) => {
    dnd.end = props.onDragEnd as typeof dnd.end;
    return <actual.DndContext {...props} />;
  } };
});

const auth = vi.hoisted(() => ({ id: "test-user-subtasks" }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: auth.id }, loading: false }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
const deleteMocks = vi.hoisted(() => ({
  cascade: vi.fn(async (..._args: unknown[]) => ({ success: true, deletedIds: ["sub-1"] })),
  cachedTasks: [] as unknown,
  serverTasks: [] as unknown[] | null,
  preflight: vi.fn(),
}));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: vi.fn(async () => deleteMocks.cachedTasks) }));
vi.mock("./TaskPlanningPicker", () => ({ TaskPlanningPicker: ({ task, onPatch }: { task: { id: string; priority: string }; onPatch: (patch: { priority: string }) => void }) => <button aria-label={`Plan ${task.id}`} onClick={() => onPatch({ priority: task.priority === "high" ? "low" : "high" })}>{task.priority}</button> }));

vi.mock("@/features/tasks/taskService", () => ({
  deleteTaskCascade: (...args: unknown[]) => deleteMocks.cascade(...args),
  getServerConfirmedCascadeTasks: (...args: unknown[]) => deleteMocks.preflight(...args),
}));

const mockPersistTask = vi.fn().mockResolvedValue("saved");
vi.mock("@/lib/firestoreDataService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/firestoreDataService")>();
  return {
    ...actual,
    persistTask: (...args: unknown[]) => mockPersistTask(...args),
  };
});

describe("TaskSubtasksInline Component", () => {
  beforeEach(() => {
    window.localStorage.clear();
    auth.id = "test-user-subtasks";
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    mockPersistTask.mockReset().mockResolvedValue("saved");
    deleteMocks.cascade.mockReset().mockResolvedValue({ success: true, deletedIds: ["sub-1"] });
    deleteMocks.cachedTasks = null;
    deleteMocks.serverTasks = [];
    deleteMocks.preflight.mockReset().mockImplementation(async () => deleteMocks.serverTasks);
  });

  it("renders subtasks and allows checking without reverting when parent re-renders", async () => {
    const initialSubs = [
      { id: "sub-1", title: "مرحله اول کار", completed: false, position: 0 },
      { id: "sub-2", title: "مرحله دوم کار", completed: false, position: 1 },
    ];

    const onProgress = vi.fn();
    const onSubtasksChange = vi.fn();

    const { rerender } = render(
      <TaskSubtasksInline
        taskId="parent-task-1"
        initialSubs={initialSubs}
        onProgressChange={onProgress}
        onSubtasksChange={onSubtasksChange}
      />
    );

    expect(screen.getByText("مرحله اول کار")).toBeInTheDocument();
    expect(screen.getByText("مرحله دوم کار")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();

    // Check first subtask
    fireEvent.click(checkboxes[0]);

    // Checkboxes should now reflect completed
    expect(checkboxes[0]).toBeChecked();

    // Verify persistTask called with status: done and parent_id
    expect(mockPersistTask).toHaveBeenCalledWith(
      "test-user-subtasks",
      expect.objectContaining({
        id: "sub-1",
        completed: true,
        status: "done",
        parent_id: "parent-task-1",
      })
    );

    // Verify garden water was awarded
    const garden = getGardenState();
    expect(garden.waterDrops).toBeGreaterThanOrEqual(35); // 30 initial + 5 for subtask

    // Parent re-renders with the OLD initialSubs (which previously caused reverting!)
    rerender(
      <TaskSubtasksInline
        taskId="parent-task-1"
        initialSubs={initialSubs}
        onProgressChange={onProgress}
        onSubtasksChange={onSubtasksChange}
      />
    );

    // Subtask 1 MUST REMAIN CHECKED and not revert!
    const recheckedCheckboxes = screen.getAllByRole("checkbox");
    expect(recheckedCheckboxes[0]).toBeChecked();
  });

  it("preserves a failed draft and ignores rapid repeated Enter while saving", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent-add" initialSubs={[]} />);
    const input = screen.getByPlaceholderText("+ زیرتسک جدید...");
    fireEvent.change(input, { target: { value: "کار جدید" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPersistTask).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("کار جدید");
    await act(async () => finish("failed"));
    expect(input).toHaveValue("کار جدید");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(input).toHaveValue(""));
    expect(mockPersistTask).toHaveBeenCalledTimes(2);
    expect(mockPersistTask.mock.calls[1][1].id).toBe(mockPersistTask.mock.calls[0][1].id);
    expect(screen.getByDisplayValue("کار جدید")).toBeInTheDocument();
  });

  it("does not submit an empty draft or Enter used for text composition", async () => {
    render(<TaskSubtasksInline taskId="parent-ime" initialSubs={[]} />);
    const input = screen.getByPlaceholderText("+ زیرتسک جدید...");
    fireEvent.change(input, { target: { value: "  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "عنوان" } });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(mockPersistTask).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mockPersistTask).toHaveBeenCalledTimes(1));
  });

  it("deletes a leaf subtask immediately without a confirmation dialog", async () => {
    render(<TaskSubtasksInline taskId="parent-delete" initialSubs={[
      { id: "sub-1", title: "مرحله", completed: false, position: 0 },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک مرحله" }));
    await waitFor(() => expect(deleteMocks.cascade).toHaveBeenCalledWith("test-user-subtasks", "sub-1"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("confirms before deleting a subtask with descendants and explains the cascade", async () => {
    deleteMocks.cachedTasks = [
      { id: "sub-1", parent_id: "parent-delete" },
      { id: "nested-1", parent_id: "sub-1" },
    ];
    deleteMocks.serverTasks = [
      { id: "parent-delete" },
      { id: "sub-1", parent_id: "parent-delete" },
      { id: "nested-1", parent_id: "sub-1" },
    ];
    render(<TaskSubtasksInline taskId="parent-delete" initialSubs={[
      { id: "sub-1", title: "مرحله", completed: false, position: 0 },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک مرحله" }));
    const confirmation = await screen.findByRole("alertdialog");
    expect(confirmation).toHaveTextContent("همهٔ زیرتسک‌های تو در تو");
    expect(deleteMocks.cascade).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک" }));
    await waitFor(() => expect(deleteMocks.cascade).toHaveBeenCalledWith("test-user-subtasks", "sub-1"));
  });

  it("confirms when the stale local cache misses a server-known nested child", async () => {
    deleteMocks.cachedTasks = [];
    deleteMocks.serverTasks = [
      { id: "parent-delete" },
      { id: "sub-1", parent_id: "parent-delete" },
      { id: "server-child", parent_id: "sub-1" },
    ];
    render(<TaskSubtasksInline taskId="parent-delete" initialSubs={[
      { id: "sub-1", title: "مرحله", completed: false, position: 0 },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک مرحله" }));
    const confirmation = await screen.findByRole("alertdialog");
    expect(confirmation).toHaveTextContent("همهٔ زیرتسک‌های تو در تو");
    expect(deleteMocks.cascade).not.toHaveBeenCalled();
  });

  it("warns before deleting when an online server snapshot cannot confirm whether descendants exist", async () => {
    deleteMocks.serverTasks = null;
    render(<TaskSubtasksInline taskId="parent-delete" initialSubs={[
      { id: "sub-1", title: "مرحله", completed: false, position: 0 },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک مرحله" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(deleteMocks.cascade).not.toHaveBeenCalled();
  });

  it("warns offline even when a fresh cache shows no nested child", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    deleteMocks.cachedTasks = {
      tasks: [
        { id: "parent-delete" },
        { id: "sub-1", parent_id: "parent-delete" },
      ],
      cachedAt: Date.now(),
    };
    render(<TaskSubtasksInline taskId="parent-delete" initialSubs={[
      { id: "sub-1", title: "مرحله", completed: false, position: 0 },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک مرحله" }));
    const confirmation = await screen.findByRole("alertdialog");
    expect(confirmation).toHaveTextContent("فهرست زیرتسک‌ها از سرور تأیید نشده است");
    expect(deleteMocks.cascade).not.toHaveBeenCalled();
  });

  it("keeps new typing entered while the preceding subtask is being saved", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent-next" initialSubs={[]} />);
    const input = screen.getByPlaceholderText("+ زیرتسک جدید...");
    fireEvent.change(input, { target: { value: "اول" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "دوم" } });
    await act(async () => finish("saved"));
    expect(input).toHaveValue("دوم");
    expect(mockPersistTask.mock.calls[0][1]).toMatchObject({ parent_id: "parent-next", title: "اول", status: "todo", completed: false });
  });

  it("does not insert a delayed save result into a different parent's rows", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const changed = vi.fn();
    const { rerender } = render(<TaskSubtasksInline taskId="parent-old" initialSubs={[]} onSubtasksChange={changed} />);
    const input = screen.getByPlaceholderText("+ زیرتسک جدید...");
    fireEvent.change(input, { target: { value: "زیرکار قبلی" } });
    fireEvent.keyDown(input, { key: "Enter" });
    rerender(<TaskSubtasksInline taskId="parent-new" initialSubs={[]} onSubtasksChange={changed} />);
    await act(async () => finish("saved"));
    expect(screen.queryByDisplayValue("زیرکار قبلی")).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it("does not roll back other rows or edits when a toggle fails", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent" initialSubs={[
      { id: "a", title: "First", completed: false, position: 0 },
      { id: "b", title: "Second", completed: false, position: 1 },
    ]} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.change(screen.getByDisplayValue("Second"), { target: { value: "New second title" } });
    await act(async () => finish("failed"));
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
    expect(screen.getAllByRole("checkbox")[1]).toBeChecked();
    expect(screen.getByDisplayValue("New second title")).toBeInTheDocument();
  });

  it("serializes rapid toggles and does not apply an older failure to a newer toggle", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "a", title: "First", completed: false, position: 0 }]} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(mockPersistTask).toHaveBeenCalledTimes(1);
    await act(async () => finish("failed"));
    await waitFor(() => expect(mockPersistTask).toHaveBeenCalledTimes(2));
    expect(mockPersistTask.mock.calls[1][1].completed).toBe(false);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("does not restore a failed old-account toggle into new-account rows", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const changed = vi.fn();
    const view = render(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "a", title: "Old", completed: false, position: 0 }]} onSubtasksChange={changed} />);
    fireEvent.click(screen.getByRole("checkbox"));
    changed.mockClear();
    auth.id = "new-account";
    view.rerender(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "b", title: "New", completed: false, position: 0 }]} onSubtasksChange={changed} />);
    await act(async () => finish("failed"));
    expect(screen.getByDisplayValue("New")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Old")).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it("abandons delayed delete preflight after switching tasks", async () => {
    let finish!: (rows: unknown[]) => void;
    deleteMocks.preflight.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<TaskSubtasksInline taskId="old-parent" initialSubs={[{ id: "a", title: "Old", completed: false, position: 0 }]} />);
    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک Old" }));
    view.rerender(<TaskSubtasksInline taskId="new-parent" initialSubs={[{ id: "b", title: "New", completed: false, position: 0 }]} />);
    await act(async () => finish([]));
    expect(deleteMocks.cascade).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("flushes titles to the original account on scope switch without leaking them", async () => {
    const view = render(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "a", title: "Old", completed: false, position: 0 }]} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "Pending title" } });
    auth.id = "new-account";
    view.rerender(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "b", title: "New", completed: false, position: 0 }]} />);
    await waitFor(() => expect(mockPersistTask).toHaveBeenCalledWith("test-user-subtasks", { id: "a", title: "Pending title" }));
    expect(mockPersistTask.mock.calls.every(call => call[0] === "test-user-subtasks")).toBe(true);
    expect(screen.getByDisplayValue("New")).toBeInTheDocument();
  });

  it("serializes title blur saves so an older request cannot overwrite newer text", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "a", title: "Old", completed: false, position: 0 }]} />);
    const input = screen.getByDisplayValue("Old");
    fireEvent.change(input, { target: { value: "First edit" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "Second edit" } });
    fireEvent.blur(input);
    expect(mockPersistTask).toHaveBeenCalledTimes(1);
    await act(async () => finish("saved"));
    await waitFor(() => expect(mockPersistTask).toHaveBeenCalledTimes(2));
    expect(mockPersistTask.mock.calls[1][1].title).toBe("Second edit");
    expect(input).toHaveValue("Second edit");
  });

  it("warns before browser exit with an unsubmitted subtask draft", () => {
    render(<TaskSubtasksInline taskId="parent" initialSubs={[]} />);
    fireEvent.change(screen.getByPlaceholderText("+ زیرتسک جدید..."), { target: { value: "Unsaved" } });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("restores the last confirmed toggle when consecutive toggles both fail", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce("failed");
    render(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "a", title: "First", completed: false, position: 0 }]} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => finish("failed"));
    await waitFor(() => expect(mockPersistTask).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("restores confirmed planning after overlapping failures without losing title edits", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce("failed");
    render(<TaskSubtasksInline taskId="parent" initialSubs={[{ id: "a", title: "First", completed: false, priority: "none", position: 0 }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Plan a" }));
    fireEvent.click(screen.getByRole("button", { name: "Plan a" }));
    fireEvent.change(screen.getByDisplayValue("First"), { target: { value: "Local title" } });
    await act(async () => finish("failed"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Plan a" })).toHaveTextContent("none"));
    expect(screen.getByDisplayValue("Local title")).toBeInTheDocument();
  });

  it("restores only a failed deletion while preserving another row's draft", async () => {
    let finish!: (value: { success: boolean; deletedIds: string[] }) => void;
    deleteMocks.cascade.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent" initialSubs={[
      { id: "a", title: "First", completed: false, position: 0 },
      { id: "b", title: "Second", completed: false, position: 1 },
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "حذف زیرتسک First" }));
    await waitFor(() => expect(deleteMocks.cascade).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByDisplayValue("Second"), { target: { value: "Keep other draft" } });
    await act(async () => finish({ success: false, deletedIds: [] }));
    expect(screen.getByDisplayValue("First")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Keep other draft")).toBeInTheDocument();
  });

  it("rolls back only reorder positions without reverting concurrent title edits", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskSubtasksInline taskId="parent" initialSubs={[
      { id: "a", title: "First", completed: false, position: 0 },
      { id: "b", title: "Second", completed: false, position: 1 },
    ]} />);
    act(() => dnd.end?.({ active: { id: "a" }, over: { id: "b" } }));
    fireEvent.change(screen.getByDisplayValue("Second"), { target: { value: "Keep reordered draft" } });
    await act(async () => finish("failed"));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("First");
    expect(screen.getAllByRole("textbox")[1]).toHaveValue("Keep reordered draft");
  });

  it("ignores reorder failure after switching to a different task", async () => {
    let finish!: (value: string) => void;
    mockPersistTask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<TaskSubtasksInline taskId="parent" initialSubs={[
      { id: "a", title: "First", completed: false, position: 0 },
      { id: "b", title: "Second", completed: false, position: 1 },
    ]} />);
    act(() => dnd.end?.({ active: { id: "a" }, over: { id: "b" } }));
    view.rerender(<TaskSubtasksInline taskId="new-parent" initialSubs={[{ id: "c", title: "New task", completed: false, position: 0 }]} />);
    await act(async () => finish("failed"));
    expect(screen.getByDisplayValue("New task")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("First")).toBeNull();
  });
});
