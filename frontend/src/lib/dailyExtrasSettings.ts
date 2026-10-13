import { useSyncExternalStore } from "react";

export type DailyExtrasSettings = { weather: boolean; calendarWeather: boolean; news: boolean; inspiration: boolean; bilingual: boolean };
const KEY = "arsh_daily_extras_v1";
const EVENT = "arsh:daily-extras";
const defaults: DailyExtrasSettings = { weather: false, calendarWeather: false, news: false, inspiration: false, bilingual: true };
let cachedRaw: string | null | undefined;
let cached = defaults;
export function getDailyExtrasSettings(): DailyExtrasSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    const parsed = JSON.parse(raw || "{}");
    cached = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof parsed?.[key] === "boolean" ? parsed[key] : fallback])) as DailyExtrasSettings;
  } catch { cachedRaw = undefined; cached = defaults; }
  return cached;
}
export function setDailyExtrasSettings(patch: Partial<DailyExtrasSettings>): boolean {
  try {
    const raw = JSON.stringify({ ...getDailyExtrasSettings(), ...patch });
    localStorage.setItem(KEY, raw);
    if (localStorage.getItem(KEY) !== raw) return false;
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch { return false; }
}
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", callback); };
}
export function useDailyExtrasSettings() { return useSyncExternalStore(subscribe, getDailyExtrasSettings, () => defaults); }
