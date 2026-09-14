import { describe, expect, it } from "vitest";
import { isTaskCompleted, sortTasksCompletedLast } from "./taskOrdering";

describe("task completion ordering", () => {
  it("keeps completed tasks visible after every open task", () => {
    const tasks = [
      { id: "done", completed: true, status: "done" },
      { id: "open-b", completed: false, status: "todo" },
      { id: "open-a", completed: false, status: "todo" },
    ];
    expect(sortTasksCompletedLast(tasks, (a, b) => a.id.localeCompare(b.id)).map((task) => task.id))
      .toEqual(["open-a", "open-b", "done"]);
  });

  it("supports older records that only carry the done status", () => {
    expect(isTaskCompleted({ status: "done" })).toBe(true);
  });
});
