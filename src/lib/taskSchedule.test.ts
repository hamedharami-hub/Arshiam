import { describe, expect, it } from "vitest";
import {
  assertSchedulePatch,
  calendarDayMarks,
  deadlinePatch,
  deadlineSignal,
  isScheduledToday,
  occursInPeriod,
  readTaskSchedule,
  schedulePatch,
  type ScheduleWrite,
} from "./taskSchedule";

const SCHEDULE_KEYS = [
  "planning_calendar",
  "planning_end",
  "planning_horizon",
  "planning_start",
  "schedule_timezone",
  "schedule_v",
  "work_date",
];

function expectScheduleKeys(patch: ScheduleWrite) {
  expect(Object.keys(patch).sort()).toEqual([...SCHEDULE_KEYS].sort());
  expect(patch).not.toHaveProperty("deadline_date");
  expect(patch).not.toHaveProperty("schedule_legacy");
  expect(patch).not.toHaveProperty("title");
  expect(patch).not.toHaveProperty("due_date");
}

describe("task schedule contract", () => {
  it("keeps a date-only work day as that literal day, not a UTC-shifted instant", () => {
    const expected = "2026-05-03";
    const schedule = readTaskSchedule({ work_date: expected, schedule_v: null });
    expect(schedule.mode).toBe("day");
    expect(schedule.workDate).toBe(expected);
    expect(schedule.timezone).toBeNull();
    expect(schedule.horizon).toBeNull();
    expect(schedule.conflict).toBe(false);
    expect(schedule.v).toBe(2);
    expect(isScheduledToday(schedule, expected)).toBe(true);
    expect(isScheduledToday(schedule, "2026-05-02")).toBe(false);
  });

  it("treats 00:00 and 23:59 as clock time instead of an empty day", () => {
    const midnight = readTaskSchedule({ work_date: "2026-05-03T00:00:00", schedule_timezone: "Asia/Tehran" });
    const endMarker = readTaskSchedule({ work_date: "2026-05-03T23:59:00" });
    expect(midnight.mode).toBe("clock");
    expect(midnight.workDate).toBe("2026-05-03T00:00:00");
    expect(midnight.timezone).toBe("Asia/Tehran");
    expect(endMarker.mode).toBe("clock");
    expect(endMarker.timezone).toBeNull();
    expect(isScheduledToday(midnight, "2026-05-03")).toBe(true);
    expect(isScheduledToday(midnight, "2026-05-02")).toBe(false);
    expect(isScheduledToday(endMarker, "2026-05-03")).toBe(true);
  });

  it("places an offset instant on the calendar day of its timezone", () => {
    const schedule = readTaskSchedule({
      work_date: "2026-05-03T00:30:00Z",
      schedule_timezone: "America/Los_Angeles",
    });
    expect(schedule.mode).toBe("clock");
    expect(isScheduledToday(schedule, "2026-05-02")).toBe(true);
    expect(isScheduledToday(schedule, "2026-05-03")).toBe(false);
  });

  it("does not infer a deadline or a mode from a removed due field", () => {
    const schedule = readTaskSchedule({ due_date: "2026-06-01", deadline_date: "2026-06-15" });
    expect(schedule.mode).toBe("none");
    expect(schedule.deadlineDate).toBe("2026-06-15");
    expect(schedule.conflict).toBe(false);
    expect(readTaskSchedule({ deadline_date: null }).deadlineDate).toBeNull();
  });

  it("reads a planning period as horizon and a day plan without work_date as a day", () => {
    const month = readTaskSchedule({
      planning_horizon: "month",
      planning_start: "2026-05-01",
      planning_end: "2026-05-31",
    });
    expect(month.mode).toBe("horizon");
    expect(month.horizon).toBe("month");
    expect(month.workDate).toBeNull();
    expect(isScheduledToday(month, "2026-05-12")).toBe(false);
    expect(occursInPeriod(month, { start: "2026-05-12", end: "2026-05-12" }, "day")).toBe(false);
    expect(occursInPeriod(month, { start: "2026-05-01", end: "2026-05-31" }, "month")).toBe(true);
    expect(occursInPeriod(month, { start: "2026-05-02", end: "2026-05-08" }, "week")).toBe(false);

    const dayPlan = readTaskSchedule({
      planning_horizon: "day",
      planning_start: "2026-05-06",
      planning_end: "2026-05-06",
    });
    expect(dayPlan.mode).toBe("day");
    expect(dayPlan.workDate).toBe("2026-05-06");
    expect(dayPlan.conflict).toBe(false);
    expect(isScheduledToday(dayPlan, "2026-05-06")).toBe(true);
  });

  it("sees a range where it overlaps a month and never treats it as today", () => {
    const range = readTaskSchedule({
      planning_horizon: "range",
      planning_start: "2026-05-10",
      planning_end: "2026-06-02",
    });
    expect(range.mode).toBe("horizon");
    expect(range.horizon).toBe("range");
    expect(isScheduledToday(range, "2026-05-10")).toBe(false);
    expect(isScheduledToday(range, "2026-05-20")).toBe(false);
    expect(occursInPeriod(range, { start: "2026-05-01", end: "2026-05-31" })).toBe(true);
    expect(occursInPeriod(range, { start: "2026-05-01", end: "2026-05-31" }, "range")).toBe(true);
    expect(occursInPeriod(range, { start: "2026-05-01", end: "2026-05-31" }, "month")).toBe(true);
    expect(occursInPeriod(range, { start: "2026-05-20", end: "2026-05-20" }, "day")).toBe(false);
    expect(occursInPeriod(range, { start: "2026-06-03", end: "2026-06-30" })).toBe(false);
  });

  it("counts a dated item once inside a week span and once inside a month span", () => {
    const expected = "2026-05-06";
    const schedule = readTaskSchedule({ work_date: expected });
    expect(schedule.horizon).toBeNull();
    expect(occursInPeriod(schedule, { start: "2026-05-02", end: "2026-05-08" }, "week")).toBe(true);
    expect(occursInPeriod(schedule, { start: "2026-05-01", end: "2026-05-31" }, "month")).toBe(true);
    expect(occursInPeriod(schedule, { start: "2026-05-09", end: "2026-05-15" }, "week")).toBe(false);
    expect(occursInPeriod(schedule, { start: "2026-04-01", end: "2026-04-30" }, "month")).toBe(false);
    expect(occursInPeriod(schedule, { start: "2026-05-01", end: "2026-05-31" }, "range")).toBe(false);
  });

  it("marks simultaneous work day and horizon as a conflict without dropping either side", () => {
    const schedule = readTaskSchedule({
      work_date: "2026-06-02",
      planning_horizon: "month",
      planning_start: "2026-05-01",
      planning_end: "2026-05-31",
    });
    expect(schedule.conflict).toBe(true);
    expect(schedule.mode).toBe("day");
    expect(schedule.workDate).toBe("2026-06-02");
    expect(schedule.horizon).toBe("month");
    expect(schedule.start).toBe("2026-05-01");
    expect(schedule.end).toBe("2026-05-31");
    expect(occursInPeriod(schedule, { start: "2026-06-02", end: "2026-06-02" }, "day")).toBe(true);
    expect(occursInPeriod(schedule, { start: "2026-05-30", end: "2026-06-05" }, "week")).toBe(true);
    expect(occursInPeriod(schedule, { start: "2026-05-01", end: "2026-05-31" }, "month")).toBe(true);
    expect(occursInPeriod(schedule, { start: "2026-05-01", end: "2026-05-31" }, "day")).toBe(false);
    expect(isScheduledToday(schedule, "2026-06-02")).toBe(true);
    expect(isScheduledToday(schedule, "2026-05-12")).toBe(false);
  });

  it("rejects a clock without a timezone and a patch that would write both a day and a horizon", () => {
    expect(schedulePatch({ mode: "clock", instant: "2026-05-03T00:00:00" } as never)).toEqual({
      ok: false,
      reason: "invalid-clock",
    });
    expect(schedulePatch({ mode: "clock", instant: "2026-05-03T00:00:00", timezone: " " })).toEqual({
      ok: false,
      reason: "invalid-clock",
    });
    expect(schedulePatch({
      mode: "day",
      date: "2026-05-03",
      horizon: "month",
      start: "2026-05-01",
      end: "2026-05-31",
    } as never)).toEqual({ ok: false, reason: "day-and-horizon" });
  });

  it("writes an explicit patch that clears the other side and never carries a deadline or title", () => {
    const none = assertSchedulePatch({ mode: "none" });
    const day = assertSchedulePatch({ mode: "day", date: "2026-05-06" });
    const clock = assertSchedulePatch({
      mode: "clock",
      instant: "2026-05-06T00:00:00",
      timezone: "Asia/Tehran",
    });
    const horizon = assertSchedulePatch({
      mode: "horizon",
      horizon: "week",
      start: "2026-05-02",
      end: "2026-05-08",
      calendar: "jalali",
    });
    const range = assertSchedulePatch({
      mode: "horizon",
      horizon: "range",
      start: "2026-05-10",
      end: "2026-06-02",
    });

    for (const patch of [none, day, clock, horizon, range]) expectScheduleKeys(patch);

    expect(none).toMatchObject({
      work_date: null,
      schedule_timezone: null,
      planning_horizon: null,
      planning_start: null,
      planning_end: null,
      planning_calendar: null,
      schedule_v: 2,
    });
    expect(day.work_date).toBe("2026-05-06");
    expect(day.planning_horizon).toBeNull();
    expect(day.planning_start).toBeNull();
    expect(day.planning_end).toBeNull();
    expect(day.planning_calendar).toBeNull();
    expect(day.schedule_timezone).toBeNull();
    expect(clock.work_date).toBe("2026-05-06T00:00:00");
    expect(clock.schedule_timezone).toBe("Asia/Tehran");
    expect(clock.planning_horizon).toBeNull();
    expect(horizon.work_date).toBeNull();
    expect(horizon.schedule_timezone).toBeNull();
    expect(horizon.planning_horizon).toBe("week");
    expect(horizon.planning_start).toBe("2026-05-02");
    expect(horizon.planning_end).toBe("2026-05-08");
    expect(horizon.planning_calendar).toBe("jalali");
    expect(range.planning_horizon).toBe("range");
    expect(range.planning_calendar).toBeNull();
    expect(range.work_date).toBeNull();

    expect(readTaskSchedule(day).conflict).toBe(false);
    expect(readTaskSchedule(horizon).mode).toBe("horizon");
    expect(readTaskSchedule(none).mode).toBe("none");
  });
});

describe("deadline contract", () => {
  const range = { start: "2026-10-01", end: "2026-10-31" };

  it("rejects a timed deadline and writes only deadline_date", () => {
    expect(deadlinePatch("2026-10-12T09:00:00")).toEqual({ ok: false, reason: "invalid-deadline" });
    expect(deadlinePatch("2026-10-12T00:00:00Z")).toEqual({ ok: false, reason: "invalid-deadline" });
    expect(deadlinePatch("2026-02-31")).toEqual({ ok: false, reason: "invalid-deadline" });
    const set = deadlinePatch("2026-10-12");
    const cleared = deadlinePatch(null);
    expect(set).toEqual({ ok: true, patch: { deadline_date: "2026-10-12" } });
    expect(cleared).toEqual({ ok: true, patch: { deadline_date: null } });
    if (set.ok) {
      expect(Object.keys(set.patch)).toEqual(["deadline_date"]);
      expect(set.patch).not.toHaveProperty("work_date");
      expect(set.patch).not.toHaveProperty("planning_horizon");
      expect(set.patch).not.toHaveProperty("planning_start");
      expect(set.patch).not.toHaveProperty("planning_end");
      expect(set.patch).not.toHaveProperty("schedule_timezone");
    }
    expect(assertSchedulePatch({ mode: "day", date: "2026-10-12" })).not.toHaveProperty("deadline_date");
  });

  it("signals only the 7-day window or a passed deadline, from literal dates", () => {
    const today = "2026-10-12";
    expect(deadlineSignal(null, today)).toBeNull();
    expect(deadlineSignal("2026-10-20T00:00:00", today)).toBeNull();
    expect(deadlineSignal("2026-10-20", today)).toBeNull();
    expect(deadlineSignal("2026-10-19", today)).toEqual({ state: "soon", days: 7 });
    expect(deadlineSignal("2026-10-12", today)).toEqual({ state: "soon", days: 0 });
    expect(deadlineSignal("2026-10-11", today)).toEqual({ state: "passed", days: 1 });
    expect(deadlineSignal("2024-03-06", "2024-02-28")).toEqual({ state: "soon", days: 7 });
    expect(deadlineSignal("2024-03-07", "2024-02-28")).toBeNull();
  });

  it("counts the operational day and the deadline once when they are the same day", () => {
    expect(calendarDayMarks({ work_date: "2026-10-12", deadline_date: "2026-10-12" }, range)).toEqual([
      { day: "2026-10-12", work: true, deadline: true },
    ]);
    expect(calendarDayMarks({ work_date: "2026-10-05", deadline_date: "2026-10-12" }, range)).toEqual([
      { day: "2026-10-05", work: true, deadline: false },
      { day: "2026-10-12", work: false, deadline: true },
    ]);
    const horizon = {
      planning_horizon: "month" as const,
      planning_start: "2026-10-01",
      planning_end: "2026-10-31",
      deadline_date: "2026-10-12",
    };
    expect(calendarDayMarks(horizon, range)).toEqual([{ day: "2026-10-12", work: false, deadline: true }]);
    expect(calendarDayMarks({ work_date: "2026-09-01", deadline_date: "2026-10-12T00:00:00" }, range)).toEqual([]);
    expect(calendarDayMarks({ work_date: "2026-10-05", deadline_date: "2026-11-02" }, range)).toEqual([
      { day: "2026-10-05", work: true, deadline: false },
    ]);
  });
});
