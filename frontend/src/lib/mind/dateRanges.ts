import { getCalendarSystem } from "@/lib/jalali";

import { MIND_ACTION_SOURCES } from "./sources";
export { MIND_ACTION_SOURCES } from "./sources";
export const MIND_RANGES = [7, 30, 90] as const;
export type MindRange = typeof MIND_RANGES[number];
export type MindMetric = "mood" | "energy" | "focus" | "stress";

/** Stored YYYY-MM-DD is a local calendar date, never a UTC timestamp. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseLocalDate(value: string): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localDateKey(date) === value ? date : null;
}

export function shiftLocalDay(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

/** N calendar days including today. Timestamp entries must also not be later than now. */
export function mindDateRange(days: number, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = shiftLocalDay(end, -(days - 1));
  const afterEnd = shiftLocalDay(end, 1);
  return { start: localDateKey(start), end: localDateKey(end), startISO: start.toISOString(), afterEndISO: afterEnd.toISOString(), now: now.getTime() };
}

export function datesInRange(start: string, end: string): string[] {
  const first = parseLocalDate(start), last = parseLocalDate(end);
  if (!first || !last || first > last) return [];
  const dates: string[] = [];
  for (let date = first; date <= last && dates.length < 366; date = shiftLocalDay(date, 1)) dates.push(localDateKey(date));
  return dates;
}

export function uniqueCheckins<T extends { checkin_date: string }>(rows: T[], range: ReturnType<typeof mindDateRange>): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (parseLocalDate(row.checkin_date) && row.checkin_date >= range.start && row.checkin_date <= range.end) map.set(row.checkin_date, row);
  }
  return [...map.values()].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
}

export function timestampInRange(value: unknown, range: ReturnType<typeof mindDateRange>): boolean {
  if (!validTimestamp(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= Date.parse(range.startISO) && time < Date.parse(range.afterEndISO) && time <= range.now;
}

export function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !!parseLocalDate(value.slice(0, 10)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

export function weeklyMindActions<T extends { id?: string; source_type?: string; completed_at?: string | null }>(rows: T[], now = new Date()) {
  const unique = new Map<string, T>();
  rows.forEach((row, index) => {
    if (MIND_ACTION_SOURCES.includes(row.source_type as typeof MIND_ACTION_SOURCES[number])) unique.set(row.id || `unknown-${index}`, row);
  });
  const actions = [...unique.values()];
  return {
    completed: actions.filter((row) => timestampInRange(row.completed_at, mindDateRange(7, now))),
    undated: actions.filter((row) => !validTimestamp(row.completed_at)).length,
  };
}

export function validRating(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 10;
}

/** Intl supplies language as well as the chosen calendar (date-fns defaults can mix languages). */
export function mindDateLabel(date: Date, isEn: boolean, full = false): string {
  return new Intl.DateTimeFormat(isEn ? "en-US" : "fa-IR", {
    calendar: getCalendarSystem() === "jalali" ? "persian" : "gregory",
    day: "numeric", month: full ? "long" : "short", ...(full ? { weekday: "long", year: "numeric" } : {}),
  }).format(date);
}

/** Numeric plot coordinate represents a calendar day; UTC is used only for equal-width plotting. */
export function calendarCoordinate(key: string): number {
  const date = parseLocalDate(key);
  return date ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) : NaN;
}

export function calendarWeeks<T extends { date: string }>(days: T[], weekStartsOn: number): (T | null)[][] {
  if (!days.length) return [];
  const first = parseLocalDate(days[0].date);
  if (!first) return [];
  const padding = (first.getDay() - weekStartsOn + 7) % 7;
  const cells: (T | null)[] = [...Array(padding).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
