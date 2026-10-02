import i18n from "@/i18n";
import { format as formatJalali } from "date-fns-jalali";
import { format as formatGregorian } from "date-fns";

export type CalendarSystem = "jalali" | "gregorian";

const PREF_KEY = "calendar_system_v1";

export function getCalendarSystem(): CalendarSystem {
  try {
    // English UI: Gregorian by default; Jalali only when "Show Persian dates" is on.
    const lang = i18n.language || localStorage.getItem("arshnaz_app_language") || "fa";
    if (lang && lang.startsWith("en")) return localStorage.getItem("arshnaz_en_show_jalali") === "1" ? "jalali" : "gregorian";
    const v = localStorage.getItem(PREF_KEY);
    if (v === "jalali" || v === "gregorian") return v;
  } catch {}
  return "jalali";
}

export function setCalendarSystem(s: CalendarSystem) {
  try { localStorage.setItem(PREF_KEY, s); } catch {}
}

const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
/** Persian digits in the Persian UI; Latin digits stay as-is in the English UI. */
export function toPersianDigits(s: string | number): string {
  if ((i18n.language || "fa").startsWith("en")) return String(s);
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
