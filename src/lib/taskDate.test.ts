import { describe, expect, it } from "vitest";
import { parseTaskDueDate, taskDueTimestamp, getLocalDateString } from "./taskDate";

describe("task date parsing", () => {
  it("treats date-only values as local calendar dates", () => {
    const parsed = parseTaskDueDate("2026-09-17");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(17);
  });

  it("returns infinity for missing or invalid dates", () => {
    expect(taskDueTimestamp(null)).toBe(Number.POSITIVE_INFINITY);
    expect(taskDueTimestamp("not-a-date")).toBe(Number.POSITIVE_INFINITY);
  });

  it("formats local dates to YYYY-MM-DD correctly without UTC shift", () => {
    const d = new Date(2026, 8, 20, 2, 30, 0); // Sept 20, 2026 at 2:30 AM local
    expect(getLocalDateString(d)).toBe("2026-09-20");
  });
});
