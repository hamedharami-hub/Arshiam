import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { Task } from "@/lib/taskTypes";

const mockSetAllTasks = vi.fn();
let mockTasks: Task[] = [];

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ T: (fa: string, en: string) => en, isEn: true }),
}));

vi.mock("@/hooks/useDeviceFormFactor", () => ({
  useDeviceFormFactor: () => ({ isPhone: false }),
}));

vi.mock("@/hooks/useTasksData", () => ({
  useTasksData: () => ({
    allTasks: mockTasks,
    setAllTasks: mockSetAllTasks,
    outcomeById: {},
    outcomeByTaskId: {},
    load: vi.fn(),
  }),
}));

vi.mock("@/components/HeaderTitlePortal", () => ({
  HeaderTitlePortal: ({ title, subtitle }: any) => (
    <div data-testid="header-title-portal">
      <span>{title}</span>
      {subtitle && <span data-testid="header-subtitle">{subtitle}</span>}
    </div>
  ),
}));

vi.mock("@/components/QuickAddTask", () => ({
  QuickAddTask: () => <div data-testid="quick-add-task" />,
}));

vi.mock("@/components/TaskDetail", () => ({
  TaskDetail: ({ task, mode, onClose }: any) => (
    <div data-testid="task-detail" data-mode={mode} data-task-id={task.id}>
      <span>Detail: {task.title}</span>
      <button onClick={onClose}>Close Detail</button>
    </div>
  ),
}));

import TodayDashboardView from "./TodayDashboardView";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname + location.search}</output>;
}

describe("TodayDashboardView visual and structural requirements", { timeout: 15000 }, () => {
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0).toISOString();
  const yesterdayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0).toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders top priorities, active today tasks, collapsible completed tasks, and overdue below today", () => {
    mockTasks = [
      {
        id: "task-urgent",
        user_id: "user-123",
        title: "Urgent Meeting",
        completed: false,
        status: "todo",
        priority: "urgent",
        due_date: todayIso,
        folder_id: null,
        parent_id: null,
      },
      {
        id: "task-regular",
        user_id: "user-123",
        title: "Regular Task",
        completed: false,
        status: "todo",
        priority: "none",
        due_date: todayIso,
        folder_id: null,
        parent_id: null,
      },
      {
        id: "task-completed",
        user_id: "user-123",
        title: "Done Morning Walk",
        completed: true,
        status: "done",
        priority: "low",
        due_date: todayIso,
        completed_at: new Date().toISOString(),
        folder_id: null,
        parent_id: null,
      },
      {
        id: "task-overdue",
        user_id: "user-123",
        title: "Overdue Report",
        completed: false,
        status: "todo",
        priority: "high",
        due_date: yesterdayIso,
        folder_id: null,
        parent_id: null,
      },
    ];

    render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    // 1. Top priorities subtle section has accessible star icon, but no visible counter or big heading
    expect(screen.getByLabelText("Top Priorities")).toBeInTheDocument();
    expect(screen.getByText("Urgent Meeting")).toBeInTheDocument();
    expect(screen.queryByText(/(\d)\/3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/(\d)\/۳/)).not.toBeInTheDocument();

    // 2. Regular active task
    expect(screen.getByText("Regular Task")).toBeInTheDocument();

    // 3. Unwanted text and persistent QuickAdd form must NOT exist
    expect(screen.queryByText("Other tasks for today")).not.toBeInTheDocument();
    expect(screen.queryByText("سایر تسک‌های امروز")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Add a task for today|افزودن تسک برای امروز/i)).not.toBeInTheDocument();

    // 4. Completed tasks toggle
    const completedToggle = screen.getByRole("button", { name: /show completed tasks/i });
    expect(completedToggle).toBeInTheDocument();
    expect(screen.queryByText("Done Morning Walk")).not.toBeInTheDocument();

    // Expand completed
    fireEvent.click(completedToggle);
    expect(screen.getByText("Done Morning Walk")).toBeInTheDocument();

    // 5. Overdue section is present
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Overdue Report")).toBeInTheDocument();
  });

  it("opens Leitner review instead of completing it from a widget deep link", async () => {
    mockTasks = [{
      id: "review-task", title: "Review study cards", due_date: new Date().toISOString(),
      completed: false, status: "todo", source_type: "leitner", source_id: "doc-7",
    } as Task];
    render(
      <MemoryRouter initialEntries={["/app/today?completeTaskId=review-task"]}>
        <LocationProbe />
        <TodayDashboardView />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("location-probe")).toHaveTextContent(
      "/app/review?tab=leitner&studyDocId=doc-7&studyTaskId=review-task",
    ));
    expect(mockSetAllTasks).not.toHaveBeenCalled();
  });

  it("renders split view on wide screens with placeholder and opens task in embedded left panel when clicked", () => {
    mockTasks = [
      {
        id: "task-1",
        user_id: "user-123",
        title: "Write documentation",
        completed: false,
        status: "todo",
        priority: "high",
        due_date: todayIso,
        folder_id: null,
        parent_id: null,
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    // The task list section has independent scrolling (overflow-y-auto and overscroll-contain)
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section?.className).toContain("overflow-y-auto");
    expect(section?.className).toContain("overscroll-contain");

    // Placeholder is shown when no task is selected
    expect(screen.getByText("Select a task")).toBeInTheDocument();
    expect(screen.getByText(/Details open in the left panel while the task list remains on the right/i)).toBeInTheDocument();

    // Clicking a task selects it and renders embedded TaskDetail in the left panel
    const taskTitle = screen.getByText("Write documentation");
    fireEvent.click(taskTitle);

    const detail = screen.getByTestId("task-detail");
    expect(detail).toBeInTheDocument();
    expect(detail.getAttribute("data-mode")).toBe("embedded");
    expect(detail.getAttribute("data-task-id")).toBe("task-1");

    // Closing the detail restores the placeholder
    const closeBtn = screen.getByText("Close Detail");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("task-detail")).not.toBeInTheDocument();
    expect(screen.getByText("Select a task")).toBeInTheDocument();
  });

  it("toggles split view off to single column and opens drawer when a task is selected", () => {
    mockTasks = [
      {
        id: "task-2",
        user_id: "user-123",
        title: "Review pull request",
        completed: false,
        status: "todo",
        priority: "none",
        due_date: todayIso,
        folder_id: null,
        parent_id: null,
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    // Toggle split view off via the split view button
    const toggleBtn = screen.getByTitle("Full width");
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);

    // Split container is now single column (data-task-split="false")
    expect(container.querySelector('[data-task-split="false"]')).toBeInTheDocument();
    expect(screen.queryByText("Select a task")).not.toBeInTheDocument();

    // In single column mode, the section does not constrain height or force independent overflow
    const section = container.querySelector("section");
    expect(section?.className).not.toContain("overflow-y-auto");

    // Clicking the task in single-column mode opens TaskDetail with mode="drawer"
    fireEvent.click(screen.getByText("Review pull request"));

    const detail = screen.getByTestId("task-detail");
    expect(detail).toBeInTheDocument();
    expect(detail.getAttribute("data-mode")).toBe("drawer");
    expect(detail.getAttribute("data-task-id")).toBe("task-2");
  });

  it("merges the date and split view controls into the header on wide screens and omits the separate second row", () => {
    mockTasks = [
      {
        id: "task-10",
        user_id: "user-123",
        title: "Test merged header",
        completed: false,
        status: "todo",
        priority: "high",
        due_date: todayIso,
        folder_id: null,
        parent_id: null,
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    // Title and date are rendered in the header portal
    const headerTitle = screen.getByTestId("header-title-portal");
    expect(headerTitle).toBeInTheDocument();
    expect(headerTitle).toHaveTextContent("Today");
    const headerSubtitle = screen.getByTestId("header-subtitle");
    expect(headerSubtitle).toBeInTheDocument();

    // Split view toggle button is present in the header actions portal
    const toggleBtn = screen.getByTitle("Full width");
    expect(toggleBtn).toBeInTheDocument();

    // A separate second row heading for date is NOT present on wide screens
    // The h1 with date only exists in the mobile second row which should not be rendered
    const h1Elements = container.querySelectorAll("h1");
    expect(h1Elements.length).toBe(0);
  });

  it("merges the date into the header and omits full width button and second row on compact mobile screens", () => {
    window.innerWidth = 390;
    mockTasks = [];

    const { container } = render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    // On mobile, the portal subtitle now has the date directly merged
    expect(screen.getByTestId("header-subtitle")).toBeInTheDocument();

    // The date heading does NOT exist as a separate second row h1 on the page
    const h1Elements = container.querySelectorAll("h1");
    expect(h1Elements.length).toBe(0);

    // The Full width / split view button is NOT rendered on mobile
    expect(screen.queryByTitle("Full width")).not.toBeInTheDocument();
  });

  it("promotes and displays a child task scheduled for today when its parent has no due date", () => {
    mockTasks = [
      {
        id: "parent-project",
        user_id: "user-123",
        title: "Big Overarching Project",
        completed: false,
        status: "todo",
        priority: "none",
        due_date: null,
        folder_id: null,
        parent_id: null,
      },
      {
        id: "child-due-today",
        user_id: "user-123",
        title: "Child Subtask Due Today",
        completed: false,
        status: "todo",
        priority: "high",
        due_date: todayIso,
        folder_id: null,
        parent_id: "parent-project",
      },
    ];

    render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    // Child task is visible on today's dashboard!
    expect(screen.getByText("Child Subtask Due Today")).toBeInTheDocument();

    // The capsule chip badge indicating the parent task is also rendered!
    expect(screen.getByTitle("View parent task")).toBeInTheDocument();
    expect(screen.getByText("Big Overarching Project")).toBeInTheDocument();
  });

  it("separates due and overdue study items from ordinary tasks and priorities", () => {
    mockTasks = [
      {
        id: "personal-urgent",
        user_id: "user-123",
        title: "Urgent personal task",
        completed: false,
        status: "todo",
        priority: "urgent",
        due_date: todayIso,
        folder_id: null,
        parent_id: null,
      },
      {
        id: "study-due",
        user_id: "user-123",
        title: "Leitner cards due today",
        completed: false,
        status: "todo",
        priority: "urgent",
        due_date: todayIso,
        source_type: "leitner",
        source_id: "doc-7",
        folder_id: null,
        parent_id: null,
      },
      {
        id: "personal-overdue",
        user_id: "user-123",
        title: "Overdue personal task",
        completed: false,
        status: "todo",
        priority: "medium",
        due_date: yesterdayIso,
        folder_id: null,
        parent_id: null,
      },
      {
        id: "study-overdue",
        user_id: "user-123",
        title: "Overdue lesson",
        completed: false,
        status: "todo",
        priority: "medium",
        due_date: yesterdayIso,
        source_type: "knowledge_doc",
        source_id: "doc-8",
        folder_id: null,
        parent_id: null,
      },
    ];

    render(
      <MemoryRouter>
        <TodayDashboardView />
      </MemoryRouter>
    );

    expect(screen.getByTestId("top-priorities")).toHaveTextContent("Urgent personal task");
    expect(screen.getByTestId("top-priorities")).not.toHaveTextContent("Leitner cards due today");
    expect(screen.getByTestId("study-due-today")).toHaveTextContent("Leitner cards due today");
    expect(screen.getByTestId("overdue-tasks")).toHaveTextContent("Overdue personal task");
    expect(screen.getByTestId("overdue-tasks")).not.toHaveTextContent("Overdue lesson");
    expect(screen.getByTestId("overdue-study")).toHaveTextContent("Overdue lesson");
  });
});
