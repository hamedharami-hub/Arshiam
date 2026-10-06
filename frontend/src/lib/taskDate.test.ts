import { describe, expect, it } from "vitest";
import { isScheduleOverdue, parseTaskDueDate, taskDueTimestamp, getLocalDateString, formatTaskDueDateDisplay, moveTaskDayPatch } from "./taskDate";

describe("task date parsing", () => {
  it("treats date-only values as local calendar dates", () => {
    const parsed = parseTaskDueDate("2026-09-17");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(17);
  });

  it("moves an explicit late-night time to another day without inventing time for daily plans", () => {
    const current = new Date(2026, 8, 17, 23, 59).toISOString();
    const moved = moveTaskDayPatch({ schedule_v: 2, work_date: current }, "2026-09-19");
    const date = new Date(moved.work_date!);
    expect(getLocalDateString(date)).toBe("2026-09-19");
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
    expect(moveTaskDayPatch({ schedule_v: 2, work_date: "2026-09-17" }, "2026-09-19").work_date).toBe("2026-09-19");
  });

  it("returns infinity for missing or invalid dates", () => {
    expect(taskDueTimestamp(null)).toBe(Number.POSITIVE_INFINITY);
    expect(taskDueTimestamp("not-a-date")).toBe(Number.POSITIVE_INFINITY);
  });

  it("formats local dates to YYYY-MM-DD correctly without UTC shift", () => {
    const d = new Date(2026, 8, 20, 2, 30, 0); // Sept 20, 2026 at 2:30 AM local
    expect(getLocalDateString(d)).toBe("2026-09-20");
  });

  it("formats task due date for display correctly", () => {
    expect(formatTaskDueDateDisplay(null)).toBe("");
    expect(formatTaskDueDateDisplay("")).toBe("");
    const formattedDateOnly = formatTaskDueDateDisplay("2026-09-17", true);
    expect(formattedDateOnly).toContain("Sep");
    const formattedWithTime = formatTaskDueDateDisplay("2026-09-17T14:30:00", true);
    expect(formattedWithTime).toMatch(/0?2:30\s?PM/);
    // The picker's "no time" marker (23:59) shows the day only.
    expect(formatTaskDueDateDisplay("2026-09-17T23:59:00", true)).not.toMatch(/11:59/);
    expect(formatTaskDueDateDisplay("2026-09-17T23:59:00", true, 2)).toMatch(/11:59/);
  });

  it("treats explicit v2 23:59 as a real instant and keeps the legacy day marker isolated", () => {
    const at = new Date(2026, 8, 17, 23, 59, 0);
    const value = at.toISOString();
    expect(isScheduleOverdue(value, new Date(2026, 8, 17, 23, 58), 2)).toBe(false);
    expect(isScheduleOverdue(value, new Date(2026, 8, 18, 0, 1), 2)).toBe(true);
    expect(isScheduleOverdue(value, new Date(2026, 8, 17, 23, 58))).toBe(false);
    expect(isScheduleOverdue(value, new Date(2026, 8, 18, 0, 1))).toBe(true);
  });
});
