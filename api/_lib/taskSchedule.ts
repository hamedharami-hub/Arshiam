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
export function taskDayOf(t: any, userTimeZone?: string): string | null {
  const v = taskDateOf(t);
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const zone = userTimeZone || t.schedule_timezone;
  if (!zone) return null; // No reliable user zone: never invent a UTC calendar day.
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch { return null; }
}

export function scheduleWrite(value: string | null, timeZone?: string): Record<string, any> {
  let zone: string | null = null;
  if (typeof timeZone === "string") {
    try { zone = new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions().timeZone; } catch { /* unknown zone remains explicit null */ }
  }
  return {
    schedule_v: 2, work_date: value || null,
    schedule_timezone: value && value.includes("T") ? zone : null,
    planning_horizon: null, planning_start: null, planning_end: null, planning_calendar: null,
    due_date: null, due_at: null, is_exact: null, horizon: null, period_start: null, period_end: null,
    bucket_kind: null, bucket_anchor: null, bucket_calendar: null,
  };
}
