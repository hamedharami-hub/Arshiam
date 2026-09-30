import type { Task } from "@/lib/taskTypes";

export type TaskChildrenMap = Record<string, Task[]>;

export function buildTaskChildrenMap(tasks: Task[]): TaskChildrenMap {
  const children: TaskChildrenMap = {};
  for (const task of tasks) {
    if (task.parent_id) (children[task.parent_id] ||= []).push(task);
  }
  return children;
}

export function collectTaskDescendantIds(
  rootId: string,
  childrenMap: TaskChildrenMap,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    result.push(id);
    for (const child of childrenMap[id] || []) visit(child.id);
  };
  visit(rootId);
  return result;
}

export function getTaskProgress(
  taskId: string,
  childrenMap: TaskChildrenMap,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const child of childrenMap[id] || []) {
      total += 1;
      if (child.completed) done += 1;
      visit(child.id);
    }
  };

  visit(taskId);
  return { done, total };
}

/**
 * Determines whether a task should be promoted to the top-level list in a date-scoped view.
 * A task is top-level if:
 * 1. It matches the scope criteria (e.g., date matches today/tomorrow/next7).
 * 2. Either it has no parent_id (it's a root task), OR its parent task is NOT in the scope.
 *
 * If its parent IS also in the scope, the child is nested hierarchically inside the parent.
 * If its parent is NOT in the scope (undated, different date, or missing), the child must
 * appear as a standalone root item so it is never hidden or lost.
 */
export function isStandaloneTaskForScope(
  task: Task,
  isTaskInScope: (task: Task) => boolean,
  taskMap: Map<string, Task> | Record<string, Task>,
): boolean {
  if (!isTaskInScope(task)) return false;
  if (!task.parent_id) return true;

  const parent = taskMap instanceof Map ? taskMap.get(task.parent_id) : taskMap[task.parent_id];
  if (!parent) return true;
  return !isTaskInScope(parent);
}
