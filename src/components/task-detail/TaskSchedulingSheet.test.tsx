import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskScheduleBody } from "./TaskSchedulingSheet";
import { getLocalDateString } from "@/lib/taskDate";
import { currentPeriod, getTimeSettings } from "@/lib/timeHorizon";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/components/DueDatePicker", () => ({ DueDatePicker: () => <div data-testid="reminder-editor-stub" /> }));
vi.mock("@/components/RecurrenceEditor", () => ({ RecurrenceEditor: ({ onChange }: any) => <button data-testid="repeat-pick-weekly" onClick={() => onChange({ freq: "weekly", interval: 2, byweekday: ["MO", "FR"] })}>weekly</button> }));
vi.mock("@/components/InlineDatePicker", () => ({ InlineDatePicker: ({ onSelect }: any) => <button data-testid="calendar-pick" onClick={() => onSelect("2026-10-08")}>day</button> }));
const base: Task = { id: "t1", title: "x", completed: false, status: "todo", priority: "none" };
const T = (fa: string, en: string) => en;
const panel = (task = base, save = vi.fn(), canEdit = true) => render(<TaskScheduleBody t={task} canEdit={canEdit} save={save} postpone={vi.fn()} T={T} isEn />);

describe("simplified task scheduling", () => {
  it("offers the supported controls and never renders the removed features", () => {
    panel();
    for (const id of ["schedule-quick-today", "schedule-quick-tomorrow", "schedule-quick-week", "schedule-quick-next-week", "schedule-quick-month", "schedule-quick-next-month", "schedule-pick-date", "schedule-time", "schedule-repeat", "schedule-reminder"]) expect(screen.getByTestId(id)).toBeInTheDocument();
    for (const id of ["schedule-deadline", "schedule-bucket", "schedule-block", "schedule-repeat-body"]) expect(screen.queryByTestId(id)).toBeNull();
  });

  it("saves today as a date-only work_date", () => {
    const save = vi.fn();
    panel(base, save);
    fireEvent.click(screen.getByTestId("schedule-quick-today"));
    const patch = save.mock.calls[0][0];
    expect(patch.work_date).toBe(getLocalDateString());
    expect(patch.work_date).not.toContain("T");
    expect(patch).toEqual(expect.objectContaining({ schedule_timezone: null, planning_horizon: null, schedule_v: 2 }));
    expect(patch).not.toHaveProperty("deadline_date");
  });

  it("a week choice nulls work_date", () => {
    const save = vi.fn();
    const week = currentPeriod("week", getTimeSettings());
    panel({ ...base, work_date: "2026-10-05" }, save);
    fireEvent.click(screen.getByTestId("schedule-quick-week"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      work_date: null,
      schedule_timezone: null,
      planning_horizon: "week",
      planning_start: week.start,
      planning_end: week.end,
      planning_calendar: getTimeSettings().calendar,
    }), undefined);
    expect(save.mock.calls[0][0]).not.toHaveProperty("deadline_date");
  });

  it("does not save a time when no work day exists", () => {
    const save = vi.fn();
    panel(base, save);
    fireEvent.click(screen.getByTestId("schedule-time"));
    expect(screen.getByTestId("schedule-time-apply")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "10:30" } });
    fireEvent.click(screen.getByTestId("schedule-time-apply"));
    expect(save).not.toHaveBeenCalled();
  });

  it("clear does not include deadline_date", () => {
    const save = vi.fn();
    panel({ ...base, work_date: "2026-10-05" }, save);
    fireEvent.click(screen.getByTestId("schedule-clear-date"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      work_date: null,
      schedule_timezone: null,
      planning_horizon: null,
      planning_start: null,
      planning_end: null,
      planning_calendar: null,
      schedule_v: 2,
    }), undefined);
    expect(save.mock.calls[0][0]).not.toHaveProperty("deadline_date");
  });

  it("keeps an existing clock on the picked day", () => {
    const save = vi.fn();
    panel({ ...base, work_date: new Date(2026, 9, 5, 14, 45).toISOString() }, save);
    fireEvent.click(screen.getByTestId("schedule-pick-date"));
    fireEvent.click(screen.getByTestId("calendar-pick"));
    const patch = save.mock.calls[0][0];
    expect(patch.work_date).toContain("T");
    expect(patch.work_date.startsWith("2026-10-08T")).toBe(true);
    expect(patch.schedule_timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const date = new Date(patch.work_date);
    expect([date.getHours(), date.getMinutes()]).toEqual([14, 45]);
    expect(patch).not.toHaveProperty("deadline_date");
  });

  it("activates today only for a day or clock on today, not a week that merely contains today", () => {
    const week = currentPeriod("week", getTimeSettings());
    panel({ ...base, work_date: getLocalDateString(), planning_horizon: "week", planning_start: week.start, planning_end: week.end });
    expect(screen.getByTestId("schedule-quick-today")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("schedule-quick-week")).toHaveAttribute("aria-pressed", "false");
  });

  it("lets the user configure a repeat rule fully before applying it", () => {
    const save = vi.fn();
    panel(base, save);
    fireEvent.click(screen.getByTestId("schedule-repeat"));
    fireEvent.click(screen.getByTestId("repeat-pick-weekly"));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("schedule-repeat-apply"));
    expect(save).toHaveBeenCalledWith({ recurrence: "weekly", recurrence_rule: { freq: "weekly", interval: 2, byweekday: ["MO", "FR"] } });
  });

  it("prevents edits when task access is read only", () => {
    const save = vi.fn();
    panel({ ...base, work_date: "2026-10-05" }, save, false);
    fireEvent.click(screen.getByTestId("schedule-quick-tomorrow"));
    fireEvent.click(screen.getByTestId("schedule-repeat"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByTestId("schedule-repeat-body")).toBeNull();
  });
});
