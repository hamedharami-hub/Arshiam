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
vi.mock("@/components/InlineDatePicker", () => ({ InlineDatePicker: () => <div data-testid="inline-date-picker" /> }));

const base = { id: "t1", user_id: "u1", title: "x", completed: false, status: "todo", priority: "none" } as Task;

describe("TaskPlanningBody — tag-style quick list", () => {
  it("offers the same operational choices and no second custom writer", () => {
    render(<TaskPlanningBody task={base} onPatch={vi.fn()} onDone={vi.fn()} />);
    for (const key of ["today", "tomorrow", "week", "next-week", "month", "next-month"]) {
      expect(screen.getByTestId(`planning-quick-${key}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("planning-pick-date")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-custom-toggle")).toBeNull();
    expect(screen.queryByTestId("planning-custom-body")).toBeNull();
  });

  it("saves today as a date-only work day and closes", () => {
    const onPatch = vi.fn();
    const onDone = vi.fn();
    render(<TaskPlanningBody task={base} onPatch={onPatch} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("planning-quick-today"));
    const patch = onPatch.mock.calls[0][0];
    expect(patch).toEqual(expect.objectContaining({
      work_date: getLocalDateString(),
      schedule_timezone: null,
      planning_horizon: null,
      planning_start: null,
      planning_end: null,
      schedule_v: 2,
    }));
    expect(patch.work_date).not.toContain("T");
    expect(patch).not.toHaveProperty("deadline_date");
    expect(onDone).toHaveBeenCalled();
  });

  it("highlights a week only when the schedule horizon matches that period", () => {
    const week = currentPeriod("week", getTimeSettings());
    const planned = { ...base, planning_horizon: "week", planning_start: week.start, planning_end: week.end } as Task;
    render(<TaskPlanningBody task={planned} onPatch={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByTestId("planning-quick-week")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("planning-quick-today")).toHaveAttribute("aria-pressed", "false");
  });

  it("a week choice nulls work_date", () => {
    const onPatch = vi.fn();
    const onDone = vi.fn();
    const week = currentPeriod("week", getTimeSettings());
    render(<TaskPlanningBody task={{ ...base, work_date: "2026-04-04T09:00:00" }} onPatch={onPatch} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("planning-quick-week"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({
      work_date: null,
      schedule_timezone: null,
      planning_horizon: "week",
      planning_start: week.start,
      planning_end: week.end,
      planning_calendar: getTimeSettings().calendar,
      schedule_v: 2,
    }));
    expect(onPatch.mock.calls[0][0]).not.toHaveProperty("deadline_date");
    expect(onDone).toHaveBeenCalled();
  });

  it("clears through schedule none and does not write a deadline", () => {
    const planned = { ...base, planning_horizon: "week", planning_start: "2026-04-04", planning_end: "2026-04-10" } as Task;
    const onPatch = vi.fn();
    render(<TaskPlanningBody task={planned} onPatch={onPatch} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-clear"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({
      work_date: null,
      schedule_timezone: null,
      planning_horizon: null,
      planning_start: null,
      planning_end: null,
      planning_calendar: null,
      schedule_v: 2,
    }));
    expect(onPatch.mock.calls[0][0]).not.toHaveProperty("deadline_date");
  });
});
