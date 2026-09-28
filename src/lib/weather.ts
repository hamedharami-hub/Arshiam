/** Open-Meteo weather via the ARSHNAZ service, with location settings and offline cache. */
import { arshFetch } from "@/lib/arshApi";

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
    return raw ? (JSON.parse(raw) as WeatherLocation) : null;
  } catch {
    return null;
  }
}

export function setWeatherLocation(loc: WeatherLocation) {
  try {
    localStorage.setItem(LOC_KEY, JSON.stringify(loc));
    window.dispatchEvent(new Event(WEATHER_EVENT));
  } catch {}
}

const cacheKey = (loc: WeatherLocation) => `arsh_weather_cache_v1:${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;

export async function fetchWeather(loc: WeatherLocation): Promise<WeatherData> {
  try {
    const data = await arshFetch<WeatherData>(`/api/arsh/weather?lat=${loc.lat}&lon=${loc.lon}`, {}, false);
    try { localStorage.setItem(cacheKey(loc), JSON.stringify(data)); } catch {}
    return data;
  } catch (e) {
    const raw = localStorage.getItem(cacheKey(loc));
    if (raw) return { ...(JSON.parse(raw) as WeatherData), offline: true };
    throw e;
  }
}

export type CitySuggestion = { name: string; admin1?: string; country?: string; lat: number; lon: number };

export async function searchCity(q: string, lang: "fa" | "en"): Promise<CitySuggestion[]> {
  const res = await arshFetch<{ items: CitySuggestion[] }>(`/api/arsh/geocode?q=${encodeURIComponent(q)}&lang=${lang}`, {}, false);
  return res.items;
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
    if (t.startsWith(date)) out.push({ time: t, temp: h.temperature_2m[i], code: h.weather_code[i], rain: h.precipitation_probability[i] ?? 0, wind: h.wind_speed_10m[i] });
  });
  return out;
}

export type DayPoint = { date: string; max: number; min: number; code: number; rain: number };

export function dayForDate(data: WeatherData, date: string): DayPoint | null {
  const i = data.daily.time.indexOf(date);
  if (i < 0) return null;
  const d = data.daily;
  return { date, max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], code: d.weather_code[i], rain: d.precipitation_probability_max[i] ?? 0 };
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
