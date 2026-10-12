import type { Task, TaskStatus } from "@/lib/taskTypes";

/** One explicit next task. This module only returns patches; it does not write Firebase. */
export function nextTaskPatch(
  tasks: Array<{ id: string; is_next?: boolean | null }>,
  id: string | null,
): Array<{ id: string; is_next: boolean }> {
  const patches: Array<{ id: string; is_next: boolean }> = [];
  let selectedSeen = false;
  for (const task of tasks) {
    if (id && task.id === id) {
      selectedSeen = true;
      patches.push({ id: task.id, is_next: true });
      continue;
    }
    if (task.is_next === true) patches.push({ id: task.id, is_next: false });
  }
  if (id && !selectedSeen) patches.push({ id, is_next: true });
  return patches;
}

/** Completion and deletion clear the flag. They do not pick another task. */
export function clearNextOnClose(_task: {
  is_next?: boolean | null;
  completed?: boolean;
  status?: string | null;
}): { is_next: false } {
  return { is_next: false };
}

export type WaitingPatchResult =
  | { ok: false; error: "self" }
  | {
      ok: true;
      patch: {
        status: "waiting";
        waiting_reason: string | null;
        prerequisite_id: string | null;
      };
    };

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Marks a task waiting. Reason is optional. A self-prerequisite is rejected.
 * The patch never deletes the task and never writes work_date.
 */
export function waitingPatch(
  task: { id: string; work_date?: string | null },
  input: { reason?: string | null; prerequisite_id?: string | null } = {},
): WaitingPatchResult {
  const prerequisite = emptyToNull(input.prerequisite_id);
  if (prerequisite && prerequisite === task.id) return { ok: false, error: "self" };
  return {
    ok: true,
    patch: {
      status: "waiting",
      waiting_reason: emptyToNull(input.reason),
      prerequisite_id: prerequisite,
    },
  };
}

/**
 * Completing or scheduling a prerequisite must not start or schedule tasks that wait on it.
 * An empty list is the only allowed result.
 */
export function prerequisiteFollowUp(
  tasks: Array<Pick<Task, "id" | "status" | "prerequisite_id" | "work_date">>,
  prerequisiteId: string,
  change: "complete" | "schedule" | { completed?: boolean; status?: TaskStatus; work_date?: string | null },
): Array<{ id: string; status?: TaskStatus; work_date?: string | null }> {
  const waiting = tasks.some((task) => task.prerequisite_id === prerequisiteId && task.status === "waiting");
  void waiting;
  void change;
  return [];
}

export const WIP_SUGGESTED_LIMIT = 3;
const WIP_WARNING_KEY = "arsh_wip_warning_v1";

/** Off unless the caller passes enabled: true. The suggested limit is 3. */
export function wipWarning(
  inProgressCount: number,
  options: { enabled?: boolean; limit?: number } = {},
): string | null {
  if (options.enabled !== true) return null;
  const limit = options.limit ?? WIP_SUGGESTED_LIMIT;
  if (inProgressCount <= limit) return null;
  return `wip:${inProgressCount}/${limit}`;
}

export function getWipWarningEnabled(): boolean {
  try { return localStorage.getItem(WIP_WARNING_KEY) === "1"; } catch { return false; }
}

export function setWipWarningEnabled(enabled: boolean) {
  try {
    localStorage.setItem(WIP_WARNING_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new Event("arsh:time-settings"));
  } catch { /* private mode */ }
}

export type ReviewSnapshotItem = {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  work_date: string | null;
  planning_horizon: string | null;
  planning_start: string | null;
  planning_end: string | null;
};

/** Account snapshot. Description, diary, and reminder text are omitted. */
export function reviewSnapshotItems(tasks: Array<Partial<Task> & { id: string }>): ReviewSnapshotItem[] {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title || "",
    status: task.status || "todo",
    completed: !!task.completed,
    work_date: task.work_date ?? null,
    planning_horizon: task.planning_horizon ?? null,
    planning_start: task.planning_start ?? null,
    planning_end: task.planning_end ?? null,
  }));
}

export function reviewSnapshotId(period: { horizon: string; start: string }): string {
  return `review_${period.horizon}_${period.start}`;
}

export function reviewSnapshotDocument(input: {
  id: string;
  user_id: string;
  horizon: string;
  period_start: string;
  period_end: string;
  at: string;
  note: string;
  tasks: Array<Partial<Task> & { id: string }>;
}) {
  return {
    id: input.id,
    user_id: input.user_id,
    horizon: input.horizon,
    period_start: input.period_start,
    period_end: input.period_end,
    at: input.at,
    note: input.note,
    items: reviewSnapshotItems(input.tasks),
  };
}

/** A saved review without an items array is not rebuilt from current tasks. */
export function reviewHistoryLabel(
  saved: { items?: unknown } | null | undefined,
  fa: boolean,
): string | null {
  if (!saved || Array.isArray(saved.items)) return null;
  return fa ? "تاریخچه موجود نیست" : "History is not available";
}

export function mergeReviewHistory<T extends { items?: unknown }>(current: T | null, remote: T): T {
  if (Array.isArray(remote.items)) return remote;
  if (current && Array.isArray(current.items)) return current;
  return remote;
}

/** Continue leaves the schedule untouched. */
export function continueReviewPatch(): null {
  return null;
}
