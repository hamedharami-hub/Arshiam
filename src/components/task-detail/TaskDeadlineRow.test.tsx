import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDeadlineRow } from "./TaskDeadlineRow";

const T = (fa: string, en: string) => en;

describe("task deadline row", () => {
  it("saves a date through deadlinePatch and nothing else", () => {
    const save = vi.fn();
    render(<TaskDeadlineRow task={{ deadline_date: null }} canEdit save={save} T={T} isEn />);
    expect(screen.getByText("Deadline")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("task-deadline-input"), { target: { value: "2026-10-20" } });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual({ deadline_date: "2026-10-20" });
    expect(save.mock.calls[0][0]).not.toHaveProperty("work_date");
    expect(save.mock.calls[0][0]).not.toHaveProperty("planning_horizon");
    expect(save.mock.calls[0][0]).not.toHaveProperty("schedule_timezone");
  });

  it("does not save a timed value", () => {
    const save = vi.fn();
    render(<TaskDeadlineRow task={{ deadline_date: null }} canEdit save={save} T={T} isEn />);
    fireEvent.change(screen.getByTestId("task-deadline-input"), { target: { value: "2026-10-20T09:00" } });
    expect(save).not.toHaveBeenCalled();
  });

  it("clears with a deadline-only null patch", () => {
    const save = vi.fn();
    render(<TaskDeadlineRow task={{ deadline_date: "2026-10-20" }} canEdit save={save} T={T} isEn />);
    fireEvent.click(screen.getByTestId("task-deadline-clear"));
    expect(save).toHaveBeenCalledWith({ deadline_date: null });
  });
});
