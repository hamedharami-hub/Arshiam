import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
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
  HeaderTitlePortal: () => null,
}));

import TodayDashboardView from "./TodayDashboardView";

describe("TodayDashboardView visual and structural requirements", () => {
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0).toISOString();
  const yesterdayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0).toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
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
});
