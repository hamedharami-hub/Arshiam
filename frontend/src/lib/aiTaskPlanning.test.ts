import { describe, expect, it, vi } from "vitest";
import { isOverdueFixedSchedule, parseExplicitWorkDate, parseTaskListDrafts, safeInboxTasks, safeScheduledTasks, taskScheduleLabel, validateInboxSortProposal } from "./aiTaskPlanning";

vi.mock("./taskSchedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./taskSchedule")>();
  return { ...actual, readSchedule: actual.readSchedule };
});

describe("AI task planning safeguards", () => {
  it("requires an explicit date and drops an ambiguous clock from the parsed schedule", () => {
    const parseDate = vi.fn((source: string) => source.includes("tomorrow") ? "2026-10-08T05:00:00.000Z" : "2026-10-07T17:00:00.000Z");
    expect(parseExplicitWorkDate("Call at 5", parseDate)).toBeNull();
    expect(parseDate).not.toHaveBeenCalled();
    expect(parseExplicitWorkDate("Finish the report by Friday", parseDate)).toBeNull();
    expect(parseExplicitWorkDate("گزارش را تا جمعه تمام کن", parseDate)).toBeNull();
    expect(parseDate).not.toHaveBeenCalled();
    expect(parseExplicitWorkDate("Call tomorrow at 5", parseDate)).toBe("2026-10-08");
    expect(parseExplicitWorkDate("Call tomorrow at 5pm", parseDate)).toBe("2026-10-08T05:00:00.000Z");
    expect(parseExplicitWorkDate("Call tomorrow at 17", parseDate)).toBe("2026-10-08T05:00:00.000Z");
  });

  it("accepts only rows with an exact source quote and derives dates from that quote, not model fields", () => {
    const drafts = parseTaskListDrafts({ items: [
      { source_text: "Call Sara tomorrow", title: "Call Sara", work_date: "2099-01-01", priority: "high" },
      { source_text: "invented task", title: "Invented" },
    ] }, "Call Sara tomorrow", (source) => source.includes("tomorrow") ? "2026-10-08" : null);

    expect(drafts).toEqual([{
      source_text: "Call Sara tomorrow", title: "Call Sara", description: null,
      priority: "high", work_date: "2026-10-08",
    }]);
  });

  it("filters context to the current user's ordinary, open inbox tasks", () => {
    const tasks = safeInboxTasks([
      { id: "mine", user_id: "u1", title: "Buy milk", priority: "none", completed: false, status: "todo" },
      { id: "other", user_id: "u2", title: "Private", priority: "none", completed: false, status: "todo" },
      { id: "mind", user_id: "u1", title: "Sensitive", priority: "none", completed: false, status: "todo", source_type: "cbt_thought" },
      { id: "child", user_id: "u1", title: "Child", priority: "none", completed: false, status: "todo", parent_id: "mine" },
      { id: "folder", user_id: "u1", title: "Folder task", priority: "none", completed: false, status: "todo", folder_id: "f1" },
      { id: "done", user_id: "u1", title: "Done", priority: "none", completed: true, status: "done" },
    ], "u1");

    expect(tasks.map((task) => task.id)).toEqual(["mine"]);
  });

  it("includes only scheduled ordinary work in the selected calendar window", () => {
    const tasks = safeScheduledTasks([
      { id: "today", user_id: "u1", title: "Today", priority: "high", completed: false, status: "todo", schedule_v: 2, work_date: "2026-10-07" },
      { id: "week", user_id: "u1", title: "This week", priority: "none", completed: false, status: "todo", schedule_v: 2, planning_horizon: "week", planning_start: "2026-10-03", planning_end: "2026-10-09" },
      { id: "month", user_id: "u1", title: "This month", priority: "none", completed: false, status: "todo", schedule_v: 2, planning_horizon: "month", planning_start: "2026-10-01", planning_end: "2026-10-31" },
      { id: "unscheduled", user_id: "u1", title: "Unscheduled", priority: "none", completed: false, status: "todo" },
      { id: "done", user_id: "u1", title: "Done", priority: "none", completed: true, status: "done", schedule_v: 2, work_date: "2026-10-07" },
    ], "u1", "2026-10-07", "2026-10-07", "day");

    expect(tasks.map((task) => task.id)).toEqual(["today"]);
    expect(taskScheduleLabel(tasks[0])).toBe("2026-10-07");
  });

  it("keeps weekly date tasks inside the selected week and leaves old work in the explicit daily overdue set", () => {
    const base = { user_id: "u1", priority: "none" as const, completed: false, status: "todo" as const, schedule_v: 2 };
    const all = [
      { ...base, id: "before", title: "Before", work_date: "2026-10-02" },
      { ...base, id: "in-start", title: "Start", work_date: "2026-10-03" },
      { ...base, id: "in-end", title: "End", work_date: "2026-10-09" },
      { ...base, id: "after", title: "After", work_date: "2026-10-10" },
    ];
    expect(safeScheduledTasks(all, "u1", "2026-10-03", "2026-10-09", "week").map((task) => task.id))
      .toEqual(["in-start", "in-end"]);
    expect(safeScheduledTasks(all, "u1", "2026-10-07", "2026-10-07", "day").map((task) => task.id))
      .toEqual(["before", "in-start"]);
  });

  it("does not classify an active planning period that spans today as overdue", () => {
    expect(isOverdueFixedSchedule({
      id: "period", user_id: "u1", title: "This week", schedule_v: 2,
      planning_horizon: "week", planning_start: "2026-10-03", planning_end: "2026-10-09",
    }, "2026-10-07")).toBe(false);
    expect(isOverdueFixedSchedule({
      id: "old-day", user_id: "u1", title: "Old task", schedule_v: 2, work_date: "2026-10-06",
    }, "2026-10-07")).toBe(true);
  });

  it("rejects malformed or unsupported sort proposals", () => {
    expect(validateInboxSortProposal({ primary: { key: "constructor", dir: "asc" }, secondary: { key: "due", dir: "asc" } })).toBeNull();
    expect(validateInboxSortProposal({ primary: { key: "priority", dir: "desc" }, secondary: { key: "due", dir: "asc" }, reason: "Start with urgent work" }))
      .toEqual({ primary: { key: "priority", dir: "desc" }, secondary: { key: "due", dir: "asc" }, reason: "Start with urgent work" });
  });
});
