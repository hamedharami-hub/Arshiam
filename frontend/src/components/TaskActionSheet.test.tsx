import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskActionSheet from "./TaskActionSheet";
import type { Task } from "@/lib/taskTypes";

const feedback = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
const planningMocks = vi.hoisted(() => ({
  setNextTask: vi.fn(), clearNextTaskIf: vi.fn(), toggleImportant: vi.fn(), setWipEnabled: vi.fn(), setWipLimit: vi.fn(),
  data: { nextTaskId: null, nextTaskDate: null, importantByDay: {}, wipEnabled: false, wipLimit: 3 },
}));
const relationMocks = vi.hoisted(() => ({ fetchTasks: vi.fn(), hasServerAuthoritativeTasks: vi.fn() }));

vi.mock("sonner", () => ({ toast: feedback }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
  }),
}));

vi.mock("@/features/tasks/taskService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/tasks/taskService")>(),
  fetchTasks: relationMocks.fetchTasks,
  hasServerAuthoritativeTasks: relationMocks.hasServerAuthoritativeTasks,
}));

vi.mock("@/hooks/useTodayPlanning", () => ({
  useTodayPlanning: () => ({
    data: planningMocks.data,
    nextTaskId: planningMocks.data.nextTaskId,
    isImportant: () => false,
    setNextTask: planningMocks.setNextTask,
    clearNextTaskIf: planningMocks.clearNextTaskIf,
    toggleImportant: planningMocks.toggleImportant,
    setWipEnabled: planningMocks.setWipEnabled,
    setWipLimit: planningMocks.setWipLimit,
  }),
}));

vi.mock("@/hooks/useShareAccess", () => ({
  useShareAccess: () => ({
    isOwner: true,
    canEdit: true,
    canComment: true,
  }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock("@/lib/capabilities", () => ({
  isFeatureEnabled: () => false,
}));

vi.mock("@/components/TaskActivities", () => ({
  TaskActivities: () => <div data-testid="task-activities">Activities</div>,
}));

describe("TaskActionSheet Responsive Behavior", () => {
  const dummyTask: Task = {
    id: "task-test-1",
    title: "Responsive Task Test",
    user_id: "user-123",
    created_at: new Date().toISOString(),
    priority: "urgent",
    completed: false,
    status: "todo",
    updated_at: new Date().toISOString(),
  };

  const defaultProps = {
    task: dummyTask,
    open: true,
    onOpenChange: vi.fn(),
    onComplete: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
    onMakeChild: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    feedback.success.mockReset();
    feedback.error.mockReset();
    feedback.info.mockReset();
    feedback.warning.mockReset();
    planningMocks.setNextTask.mockReset();
    planningMocks.clearNextTaskIf.mockReset();
    planningMocks.toggleImportant.mockReset();
    planningMocks.setWipEnabled.mockReset();
    planningMocks.setWipLimit.mockReset();
    planningMocks.data.nextTaskId = null;
    planningMocks.data.wipEnabled = false;
    planningMocks.data.wipLimit = 3;
    relationMocks.fetchTasks.mockReset().mockResolvedValue([]);
    relationMocks.hasServerAuthoritativeTasks.mockReset().mockReturnValue(true);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders inside a bounded Dialog (not bottom sheet) on Windows", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");

    render(<TaskActionSheet {...defaultProps} />);

    // In Radix Dialog, dialog role is present
    const dialogElement = screen.getByRole("dialog");
    expect(dialogElement).toBeInTheDocument();

    // Verify it uses the bounded dialog classes
    expect(dialogElement.className).toContain("max-w-md");
    expect(dialogElement.className).toContain("max-h-[75vh]");
    expect(dialogElement.className).not.toContain("rounded-t-2xl");
  });

  it("opens from an initially absent task without changing hook order and keeps focus action available", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const startFocus = vi.fn();
    const { rerender } = render(<TaskActionSheet {...defaultProps} task={null} open={false} onPomodoro={startFocus} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<TaskActionSheet {...defaultProps} onPomodoro={startFocus} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/پومودورو|Pomodoro/i));
    expect(startFocus).toHaveBeenCalledTimes(1);
  });

  it("renders inside a bounded Dialog on Foldable", () => {
    localStorage.setItem("arshnaz_nav_mode", "foldable");

    render(<TaskActionSheet {...defaultProps} />);

    const dialogElement = screen.getByRole("dialog");
    expect(dialogElement).toBeInTheDocument();
    expect(dialogElement.className).toContain("max-w-md");
    expect(dialogElement.className).toContain("max-h-[75vh]");
  });

  it("renders inside a bottom Sheet on Phone", () => {
    localStorage.setItem("arshnaz_nav_mode", "phone");

    render(<TaskActionSheet {...defaultProps} />);

    const sheetElement = screen.getByRole("dialog");
    expect(sheetElement).toBeInTheDocument();
    // Sheet has bottom sheet class rounded-t-2xl and max-h-[85vh]
    expect(sheetElement.className).toContain("rounded-t-2xl");
  });

  it("no longer offers an Add Comment entry (comments were merged into the task text)", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    expect(screen.queryByText(/افزودن توضیح|Add Comment/i)).not.toBeInTheDocument();
    const dialogElement = screen.getByRole("dialog");
    expect(dialogElement.className).toContain("max-h-[75vh]");
  });

  it("does not offer Save as Template while keeping the rest of the task actions", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    expect(screen.queryByText(/Save as Template|تمپلیت/i)).not.toBeInTheDocument();
    expect(screen.getByText(/تکثیر|Duplicate/i)).toBeInTheDocument();
  });

  it("keeps one edit entry instead of three rows that all open the same screen", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const onEdit = vi.fn();
    render(<TaskActionSheet {...defaultProps} onEdit={onEdit} />);

    expect(screen.queryByText(/ضمیمه|Attachment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^تگ$|^Tags$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/ویرایش و جزئیات|Edit & details/i));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("keeps a single Waiting & prerequisites entry, in the More view", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} />);

    expect(screen.queryByText(/انتظار و پیش‌نیازها|Waiting & prerequisites/i)).toBeNull();
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    expect(screen.getAllByText(/انتظار و پیش‌نیازها|Waiting & prerequisites/i)).toHaveLength(1);
  });

  it("requires explicit confirmation for a future next-task choice without changing its schedule", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const futureTask = { ...dummyTask, schedule_v: 2, work_date: "2099-10-08" };
    render(<TaskActionSheet {...defaultProps} task={futureTask} />);

    fireEvent.click(screen.getByText(/انتخاب به‌عنوان کار بعدی من|Set as my next task/i));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/تاریخ برنامه‌ریزی‌شدهٔ تسک تغییر نمی‌کند|planned date will stay unchanged/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/انتخاب بدون تغییر تاریخ|Choose without changing date/i));

    expect(planningMocks.setNextTask).toHaveBeenCalledWith(futureTask.id);
    expect(futureTask.work_date).toBe("2099-10-08");
  });

  it("keeps WIP as a soft warning and still starts work", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const onPatch = vi.fn().mockResolvedValue("saved");
    render(<TaskActionSheet {...defaultProps} onPatch={onPatch} wipEnabled wipLimit={3} wipCount={3} onSetWipEnabled={planningMocks.setWipEnabled} />);

    fireEvent.click(screen.getByText(/شروع کار|Start work/i));
    await waitFor(() => expect(onPatch).toHaveBeenCalledWith({ status: "in_progress", completed: false }));
    expect(feedback.warning).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate start writes while the first request is pending", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    let resolvePatch!: (status: "saved") => void;
    const onPatch = vi.fn(() => new Promise<"saved">(resolve => { resolvePatch = resolve; }));
    render(<TaskActionSheet {...defaultProps} onPatch={onPatch} onSetWipEnabled={planningMocks.setWipEnabled} />);

    const getStartButton = () => screen.getByText(/شروع کار|Start work/i).closest("button")!;
    fireEvent.click(getStartButton());
    await waitFor(() => expect(getStartButton()).toBeDisabled());
    fireEvent.click(getStartButton());
    expect(onPatch).toHaveBeenCalledTimes(1);

    resolvePatch("saved");
    await waitFor(() => expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps the WIP setting opt-in in the existing More menu", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} onSetWipEnabled={planningMocks.setWipEnabled} onSetWipLimit={planningMocks.setWipLimit} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(planningMocks.setWipEnabled).toHaveBeenCalledWith(true);
  });

  it("allows an optional important-today mark through the task action menu", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} />);
    fireEvent.click(screen.getByText(/مهم امروز|Important today/i));
    expect(planningMocks.toggleImportant).toHaveBeenCalledWith(dummyTask.id);
  });

  it("keeps the action sheet open and avoids success feedback when a patch returns no status", async () => {
    const onOpenChange = vi.fn();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<TaskActionSheet {...defaultProps} onOpenChange={onOpenChange} onPatch={onPatch as any} />);

    fireEvent.click(screen.getByText(/انجام نمی‌شود|Won't Do/i));

    await waitFor(() => expect(onPatch).toHaveBeenCalledWith({ status: "wont_do", completed: false }));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(feedback.success).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalledOnce();
  });

  it("reports queued action patches as local sync work instead of cloud success", async () => {
    const onOpenChange = vi.fn();
    const onPatch = vi.fn().mockResolvedValue("queued" as const);
    render(<TaskActionSheet {...defaultProps} onOpenChange={onOpenChange} onPatch={onPatch} />);

    fireEvent.click(screen.getByText(/انجام نمی‌شود|Won't Do/i));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(feedback.info).toHaveBeenCalledOnce();
    expect(feedback.success).not.toHaveBeenCalled();
  });

  it("saves optional waiting reason once and does not alter schedule", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const future = { ...dummyTask, work_date: "2099-10-08", schedule_v: 2 };
    let resolvePatch!: (status: "saved") => void;
    const onPatch = vi.fn(() => new Promise<"saved">((resolve) => { resolvePatch = resolve; }));
    render(<TaskActionSheet {...defaultProps} task={future} onPatch={onPatch} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    fireEvent.click(screen.getByText(/انتظار و پیش‌نیازها|Waiting & prerequisites/i));
    fireEvent.change(await screen.findByTestId("task-waiting-reason"), { target: { value: "Waiting on a review" } });
    const markWaiting = screen.getByTestId("task-mark-waiting");
    fireEvent.click(markWaiting);
    await waitFor(() => expect(markWaiting).toBeDisabled());
    fireEvent.click(markWaiting);
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ status: "waiting", completed: false, waiting_reason: "Waiting on a review" });
    expect(future.work_date).toBe("2099-10-08");
    resolvePatch("saved");
    await waitFor(() => expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false));
  });

  it("allows valid prerequisites and blocks recurring and cyclic candidates", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const current = { ...dummyTask, prerequisite_ids: [] };
    relationMocks.fetchTasks.mockResolvedValueOnce([
      current,
      { ...dummyTask, id: "prep", title: "Prepare base", prerequisite_ids: [] },
      { ...dummyTask, id: "cycle", title: "Would make a cycle", prerequisite_ids: [current.id] },
      { ...dummyTask, id: "repeat", title: "Recurring task", recurrence: "weekly" },
    ]);
    const onPatch = vi.fn().mockResolvedValue("saved");
    render(<TaskActionSheet {...defaultProps} task={current} onPatch={onPatch} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    fireEvent.click(screen.getByText(/انتظار و پیش‌نیازها|Waiting & prerequisites/i));
    await screen.findByText("Prepare base");
    expect(screen.getByText("Would make a cycle").closest("label")?.querySelector("input")).toBeDisabled();
    expect(screen.getByText("Recurring task").closest("label")?.querySelector("input")).toBeDisabled();
    fireEvent.click(screen.getByText("Prepare base").closest("label")!.querySelector("input")!);
    fireEvent.click(screen.getByTestId("task-save-prerequisites"));
    await waitFor(() => expect(onPatch).toHaveBeenCalledWith({ prerequisite_ids: ["prep"] }));
  });

  it("does not turn an offline cached task list into missing prerequisites or clear links", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const current = { ...dummyTask, prerequisite_ids: ["prerequisite-not-in-cache"] };
    relationMocks.fetchTasks.mockResolvedValueOnce([current]);
    relationMocks.hasServerAuthoritativeTasks.mockReturnValue(false);
    const onPatch = vi.fn().mockResolvedValue("saved");
    render(<TaskActionSheet {...defaultProps} task={current} onPatch={onPatch} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    fireEvent.click(screen.getByText(/انتظار و پیش‌نیازها|Waiting & prerequisites/i));
    expect(await screen.findByTestId("task-prerequisite-readiness")).toHaveTextContent(/فهرست کامل تسک‌ها در دسترس نیست|complete task list is unavailable/);
    expect(screen.queryByText(/Missing prerequisite/)).not.toBeInTheDocument();
    expect(screen.getByTestId("task-save-prerequisites")).toBeDisabled();
    expect(onPatch).not.toHaveBeenCalled();
  });
});
