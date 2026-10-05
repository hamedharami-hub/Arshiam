/**
 * Explicit, dry-run-first migration helpers. Nothing in this module subscribes to tasks
 * or starts a batch. A caller must review a preview and explicitly apply a ready item.
 */
import { deleteField, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/taskTypes";
import { fromLocalISO, getTimeSettings, periodFor, type Horizon } from "@/lib/timeHorizon";
import type { CalendarSystem } from "@/lib/jalali";
import { LEGACY_SCHEDULE_FIELDS, legacySchedule, scheduleMigrationPatch, SCHEDULE_VERSION, type TaskSchedule } from "@/lib/taskSchedule";

const MIGRATION_VERSION = 1;
const TRACKED_FIELDS = [...new Set<string>(["schedule_v", ...LEGACY_SCHEDULE_FIELDS, "schedule_legacy", "updated_at", "calendar"])];
type FieldBackup = Record<string, { present: boolean; value?: unknown }>;
export type MigrationIssue = "conflicting_exact_values" | "conflicting_period_values" | "ambiguous_legacy_time" | "ambiguous_due_at_flag" | "outside_period" | "unknown_timezone" | "invalid_timezone" | "invalid_calendar" | "invalid_schedule_value" | "unsupported_schedule_version";
export type ScheduleMigrationPlan = {
  uid: string; taskId: string; sourceVersion: unknown; fingerprint: string;
  state: "ready" | "conflict" | "invalid" | "already_v2" | "no_legacy";
  issues: MigrationIssue[]; proposed: TaskSchedule | null; backup: FieldBackup;
  backupId: string; patch: Partial<Task> | null; updatedAt: unknown;
};
export type MigrationApplyStatus = "saved" | "offline" | "failed" | "conflict" | "already_migrated";

function hasOwn(row: object, key: string) { return Object.prototype.hasOwnProperty.call(row, key); }
function stableValue(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  const maybe = value as { seconds?: unknown; nanoseconds?: unknown; toDate?: () => Date };
  if (typeof maybe.toDate === "function") return { timestamp: maybe.toDate().toISOString() };
  if (typeof maybe.seconds === "number" && typeof maybe.nanoseconds === "number") return { seconds: maybe.seconds, nanoseconds: maybe.nanoseconds };
  if (Array.isArray(value)) return value.map(stableValue);
  return Object.fromEntries(Object.keys(value as object).sort().map((key) => [key, stableValue((value as Record<string, unknown>)[key])]));
}
function hash(text: string) {
  let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b ^ text.charCodeAt(i), 2246822519); }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}
export function taskScheduleFingerprint(uid: string, taskId: string, task: Partial<Task>): string {
  const row = task as Record<string, unknown>;
  const fields = TRACKED_FIELDS.map((key) => [key, hasOwn(row, key), hasOwn(row, key) ? stableValue(row[key]) : null]);
  return JSON.stringify([uid, taskId, getTimeSettings().calendar, fields]);
}
function backupOf(task: Partial<Task>): FieldBackup {
  const row = task as Record<string, unknown>;
  return Object.fromEntries(TRACKED_FIELDS.map((key) => [key, hasOwn(row, key) ? { present: true, value: row[key] } : { present: false }]));
}
function validZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone.trim()) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: zone }).format(0); return true; } catch { return false; }
}
function validCalendar(value: unknown): value is CalendarSystem {
  return value === "gregorian" || value === "jalali";
}
function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validDateValue(value: unknown): value is string {
  return validDay(value) || (typeof value === "string" && value.includes("T") && !Number.isNaN(new Date(value).getTime()));
}
function localDayAt(instant: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function previewOne(uid: string, task: Task): ScheduleMigrationPlan {
  const taskId = task?.id || "";
  const fingerprint = taskScheduleFingerprint(uid, taskId, task);
  const common = { uid, taskId, fingerprint, sourceVersion: task.schedule_v ?? null, backup: backupOf(task), updatedAt: task.updated_at ?? null };
  const backupId = `${encodeURIComponent(taskId).replaceAll("%", "_")}_${hash(fingerprint)}`;
  if (task.schedule_v === SCHEDULE_VERSION) return { ...common, backupId, state: "already_v2", issues: [], proposed: null, patch: null };
  if (!taskId) return { ...common, backupId, state: "invalid", issues: [], proposed: null, patch: null };
  if (task.schedule_v != null) {
    return { ...common, backupId, state: "invalid", issues: ["unsupported_schedule_version"], proposed: null, patch: null };
  }
  const hasLegacy = LEGACY_SCHEDULE_FIELDS.some((field) => hasOwn(task, field));
  if (!hasLegacy) return { ...common, backupId, state: "no_legacy", issues: [], proposed: null, patch: null };

  const issues = new Set<MigrationIssue>();
  const data = task as Record<string, unknown>;
  if (task.is_exact != null && typeof task.is_exact !== "boolean") issues.add("invalid_schedule_value");
  for (const field of ["work_date", "due_at", "due_date"]) {
    const value = data[field];
    if (value != null && !validDateValue(value)) issues.add("invalid_schedule_value");
  }
  const exactValues = ["work_date", "due_at", "due_date"]
    .filter((field) => typeof data[field] === "string" && data[field])
    .map((field) => data[field] as string);
  // Multiple different schedule sources are ambiguous even if a legacy flag called one fuzzy.
  if (new Set(exactValues).size > 1) issues.add("conflicting_exact_values");
  if (typeof task.due_at === "string" && task.is_exact !== true) issues.add("ambiguous_due_at_flag");

  const sourceSettings = getTimeSettings();
  const periods: Array<{ horizon: string; start: string; end: string }> = [];
  const periodInputs = [
    { fields: ["planning_horizon", "planning_start", "planning_end"], horizon: task.planning_horizon, start: task.planning_start, end: task.planning_end },
    { fields: ["horizon", "period_start", "period_end"], horizon: task.horizon, start: task.period_start, end: task.period_end },
  ];
  for (const input of periodInputs) {
    const values = input.fields.map((field) => data[field]);
    if (values.every((value) => value == null)) continue;
    if (typeof input.horizon !== "string" || !("day week month quarter year".split(" ").includes(input.horizon)) || !validDay(input.start) || !validDay(input.end)) {
      issues.add("invalid_schedule_value");
      continue;
    }
    periods.push({ horizon: input.horizon, start: input.start, end: input.end });
  }
  const bucketPresent = task.bucket_kind != null || task.bucket_anchor != null;
  if (bucketPresent) {
    if (typeof task.bucket_kind !== "string" || !("day week month quarter year".split(" ").includes(task.bucket_kind)) || !validDay(task.bucket_anchor)) {
      issues.add("invalid_schedule_value");
    } else {
      const bucketCalendar = validCalendar(task.bucket_calendar) ? task.bucket_calendar : sourceSettings.calendar;
      const resolved = periodFor(task.bucket_kind as Horizon, fromLocalISO(task.bucket_anchor), { ...sourceSettings, calendar: bucketCalendar });
      periods.push({ horizon: resolved.horizon, start: resolved.start, end: resolved.end });
    }
  }
  if (new Set(periods.map((p) => `${p.horizon}:${p.start}:${p.end}`)).size > 1) issues.add("conflicting_period_values");

  for (const field of ["work_date", "due_date", ...(task.is_exact === true ? ["due_at"] : [])]) {
    const value = data[field];
    if (typeof value !== "string" || /^\d{4}-\d{2}-\d{2}$/.test(value)) continue;
    const match = value.match(/T(\d{2}):(\d{2})/);
    if (match && (match[1] === "00" && match[2] === "00" || match[1] === "23" && match[2] === "59") && task.is_exact !== true) issues.add("ambiguous_legacy_time");
  }

  const zone = task.schedule_timezone;
  const instantCandidates = [task.work_date, task.due_at, task.due_date].filter((v): v is string => typeof v === "string" && /T/.test(v));
  if (instantCandidates.length && !zone) issues.add("unknown_timezone");
  else if (instantCandidates.length && !validZone(zone)) issues.add("invalid_timezone");
  if (zone && !validZone(zone)) issues.add("invalid_timezone");
  if (task.bucket_kind && task.bucket_calendar && !validCalendar(task.bucket_calendar)) issues.add("invalid_calendar");
  if (task.planning_horizon && task.planning_calendar && !validCalendar(task.planning_calendar)) issues.add("invalid_calendar");

  const calendar = validCalendar(task.planning_calendar) ? task.planning_calendar : validCalendar(task.bucket_calendar) ? task.bucket_calendar : sourceSettings.calendar;
  const resolution = legacySchedule(task, { ...sourceSettings, calendar });
  if (resolution.conflict && !(resolution.schedule.kind === "datetime" && validZone(zone))) issues.add("outside_period");

  let proposed = resolution.schedule;
  if (proposed.kind === "datetime" && validZone(zone)) proposed = { ...proposed, date: localDayAt(proposed.at, zone) };
  if ((proposed.kind === "day" || proposed.kind === "datetime") && periods.some((p) => proposed.date < p.start || proposed.date > p.end)) issues.add("outside_period");
  const hasBlockingIssue = [...issues].length > 0;
  const patch = hasBlockingIssue ? null : {
    ...scheduleMigrationPatch(task, { ...sourceSettings, calendar }),
    ...(proposed.kind === "datetime" && validZone(zone) ? { work_date: proposed.at, schedule_timezone: zone } : {}),
    ...(proposed.kind === "period" && validCalendar(calendar) ? { planning_calendar: calendar } : {}),
  } as Partial<Task> | null;
  return {
    ...common, backupId, state: hasBlockingIssue ? "conflict" : patch ? "ready" : "no_legacy",
    issues: [...issues], proposed, patch,
  };
}

/** Read-only planning for all received tasks; caller should rerun before applying. */
export function previewTaskScheduleMigration(uid: string, tasks: Task[]): ScheduleMigrationPlan[] {
  if (!uid) return [];
  return tasks.map((task) => previewOne(uid, task));
}

function backupRef(uid: string, id: string) { return doc(db, "users", uid, "schedule_migration_backups", id); }
function taskRef(uid: string, id: string) { return doc(db, "users", uid, "tasks", id); }

/** Apply one reviewed, unambiguous preview with a Firestore reread and fingerprint CAS. */
export async function applyTaskScheduleMigration(plan: ScheduleMigrationPlan): Promise<MigrationApplyStatus> {
  if (plan.state === "already_v2") return "already_migrated";
  if (plan.state !== "ready" || !plan.patch) return "conflict";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline"; // Never enqueue a blind migration write.
  try {
    return await runTransaction(db, async (tx) => {
      const tRef = taskRef(plan.uid, plan.taskId);
      const bRef = backupRef(plan.uid, plan.backupId);
      const taskSnap = await tx.get(tRef);
      if (!taskSnap.exists()) return "conflict";
      const current = taskSnap.data() as Task;
      const currentFingerprint = taskScheduleFingerprint(plan.uid, plan.taskId, current);
      if (currentFingerprint !== plan.fingerprint) return "conflict";
      const fresh = previewOne(plan.uid, current);
      if (fresh.state === "already_v2") return "already_migrated";
      if (fresh.state !== "ready" || !fresh.patch) return "conflict";
      const backupSnap = await tx.get(bRef);
      if (backupSnap.exists() && backupSnap.data()?.fingerprint !== plan.fingerprint) return "conflict";

      const after = { ...current, ...fresh.patch } as Task;
      if (!backupSnap.exists()) tx.set(bRef, {
        version: MIGRATION_VERSION, uid: plan.uid, task_id: plan.taskId,
        source_version: current.schedule_v ?? null, fingerprint: plan.fingerprint,
        fields: backupOf(current), patch: fresh.patch,
        after_fingerprint: taskScheduleFingerprint(plan.uid, plan.taskId, after),
        created_at: new Date().toISOString(),
      });
      tx.update(tRef, fresh.patch as Record<string, unknown>);
      return "saved";
    });
  } catch (err) {
    const code = String((err as { code?: unknown })?.code || "");
    console.warn("[ScheduleMigration] explicit apply failed:", err);
    return "failed"; // Firestore transactions are not persisted as offline writes.
  }
}

/** Roll back only if the schedule fields still exactly match the migrated result. */
export async function rollbackTaskScheduleMigration(uid: string, id: string): Promise<MigrationApplyStatus> {
  if (!uid || !id) return "failed";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  try {
    return await runTransaction(db, async (tx) => {
      const bRef = backupRef(uid, id);
      const backupSnap = await tx.get(bRef);
      if (!backupSnap.exists()) return "conflict";
      const backup = backupSnap.data() as { uid: string; task_id: string; after_fingerprint: string; fields: FieldBackup };
      if (backup.uid !== uid || !backup.task_id) return "conflict";
      const tRef = taskRef(uid, backup.task_id);
      const taskSnap = await tx.get(tRef);
      if (!taskSnap.exists()) return "conflict";
      const current = taskSnap.data() as Task;
      if (taskScheduleFingerprint(uid, backup.task_id, current) !== backup.after_fingerprint) return "conflict";
      const restore = Object.fromEntries(Object.entries(backup.fields).map(([key, entry]) => [key, entry.present ? entry.value : deleteField()]));
      tx.update(tRef, restore);
      return "saved";
    });
  } catch (err) {
    const code = String((err as { code?: unknown })?.code || "");
    console.warn("[ScheduleMigration] rollback failed:", err);
    return "failed";
  }
}
