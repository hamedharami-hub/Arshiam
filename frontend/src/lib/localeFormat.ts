// Language-aware date/number helpers.
// fa → Jalali calendar + Persian digits; en → Gregorian + Latin digits (Jalali optional via setting).
import i18n from "@/i18n";

export const EN_JALALI_KEY = "arshnaz_en_show_jalali";

export type Lang = "fa" | "en";

export function appLang(): Lang {
  return (i18n.language || "fa").startsWith("en") ? "en" : "fa";
}

export function englishUsesJalali(): boolean {
  try { return localStorage.getItem(EN_JALALI_KEY) === "1"; } catch { return false; }
}

export function setEnglishUsesJalali(on: boolean) {
  try { localStorage.setItem(EN_JALALI_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("arshnaz:date-format-changed"));
}

/** BCP-47 locale for Intl date formatting in the current language. */
export function dateLocale(lang: Lang = appLang()): string {
  if (lang === "fa") return "fa-IR";
  return englishUsesJalali() ? "en-US-u-ca-persian" : "en-US";
}

export function formatNumber(n: number | string, lang: Lang = appLang()): string {
  const s = String(n);
  if (lang !== "fa") return s;
  return s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

/** "Today" / "Tomorrow" / "Yesterday" for nearby days, else null. */
export function relativeDayLabel(date: Date, lang: Lang = appLang()): string | null {
  const diff = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86400000);
  if (diff === 0) return lang === "fa" ? "امروز" : "Today";
  if (diff === 1) return lang === "fa" ? "فردا" : "Tomorrow";
  if (diff === -1) return lang === "fa" ? "دیروز" : "Yesterday";
  return null;
}

export function formatShortDate(date: Date, lang: Lang = appLang()): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(dateLocale(lang), sameYear ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
}

export function formatTime(date: Date, lang: Lang = appLang()): string {
  return date.toLocaleTimeString(dateLocale(lang), { hour: "2-digit", minute: "2-digit", hour12: lang === "en" ? undefined : false });
}

/** V2 23:59 is an explicit instant; only legacy values may use it as an all-day marker. */
export function dueHasTime(value: string | null | undefined, date: Date, scheduleVersion?: number | null): boolean {
  if (!value || !value.includes("T")) return false;
  return scheduleVersion === 2 || !(date.getHours() === 23 && date.getMinutes() === 59);
}

function parseDue(value: string): Date | null {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? (() => { const [y, m, dd] = value.split("-").map(Number); return new Date(y, m - 1, dd); })()
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "فردا ۱۰:۰۰", "۷ مهر", "Tomorrow 10:00 AM", "Oct 7". Falls back to the reminder time. */
export function formatDueLabel(dateIso: string | null | undefined, reminderIso?: string | null, lang: Lang = appLang(), scheduleVersion?: number | null): string | null {
  const value = dateIso || reminderIso;
  if (!value) return null;
  const base = parseDue(value);
  if (!base) return null;
  const day = relativeDayLabel(base, lang) ?? formatShortDate(base, lang);
  if (dateIso && dueHasTime(dateIso, base, scheduleVersion)) return `${day} ${formatTime(base, lang)}`;
  if (reminderIso) {
    const r = new Date(reminderIso);
    if (!Number.isNaN(r.getTime())) return `${day} ${formatTime(r, lang)}`;
  }
  return day;
}
