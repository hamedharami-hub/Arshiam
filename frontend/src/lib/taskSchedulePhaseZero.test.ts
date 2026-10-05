import { describe, expect, it } from "vitest";
import { dateTimeSchedule, legacySchedule, normalizeTaskWrite, readSchedule, schedulePatch } from "./taskSchedule";
import { scheduleWrite, taskDayOf } from "../../../api/_lib/taskSchedule";

describe("phase zero schedule contract", () => {
  it.each(["00:00", "23:59", "15:00"])("preserves explicit v2 time %s", (clock) => {
    const expected = dateTimeSchedule("2026-10-05", clock);
    expect(readSchedule(schedulePatch(expected))).toEqual(expected);
  });
  it("keeps date-only dates as days", () => {
    expect(readSchedule(normalizeTaskWrite({work_date:"2026-10-05"}))).toEqual({kind:"day",date:"2026-10-05"});
  });
  it("restricts legacy inference to non-exact legacy dates", () => {
    const at = new Date(2026,9,5,0,0).toISOString();
    expect(legacySchedule({work_date:at}).schedule.kind).toBe("day");
    expect(legacySchedule({is_exact:true,due_at:at}).schedule.kind).toBe("datetime");
  });
  it("normalizes direct writer replacements and clear without reviving periods", () => {
    const period = schedulePatch({kind:"period",period:{horizon:"week",start:"2026-10-05",end:"2026-10-11"}});
    const dated = {...period,...normalizeTaskWrite({work_date:"2026-10-06"})};
    expect(dated.planning_horizon).toBeNull();
    expect(readSchedule({...dated,...normalizeTaskWrite({work_date:null})}).kind).toBe("none");
    expect(normalizeTaskWrite({planning_horizon:"month",planning_start:"2026-10-01",planning_end:"2026-10-31"})).toMatchObject({work_date:null});
  });
  it("rejects ambiguous or incomplete schedule writes", () => {
    expect(() => normalizeTaskWrite({work_date:"2026-10-06",planning_horizon:"week"})).toThrow();
    expect(() => normalizeTaskWrite({planning_horizon:"week"})).toThrow();
    expect(() => normalizeTaskWrite({work_date:"2026-02-30"})).toThrow();
    expect(() => normalizeTaskWrite({work_date:"invalid"})).toThrow();
    expect(() => normalizeTaskWrite({planning_horizon:"week",planning_start:"2026-02-30",planning_end:"2026-03-05"})).toThrow();
  });
  it("keeps existing stored timezone when normalizing a full row", () => {
    const row = normalizeTaskWrite({work_date:"2026-10-04T13:30:00Z",schedule_timezone:"Australia/Sydney"});
    expect(row.schedule_timezone).toBe("Australia/Sydney");
    expect(taskDayOf(row)).toBe("2026-10-05");
    expect(normalizeTaskWrite({schedule_v:2,work_date:"2026-10-04T13:30:00Z"})).toMatchObject({schedule_timezone:null});
  });
  it("uses task or explicit user zone rather than UTC slicing", () => {
    const row = scheduleWrite("2026-10-04T13:30:00Z","Australia/Sydney");
    expect(taskDayOf(row)).toBe("2026-10-05");
    expect(taskDayOf(row,"America/Los_Angeles")).toBe("2026-10-04");
    expect(taskDayOf(scheduleWrite("2026-10-05"))).toBe("2026-10-05");
  });
  it("does not invent a day without a valid zone", () => {
    expect(taskDayOf(scheduleWrite("2026-10-04T13:30:00Z"))).toBeNull();
    expect(taskDayOf({work_date:"invalid",schedule_timezone:"Australia/Sydney"})).toBeNull();
    expect(taskDayOf({work_date:"2026-10-04T13:30:00Z",schedule_timezone:"invalid"})).toBeNull();
  });
});
