import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Task } from "@/lib/taskTypes";
import { buildTaskChildrenMap, collectTaskDescendantIds } from "./taskTree";

const makeTask = (id: string, parent_id: string | null = null): Task => ({
  id,
  user_id: "test-user",
  title: `Task ${id}`,
  parent_id,
  completed: false,
  status: "todo",
  description: null,
  priority: "none",
  due_date: null,
  folder_id: null,
  reminder_at: null,
  recurrence: "none",
  recurrence_rule: null,
  pinned: false,
  start_at: null,
  end_at: null,
  estimated_minutes: null,
  position: 0,
});

describe("taskCascadeDelete logic", () => {
  it("correctly identifies all descendants at depth 1, 2, and 3", () => {
    const tasks: Task[] = [
      makeTask("root"),
      makeTask("child-1", "root"),
      makeTask("child-2", "root"),
      makeTask("grandchild-1", "child-1"),
      makeTask("great-grandchild-1", "grandchild-1"),
      makeTask("unrelated"),
    ];

    const childrenMap = buildTaskChildrenMap(tasks);
    const allIdsToDelete = collectTaskDescendantIds("root", childrenMap);

    expect(allIdsToDelete).toContain("root");
    expect(allIdsToDelete).toContain("child-1");
    expect(allIdsToDelete).toContain("child-2");
    expect(allIdsToDelete).toContain("grandchild-1");
    expect(allIdsToDelete).toContain("great-grandchild-1");
    expect(allIdsToDelete).not.toContain("unrelated");
    expect(allIdsToDelete).toHaveLength(5);
  });

  it("calculates child count accurately (excluding the root task itself)", () => {
    const tasks: Task[] = [
      makeTask("parent"),
      makeTask("sub-1", "parent"),
      makeTask("sub-2", "parent"),
      makeTask("sub-sub-1", "sub-1"),
    ];

    const childrenMap = buildTaskChildrenMap(tasks);
    const descendantIds = collectTaskDescendantIds("parent", childrenMap).filter(
      (id) => id !== "parent"
    );

    expect(descendantIds).toHaveLength(3);
    expect(descendantIds).toEqual(["sub-1", "sub-sub-1", "sub-2"]);
  });

  it("returns 0 child count when task has no descendants", () => {
    const tasks: Task[] = [makeTask("leaf"), makeTask("other")];
    const childrenMap = buildTaskChildrenMap(tasks);
    const descendantIds = collectTaskDescendantIds("leaf", childrenMap).filter(
      (id) => id !== "leaf"
    );

    expect(descendantIds).toHaveLength(0);
  });

  it("handles complex multi-branch tree deletion correctly", () => {
    // Root has 2 children, child-1 has 2 grandchildren, grandchild-1 has 1 great-grandchild
    // child-2 has 1 grandchild
    const tasks: Task[] = [
      makeTask("R"),
      makeTask("C1", "R"),
      makeTask("C2", "R"),
      makeTask("G1", "C1"),
      makeTask("G2", "C1"),
      makeTask("GG1", "G1"),
      makeTask("G3", "C2"),
      makeTask("OtherRoot"),
      makeTask("OtherChild", "OtherRoot"),
    ];
    const childrenMap = buildTaskChildrenMap(tasks);
    const deletedUnderR = collectTaskDescendantIds("R", childrenMap);
    expect(deletedUnderR).toHaveLength(7);
    expect(deletedUnderR).not.toContain("OtherRoot");
    expect(deletedUnderR).not.toContain("OtherChild");

    // Deleting only C1 deletes C1, G1, G2, GG1
    const deletedUnderC1 = collectTaskDescendantIds("C1", childrenMap);
    expect(deletedUnderC1).toHaveLength(4);
    expect(deletedUnderC1).toEqual(["C1", "G1", "GG1", "G2"]);
  });
});
