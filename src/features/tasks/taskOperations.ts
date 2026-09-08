import type { Task } from "@/lib/taskTypes";
import type { QueuedOp } from "@/lib/offlineQueue";

export function applyTaskOperations(base: Task[], operations: QueuedOp[]): Task[] {
  const inserts = new Map<string, Task>();
  const deletes = new Set<string>();
  const updates = new Map<string, Partial<Task>>();

  for (const operation of operations) {
    if (operation.op === "insert" && operation.payload) {
      const task = operation.payload as Task;
      if (task.id) inserts.set(task.id, task);
    } else if (operation.op === "delete" && operation.match?.id) {
      deletes.add(operation.match.id as string);
    } else if (operation.op === "update" && operation.match?.id && operation.payload) {
      const id = operation.match.id as string;
      updates.set(id, { ...(updates.get(id) || {}), ...(operation.payload as Partial<Task>) });
    }
  }

  let next = base.filter((task) => !deletes.has(task.id));
  for (const task of inserts.values()) {
    if (!next.some((item) => item.id === task.id)) next = [task, ...next];
  }
  return next.map((task) => updates.has(task.id)
    ? { ...task, ...updates.get(task.id) }
    : task);
}
