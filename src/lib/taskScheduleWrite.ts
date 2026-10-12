import { deleteField } from "@/lib/firebase";
import {
  applyLegacySchedule,
  isExplicitScheduleApply,
  scheduleApplyDeleteKeys,
  supportedTaskPatch,
} from "./taskScheduleMigration";

/**
 * Normal schedule save. Does not delete legacy fields and does not write schedule_legacy.
 * An explicit apply is a separate write, used only by the task-detail click handler.
 */
export function taskScheduleWrite<T extends Record<string, any>>(task: T): Record<string, any> {
  return supportedTaskPatch(task);
}

function isDeleteMarker(value: unknown): boolean {
  return !!value && typeof value === "object" && (value as { _methodName?: string })._methodName === "deleteField";
}

/** Click-path patch: proposed schedule fields, archived values, and delete markers for keys that were present. */
export function taskScheduleApplyWrite(task: Record<string, any> | null | undefined): Record<string, unknown> | null {
  const applied = applyLegacySchedule(task);
  if (!applied) return null;
  return withApplyDeleteMarkers(applied);
}

/** Attach delete markers for an already-built apply patch. Other writes are unchanged. */
export function withApplyDeleteMarkers<T extends Record<string, any>>(patch: T): T {
  if (!isExplicitScheduleApply(patch)) return patch;
  const next: Record<string, any> = { ...patch };
  for (const key of scheduleApplyDeleteKeys(patch)) next[key] = deleteField();
  return next as T;
}

/** State and cache copy of an apply patch, without delete markers. */
export function withoutApplyDeleteMarkers<T extends Record<string, any>>(patch: T): T {
  const next: Record<string, any> = { ...patch };
  for (const key of Object.keys(next)) {
    if (isDeleteMarker(next[key])) delete next[key];
  }
  return next as T;
}
