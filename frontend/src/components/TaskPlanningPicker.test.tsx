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
vi.mock("./InlineDatePicker", () => ({
  InlineDatePicker: ({ onSelect }: { onSelect: (ymd: string) => void }) => (
    <div>
      <button type="button" data-testid="range-pick-a" onClick={() => onSelect("2026-05-10")}>a</button>
      <button type="button" data-testid="range-pick-b" onClick={() => onSelect("2026-05-14")}>b</button>
    </div>
  ),
}));

const base = { id: "t1", user_id: "u1", title: "x", completed: false, status: "todo", priority: "none" } as Task;

describe("TaskPlanningBody — icon-led period picker", () => {
  it("offers the six periods and a custom range icon", () => {
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
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ work_date: getLocalDateString(), planning_horizon: null, schedule_v: 2 }));
    expect(onDone).toHaveBeenCalled();
  });

  it("keeps an explicitly chosen clock when moving to tomorrow", () => {
    const onPatch = vi.fn();
    const at = new Date(2026, 4, 12, 16, 35).toISOString();
    render(<TaskPlanningBody task={{ ...base, schedule_v: 2, work_date: at }} onPatch={onPatch} />);
    fireEvent.click(screen.getByTestId("planning-quick-tomorrow"));
    const moved = new Date(onPatch.mock.calls[0][0].work_date);
    expect(moved.getHours()).toBe(16);
    expect(moved.getMinutes()).toBe(35);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    expect(getLocalDateString(moved)).toBe(getLocalDateString(tomorrow));
  });

  it("highlights the period matching the task's plan", () => {
    const week = currentPeriod("week", getTimeSettings());
    const planned = { ...base, planning_horizon: "week", planning_start: week.start, planning_end: week.end } as Task;
    render(<TaskPlanningBody task={planned} onPatch={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByTestId("planning-quick-week")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("planning-quick-today")).toHaveAttribute("aria-pressed", "false");
  });

  it("picks a custom start and end on a mini calendar, then applies with the check button", () => {
    const onPatch = vi.fn();
    const onDone = vi.fn();
    render(<TaskPlanningBody task={base} onPatch={onPatch} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("planning-custom-toggle"));
    expect(screen.getByTestId("planning-custom-body")).toBeInTheDocument();
    expect(screen.getByTestId("planning-apply-range")).toBeDisabled();
    fireEvent.click(screen.getByTestId("range-pick-b"));
    fireEvent.click(screen.getByTestId("range-pick-a"));
    fireEvent.click(screen.getByTestId("planning-apply-range"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_start: "2026-05-10", planning_end: "2026-05-14" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("clears planning with the x icon", () => {
    const planned = { ...base, planning_horizon: "week", planning_start: "2026-04-04", planning_end: "2026-04-10" } as Task;
    const onPatch = vi.fn();
    render(<TaskPlanningBody task={planned} onPatch={onPatch} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-clear"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_horizon: null }));
  });

  it("refreshes a custom-range draft when the task schedule changes", () => {
    const onPatch = vi.fn();
    const { rerender } = render(<TaskPlanningBody task={base} onPatch={onPatch} />);
    fireEvent.click(screen.getByTestId("planning-custom-toggle"));
    fireEvent.click(screen.getByTestId("range-pick-a"));
    const updated = { ...base, schedule_v: 2, planning_horizon: "week", planning_start: "2026-06-01", planning_end: "2026-06-07" } as Task;
    rerender(<TaskPlanningBody task={updated} onPatch={onPatch} />);
    fireEvent.click(screen.getByTestId("planning-apply-range"));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ planning_start: "2026-06-01", planning_end: "2026-06-07" }));
  });
});
