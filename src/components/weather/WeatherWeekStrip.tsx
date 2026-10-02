import { useBilingual } from "@/hooks/useBilingual";
import { useWeather } from "@/hooks/useWeather";
import { toPersianDigits, formatDate } from "@/lib/jalali";
import { dayForDate, addDaysIso } from "@/lib/weather";
import { WeatherIcon } from "./WeatherIcon";

/** Thin 7-day strip for the weekly view (days outside the 8-day forecast show a dash). */
export function WeatherWeekStrip({ start }: { start: string }) {
  const { isEn } = useBilingual();
  const { data, location } = useWeather();
  if (!location || !data) return null;
  const n = (v: number | string) => (isEn ? String(v) : toPersianDigits(v));
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
  return (
    <div className="flex items-stretch gap-1 rounded-xl bg-muted/50 px-1.5 py-1" data-testid="weather-week-strip">
      {days.map((d) => {
        const p = dayForDate(data, d);
        return (
          <div key={d} className="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-[10px]" title={d}>
            <span className="text-muted-foreground">{formatDate(`${d}T12:00:00`, "EEEEE")}</span>
            {p ? <WeatherIcon code={p.code} className="w-3.5 h-3.5" /> : <span className="h-3.5 text-muted-foreground">–</span>}
            <span className="tabular-nums font-semibold">{p ? `${n(Math.round(p.max))}°` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
