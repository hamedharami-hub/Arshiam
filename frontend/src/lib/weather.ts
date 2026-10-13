/** Direct Open-Meteo forecasts, with explicit location selection and a bounded offline cache. */
import { requestDeadline } from "./requestDeadline";

export type WeatherLocation = { mode: "gps" | "city"; name: string; lat: number; lon: number };

export type WeatherData = {
  timezone: string;
  current: { time: string; temperature_2m: number; weather_code: number; apparent_temperature: number; wind_speed_10m: number } | null;
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: number[]; wind_speed_10m: number[] };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[] };
  fetched_at: string;
  stale?: boolean;
  offline?: boolean;
};

const LOC_KEY = "arsh_weather_location_v1";
export const WEATHER_EVENT = "arsh:weather-location";

export function getWeatherLocation(): WeatherLocation | null {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    const loc = raw ? JSON.parse(raw) : null;
    return loc && (loc.mode === "gps" || loc.mode === "city") && typeof loc.name === "string" && Number.isFinite(loc.lat) && Math.abs(loc.lat) <= 90 && Number.isFinite(loc.lon) && Math.abs(loc.lon) <= 180 ? loc : null;
  } catch {
    return null;
  }
}

export function setWeatherLocation(loc: WeatherLocation) {
  try {
    if (!validLocation(loc)) return false;
    const raw = JSON.stringify(loc);
    localStorage.setItem(LOC_KEY, raw);
    if (localStorage.getItem(LOC_KEY) !== raw) return false;
    window.dispatchEvent(new Event(WEATHER_EVENT));
    return true;
  } catch { return false; }
}

const cacheKey = (loc: WeatherLocation) => `arsh_weather_cache_v1:${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;

function validLocation(loc: WeatherLocation): boolean {
  return (loc.mode === "gps" || loc.mode === "city") && typeof loc.name === "string" && Boolean(loc.name.trim()) && Number.isFinite(loc.lat) && Math.abs(loc.lat) <= 90 && Number.isFinite(loc.lon) && Math.abs(loc.lon) <= 180;
}

function validForecast(value: unknown): value is WeatherData {
  if (!value || typeof value !== "object") return false;
  const data = value as WeatherData;
  const validSeries = (series: WeatherData["hourly"] | WeatherData["daily"], fields: string[], datePattern: RegExp) => {
    if (!series || !Array.isArray(series.time) || !series.time.length || !series.time.every(time => typeof time === "string" && datePattern.test(time))) return false;
    const values = series as unknown as Record<string, unknown>;
    return fields.every(field => Array.isArray(values[field]) && (values[field] as unknown[]).length === series.time.length && (values[field] as unknown[]).every(value => value === null || (typeof value === "number" && Number.isFinite(value))));
  };
  return typeof data.timezone === "string" && validSeries(data.hourly, ["temperature_2m", "weather_code", "precipitation_probability", "wind_speed_10m"], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) && validSeries(data.daily, ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max"], /^\d{4}-\d{2}-\d{2}$/);
}

export async function fetchWeather(loc: WeatherLocation, signal?: AbortSignal): Promise<WeatherData> {
  if (!validLocation(loc)) throw new Error("Invalid weather location");
  const deadline = requestDeadline(15000, signal);
  try {
    const params = new URLSearchParams({ latitude: String(loc.lat), longitude: String(loc.lon), timezone: "auto", forecast_days: "7", current: "temperature_2m,weather_code,apparent_temperature,wind_speed_10m", hourly: "temperature_2m,weather_code,precipitation_probability,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: deadline.signal });
    if (!response.ok) throw new Error(`Weather HTTP ${response.status}`);
    const result = await response.json();
    if (!validForecast(result)) throw new Error("Invalid weather response");
    const data: WeatherData = { ...result, fetched_at: new Date().toISOString() };
    try { localStorage.setItem(cacheKey(loc), JSON.stringify(data)); } catch {}
    return data;
  } catch (e) {
    if (signal?.aborted) throw e;
    try {
      const raw = localStorage.getItem(cacheKey(loc));
      const cached = raw ? JSON.parse(raw) as WeatherData : null;
      const age = cached ? Date.now() - Date.parse(cached.fetched_at) : NaN;
      if (validForecast(cached) && age >= 0 && age < 24 * 60 * 60 * 1000) return { ...cached, offline: true, stale: true };
    } catch { /* A corrupt or inaccessible cache must not mask the network error. */ }
    throw e;
  } finally { deadline.dispose(); }
}

export type CitySuggestion = { name: string; admin1?: string; country?: string; lat: number; lon: number };

export async function searchCity(q: string, lang: "fa" | "en"): Promise<CitySuggestion[]> {
  const deadline = requestDeadline(15000);
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=8&language=${lang}`, { signal: deadline.signal });
    if (!response.ok) throw new Error(`City search HTTP ${response.status}`);
    const result = await response.json();
    if (result.results != null && !Array.isArray(result.results)) throw new Error("Invalid city response");
    return (result.results || []).flatMap((city: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => {
      const loc: WeatherLocation = { mode: "city", name: city?.name, lat: city?.latitude, lon: city?.longitude };
      return validLocation(loc) ? [{ name: loc.name, admin1: city.admin1, country: city.country, lat: loc.lat, lon: loc.lon }] : [];
    });
  } finally { deadline.dispose(); }
}

export function locateByGps(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/** WMO weather code → group used for icons/labels. */
export type WeatherGroup = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function weatherGroup(code: number): WeatherGroup {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export const WEATHER_LABEL: Record<WeatherGroup, { fa: string; en: string }> = {
  clear: { fa: "صاف", en: "Clear" },
  partly: { fa: "نیمه‌ابری", en: "Partly cloudy" },
  cloudy: { fa: "ابری", en: "Cloudy" },
  fog: { fa: "مه", en: "Fog" },
  drizzle: { fa: "نم‌نم باران", en: "Drizzle" },
  rain: { fa: "باران", en: "Rain" },
  snow: { fa: "برف", en: "Snow" },
  storm: { fa: "رعدوبرق", en: "Thunderstorm" },
};

export type HourPoint = { time: string; temp: number; code: number; rain: number; wind: number };

/** Hourly points for a local date (yyyy-mm-dd) — Open-Meteo times are already in the location's timezone. */
export function hoursForDate(data: WeatherData, date: string): HourPoint[] {
  const h = data.hourly;
  const out: HourPoint[] = [];
  h.time.forEach((t, i) => {
    if (t.startsWith(date)) out.push({ time: t, temp: h.temperature_2m[i] ?? NaN, code: h.weather_code[i], rain: h.precipitation_probability[i] ?? NaN, wind: h.wind_speed_10m[i] ?? NaN });
  });
  return out;
}

export type DayPoint = { date: string; max: number; min: number; code: number; rain: number };

export function dayForDate(data: WeatherData, date: string): DayPoint | null {
  const i = data.daily.time.indexOf(date);
  if (i < 0) return null;
  const d = data.daily;
  return { date, max: d.temperature_2m_max[i] ?? NaN, min: d.temperature_2m_min[i] ?? NaN, code: d.weather_code[i], rain: d.precipitation_probability_max[i] ?? NaN };
}

/** "Today" in the forecast location's own timezone (Open-Meteo current.time), falling back to device date. */
export function forecastToday(data: WeatherData): string {
  if (data.current?.time) return data.current.time.slice(0, 10);
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
