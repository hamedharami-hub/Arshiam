import { describe, expect, it } from "vitest";
import type { Task } from "./taskTypes";
import {
  clearNextOnClose,
  nextTaskPatch,
  prerequisiteFollowUp,
  reviewHistoryLabel,
  reviewSnapshotItems,
  waitingPatch,
  wipWarning,
} from "./dayFlow";

const task = (extra: Partial<Task> & { id: string }): Task => ({
  title: extra.id,
  completed: false,
  status: "todo",
  priority: "none",
  ...extra,
});

describe("day flow", () => {
  it("selects one next task and clears every other explicit next flag", () => {
    const patches = nextTaskPatch([
      { id: "a", is_next: true },
      { id: "b", is_next: false },
      { id: "c", is_next: null },
    ], "c");
    expect(patches).toEqual([
      { id: "a", is_next: false },
      { id: "c", is_next: true },
    ]);
    expect(patches.filter((patch) => patch.is_next).map((patch) => patch.id)).toEqual(["c"]);
  });

  it("does not auto-select a replacement when the next task is closed", () => {
    const tasks = [{ id: "a", is_next: true }, { id: "b", is_next: false }, { id: "c" }];
    const cleared = nextTaskPatch(tasks, null);
    expect(cleared).toEqual([{ id: "a", is_next: false }]);
    expect(cleared.some((patch) => patch.is_next)).toBe(false);
    expect(clearNextOnClose(task({ id: "a", is_next: true, completed: true, status: "done" }))).toEqual({ is_next: false });
    expect(clearNextOnClose(task({ id: "a", is_next: true, status: "done" }))).not.toHaveProperty("id");
  });

  it("rejects a waiting task whose prerequisite is itself and leaves the work date alone", () => {
    const rejected = waitingPatch({ id: "me", work_date: "2026-10-01" }, { prerequisite_id: "me", reason: "loop" });
    expect(rejected).toEqual({ ok: false, error: "self" });
    const accepted = waitingPatch({ id: "me", work_date: "2026-10-01" }, { prerequisite_id: "other" });
    expect(accepted).toEqual({
      ok: true,
      patch: { status: "waiting", waiting_reason: null, prerequisite_id: "other" },
    });
    expect(accepted.ok && accepted.patch).not.toHaveProperty("work_date");
    expect(waitingPatch({ id: "me" }, {}).ok && waitingPatch({ id: "me" }, {}).ok).toBe(true);
  });

  it("does not start or schedule a waiting task when its prerequisite is completed or scheduled", () => {
    const waiter = task({ id: "wait", status: "waiting", prerequisite_id: "pre", work_date: "2026-10-01" });
    const completed = prerequisiteFollowUp([waiter], "pre", "complete");
    const scheduled = prerequisiteFollowUp([waiter], "pre", { work_date: "2026-10-12", status: "todo" });
    expect(completed).toEqual([]);
    expect(scheduled).toEqual([]);
    for (const patch of [...completed, ...scheduled]) {
      expect(patch.work_date).toBeUndefined();
      expect(patch.status === "todo" || patch.status === "in_progress").toBe(false);
    }
  });

  it("keeps the work-in-progress warning off unless it is explicitly enabled", () => {
    expect(wipWarning(9, { enabled: false, limit: 3 })).toBeNull();
    expect(wipWarning(9)).toBeNull();
    expect(wipWarning(3, { enabled: true, limit: 3 })).toBeNull();
    expect(wipWarning(4, { enabled: true, limit: 3 })).toBe("wip:4/3");
  });

  it("does not invent review history when a saved snapshot has no items array", () => {
    expect(reviewHistoryLabel({ at: "2026-10-01", note: "kept" }, true)).toBe("تاریخچه موجود نیست");
    expect(reviewHistoryLabel({ at: "2026-10-01", note: "kept" }, false)).toBe("History is not available");
    expect(reviewHistoryLabel({ items: [] }, true)).toBeNull();
    expect(reviewHistoryLabel(null, true)).toBeNull();
    const items = reviewSnapshotItems([task({
      id: "a",
      title: "A",
      description: "secret diary",
      reminder_at: "2026-10-01T09:00:00Z",
      work_date: "2026-10-01",
      planning_horizon: "week",
      planning_start: "2026-10-01",
      planning_end: "2026-10-07",
    })]);
    expect(items).toEqual([{
      id: "a",
      title: "A",
      status: "todo",
      completed: false,
      work_date: "2026-10-01",
      planning_horizon: "week",
      planning_start: "2026-10-01",
      planning_end: "2026-10-07",
    }]);
    expect(items[0]).not.toHaveProperty("description");
    expect(items[0]).not.toHaveProperty("reminder_at");
  });
});
