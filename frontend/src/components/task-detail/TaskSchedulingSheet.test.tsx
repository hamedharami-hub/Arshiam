import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    <div>
      <button type="button" data-testid="inline-calendar-pick" onClick={() => onSelect("2026-05-01")}>day</button>
      <button type="button" data-testid="inline-calendar-dst-gap" onClick={() => onSelect("2026-03-08")}>DST day</button>
    </div>
  ),
}));
vi.mock("@/components/TimeWheel", () => ({
  TimeWheel: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <span data-testid="time-wheel-value">{value}</span>
      <button type="button" data-testid="time-wheel-pick" onClick={() => onChange("08:30")}>wheel</button>
      <button type="button" data-testid="time-wheel-midnight" onClick={() => onChange("00:00")}>midnight</button>
      <button type="button" data-testid="time-wheel-last-minute" onClick={() => onChange("23:59")}>last minute</button>
      <button type="button" data-testid="time-wheel-dst-gap" onClick={() => onChange("02:30")}>DST gap</button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
    expect(screen.getByTestId("schedule-reminder")).toBeInTheDocument();
  });

  it("has no Time block, Part of day or Deadline controls", () => {
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} T={T} isEn={false} />);
    for (const id of ["schedule-deadline", "schedule-bucket", "schedule-block", "schedule-estimate", "schedule-pick-date", "task-meta-plan"]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it("keeps an optional deadline separate from the operational schedule", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} T={T} isEn={false} />);

    fireEvent.click(screen.getByTestId("task-deadline-toggle"));
    fireEvent.click(screen.getAllByTestId("inline-calendar-pick").at(-1)!);

    expect(save).toHaveBeenCalledWith({ deadline_date: "2026-05-01" });
    expect(save.mock.calls[0][0]).not.toHaveProperty("work_date");
    expect(save.mock.calls[0][0]).not.toHaveProperty("recurrence");
  });

  it("clears only the optional deadline", () => {
    const save = vi.fn();
    const task = { ...scheduled("2026-05-01"), deadline_date: "2026-05-07" } as Task;
    render(<TaskScheduleBody t={task} canEdit save={save} T={T} isEn={false} />);

    fireEvent.click(screen.getByTestId("task-deadline-clear"));

    expect(save).toHaveBeenCalledWith({ deadline_date: null });
    expect(save.mock.calls[0][0]).not.toHaveProperty("work_date");
  });

  it("keeps a recurring task's deadline visible and allows it to be cleared", () => {
    const save = vi.fn();
    const recurring = { ...base, recurrence_rule: { freq: "daily", interval: 1 }, deadline_date: "2026-05-07" } as Task;
    render(<TaskScheduleBody t={recurring} canEdit save={save} T={T} isEn={false} />);

    expect(screen.getByTestId("task-deadline-toggle")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("task-deadline-clear"));
    expect(save).toHaveBeenCalledWith({ deadline_date: null });
    expect(save.mock.calls[0][0]).not.toHaveProperty("recurrence_rule");
  });

  it("keeps the deadline editor open after a failed save and allows retry", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("queued");
    render(<TaskScheduleBody t={base} canEdit save={save} T={T} isEn={false} />);

    fireEvent.click(screen.getByTestId("task-deadline-toggle"));
    fireEvent.click(screen.getAllByTestId("inline-calendar-pick").at(-1)!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ذخیره نشد"));
    expect(screen.getByTestId("task-deadline-calendar")).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("inline-calendar-pick").at(-1)!);
    await waitFor(() => expect(screen.queryByTestId("task-deadline-calendar")).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
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

  it("opening time keeps 09:00 as a draft; only a wheel selection writes", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const onDone = vi.fn();
    const { rerender } = render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId("schedule-time-body")).toBeInTheDocument();
    expect(screen.getByTestId("time-wheel-value")).toHaveTextContent("09:00");
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    expect(save).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(120));
    const selected = save.mock.calls[0][0].work_date as string;
    expect(new Date(selected).getHours()).toBe(8);
    expect(new Date(selected).getMinutes()).toBe(30);

    const timed = { ...scheduled(selected), schedule_v: 2 } as Task;
    rerender(<TaskScheduleBody t={timed} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("schedule-time-clear"));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: "2026-05-01" }));
    expect(onDone).not.toHaveBeenCalled();
  });

  it.each(["00:00", "23:59"] as const)("preserves explicitly selected %s as an exact datetime", (hhmm) => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { rerender } = render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId(hhmm === "00:00" ? "time-wheel-midnight" : "time-wheel-last-minute"));
    act(() => vi.advanceTimersByTime(120));

    const patch = save.mock.calls.at(-1)![0] as Partial<Task>;
    expect(patch.schedule_v).toBe(2);
    expect(typeof patch.work_date).toBe("string");
    expect(new Date(patch.work_date!).getHours()).toBe(Number(hhmm.slice(0, 2)));
    expect(new Date(patch.work_date!).getMinutes()).toBe(Number(hhmm.slice(3)));

    rerender(<TaskScheduleBody t={{ ...base, ...patch } as Task} canEdit save={save} T={T} isEn />);
    expect(screen.getByTestId("schedule-time")).toHaveTextContent(hhmm);
  });

  it("keeps an unavailable daylight-saving time as an editable error instead of silently shifting it", () => {
    vi.useFakeTimers();
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const save = vi.fn();
      render(<TaskScheduleBody t={scheduled("2026-03-08")} canEdit save={save} T={T} isEn={false} />);
      fireEvent.click(screen.getByTestId("schedule-time"));
      fireEvent.click(screen.getByTestId("time-wheel-dst-gap"));
      act(() => vi.advanceTimersByTime(120));

      expect(save).not.toHaveBeenCalled();
      expect(screen.getByTestId("schedule-invalid-local-time")).toBeInTheDocument();
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("keeps a chosen day and explains when its previous clock time cannot be preserved after saving", async () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const save = vi.fn();
      render(<TaskScheduleBody t={scheduled("2026-03-07T07:30:00.000Z")} canEdit save={save} T={T} isEn={false} />);
      fireEvent.click(screen.getByTestId("inline-calendar-dst-gap"));

      expect(save).toHaveBeenCalledWith(expect.objectContaining({ work_date: "2026-03-08", schedule_v: 2 }));
      await waitFor(() => expect(screen.getByTestId("schedule-invalid-local-time")).toBeInTheDocument());
      expect(screen.getByTestId("schedule-time-body")).toBeInTheDocument();
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("does not show the daylight-saving guidance when saving the fallback day fails", async () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const save = vi.fn().mockResolvedValue("failed");
      render(<TaskScheduleBody t={scheduled("2026-03-07T07:30:00.000Z")} canEdit save={save} T={T} isEn={false} />);
      fireEvent.click(screen.getByTestId("inline-calendar-dst-gap"));

      await waitFor(() => expect(screen.getByTestId("schedule-save-error")).toBeInTheDocument());
      expect(screen.queryByTestId("schedule-invalid-local-time")).toBeNull();
      expect(screen.getByTestId("schedule-time-body")).toBeInTheDocument();
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("handles a rejected fallback-day save without an unhandled error or false success", async () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const save = vi.fn().mockRejectedValue(new Error("offline"));
      render(<TaskScheduleBody t={scheduled("2026-03-07T07:30:00.000Z")} canEdit save={save} T={T} isEn={false} />);
      fireEvent.click(screen.getByTestId("inline-calendar-dst-gap"));

      await waitFor(() => expect(screen.getByTestId("schedule-save-error")).toBeInTheDocument());
      expect(screen.queryByTestId("schedule-invalid-local-time")).toBeNull();
      expect(screen.getByTestId("schedule-time-body")).toBeInTheDocument();
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("a pending wheel write cannot undo clearing the whole schedule", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    fireEvent.click(screen.getByTestId("planning-clear"));
    act(() => vi.advanceTimersByTime(120));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: null, planning_horizon: null }));
  });

  it("a pending wheel write cannot replace a selected period", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    fireEvent.click(screen.getByTestId("planning-quick-week"));
    act(() => vi.advanceTimersByTime(120));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: null, planning_horizon: "week" }));
  });

  it("a pending wheel write cannot replace a newly selected day", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    render(<TaskScheduleBody t={scheduled("2026-05-02")} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    fireEvent.click(screen.getByTestId("planning-quick-tomorrow"));
    act(() => vi.advanceTimersByTime(120));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: dayKey(1) }));
  });

  it("clearing the time cancels a wheel write that has not settled", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    render(<TaskScheduleBody t={scheduled(new Date(2026, 4, 1, 9, 30).toISOString())} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    fireEvent.click(screen.getByTestId("schedule-time-clear"));
    act(() => vi.advanceTimersByTime(120));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ work_date: "2026-05-01" }));
  });

  it("changing tasks cancels a pending wheel write for the old task", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { rerender } = render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    rerender(<TaskScheduleBody t={{ ...scheduled("2026-05-01"), id: "t2" } as Task} canEdit save={save} T={T} isEn={false} />);
    act(() => vi.advanceTimersByTime(120));
    expect(save).not.toHaveBeenCalled();
  });

  it("a newer clock on the same task and day supersedes a pending wheel write", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const first = { ...scheduled(new Date(2026, 4, 1, 9, 30).toISOString()), schedule_v: 2 } as Task;
    const newer = { ...first, work_date: new Date(2026, 4, 1, 18, 0).toISOString() };
    const { rerender } = render(<TaskScheduleBody t={first} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    rerender(<TaskScheduleBody t={newer} canEdit save={save} T={T} isEn={false} />);
    act(() => vi.advanceTimersByTime(120));
    expect(save).not.toHaveBeenCalled();
  });

  it("unmounting cancels a pending wheel write", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { unmount } = render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    unmount();
    act(() => vi.advanceTimersByTime(120));
    expect(save).not.toHaveBeenCalled();
  });

  it("Done flushes a valid pending wheel choice before closing", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const onDone = vi.fn();
    render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} onDone={onDone} />);
    fireEvent.click(screen.getByTestId("schedule-time"));
    fireEvent.click(screen.getByTestId("time-wheel-pick"));
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("schedule-done"));
    expect(save).toHaveBeenCalledTimes(1);
    expect(new Date(save.mock.calls[0][0].work_date).getHours()).toBe(8);
    expect(new Date(save.mock.calls[0][0].work_date).getMinutes()).toBe(30);
    expect(onDone).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(120));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("allows a reminder for a day-only task without adding an exact schedule time", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={scheduled("2026-05-01")} canEdit save={save} T={T} isEn={false} />);
    expect(screen.getByTestId("schedule-reminder")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("schedule-reminder"));
    expect(screen.getByTestId("schedule-reminder-body")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("changing recurrence preserves the independent deadline", () => {
    const save = vi.fn();
    const task = { ...base, deadline_date: "2026-05-07" } as Task;
    render(<TaskScheduleBody t={task} canEdit save={save} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-repeat"));
    fireEvent.click(screen.getByTestId("repeat-weekly"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ recurrence: "weekly" }));
    expect(save.mock.calls[0][0]).not.toHaveProperty("deadline_date");
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
