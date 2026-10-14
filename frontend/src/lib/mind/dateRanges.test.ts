import { afterEach, describe, expect, it, vi } from "vitest";
import { calendarWeeks, datesInRange, localDateKey, mindDateRange, parseLocalDate, shiftLocalDay, timestampInRange, uniqueCheckins, weeklyMindActions, MIND_ACTION_SOURCES } from "./dateRanges";

afterEach(() => vi.unstubAllEnvs());

describe("Mind local calendar ranges", () => {
  it.each([7, 30, 90])("includes exactly %i distinct days including today and excludes future dates", (days) => {
    const range = mindDateRange(days, new Date(2026, 9, 15, 14));
    const dates = datesInRange(range.start, range.end);
    expect(dates).toHaveLength(days);
    expect(dates.at(-1)).toBe("2026-10-15");
    const rows = [...dates, dates[0], "2026-10-16", "2026-02-30"].map((checkin_date) => ({ checkin_date }));
    expect(uniqueCheckins(rows, range)).toHaveLength(days);
  });

  it("constructs date-only values locally and rejects invalid days", () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    expect(parseLocalDate("2026-10-15")?.getDate()).toBe(15);
    expect(parseLocalDate("2026-02-30")).toBeNull();
    expect(parseLocalDate("2026-10-15T00:00:00Z")).toBeNull();
  });

  it.each([[2, 9, 23], [10, 2, 25]])("counts calendar days across DST boundaries (month %i day %i)", (month, day, hours) => {
    vi.stubEnv("TZ", "America/New_York");
    const now = new Date(2026, month, day, 14);
    const range = mindDateRange(7, now);
    expect(datesInRange(range.start, range.end)).toHaveLength(7);
    expect(localDateKey(shiftLocalDay(parseLocalDate(range.start)!, 6))).toBe(range.end);
    const midnight = new Date(2026, month, day);
    expect((midnight.getTime() - shiftLocalDay(midnight, -1).getTime()) / 3600000).toBe(hours);
  });

  it("bounds timestamps at local midnight and now, without fabricating completion dates", () => {
    const now = new Date(2026, 9, 15, 14);
    const range = mindDateRange(7, now);
    expect(timestampInRange(range.startISO, range)).toBe(true);
    expect(timestampInRange(new Date(Date.parse(range.startISO) - 1).toISOString(), range)).toBe(false);
    expect(timestampInRange(new Date(now.getTime() + 1).toISOString(), range)).toBe(false);
    expect(timestampInRange("2026-10-15", range)).toBe(false);
    expect(timestampInRange(undefined, range)).toBe(false);
  });

  it("counts all registered action sources once, and leaves undated actions outside totals", () => {
    const now = new Date(2026, 9, 15, 14);
    const rows = MIND_ACTION_SOURCES.map((source_type, index) => ({ id: String(index), source_type, completed_at: now.toISOString() }));
    const result = weeklyMindActions([...rows, rows[0], { id: "undated", source_type: "mind_need" }, { id: "future", source_type: "values_goal", completed_at: new Date(2026, 9, 16).toISOString() }], now);
    expect(result.completed).toHaveLength(5);
    expect(result.undated).toBe(1);
  });

  it("aligns Saturday-start and Sunday-start calendars to seven-day weeks", () => {
    const days = datesInRange("2026-10-01", "2026-10-07").map((date) => ({ date }));
    const saturday = calendarWeeks(days, 6), sunday = calendarWeeks(days, 0);
    expect(saturday.every((week) => week.length === 7)).toBe(true);
    expect(saturday[0][5]).toEqual({ date: "2026-10-01" });
    expect(sunday[0][4]).toEqual({ date: "2026-10-01" });
    expect(saturday.flat().filter(Boolean)).toEqual(days);
  });
});
