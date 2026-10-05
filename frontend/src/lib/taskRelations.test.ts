import { describe, expect, it } from "vitest";
import type { Task } from "./taskTypes";
import { prerequisiteReadiness, validatePrerequisiteLink, validateTaskParentLink } from "./taskRelations";

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id, title: id, priority: "none", completed: false, status: "todo", ...extra,
});

describe("task relationships", () => {
  it("rejects self-links and cycles for prerequisites and both parent graphs", () => {
    const tasks = [task("a", { prerequisite_ids: ["b"] }), task("b")];
    expect(validatePrerequisiteLink(tasks, "a", "a")).toEqual({ valid: false, reason: "self" });
    expect(validatePrerequisiteLink(tasks, "b", "a")).toEqual({ valid: false, reason: "cycle" });
    expect(validateTaskParentLink([task("a", { parent_id: "b" }), task("b")], "b", "a", "parent_id"))
      .toEqual({ valid: false, reason: "cycle" });
    expect(validateTaskParentLink([task("goal", { plan_parent_id: "action" }), task("action")], "action", "goal", "plan_parent_id"))
      .toEqual({ valid: false, reason: "cycle" });
  });

  it("keeps subtask, plan-goal, and prerequisite graphs separate", () => {
    const tasks = [task("goal"), task("step", { plan_parent_id: "goal" }), task("prep", { parent_id: "step" })];
    expect(validateTaskParentLink(tasks, "prep", "goal", "parent_id")).toEqual({ valid: true });
    expect(validateTaskParentLink(tasks, "prep", "goal", "plan_parent_id")).toEqual({ valid: true });
    expect(validatePrerequisiteLink(tasks, "prep", "goal")).toEqual({ valid: true });
  });

  it("requires a user decision for missing, set-aside, or recurring prerequisites", () => {
    const current = task("current", { prerequisite_ids: ["deleted"] });
    expect(prerequisiteReadiness(current, [current])).toBe("needs_decision");
    expect(prerequisiteReadiness(task("current", { prerequisite_ids: ["aside"] }), [task("aside", { status: "wont_do" })]))
      .toBe("needs_decision");
    expect(prerequisiteReadiness(task("current", { prerequisite_ids: ["repeat"] }), [task("repeat", { recurrence: "daily" })]))
      .toBe("needs_decision");
    expect(validatePrerequisiteLink([task("current"), task("repeat", { recurrence_rule: { freq: "weekly", interval: 1 } })], "current", "repeat"))
      .toEqual({ valid: false, reason: "recurring" });
  });

  it("only changes readiness when prerequisites are all explicitly done; it never starts or schedules", () => {
    const current = task("current", { prerequisite_ids: ["a", "b"] });
    const a = task("a", { completed: true, status: "done" });
    const b = task("b");
    expect(prerequisiteReadiness(current, [current, a, b])).toBe("blocked");
    expect(prerequisiteReadiness(current, [current, a, task("b", { completed: true, status: "done" })])).toBe("ready");
    expect(current.status).toBe("todo");
    expect(current.work_date).toBeUndefined();
  });
});
