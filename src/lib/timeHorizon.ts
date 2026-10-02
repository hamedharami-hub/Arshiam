/**
 * Time horizons ("Time Bucket" v2).
 *
 * Every task either has an exact time (is_exact + due_at) or a fuzzy period
 * (horizon + period_start/period_end). All maths is done on *local* calendar
 * dates (yyyy-mm-dd) built with `new Date(y, m, d)` and day arithmetic via
 * setDate, so daylight-saving transitions (e.g. Sydney, first Sunday of
 * October / April) never shift a day boundary.
 */
import * as g from "date-fns";
import * as j from "date-fns-jalali";
import { getCalendarSystem, type CalendarSystem } from "@/lib/jalali";
import type { Task } from "@/lib/taskTypes";

export type Horizon = "day" | "week" | "month" | "quarter" | "year";
export const ALL_HORIZONS: Horizon[] = ["day", "week", "month", "quarter", "year"];
export type WeekStart = "sat" | "mon";

export type TimeSettings = { calendar: CalendarSystem; weekStart: WeekStart; seasonsEnabled: boolean };
export type Period = { horizon: Horizon; start: string; end: string };
export type ChildPeriod = Period & { shared: boolean };

export type TimeFields = {
  horizon: Horizon;
  period_start: string;
  period_end: string;
  due_at: string | null;
  is_exact: boolean;
  postpone_count: number;
};

// ---------------- settings ----------------
const WEEK_START_KEY = "arsh_week_start_v1";
const SEASONS_KEY = "arsh_seasons_enabled_v1";

export function getWeekStart(): WeekStart {
  try { return localStorage.getItem(WEEK_START_KEY) === "mon" ? "mon" : "sat"; } catch { return "sat"; }
}
export function setWeekStart(v: WeekStart) {
  try { localStorage.setItem(WEEK_START_KEY, v); window.dispatchEvent(new Event("arsh:time-settings")); } catch {}
}
export function getSeasonsEnabled(): boolean {
  try { return localStorage.getItem(SEASONS_KEY) !== "0"; } catch { return true; }
}
export function setSeasonsEnabled(v: boolean) {
  try { localStorage.setItem(SEASONS_KEY, v ? "1" : "0"); window.dispatchEvent(new Event("arsh:time-settings")); } catch {}
}
export function getTimeSettings(): TimeSettings {
  return { calendar: getCalendarSystem(), weekStart: getWeekStart(), seasonsEnabled: getSeasonsEnabled() };
}
export function enabledHorizons(s: Pick<TimeSettings, "seasonsEnabled">): Horizon[] {
  return s.seasonsEnabled ? ALL_HORIZONS : ALL_HORIZONS.filter((h) => h !== "quarter");
}

// ---------------- local date helpers ----------------
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fromLocalISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds());
}
export function todayISO(now: Date = new Date()): string {
  return toLocalISO(now);
}
export function weekStartsOn(ws: WeekStart): 1 | 6 {
  return ws === "mon" ? 1 : 6;
}

function lib(calendar: CalendarSystem): typeof g {
  return (calendar === "jalali" ? j : g) as unknown as typeof g;
}

// ---------------- periods ----------------
export function periodFor(horizon: Horizon, date: Date, s: TimeSettings): Period {
  const L = lib(s.calendar);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let a = day;
  let b = day;
  if (horizon === "week") {
    a = g.startOfWeek(day, { weekStartsOn: weekStartsOn(s.weekStart) });
    b = g.endOfWeek(day, { weekStartsOn: weekStartsOn(s.weekStart) });
  } else if (horizon === "month") {
    a = L.startOfMonth(day); b = L.endOfMonth(day);
  } else if (horizon === "quarter") {
    a = L.startOfQuarter(day); b = L.endOfQuarter(day);
  } else if (horizon === "year") {
    a = L.startOfYear(day); b = L.endOfYear(day);
  }
  return { horizon, start: toLocalISO(a), end: toLocalISO(b) };
}

export function nextPeriod(p: Period, s: TimeSettings): Period {
  return periodFor(p.horizon, addDaysLocal(fromLocalISO(p.end), 1), s);
}
export function prevPeriod(p: Period, s: TimeSettings): Period {
  return periodFor(p.horizon, addDaysLocal(fromLocalISO(p.start), -1), s);
}
export function currentPeriod(horizon: Horizon, s: TimeSettings, now: Date = new Date()): Period {
  return periodFor(horizon, now, s);
}

export function childHorizon(h: Horizon, seasonsEnabled: boolean): Horizon | null {
  if (h === "week") return "day";
  if (h === "month") return "week";
  if (h === "quarter") return "month";
  if (h === "year") return seasonsEnabled ? "quarter" : "month";
  return null;
}

/** Sub-periods exactly one level down. Weeks crossing a month edge are flagged `shared`. */
export function childPeriods(p: Period, s: TimeSettings): ChildPeriod[] {
  const ch = childHorizon(p.horizon, s.seasonsEnabled);
  if (!ch) return [];
  const out: ChildPeriod[] = [];
  let cur = fromLocalISO(p.start);
  for (let guard = 0; guard < 40 && toLocalISO(cur) <= p.end; guard++) {
    const cp = periodFor(ch, cur, s);
    out.push({ ...cp, shared: cp.start < p.start || cp.end > p.end });
    cur = addDaysLocal(fromLocalISO(cp.end), 1);
  }
  return out;
}

export function periodContains(p: Pick<Period, "start" | "end">, iso: string): boolean {
  return iso >= p.start && iso <= p.end;
}

// ---------------- task <-> time fields ----------------
const LEGACY_TO_HORIZON: Record<string, Horizon> = {
  morning: "day", noon: "day", afternoon: "day", night: "day", day: "day",
  week: "week", month: "month", quarter: "quarter", year: "year",
};

function hasClockTime(iso: string): boolean {
  if (!iso.includes("T")) return false;
  const d = new Date(iso);
  return !(d.getHours() === 0 && d.getMinutes() === 0);
}

/** Reads the v2 fields, falling back to legacy bucket_* / due_date written by older screens. */
export function getTaskTime(task: Partial<Task>, s: TimeSettings): TimeFields | null {
  const postpone_count = task.postpone_count || 0;
  const legacyH = task.bucket_kind ? LEGACY_TO_HORIZON[task.bucket_kind] : undefined;
  const v2Consistent = task.horizon && task.period_start && task.period_end && (
    task.is_exact
      ? !task.due_date || task.due_date === task.due_at
      : !legacyH || (legacyH === task.horizon && task.bucket_anchor === task.period_start)
  );
  if (v2Consistent) {
    return {
      horizon: task.horizon!, period_start: task.period_start!, period_end: task.period_end!,
      due_at: task.due_at || null, is_exact: !!task.is_exact, postpone_count,
    };
  }
  if (legacyH && task.bucket_anchor) {
    const cal = (task.bucket_calendar as CalendarSystem) || s.calendar;
    const p = periodFor(legacyH, fromLocalISO(task.bucket_anchor), { ...s, calendar: cal });
    return { horizon: legacyH, period_start: p.start, period_end: p.end, due_at: null, is_exact: false, postpone_count };
  }
  if (task.due_date) {
    const d = task.due_date.includes("T") ? new Date(task.due_date) : fromLocalISO(task.due_date);
    if (Number.isNaN(d.getTime())) return null;
    const iso = toLocalISO(d);
    const exact = hasClockTime(task.due_date);
    return { horizon: "day", period_start: iso, period_end: iso, due_at: exact ? d.toISOString() : null, is_exact: exact, postpone_count };
  }
  return null;
}

function isClosed(task: Partial<Task>): boolean {
  return !!task.completed || task.status === "done" || task.status === "wont_do";
}

export function isOverdue(task: Partial<Task>, s: TimeSettings, now: Date = new Date()): boolean {
  if (isClosed(task)) return false;
  const tf = getTaskTime(task, s);
  if (!tf) return false;
  if (tf.is_exact && tf.due_at) return toLocalISO(new Date(tf.due_at)) < todayISO(now);
  return tf.period_end < todayISO(now);
}

/** Fields to persist (v2 + legacy mirror so older screens keep working). */
export function timePatch(tf: TimeFields, s: TimeSettings): Partial<Task> {
  return {
    horizon: tf.horizon,
    period_start: tf.period_start,
    period_end: tf.period_end,
    due_at: tf.due_at,
    is_exact: tf.is_exact,
    postpone_count: tf.postpone_count,
    ...(tf.is_exact && tf.due_at
      ? { due_date: tf.due_at, bucket_kind: null, bucket_anchor: null, bucket_calendar: null }
      : { due_date: null, bucket_kind: tf.horizon, bucket_anchor: tf.period_start, bucket_calendar: s.calendar }),
  };
}

export function fieldsForPeriod(p: Period, postpone_count = 0): TimeFields {
  return { horizon: p.horizon, period_start: p.start, period_end: p.end, due_at: null, is_exact: false, postpone_count };
}

export function fieldsForExact(at: Date, horizon: Horizon, s: TimeSettings, postpone_count = 0): TimeFields {
  const p = periodFor(horizon, at, s);
  return { horizon, period_start: p.start, period_end: p.end, due_at: at.toISOString(), is_exact: true, postpone_count };
}

function shiftExact(d: Date, h: Horizon, s: TimeSettings): Date {
  const L = lib(s.calendar);
  if (h === "day") return addDaysLocal(d, 1);
  if (h === "week") return addDaysLocal(d, 7);
  if (h === "month") return L.addMonths(d, 1);
  if (h === "quarter") return L.addMonths(d, 3);
  return L.addYears(d, 1);
}

/**
 * Postpone = move to the next period of the same horizon. If that period is
 * already in the past (task was overdue for a long time) it lands in the
 * current period instead, so a postponed task is never still overdue.
 */
export function postponeFields(task: Partial<Task>, s: TimeSettings, now: Date = new Date()): TimeFields | null {
  const tf = getTaskTime(task, s);
  if (!tf) return null;
  const count = tf.postpone_count + 1;
  if (tf.is_exact && tf.due_at) {
    let d = shiftExact(new Date(tf.due_at), tf.horizon, s);
    for (let i = 0; i < 500 && d.getTime() < now.getTime(); i++) d = shiftExact(d, tf.horizon, s);
    return fieldsForExact(d, tf.horizon, s, count);
  }
  let next = nextPeriod({ horizon: tf.horizon, start: tf.period_start, end: tf.period_end }, s);
  if (next.end < todayISO(now)) next = periodFor(tf.horizon, now, s);
  return fieldsForPeriod(next, count);
}

/** Does a task belong inside the given period (its own period fits in it)? */
export function taskInPeriod(tf: TimeFields, p: Pick<Period, "start" | "end">): boolean {
  return tf.period_start >= p.start && tf.period_end <= p.end;
}

// ---------------- labels ----------------
const HORIZON_LABEL: Record<Horizon, { fa: string; en: string }> = {
  day: { fa: "روزانه", en: "Daily" },
  week: { fa: "هفتگی", en: "Weekly" },
  month: { fa: "ماهانه", en: "Monthly" },
  quarter: { fa: "فصلی", en: "Quarterly" },
  year: { fa: "سالانه", en: "Yearly" },
};
export function horizonLabel(h: Horizon, lang: "fa" | "en"): string {
  return HORIZON_LABEL[h][lang];
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faDigits = (s: string) => s.replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export function periodLabel(p: Period, s: TimeSettings, lang: "fa" | "en", now: Date = new Date()): string {
  const a = fromLocalISO(p.start);
  const b = fromLocalISO(p.end);
  const jal = s.calendar === "jalali";
  // English + Jalali: Latin Solar Hijri names (e.g. "Mehr 4") instead of Persian script.
  const enJal = jal && lang === "en";
  const intlOpts: Record<string, Intl.DateTimeFormatOptions> = {
    "d MMM": { day: "numeric", month: "short" }, "MMMM yyyy": { month: "long", year: "numeric" },
    "EEEE d MMMM": { weekday: "long", day: "numeric", month: "long" }, yyyy: { year: "numeric" },
  };
  const f = (d: Date, fmt: string) => (enJal
    ? d.toLocaleDateString("en-US-u-ca-persian", intlOpts[fmt] || intlOpts["d MMM"]).replace(/\s?AP$/, "")
    : jal ? faDigits(j.format(d, fmt)) : g.format(d, fmt));
  const today = todayISO(now);
  if (p.horizon === "day") {
    if (p.start === today) return lang === "fa" ? "امروز" : "Today";
    if (p.start === toLocalISO(addDaysLocal(now, 1))) return lang === "fa" ? "فردا" : "Tomorrow";
    return f(a, jal ? "EEEE d MMMM" : "EEE d MMM");
  }
  if (p.horizon === "week") return `${f(a, "d MMM")} – ${f(b, "d MMM")}`;
  if (p.horizon === "month") return f(a, "MMMM yyyy");
  if (p.horizon === "quarter") {
    if (jal) {
      const seasons = lang === "en" ? ["Spring", "Summer", "Autumn", "Winter"] : ["بهار", "تابستان", "پاییز", "زمستان"];
      return lang === "en" ? `${seasons[Math.floor(j.getMonth(a) / 3)]} ${j.format(a, "yyyy")}` : `${seasons[Math.floor(j.getMonth(a) / 3)]} ${faDigits(j.format(a, "yyyy"))}`;
    }
    return `Q${g.getQuarter(a)} ${g.format(a, "yyyy")}`;
  }
  return f(a, "yyyy");
}
