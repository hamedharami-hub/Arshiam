import { describe, expect, it } from "vitest";
import { focusMinutesInRange, focusSessionMinutes } from "./focusMetrics";

describe("persisted focus metrics", () => {
  it("includes stopped actual minutes and attributes a midnight crossing to its end day", () => {
    const sessions = [
      { duration_minutes: 4.5, completed: false, ended_at: new Date(2026, 9, 14, 0, 2).toISOString() },
      { duration_minutes: 25, completed: true, ended_at: new Date(2026, 9, 13, 23, 30).toISOString() },
    ];
    expect(focusMinutesInRange(sessions, new Date(2026, 9, 14), new Date(2026, 9, 14, 23, 59, 59))).toBe(4.5);
    expect(focusMinutesInRange(sessions, new Date(2026, 9, 13), new Date(2026, 9, 13, 23, 59, 59))).toBe(25);
  });
  it("does not invent duration or day for invalid records", () => {
    expect(focusSessionMinutes({ duration_minutes: NaN, ended_at: null })).toBe(0);
    expect(focusSessionMinutes({ duration_minutes: -5, ended_at: null })).toBe(0);
    expect(focusMinutesInRange([{ duration_minutes: 25, ended_at: "invalid" }], new Date(2026, 0, 1), new Date(2027, 0, 1))).toBe(0);
  });
  it("rounds summed persisted fractions only once", () => {
    expect(focusMinutesInRange(Array.from({ length: 3 }, () => ({ duration_minutes: 0.1, ended_at: "2026-01-01T12:00:00Z" })), new Date("2026-01-01"), new Date("2026-01-02"))).toBe(0.3);
  });
});
