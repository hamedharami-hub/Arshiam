import { getFolderTaskTree, buildTaskChildrenMap, collectTaskDescendantIds, getTaskProgress, isStandaloneTaskForScope } from "./taskTree";
import type { Task } from "@/lib/taskTypes";

const task = (id: string, parent_id: string | null = null, completed = false): Task => ({
  id,
  parent_id,
  completed,
  title: id,
  description: null,
  priority: "none",
  due_date: null,
  status: completed ? "done" : "todo",
  folder_id: null,
  reminder_at: null,
  recurrence: "none",
  recurrence_rule: null,
  pinned: false,
  
  
  
});

describe("task tree utilities", () => {
  it("builds a parent-to-children map", () => {
    const map = buildTaskChildrenMap([
      task("root"),
      task("child-a", "root"),
      task("child-b", "root"),
      task("grandchild", "child-a"),
    ]);

    expect(map.root.map((item) => item.id)).toEqual(["child-a", "child-b"]);
    expect(map["child-a"].map((item) => item.id)).toEqual(["grandchild"]);
  });

  it("collects a root and all descendants once", () => {
    const map = buildTaskChildrenMap([
      task("root"),
      task("child", "root"),
      task("grandchild", "child"),
    ]);

    expect(collectTaskDescendantIds("root", map)).toEqual(["root", "child", "grandchild"]);
  });

  it("calculates progress across unique nested leaves without counting intermediate parents", () => {
    const map = buildTaskChildrenMap([
      task("root"),
      task("done", "root", true),
      task("open", "root"),
      task("nested-done", "open", true),
    ]);

    expect(getTaskProgress("root", map)).toEqual({ done: 2, total: 2 });
    expect(getTaskProgress("done", map)).toEqual({ done: 0, total: 0 });
  });

  it("does not loop forever when malformed data contains a cycle", () => {
    const map = buildTaskChildrenMap([task("a", "b"), task("b", "a")]);
    expect(collectTaskDescendantIds("a", map)).toEqual(["a", "b"]);
    expect(getTaskProgress("a", map)).toEqual({ done: 0, total: 0 });
  });

  it("does not let a checked parent hide open descendants or count set-aside leaves", () => {
    const root = { ...task("root"), completed: true, status: "done" as const };
    const branch = task("branch", "root");
    const doneLeaf = task("done-leaf", "branch", true);
    const openLeaf = task("open-leaf", "branch");
    const asideLeaf = { ...task("aside-leaf", "root"), status: "wont_do" as const };
    const map = buildTaskChildrenMap([root, branch, doneLeaf, openLeaf, asideLeaf]);
    expect(getTaskProgress("root", map)).toEqual({ done: 1, total: 2 });
  });

  it("does not treat a completed parent with only set-aside descendants as a leaf", () => {
    const root = { ...task("root"), completed: true, status: "done" as const };
    const branch = { ...task("branch", "root"), completed: true, status: "done" as const };
    const asideLeaf = { ...task("aside-leaf", "branch"), status: "wont_do" as const };
    const map = buildTaskChildrenMap([root, branch, asideLeaf]);
    expect(getTaskProgress("root", map)).toEqual({ done: 0, total: 0 });
  });

  describe("isStandaloneTaskForScope", () => {
    const todayStr = "2026-09-21";
    const tomorrowStr = "2026-09-22";
    const isToday = (t: Task) => t.due_date === todayStr;

    it("returns false if task itself is not in scope", () => {
      const t = { ...task("child"), due_date: tomorrowStr };
      expect(isStandaloneTaskForScope(t, isToday, new Map())).toBe(false);
    });

    it("returns true for root task in scope without parent", () => {
      const t = { ...task("root"), due_date: todayStr };
      expect(isStandaloneTaskForScope(t, isToday, new Map())).toBe(true);
    });

    it("returns true for child task in scope when parent is undated (not in scope)", () => {
      const parent = { ...task("parent"), due_date: null };
      const child = { ...task("child", "parent"), due_date: todayStr };
      const map = new Map([["parent", parent], ["child", child]]);

      expect(isStandaloneTaskForScope(child, isToday, map)).toBe(true);
    });

    it("returns true for child task in scope when parent is on a different date", () => {
      const parent = { ...task("parent"), due_date: tomorrowStr };
      const child = { ...task("child", "parent"), due_date: todayStr };
      const map = new Map([["parent", parent], ["child", child]]);

      expect(isStandaloneTaskForScope(child, isToday, map)).toBe(true);
    });

    it("returns false for child task in scope when parent is ALSO in scope", () => {
      const parent = { ...task("parent"), due_date: todayStr };
      const child = { ...task("child", "parent"), due_date: todayStr };
      const map = new Map([["parent", parent], ["child", child]]);

      // Since parent is in today's scope, child will be nested inside parent
      expect(isStandaloneTaskForScope(child, isToday, map)).toBe(false);
    });

    it("returns true if parent_id is missing from taskMap (orphaned child)", () => {
      const child = { ...task("child", "missing-parent"), due_date: todayStr };
      expect(isStandaloneTaskForScope(child, isToday, new Map())).toBe(true);
    });
  });
});

describe("folder descendants", () => {
  it("includes children and grandchildren without a folder id and excludes other folders", () => {
    const root = { ...task("root"), folder_id: "folder-1" };
    const child = task("child", "root");
    const grandchild = task("grandchild", "child");
    const other = { ...task("other"), folder_id: "folder-2" };
    expect(getFolderTaskTree([root, child, grandchild, other, task("other-child", "other")], "folder-1").map(task => task.id)).toEqual(["root", "child", "grandchild"]);
  });
});
