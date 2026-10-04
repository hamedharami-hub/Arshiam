import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskPlanningBody } from "./TaskPlanningPicker";
import type { Task } from "@/lib/taskTypes";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  useTranslation: () => ({ i18n: { language: "fa" } }),
}));

const base = { id: "t1", user_id: "u1", title: "x", completed: false, status: "todo", priority: "none" } as Task;

describe("TaskPlanningBody compact picker", () => {
  it("chooses the next week from the compact chip row and closes", () => {
    const onPatch = vi.fn();
    const onDone = vi.fn();
    render(<TaskPlanningBody task={base} onPatch={onPatch} onDone={onDone} />);
    expect(screen.getByTestId("task-planning-body")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("planning-period-1"));
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0][0]).toEqual(expect.objectContaining({ planning_horizon: "week" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("clears planning from the compact body", () => {
    const planned = { ...base, planning_horizon: "day", planning_start: "2026-04-10", planning_end: "2026-04-10" } as Task;
    const onPatch = vi.fn();
    render(<TaskPlanningBody task={planned} onPatch={onPatch} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-clear"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_horizon: null }));
  });

  it("switches horizons without losing the chip row", () => {
    render(<TaskPlanningBody task={base} onPatch={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-horizon-day"));
    expect(screen.getByTestId("planning-period-1")).toBeInTheDocument();
  });
});
