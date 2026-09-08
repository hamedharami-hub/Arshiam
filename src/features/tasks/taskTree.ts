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
