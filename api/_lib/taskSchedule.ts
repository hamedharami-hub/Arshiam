/**
 * Server-side view of the single task schedule (same contract as frontend/src/lib/taskSchedule.ts).
 * work_date holds the task's day ("YYYY-MM-DD") or instant; planning_* hold a period. Time block,
 * part of day and deadline are not part of the model. Older callers may still send `due_date`:
 * it is accepted as the task date and stored in work_date.
 */
export function taskDateOf(t: any): string | null {
  if (!t) return null;
  if (t.schedule_v === 2 || t.work_date !== undefined) return t.work_date || null;
  return t.due_date || t.due_at || null;
}

/** Local calendar day of a stored value; a date-only value is returned as-is (never shifted through UTC). */
export function taskDayOf(t: any): string | null {
  const v = taskDateOf(t);
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : v.slice(0, 10);
}

export function scheduleWrite(value: string | null): Record<string, any> {
  return {
    schedule_v: 2, work_date: value || null,
    planning_horizon: null, planning_start: null, planning_end: null, planning_calendar: null,
    due_date: null, due_at: null, is_exact: null, horizon: null, period_start: null, period_end: null,
    bucket_kind: null, bucket_anchor: null, bucket_calendar: null,
  };
}
