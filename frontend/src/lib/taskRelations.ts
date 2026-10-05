import type { Task } from "./taskTypes";

export type TaskParentField = "parent_id" | "plan_parent_id";
export type PrerequisiteReadiness = "none" | "ready" | "blocked" | "needs_decision";
export type TaskRelationNode = Pick<Task, "id"> & Partial<Pick<Task, "parent_id" | "plan_parent_id">>;

/** Validate a proposed subtask or plan-goal parent without conflating the two graphs. */
export function validateTaskParentLink(
  tasks: TaskRelationNode[], childId: string, parentId: string | null, field: TaskParentField,
): { valid: true } | { valid: false; reason: "self" | "missing" | "cycle" } {
  if (parentId === null) return { valid: true };
  if (parentId === childId) return { valid: false, reason: "self" };
  const byId = new Map(tasks.map((task) => [task.id, task]));
  if (!byId.has(parentId)) return { valid: false, reason: "missing" };
  const visited = new Set<string>();
  let cursor: string | null | undefined = parentId;
  while (cursor) {
    if (cursor === childId) return { valid: false, reason: "cycle" };
    if (visited.has(cursor)) return { valid: false, reason: "cycle" };
    visited.add(cursor);
    cursor = byId.get(cursor)?.[field];
  }
  return { valid: true };
}

export function isRecurringPrerequisite(task: Task): boolean {
  return (!!task.recurrence && task.recurrence !== "none") || !!task.recurrence_rule?.freq;
}

/** Rejects a new dependency if it is self-referential, missing, recurring, or cyclic. */
export function validatePrerequisiteLink(
  tasks: Task[], taskId: string, prerequisiteId: string,
): { valid: true } | { valid: false; reason: "self" | "missing" | "recurring" | "cycle" } {
  if (taskId === prerequisiteId) return { valid: false, reason: "self" };
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const prerequisite = byId.get(prerequisiteId);
  if (!prerequisite) return { valid: false, reason: "missing" };
  if (isRecurringPrerequisite(prerequisite)) return { valid: false, reason: "recurring" };

  // Edges point from an action to the tasks it depends on. A path from the
  // candidate back to this action would close a cycle.
  const visited = new Set<string>();
  const reachesTask = (id: string): boolean => {
    if (id === taskId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return (byId.get(id)?.prerequisite_ids || []).some(reachesTask);
  };
  if (reachesTask(prerequisiteId)) return { valid: false, reason: "cycle" };
  return { valid: true };
}

/** Every prerequisite must be explicitly done; missing/set-aside tasks need a user decision. */
export function prerequisiteReadiness(task: Task, tasks: Task[]): PrerequisiteReadiness {
  const ids = [...new Set((task.prerequisite_ids || []).filter((id) => typeof id === "string" && id.length > 0))];
  if (!ids.length) return "none";
  const byId = new Map(tasks.map((item) => [item.id, item]));
  let blocked = false;
  for (const id of ids) {
    const prerequisite = byId.get(id);
    if (!prerequisite || prerequisite.status === "wont_do" || isRecurringPrerequisite(prerequisite)) return "needs_decision";
    if (!(prerequisite.status === "done" && prerequisite.completed)) blocked = true;
  }
  return blocked ? "blocked" : "ready";
}
