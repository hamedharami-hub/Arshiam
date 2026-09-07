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

export function formatDate(date: Date, fmt: string, system: CalendarSystem = getCalendarSystem()): string {
  const out = system === "jalali" ? formatJalali(date, fmt) : formatGregorian(date, fmt);
  return system === "jalali" ? toPersianDigits(out) : out;
}

export function formatDual(date: Date, fmt = "yyyy/MM/dd"): string {
  const j = toPersianDigits(formatJalali(date, fmt));
  const g = formatGregorian(date, fmt);
  const sys = getCalendarSystem();
  return sys === "jalali" ? `${j} (${g})` : `${g} (${j})`;
}

export const WEEKDAY_NAMES_FA = ["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
export const WEEKDAY_SHORT_FA = ["ش","ی","د","س","چ","پ","ج"];

// Jalali week starts Saturday. JS getDay(): 0=Sun..6=Sat
export function jalaliDayOfWeek(date: Date): number {
  // 0 = Saturday in jalali order
  return (date.getDay() + 1) % 7;
}
