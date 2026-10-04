import type { Task } from "@/lib/taskTypes";

/** Keep newly edited badges visible even if a stale task list arrives later. */
export function applyVisualTaskPatches(tasks: Task[], patches: Record<string, Partial<Task>>): Task[] {
  if (Object.keys(patches).length === 0) return tasks;
  return tasks.map((task) => patches[task.id] ? { ...task, ...patches[task.id] } : task);
}
