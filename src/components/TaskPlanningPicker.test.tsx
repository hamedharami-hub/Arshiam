import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskPlanningBody } from "./TaskPlanningPicker";
import { getLocalDateString } from "@/lib/taskDate";
import { currentPeriod, getTimeSettings } from "@/lib/timeHorizon";
import type { Task } from "@/lib/taskTypes";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  useTranslation: () => ({ i18n: { language: "fa" } }),
}));

const base = { id: "t1", user_id: "u1", title: "x", completed: false, status: "todo", priority: "none" } as Task;

describe("TaskPlanningBody — tag-style quick list", () => {
  it("offers the common periods as one uniform list", () => {
    render(<TaskPlanningBody task={base} onPatch={vi.fn()} onDone={vi.fn()} />);
    for (const key of ["today", "tomorrow", "week", "next-week", "month", "next-month"]) {
      expect(screen.getByTestId(`planning-quick-${key}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("planning-custom-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-custom-body")).toBeNull();
  });

  it("saves a quick pick and closes", () => {
    const onPatch = vi.fn();
    const onDone = vi.fn();
    render(<TaskPlanningBody task={base} onPatch={onPatch} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("planning-quick-today"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_horizon: "day", planning_start: getLocalDateString() }));
    expect(onDone).toHaveBeenCalled();
  });

  it("highlights the row matching the task's plan", () => {
    const week = currentPeriod("week", getTimeSettings());
    const planned = { ...base, planning_horizon: "week", planning_start: week.start, planning_end: week.end } as Task;
    render(<TaskPlanningBody task={planned} onPatch={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByTestId("planning-quick-week")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("planning-quick-today")).toHaveAttribute("aria-pressed", "false");
  });

  it("folds out a custom period picker on demand", () => {
    const onPatch = vi.fn();
    const onDone = vi.fn();
    render(<TaskPlanningBody task={base} onPatch={onPatch} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("planning-custom-toggle"));
    expect(screen.getByTestId("planning-custom-body")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("planning-horizon-month"));
    fireEvent.click(screen.getByTestId("planning-apply-date"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_horizon: "month" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("clears planning from the list", () => {
    const planned = { ...base, planning_horizon: "week", planning_start: "2026-04-04", planning_end: "2026-04-10" } as Task;
    const onPatch = vi.fn();
    render(<TaskPlanningBody task={planned} onPatch={onPatch} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-clear"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_horizon: null }));
  });
});
