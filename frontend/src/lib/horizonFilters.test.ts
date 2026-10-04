import { describe, expect, it, beforeEach } from "vitest";
import { applyFilter, EMPTY_FILTER, inheritFromFilter, loadFilter, saveFilter, sortTasks } from "./horizonFilters";
import type { Task } from "./taskTypes";

const t = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, priority: "none", completed: false, status: "todo", ...extra });

describe("horizon filters", () => {
  beforeEach(() => localStorage.clear());

  it("are stored separately for each bucket", () => {
    saveFilter("week", { ...EMPTY_FILTER, priorities: ["high"] });
    expect(loadFilter("week").priorities).toEqual(["high"]);
    expect(loadFilter("month").priorities).toEqual([]);
  });

  it("filter by importance, folder and tag", () => {
    const tasks = [t("a", { priority: "high", folder_id: "f1" }), t("b", { priority: "low", folder_id: "f2" }), t("c", { priority: "high" })];
    const tags = new Map([["c", new Set(["t1"])]]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, priorities: ["high"] }, tags).map((x) => x.id)).toEqual(["a", "c"]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, folderIds: ["f2"] }, tags).map((x) => x.id)).toEqual(["b"]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, tagIds: ["t1"] }, tags).map((x) => x.id)).toEqual(["c"]);
  });

  it("sorts by importance with done tasks last", () => {
    const out = sortTasks([t("x", { priority: "low" }), t("y", { priority: "urgent", completed: true }), t("z", { priority: "high" })], "priority");
    expect(out.map((x) => x.id)).toEqual(["z", "x", "y"]);
  });

  it("filters by completion status (active, completed, all)", () => {
    const tasks = [t("t1", { completed: false }), t("t2", { completed: true })];
    const tags = new Map();
    expect(applyFilter(tasks, { ...EMPTY_FILTER, completion: "active" }, tags).map((x) => x.id)).toEqual(["t1"]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, completion: "completed" }, tags).map((x) => x.id)).toEqual(["t2"]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, completion: "all" }, tags).map((x) => x.id)).toEqual(["t1", "t2"]);
  });

  it("filters by goals including child goals and no-goal option", () => {
    const goals = [
      { id: "g-root", title: "هدف اصلی", parentId: null, timeHorizon: "quarterly" as const, priority: "high" as const, position: 0 },
      { id: "g-child", title: "زیر هدف", parentId: "g-root", timeHorizon: "monthly" as const, priority: "medium" as const, position: 0 },
      { id: "g-other", title: "هدف دیگر", parentId: null, timeHorizon: "quarterly" as const, priority: "low" as const, position: 1 },
    ];
    const tasks = [
      t("task-root", { kanban_column_id: "g-root" }),
      t("task-child", { kanban_column_id: "g-child" }),
      t("task-other", { kanban_column_id: "g-other" }),
      t("task-none", { kanban_column_id: null }),
    ];
    const tags = new Map();

    // Filtering by g-root should also include task-child
    expect(applyFilter(tasks, { ...EMPTY_FILTER, goalIds: ["g-root"] }, tags, goals).map((x) => x.id)).toEqual(["task-root", "task-child"]);
    // Filtering by __none__ should find task-none
    expect(applyFilter(tasks, { ...EMPTY_FILTER, goalIds: ["__none__"] }, tags, goals).map((x) => x.id)).toEqual(["task-none"]);
  });

  it("filters by search query on task title", () => {
    const tasks = [t("t1", { title: "خرید شیر و نان" }), t("t2", { title: "تماس با پزشک" })];
    const tags = new Map();
    expect(applyFilter(tasks, { ...EMPTY_FILTER, search: "شیر" }, tags).map((x) => x.id)).toEqual(["t1"]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, search: "پزشک" }, tags).map((x) => x.id)).toEqual(["t2"]);
    expect(applyFilter(tasks, { ...EMPTY_FILTER, search: "داروخانه" }, tags)).toEqual([]);
  });

  it("inherits only from an unambiguous filter", () => {
    expect(inheritFromFilter({ ...EMPTY_FILTER, priorities: ["high"], folderIds: ["f1"], tagIds: ["t1"] }))
      .toEqual({ priority: "high", folderId: "f1", tagIds: ["t1"] });
    expect(inheritFromFilter({ ...EMPTY_FILTER, priorities: ["high", "low"], folderIds: ["f1"] })).toEqual({});
    expect(inheritFromFilter(EMPTY_FILTER)).toEqual({});
  });
});
