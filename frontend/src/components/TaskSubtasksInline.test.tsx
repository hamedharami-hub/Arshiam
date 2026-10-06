import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskSubtasksInline } from "./TaskSubtasksInline";
import { getGardenState } from "@/lib/garden";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-subtasks" }, loading: false }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: vi.fn().mockResolvedValue([]) }));
vi.mock("./TaskPlanningPicker", () => ({ TaskPlanningPicker: () => null }));

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
    mockPersistTask.mockReset().mockResolvedValue("saved");
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
});
