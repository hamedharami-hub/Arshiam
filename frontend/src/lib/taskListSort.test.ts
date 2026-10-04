import { beforeEach, describe, expect, it } from "vitest";
import { readTaskListSort, saveTaskListSort, TASK_LIST_SORT_KEY } from "./taskListSort";
import { DEFAULT_FILTERS, filterAndSortTasks } from "./smartListService";
import type { Task } from "./taskTypes";

beforeEach(() => localStorage.clear());
describe("Task list display rules", () => {
  it("stores separate two-level rules per list and preserves its existing filters", () => {
    localStorage.setItem(TASK_LIST_SORT_KEY, JSON.stringify({ "inbox:_": { tag_ids: ["work"] } }));
    const next = { sort_primary: { key: "title", dir: "asc" }, sort_secondary: { key: "created", dir: "desc" } } as const;
    expect(saveTaskListSort("inbox:_", next)).toBe(true);
    expect(readTaskListSort("inbox:_")).toEqual(next);
    expect(readTaskListSort("today:_").sort_primary.key).toBe("priority");
    expect(JSON.parse(localStorage.getItem(TASK_LIST_SORT_KEY)!)["inbox:_"].tag_ids).toEqual(["work"]);
  });
  it("keeps pinned tasks first and uses the second rule for tied priorities", () => {
    const task = (id: string, title: string, priority: string, pinned?: boolean) => ({ id, title, priority, pinned, completed: false } as Task);
    const tasks = [task("c", "C", "high", false), task("b", "B", "high"), task("a", "A", "low", true), task("d", "D", "urgent")];
    expect(filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, sort_primary: { key: "priority", dir: "asc" }, sort_secondary: { key: "title", dir: "asc" } }).map((item) => item.id)).toEqual(["a", "d", "b", "c"]);
    expect(tasks.map((item) => item.id)).toEqual(["c", "b", "a", "d"]);
  });
  it("validates damaged values and applies defaults to lists without overrides", () => {
    localStorage.setItem(TASK_LIST_SORT_KEY, '{"today:_":{"sort_primary":{"key":"broken","dir":"up"}}}');
    expect(readTaskListSort("today:_").sort_primary.key).toBe("priority");
    saveTaskListSort("default:_", { sort_primary: { key: "created", dir: "desc" }, sort_secondary: { key: "title", dir: "asc" } });
    expect(readTaskListSort("tomorrow:_").sort_primary).toEqual({ key: "created", dir: "desc" });
  });
});
