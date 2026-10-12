import {
  readTaskSchedule,
  scheduleCalendarDay,
  schedulePatch,
  type SchedulePatchInput,
  type ScheduleSource,
  type ScheduleWrite,
} from "./taskSchedule";
import { currentPeriod, nextPeriod, type Period, type TimeSettings } from "./timeHorizon";

/** A save may stay open while a range is still being filled. The patch itself is unchanged. */
export type ScheduleSaveMeta = { keepOpen?: boolean };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** Local calendar day, without parsing a date-only string. */
export function localDateKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Clock instant with a literal day and `T`. Never produced via `toISOString`. */
export function clockInstant(day: string, hhmm: string): string {
  const [rawH = "0", rawM = "0"] = hhmm.split(":");
  const hour = rawH === "24" ? "00" : rawH;
  return `${day}T${hour.padStart(2, "0")}:${rawM.padStart(2, "0")}:00`;
}

/** Wall-clock `HH:mm` of a stored instant. A zoneless value keeps the written clock, including 00:00. */
export function clockFromWorkDate(workDate: string | null | undefined, timezone: string | null | undefined): string | null {
  if (!workDate || !workDate.includes("T")) return null;
  const match = /T(\d{2}):(\d{2})/.exec(workDate);
  if (!match) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(workDate)) return `${match[1]}:${match[2]}`;
  const date = new Date(workDate);
  if (Number.isNaN(date.getTime())) return `${match[1]}:${match[2]}`;
  const zone = timezone?.trim();
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone || undefined,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    let hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;
    if (!hour || !minute) return `${match[1]}:${match[2]}`;
    if (hour === "24") hour = "00";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } catch {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
}

/** Returns the patch only when `schedulePatch` accepts it. */
export function commitSchedule(input: SchedulePatchInput): ScheduleWrite | null {
  const result = schedulePatch(input);
  return result.ok ? result.patch : null;
}

export function dayOrClock(date: string, clockTime: string | null): SchedulePatchInput | null {
  if (!DATE_ONLY.test(date)) return null;
  if (!clockTime) return { mode: "day", date };
  const timezone = deviceTimeZone();
  if (!timezone) return null;
  return { mode: "clock", instant: clockInstant(date, clockTime), timezone };
}

export function horizonChoice(period: Period, settings: TimeSettings): SchedulePatchInput | null {
  if (period.horizon === "day") return dayOrClock(period.start, null);
  if (period.horizon !== "week" && period.horizon !== "month" && period.horizon !== "quarter" && period.horizon !== "year") return null;
  return {
    mode: "horizon",
    horizon: period.horizon,
    start: period.start,
    end: period.end,
    calendar: settings.calendar,
  };
}

export function periodChoice(kind: "week" | "next-week" | "month" | "next-month", settings: TimeSettings): SchedulePatchInput | null {
  const horizon = kind === "week" || kind === "next-week" ? "week" : "month";
  const current = currentPeriod(horizon, settings);
  const period = kind === "next-week" || kind === "next-month" ? nextPeriod(current, settings) : current;
  return horizonChoice(period, settings);
}

export function rangeChoice(start: string, end: string, settings: TimeSettings, allowSingle: boolean): SchedulePatchInput | null {
  const hasStart = DATE_ONLY.test(start);
  const hasEnd = DATE_ONLY.test(end);
  if (hasStart && hasEnd) {
    if (end < start) return null;
    return { mode: "horizon", horizon: "range", start, end, calendar: settings.calendar };
  }
  if (!allowSingle) return null;
  if (hasStart) return { mode: "day", date: start };
  if (hasEnd) return { mode: "day", date: end };
  return null;
}

/** Period attachment for create/move. A rejected period is not written. Day is a work day, not a horizon. */
export function scheduleWriteForPeriod(period: Period | null, settings: TimeSettings): ScheduleWrite | null {
  if (!period) return commitSchedule({ mode: "none" });
  const input = horizonChoice(period, settings);
  return input ? commitSchedule(input) : null;
}

function addDaysKey(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return localDateKey(date);
}

export function postponeSchedule(task: ScheduleSource, days: number, today = localDateKey()): ScheduleWrite | null {
  const schedule = readTaskSchedule(task);
  const base = scheduleCalendarDay(schedule) ?? today;
  const clock = schedule.mode === "clock" ? clockFromWorkDate(schedule.workDate, schedule.timezone) : null;
  const input = dayOrClock(addDaysKey(base, days), clock);
  return input ? commitSchedule(input) : null;
}
