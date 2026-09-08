import { describe, expect, it } from "vitest";
import { buildTaskChildrenMap, collectTaskDescendantIds, getTaskProgress } from "./taskTree";
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
  start_at: null,
  end_at: null,
  estimated_minutes: null,
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

  it("calculates progress across nested descendants", () => {
    const map = buildTaskChildrenMap([
      task("root"),
      task("done", "root", true),
      task("open", "root"),
      task("nested-done", "open", true),
    ]);

    expect(getTaskProgress("root", map)).toEqual({ done: 2, total: 3 });
    expect(getTaskProgress("done", map)).toEqual({ done: 0, total: 0 });
  });

  it("does not loop forever when malformed data contains a cycle", () => {
    const map = buildTaskChildrenMap([task("a", "b"), task("b", "a")]);
    expect(collectTaskDescendantIds("a", map)).toEqual(["a", "b"]);
    expect(getTaskProgress("a", map)).toEqual({ done: 0, total: 2 });
  });
});
