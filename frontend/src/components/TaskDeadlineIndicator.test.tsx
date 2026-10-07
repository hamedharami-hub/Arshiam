import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";
import { TaskDeadlineIndicator } from "./TaskDeadlineIndicator";

const T = (fa: string) => fa;
const task = (deadline_date: string, completed = false): Task & { deadline_date: string } => ({
  id: "task-1",
  title: "Task",
  priority: "none",
  status: completed ? "done" : "todo",
  completed,
  deadline_date,
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TaskDeadlineIndicator", () => {
  it("shows a compact indicator for a deadline today through seven days away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 12));

    const { rerender } = render(<TaskDeadlineIndicator task={task("2026-10-07")} isEn={false} T={T} />);
    expect(screen.getByTestId("task-deadline-indicator-task-1").getAttribute("aria-label")).toMatch(/^مهلت نزدیک است:/);

    rerender(<TaskDeadlineIndicator task={task("2026-10-14")} isEn={false} T={T} />);
    expect(screen.getByTestId("task-deadline-indicator-task-1")).toBeInTheDocument();

    rerender(<TaskDeadlineIndicator task={task("2026-10-15")} isEn={false} T={T} />);
    expect(screen.queryByTestId("task-deadline-indicator-task-1")).toBeNull();
  });

  it("shows overdue status only for an active task", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 12));

    const { rerender } = render(<TaskDeadlineIndicator task={task("2026-10-06")} isEn={true} T={(_fa, en) => en} />);
    expect(screen.getByTestId("task-deadline-indicator-task-1").getAttribute("aria-label")).toMatch(/^Past deadline:/);

    rerender(<TaskDeadlineIndicator task={task("2026-10-06", true)} isEn={true} T={(_fa, en) => en} />);
    expect(screen.queryByTestId("task-deadline-indicator-task-1")).toBeNull();

    rerender(<TaskDeadlineIndicator task={{ ...task("2026-10-06"), status: "done" }} isEn={true} T={(_fa, en) => en} />);
    expect(screen.queryByTestId("task-deadline-indicator-task-1")).toBeNull();
  });

  it("does not show deadlines for recurring tasks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 12));

    render(<TaskDeadlineIndicator task={{ ...task("2026-10-06"), recurrence_rule: { freq: "daily", interval: 1 } }} isEn={true} T={(_fa, en) => en} />);
    expect(screen.queryByTestId("task-deadline-indicator-task-1")).toBeNull();
  });
});
