import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/taskTypes";
import type { QueuedOp } from "@/lib/offlineQueue";
import { applyTaskOperations } from "./taskOperations";

const task = (id: string, title = id): Task => ({
  id, title, parent_id: null, completed: false, status: "todo", description: null,
  priority: "none", due_date: null, folder_id: null, reminder_at: null,
  recurrence: "none", recurrence_rule: null, pinned: false, start_at: null,
  end_at: null, estimated_minutes: null,
});

const op = (value: Omit<QueuedOp, "id" | "createdAt" | "attempts" | "nextRetryAt">): QueuedOp => ({
  ...value, id: Math.random(), createdAt: Date.now(), attempts: 0,
});

describe("task offline operation projection", () => {
  it("applies updates, inserts, and deletes in one projection", () => {
    const result = applyTaskOperations(
      [task("keep"), task("remove")],
      [
        op({ table: "tasks", op: "update", match: { id: "keep" }, payload: { title: "updated" } }),
        op({ table: "tasks", op: "insert", payload: task("new") }),
        op({ table: "tasks", op: "delete", match: { id: "remove" } }),
      ],
    );
    expect(result.map((item) => item.id)).toEqual(["new", "keep"]);
    expect(result.find((item) => item.id === "keep")?.title).toBe("updated");
  });

  it("merges multiple updates for the same task", () => {
    const result = applyTaskOperations([task("one")], [
      op({ table: "tasks", op: "update", match: { id: "one" }, payload: { title: "first" } }),
      op({ table: "tasks", op: "update", match: { id: "one" }, payload: { completed: true, status: "done" } }),
    ]);
    expect(result[0]).toMatchObject({ title: "first", completed: true, status: "done" });
  });

  it("does not duplicate an inserted task already in the base list", () => {
    const result = applyTaskOperations([task("one")], [
      op({ table: "tasks", op: "insert", payload: task("one", "new title") }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("one");
  });
});
