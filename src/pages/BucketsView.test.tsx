import React, { forwardRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import BucketsView from "./BucketsView";
import { currentPeriod, getTimeSettings } from "@/lib/timeHorizon";
import { setShowCompletedTasks } from "@/lib/completedTaskVisibility";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = { id: "user-test-123" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const settings = getTimeSettings();
const weekPeriod = currentPeriod("week", settings);

const mockFolder1 = { id: "folder-health", name: "پروژه سلامت", parent_id: null, color: "#10b981", position: 0 };
const mockTag1 = { id: "tag-urgent", name: "فوری", color: "#f59e0b" };

const mockTask1 = {
  id: "task-bucket-1",
  user_id: "user-test-123",
  title: "خرید دارو برای فردا",
  completed: false,
  status: "todo",
  horizon: "week" as const,
  period_start: weekPeriod.start,
  period_end: weekPeriod.end,
  priority: "high" as const,
  position: 0,
  created_at: "2026-09-29T10:00:00Z",
  folder_id: "folder-health",
};

const mockCompletedTask = {
  id: "task-bucket-done",
  user_id: "user-test-123",
  title: "نسخه دارویی تحویل شد",
  completed: true,
  status: "done",
  horizon: "week" as const,
  period_start: weekPeriod.start,
  period_end: weekPeriod.end,
  priority: "medium" as const,
  position: 1,
  created_at: "2026-09-29T10:00:00Z",
  folder_id: null,
};

vi.mock("@/hooks/useHorizonData", () => ({
  useHorizonData: () => ({
    tasks: [mockTask1, mockCompletedTask],
    loading: false,
    folders: [mockFolder1],
    tags: [mockTag1],
    taskTags: new Map([["task-bucket-1", new Set(["tag-urgent"])]]),
    setTime: vi.fn(),
    toggleDone: vi.fn(),
    createTask: vi.fn(),
  }),
}));

vi.mock("@/components/TaskDetail", () => ({
  TaskDetail: forwardRef(({ task, onClose, mode }: any, _ref) => (
    <div data-testid="in-page-task-detail" data-mode={mode}>
      <span data-testid="detail-title">{task.title}</span>
      <button onClick={onClose} data-testid="close-task-detail-btn">بستن</button>
    </div>
  )),
}));

vi.mock("@/components/weather/WeatherWeekStrip", () => ({
  WeatherWeekStrip: () => <div data-testid="weather-week-strip" />,
}));

describe("BucketsView in-place task detail and exit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setShowCompletedTasks(true);
  });

  it("opens task detail drawer in-place when a task is clicked and does not navigate to /app/today", () => {
    render(
      <MemoryRouter initialEntries={["/app/buckets"]}>
        <BucketsView />
      </MemoryRouter>
    );

    // Initial state: task row should be visible
    expect(screen.getByTestId("horizon-task-task-bucket-1")).toBeInTheDocument();
    expect(screen.queryByTestId("in-page-task-detail")).not.toBeInTheDocument();

    // Click on the task row title/content
    const taskRowButton = screen.getByText("خرید دارو برای فردا");
    fireEvent.click(taskRowButton);

    // Should NOT have navigated away
    expect(mockNavigate).not.toHaveBeenCalled();

    // In-page task detail drawer should now be open
    expect(screen.getByTestId("in-page-task-detail")).toBeInTheDocument();
    expect(screen.getByTestId("detail-title")).toHaveTextContent("خرید دارو برای فردا");

    // Close the detail
    fireEvent.click(screen.getByTestId("close-task-detail-btn"));

    // Task detail should close and user remains in BucketsView
    expect(screen.queryByTestId("in-page-task-detail")).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("horizon-task-task-bucket-1")).toBeInTheDocument();
  });

  it("toggles completed tasks visibility via HorizonFilterBar completed chip", () => {
    render(
      <MemoryRouter initialEntries={["/app/buckets"]}>
        <BucketsView />
      </MemoryRouter>
    );

    const toggleChip = screen.getByTestId("horizon-toggle-completed");
    expect(toggleChip).toBeInTheDocument();
    expect(toggleChip).toHaveTextContent("انجام‌شده‌ها: روشن");
    expect(screen.getByTestId("horizon-task-task-bucket-done")).toBeInTheDocument();

    // Click to toggle off
    fireEvent.click(toggleChip);
    expect(toggleChip).toHaveTextContent("انجام‌شده‌ها: خاموش");
    expect(screen.queryByTestId("horizon-task-task-bucket-done")).not.toBeInTheDocument();

    // Click to toggle back on
    fireEvent.click(toggleChip);
    expect(toggleChip).toHaveTextContent("انجام‌شده‌ها: روشن");
    expect(screen.getByTestId("horizon-task-task-bucket-done")).toBeInTheDocument();
  });

  it("filters tasks by search input query in BucketsView", () => {
    render(
      <MemoryRouter initialEntries={["/app/buckets"]}>
        <BucketsView />
      </MemoryRouter>
    );

    const searchInput = screen.getByTestId("horizon-filter-search-input");
    expect(searchInput).toBeInTheDocument();

    // Both tasks initially visible
    expect(screen.getByTestId("horizon-task-task-bucket-1")).toBeInTheDocument();
    expect(screen.getByTestId("horizon-task-task-bucket-done")).toBeInTheDocument();

    // Type query matching only first task
    fireEvent.change(searchInput, { target: { value: "خرید" } });
    expect(screen.getByTestId("horizon-task-task-bucket-1")).toBeInTheDocument();
    expect(screen.queryByTestId("horizon-task-task-bucket-done")).not.toBeInTheDocument();

    // Type query matching only completed task
    fireEvent.change(searchInput, { target: { value: "تحویل" } });
    expect(screen.queryByTestId("horizon-task-task-bucket-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("horizon-task-task-bucket-done")).toBeInTheDocument();
  });

  it("filters to completed-only tasks via main filter menu", () => {
    render(
      <MemoryRouter initialEntries={["/app/buckets"]}>
        <BucketsView />
      </MemoryRouter>
    );

    // Open main filter popover
    fireEvent.click(screen.getByTestId("horizon-filter-btn"));

    // Click "فقط انجام‌شده" (Completed only)
    const completedOnlyBtn = screen.getByTestId("horizon-filter-completed-only");
    fireEvent.click(completedOnlyBtn);

    // Only completed task should be in document
    expect(screen.queryByTestId("horizon-task-task-bucket-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("horizon-task-task-bucket-done")).toBeInTheDocument();

    // Switch back to "فقط باز" (Incomplete only)
    const incompleteBtn = screen.getByTestId("horizon-filter-hide-completed");
    fireEvent.click(incompleteBtn);

    expect(screen.getByTestId("horizon-task-task-bucket-1")).toBeInTheDocument();
    expect(screen.queryByTestId("horizon-task-task-bucket-done")).not.toBeInTheDocument();
  });
});
