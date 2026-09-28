import { format as formatJalali } from "date-fns-jalali";
import { format as formatGregorian } from "date-fns";

export type CalendarSystem = "jalali" | "gregorian";

const PREF_KEY = "calendar_system_v1";

export function getCalendarSystem(): CalendarSystem {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === "jalali" || v === "gregorian") return v;
  } catch {}
  return "jalali";
}

export function setCalendarSystem(s: CalendarSystem) {
  try { localStorage.setItem(PREF_KEY, s); } catch {}
}

const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
export function toPersianDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => FA_DIGITS[+d]);
}

export function formatDate(date: Date | string | number | null | undefined, fmt: string, system: CalendarSystem = getCalendarSystem()): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  try {
    const out = system === "jalali" ? formatJalali(d, fmt) : formatGregorian(d, fmt);
    return system === "jalali" ? toPersianDigits(out) : out;
  } catch {
    return "";
  }
}

export function formatDual(date: Date | string | number | null | undefined, fmt = "yyyy/MM/dd"): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  try {
    const j = toPersianDigits(formatJalali(d, fmt));
    const g = formatGregorian(d, fmt);
    const sys = getCalendarSystem();
    return sys === "jalali" ? `${j} (${g})` : `${g} (${j})`;
  } catch {
    return "";
  }
}

export const WEEKDAY_NAMES_FA = ["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
export const WEEKDAY_SHORT_FA = ["ش","ی","د","س","چ","پ","ج"];

// Jalali week starts Saturday. JS getDay(): 0=Sun..6=Sat
export function jalaliDayOfWeek(date: Date | string | number | null | undefined): number {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 0;
  // 0 = Saturday in jalali order
  return (d.getDay() + 1) % 7;
}
