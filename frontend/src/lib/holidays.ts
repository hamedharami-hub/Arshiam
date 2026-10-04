/**
 * Holidays & occasions.
 *  - Jalali (Iran): @doranjs/holidays, computed locally (works offline). Lunar dates are
 *    tabular and may be ±1 day off → flagged `approximate` ("تقریبی").
 *  - Gregorian (Australia): Nager.Date via the ARSHNAZ service (national + chosen state),
 *    cached in localStorage for offline use.
 */
import { getHolidays as getJalaliHolidays } from "@doranjs/holidays";
import { newDate as jalaliDate, getYear as jalaliYear } from "date-fns-jalali";
import { arshFetch } from "@/lib/arshApi";
import { getLocalDateString } from "@/lib/taskDate";

export type HolidayKind = "off" | "occasion" | "lunar";

export type Holiday = {
  id: string;
  date: string; // YYYY-MM-DD (local)
  country_code: "IR" | "AU";
  name: string;
  local_name: string | null;
  type: string | null;
  /** off = official day off · occasion = non-holiday observance · lunar = approximate lunar date */
  kind: HolidayKind;
  official: boolean;
  approximate?: boolean;
  region?: string | null;
};

export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
export type AuState = (typeof AU_STATES)[number] | "";
const STATE_KEY = "arsh_au_state_v1";
export const HOLIDAYS_EVENT = "arsh:holidays-settings";
const SETS_KEY = "arsh_occasion_sets_v1";
export type OccasionSet = "IR" | "AU";

export function getOccasionSets(): OccasionSet[] {
  try {
    const raw = localStorage.getItem(SETS_KEY);
    if (!raw) return ["IR", "AU"];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is OccasionSet => c === "IR" || c === "AU") : ["IR", "AU"];
  } catch {
    return ["IR", "AU"];
  }
}

export function setOccasionSets(sets: OccasionSet[]) {
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(sets));
    window.dispatchEvent(new Event(HOLIDAYS_EVENT));
  } catch {}
}

/** Default NSW (user choice). Empty string = national holidays only. */
export function getAuState(): AuState {
  try {
    const v = localStorage.getItem(STATE_KEY);
    if (v === null) return "NSW";
    return (AU_STATES as readonly string[]).includes(v) ? (v as AuState) : "";
  } catch {
    return "NSW";
  }
}

export function setAuState(v: AuState) {
  try {
    localStorage.setItem(STATE_KEY, v);
    memo.clear();
    window.dispatchEvent(new Event(HOLIDAYS_EVENT));
  } catch {}
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Pure: Iranian holidays for a date range (inclusive, local dates). */
export function iranHolidaysForRange(start: Date, end: Date): Holiday[] {
  const out: Holiday[] = [];
  const s = iso(start);
  const e = iso(end);
  for (let jy = jalaliYear(start); jy <= jalaliYear(end); jy++) {
    for (const h of getJalaliHolidays(jy)) {
      const date = iso(jalaliDate(h.year, h.month - 1, h.day));
      if (date < s || date > e) continue;
      const approximate = h.calendar === "lunar" && !!h.approximate;
      out.push({
        id: `IR-${date}-${h.titleEn}`,
        date,
        country_code: "IR",
        name: h.titleEn,
        local_name: h.title,
        type: h.type,
        kind: approximate ? "lunar" : h.official ? "off" : "occasion",
        official: h.official,
        approximate,
      });
    }
  }
  return out;
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
}

/** Pure: well-known Australian observances (not public holidays), computed locally. */
export function auObservancesForYear(year: number): Holiday[] {
  const list: Array<[Date, string, string]> = [
    [new Date(year, 1, 14), "Valentine's Day", "روز ولنتاین"],
    [nthWeekday(year, 2, 0, 1), "Clean Up Australia Day", "روز پاکسازی استرالیا"],
    [new Date(year, 2, 21), "Harmony Day", "روز هماهنگی (Harmony Day)"],
    [nthWeekday(year, 3, 0, 1), "Daylight saving ends", "پایان ساعت تابستانی"],
    [nthWeekday(year, 4, 0, 2), "Mother's Day", "روز مادر (استرالیا)"],
    [new Date(year, 4, 26), "National Sorry Day", "روز ملی عذرخواهی"],
    [new Date(year, 5, 3), "Mabo Day", "روز مابو"],
    [nthWeekday(year, 6, 0, 1), "NAIDOC Week begins", "آغاز هفتهٔ NAIDOC"],
    [nthWeekday(year, 8, 0, 1), "Father's Day", "روز پدر (استرالیا)"],
    [nthWeekday(year, 9, 0, 1), "Daylight saving begins", "آغاز ساعت تابستانی"],
    [new Date(year, 9, 31), "Halloween", "هالووین"],
    [new Date(year, 10, 11), "Remembrance Day", "روز یادبود"],
  ];
  return list.map(([d, name, fa]) => ({
    id: `AUO-${iso(d)}-${name}`, date: iso(d), country_code: "AU" as const, name, local_name: fa,
    type: "observance", kind: "occasion" as const, official: false, region: null,
  }));
}

type AuItem = { date: string; name: string; local_name: string; national: boolean; region: string | null };

async function auYear(year: number, state: AuState): Promise<Holiday[]> {
  const cacheKey = `arsh_au_holidays_v1:${year}:${state || "national"}`;
  const toHolidays = (items: AuItem[]) =>
    items.map((h) => ({
      id: `AU-${h.date}-${h.name}`,
      date: h.date,
      country_code: "AU" as const,
      name: h.name,
      local_name: h.local_name,
      type: h.national ? "national" : "state",
      kind: "off" as const,
      official: true,
      region: h.region,
    }));
  try {
    const res = await arshFetch<{ items: AuItem[] }>(`/api/arsh/holidays/au?year=${year}&state=${state}`, {}, false);
    try { localStorage.setItem(cacheKey, JSON.stringify(res.items)); } catch {}
    return toHolidays(res.items);
  } catch {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? toHolidays(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }
}

const memo = new Map<string, Promise<Holiday[]>>();

export async function getHolidaysForRange(start: Date, end: Date, countries: string[] = ["IR", "AU"]): Promise<Holiday[]> {
  const state = getAuState();
  const key = `${iso(start)}_${iso(end)}_${countries.join(",")}_${state}`;
  if (!memo.has(key)) {
    memo.set(key, (async () => {
      const result: Holiday[] = [];
      if (countries.includes("IR")) result.push(...iranHolidaysForRange(start, end));
      if (countries.includes("AU")) {
        const s = iso(start);
        const e = iso(end);
        for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
          result.push(...[...(await auYear(y, state)), ...auObservancesForYear(y)].filter((h) => h.date >= s && h.date <= e));
        }
      }
      return result.sort((a, b) => a.date.localeCompare(b.date));
    })().catch((err) => { memo.delete(key); throw err; }));
  }
  return memo.get(key)!;
}

export function isHoliday(date: Date, holidays: Holiday[], timeZone?: string): Holiday[] {
  const d = getLocalDateString(date, timeZone);
  return holidays.filter((h) => h.date === d);
}

/** A day counts as a day off only for official holidays (lunar official ones included). */
export function isDayOff(list: Holiday[]): boolean {
  return list.some((h) => h.official);
}

/** Colour per kind: day off (rose), occasion (sky), approximate lunar (emerald). */
export const HOLIDAY_TONE: Record<HolidayKind, { dot: string; text: string; bg: string; border: string }> = {
  off: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  occasion: { dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  lunar: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

/** Most important kind of a day for cell colouring. */
export function dominantKind(list: Holiday[]): HolidayKind | null {
  if (!list.length) return null;
  if (list.some((h) => h.kind === "off")) return "off";
  if (list.some((h) => h.kind === "lunar")) return "lunar";
  return "occasion";
}
