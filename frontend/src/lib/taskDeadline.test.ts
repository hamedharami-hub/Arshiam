import { describe, expect, it } from "vitest";
import { isTaskClosed, isValidDeadlineDate, supportsTaskDeadline, taskDeadlineStatus } from "./taskDeadline";

describe("task deadline date helpers", () => {
  it("limits the initial deadline feature to active one-off tasks", () => {
    expect(supportsTaskDeadline({ recurrence: "none" })).toBe(true);
    expect(supportsTaskDeadline({})).toBe(true);
    expect(supportsTaskDeadline({ recurrence: "weekly" })).toBe(false);
    expect(supportsTaskDeadline({ recurrence_rule: { freq: "daily" } })).toBe(false);
    expect(isTaskClosed({ completed: true })).toBe(true);
    expect(isTaskClosed({ status: "done", completed: false })).toBe(true);
    expect(isTaskClosed({ status: "wont_do", completed: false })).toBe(true);
    expect(isTaskClosed({ status: "todo", completed: false })).toBe(false);
  });

  it("validates real calendar dates without timezone conversion", () => {
    expect(isValidDeadlineDate("2024-02-29")).toBe(true);
    expect(isValidDeadlineDate("2026-02-29")).toBe(false);
    expect(isValidDeadlineDate("2026-04-31")).toBe(false);
    expect(isValidDeadlineDate("2026-4-03")).toBe(false);
  });

  it("classifies local calendar dates at today, seven days, eight days and overdue", () => {
    expect(taskDeadlineStatus("2026-03-10", "2026-03-10")).toBe("upcoming");
    expect(taskDeadlineStatus("2026-03-17", "2026-03-10")).toBe("upcoming");
    expect(taskDeadlineStatus("2026-03-18", "2026-03-10")).toBe("none");
    expect(taskDeadlineStatus("2026-03-09", "2026-03-10")).toBe("overdue");
    expect(taskDeadlineStatus("2026-02-30", "2026-03-10")).toBe("none");
    expect(taskDeadlineStatus("2026-03-10", "invalid")).toBe("none");
  });

  it("counts across leap day and year boundaries", () => {
    expect(taskDeadlineStatus("2024-03-01", "2024-02-23")).toBe("upcoming");
    expect(taskDeadlineStatus("2027-01-01", "2026-12-25")).toBe("upcoming");
    expect(taskDeadlineStatus("2027-01-02", "2026-12-25")).toBe("none");
  });
});
