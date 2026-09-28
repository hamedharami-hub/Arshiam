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

  it("inherits only from an unambiguous filter", () => {
    expect(inheritFromFilter({ ...EMPTY_FILTER, priorities: ["high"], folderIds: ["f1"], tagIds: ["t1"] }))
      .toEqual({ priority: "high", folderId: "f1", tagIds: ["t1"] });
    expect(inheritFromFilter({ ...EMPTY_FILTER, priorities: ["high", "low"], folderIds: ["f1"] })).toEqual({});
    expect(inheritFromFilter(EMPTY_FILTER)).toEqual({});
  });
});
