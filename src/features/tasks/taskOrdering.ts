/** Shared presentation rule: completed work remains visible, but always follows open work. */
export type CompletionAwareTask = { completed?: boolean; status?: string | null };

export function isTaskCompleted(task: CompletionAwareTask): boolean {
  return Boolean(task.completed || task.status === "done");
}

export function compareCompletedLast(a: CompletionAwareTask, b: CompletionAwareTask): number {
  return Number(isTaskCompleted(a)) - Number(isTaskCompleted(b));
}

export function sortTasksCompletedLast<T extends CompletionAwareTask>(
  tasks: readonly T[],
  compareWithinState?: (a: T, b: T) => number,
): T[] {
  return [...tasks].sort((a, b) => compareCompletedLast(a, b) || (compareWithinState?.(a, b) ?? 0));
}
