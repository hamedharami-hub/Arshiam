import { useState } from "react";
import { useWeather } from "@/hooks/useWeather";
import { dayForDate, forecastToday, hoursForDate, WEATHER_LABEL, weatherGroup } from "@/lib/weather";
import { WeatherIcon } from "./WeatherIcon";
import { WeatherLocationPicker } from "./WeatherLocationPicker";
import { Button } from "@/components/ui/button";

export function WeatherPanel({ isEn, date }: { isEn: boolean; date?: string }) {
  const { location, data, loading, error, refresh } = useWeather();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"hourly" | "daily">("hourly");
  const selectedDate = date || (data ? forecastToday(data) : "");
  const day = data ? dayForDate(data, selectedDate) : null;
  const label = (code: number) => WEATHER_LABEL[weatherGroup(code)][isEn ? "en" : "fa"];
  const num = (value: number) => Number.isFinite(value) ? new Intl.NumberFormat(isEn ? "en" : "fa", { maximumFractionDigits: 0 }).format(value) : "—";
  return <section className="rounded-xl border border-border bg-card p-3" data-testid="weather-panel">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        {day && <WeatherIcon code={day.code} />}
        {isEn ? "Weather" : "آب‌وهوا"}{location && <span className="text-xs text-muted-foreground">· {location.name}</span>}
        {day && <span dir="ltr" className="text-xs">{num(day.min)}–{num(day.max)}°C</span>}
      </h2>
      <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setEditing(value => !value)} aria-expanded={editing}>{isEn ? "Location" : "موقعیت"}</Button>
    </div>
    {(!location || editing) && <WeatherLocationPicker location={location} isEn={isEn} onDone={() => setEditing(false)} />}
    {loading && <p role="status" className="text-xs text-muted-foreground">{isEn ? "Loading forecast…" : "دریافت پیش‌بینی…"}</p>}
    {error && <div role="alert" className="flex items-center justify-between gap-2 text-xs"><span>{isEn ? "Forecast could not load." : "پیش‌بینی دریافت نشد."}</span><Button variant="outline" onClick={refresh}>{isEn ? "Retry" : "تلاش مجدد"}</Button></div>}
    {data && <>
      {(data.offline || data.stale) && <p role="status" className="text-xs text-muted-foreground">{isEn ? "Cached forecast — not a live update" : "پیش‌بینی ذخیره‌شده؛ به‌روز نیست"}</p>}
      {!day && <p className="py-2 text-xs text-muted-foreground">{isEn ? "This date is outside the available forecast." : "این تاریخ خارج از بازهٔ پیش‌بینی موجود است."}</p>}
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">{isEn ? "Hourly & 7-day forecast" : "پیش‌بینی ساعتی و ۷ روزه"}</summary>
        <div className="flex gap-2" role="group" aria-label={isEn ? "Forecast view" : "نمای پیش‌بینی"}>
          {(["hourly", "daily"] as const).map(view => <Button key={view} variant={view === mode ? "secondary" : "ghost"} aria-pressed={mode === view} onClick={() => setMode(view)}>{view === "hourly" ? (isEn ? "Hourly" : "ساعتی") : (isEn ? "7 days" : "۷ روز")}</Button>)}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2" tabIndex={0} aria-label={isEn ? "Forecast details" : "جزئیات پیش‌بینی"}>
          {mode === "hourly" ? hoursForDate(data, selectedDate).map(hour => <div key={hour.time} className="flex min-w-20 shrink-0 flex-col items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs">
            <time dateTime={hour.time}>{hour.time.slice(11, 16)}</time><WeatherIcon code={hour.code} /><span>{num(hour.temp)}°C</span><span className="text-muted-foreground">{num(hour.rain)}% {isEn ? "rain" : "بارش"}</span>
          </div>) : data.daily.time.map(dayDate => { const point = dayForDate(data, dayDate)!; return <div key={dayDate} className="flex min-w-28 shrink-0 flex-col items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs">
            <time dateTime={dayDate}>{new Intl.DateTimeFormat(isEn ? "en" : "fa", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${dayDate}T12:00:00`))}</time>
            <WeatherIcon code={point.code} /><span>{label(point.code)}</span><span dir="ltr">{num(point.min)}–{num(point.max)}°C</span>
          </div>; })}
        </div>
      </details>
      <p className="mt-2 text-[10px] text-muted-foreground">{data.timezone} · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline focus-visible:ring-2 focus-visible:ring-ring">Open-Meteo</a> · {isEn ? "Forecast, not a guarantee" : "پیش‌بینی، نه قطعیت"}</p>
    </>}
  </section>;
}
