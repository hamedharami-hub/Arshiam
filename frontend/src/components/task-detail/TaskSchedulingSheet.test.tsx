import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskScheduleBody } from "./TaskSchedulingSheet";
import { getLocalDateString } from "@/lib/taskDate";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/components/DueDatePicker", () => ({ DueDatePicker: () => <div data-testid="reminder-editor-stub" /> }));
vi.mock("@/components/RecurrenceEditor", () => ({
  RecurrenceEditor: ({ onChange }: { onChange: (v: { freq: string; interval: number } | null) => void }) => (
    <button type="button" data-testid="repeat-pick-custom" onClick={() => onChange({ freq: "daily", interval: 3 })}>custom</button>
  ),
}));
vi.mock("@/components/InlineDatePicker", () => ({
  InlineDatePicker: ({ onSelect }: { onSelect: (ymd: string) => void }) => (
    <button type="button" data-testid="inline-calendar-pick" onClick={() => onSelect("2026-05-01")}>day</button>
  ),
}));
vi.mock("@/components/TimeWheel", () => ({
  TimeWheel: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" data-testid="time-wheel-pick" onClick={() => onChange("08:30")}>wheel</button>
  ),
}));

const base = { id: "t1", user_id: "u1", title: "x", completed: false, status: "todo", priority: "none" } as Task;
const T = (fa: string, _en: string) => fa;
const dayKey = (offset: number) => {
  const n = new Date();
  return getLocalDateString(new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset));
};
const scheduled = (iso: string) => ({ ...base, work_date: iso }) as Task;

describe("TaskScheduleBody — icon-led When panel", () => {
  it("one picker: quick days and periods, the calendar, then time and repeat rows", () => {
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} T={T} isEn={false} />);
    for (const key of ["today", "tomorrow", "week", "next-week", "month", "next-month"]) {
      expect(screen.getByTestId(`planning-quick-${key}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("planning-custom-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("inline-calendar-pick")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-time")).toBeDisabled();
    expect(screen.getByTestId("schedule-repeat")).toBeInTheDocument();
    expect(screen.queryByTestId("schedule-reminder")).toBeNull();
  });

  it("has no Time block, Part of day or Deadline controls", () => {
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} T={T} isEn={false} />);
    for (const id of ["schedule-deadline", "schedule-bucket", "schedule-block", "schedule-estimate", "schedule-pick-date", "task-meta-plan"]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it("picking Today saves the day and keeps the panel open for an optional time", () => {
    const save = vi.fn();
    const onDone = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("planning-quick-today"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ work_date: dayKey(0), planning_horizon: null, schedule_v: 2 }));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("a more precise choice replaces the period: this week → tomorrow keeps the time and drops the week", () => {
    const save = vi.fn();
    const timed = { ...base, work_date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 15, 0).toISOString() } as Task;
    render(<TaskScheduleBody t={timed} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("planning-quick-tomorrow"));
    const patch = save.mock.calls.at(-1)![0];
    expect(new Date(patch.work_date).getHours()).toBe(15);
    expect(patch.planning_horizon).toBeNull();
    fireEvent.click(screen.getByTestId("planning-quick-week"));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: null, planning_horizon: "week" }));
  });

  it("clearing removes the whole schedule", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={scheduled(dayKey(1))} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("planning-clear"));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: null, planning_horizon: null, schedule_v: 2 }));
  });

  it("highlights the selected quick day", () => {
    render(<TaskScheduleBody t={scheduled(dayKey(1))} canEdit save={vi.fn()} T={T} isEn={false} />);
    expect(screen.getByTestId("planning-quick-tomorrow")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("planning-quick-today")).toHaveAttribute("aria-pressed", "false");
  });

  it("a day picked on the calendar saves it", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("inline-calendar-pick"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ work_date: "2026-05-01" }));
  });

  it("time: opening seeds 09:00, the wheel changes it, x clears it, and the panel stays open", () => {
    const save = vi.fn();
    const onDone = vi.fn();
    const { rerender } = render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    const seeded = save.mock.calls[0][0].work_date as string;
    expect(new Date(seeded).getHours()).toBe(9);
    expect(screen.getByTestId("schedule-time-body")).toBeInTheDocument();

    const timed = scheduled(new Date(2026, 4, 1, 9, 0).toISOString());
    rerender(<TaskScheduleBody t={timed} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("schedule-time-clear"));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: "2026-05-01" }));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("reminder row only appears once a time is set", () => {
    const { rerender } = render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={vi.fn()} T={T} isEn={false} />);
    expect(screen.queryByTestId("schedule-reminder")).toBeNull();
    rerender(<TaskScheduleBody t={scheduled(new Date(2026, 4, 1, 8, 30).toISOString())} canEdit save={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-reminder"));
    expect(screen.getByTestId("schedule-reminder-body")).toBeInTheDocument();
  });

  it("repeat opens an icon menu; picking weekly saves the rule and keeps the panel open", () => {
    const save = vi.fn();
    const onDone = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    expect(screen.queryByTestId("schedule-repeat-body")).toBeNull();
    fireEvent.click(screen.getByTestId("schedule-repeat"));
    for (const key of ["none", "daily", "weekly", "monthly", "yearly", "custom"]) {
      expect(screen.getByTestId(`repeat-${key}`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByTestId("repeat-weekly"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ recurrence: "weekly", recurrence_rule: expect.objectContaining({ freq: "weekly", interval: 1 }) }));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("custom repeat reveals the editor; none clears the rule", () => {
    const save = vi.fn();
    const rule = { freq: "weekly" as const, interval: 1 };
    render(<TaskScheduleBody t={{ ...base, recurrence_rule: rule } as Task} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-repeat"));
    fireEvent.click(screen.getByTestId("repeat-custom"));
    fireEvent.click(screen.getByTestId("repeat-pick-custom"));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ recurrence_rule: { freq: "daily", interval: 3 } }));
    fireEvent.click(screen.getByTestId("repeat-none"));
    expect(save).toHaveBeenLastCalledWith({ recurrence_rule: null, recurrence: "none" });
  });

  it("the check button finishes the panel", () => {
    const onDone = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("schedule-done"));
    expect(onDone).toHaveBeenCalled();
  });

  it("is read-only when the user cannot edit", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit={false} save={save} T={T} isEn={false} />);
    expect(screen.queryByTestId("planning-quick-today")).toBeNull();
    expect(screen.getByTestId("schedule-repeat")).toBeDisabled();
    fireEvent.click(screen.getByTestId("inline-calendar-pick"));
    expect(save).not.toHaveBeenCalled();
  });
});
