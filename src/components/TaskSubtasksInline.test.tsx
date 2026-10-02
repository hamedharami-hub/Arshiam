import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    mockPersistTask.mockClear();
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
});
