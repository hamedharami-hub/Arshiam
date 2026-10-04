import { useState } from "react";
import { Droplets, Loader2, MapPin, RefreshCw, Wind } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/useWeather";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits, formatDate } from "@/lib/jalali";
import { addDaysIso, dayForDate, forecastToday, hoursForDate, weatherGroup, WEATHER_LABEL } from "@/lib/weather";
import { WeatherIcon } from "./WeatherIcon";
import { WeatherLocationPicker } from "./WeatherLocationPicker";

/** Small header icon for "Today" / "Tomorrow"; tap opens hourly details in a bottom sheet. */
export function WeatherChip({ day }: { day: "today" | "tomorrow" }) {
  const { isEn } = useBilingual();
  const { location, data, loading, error, refresh } = useWeather();
  const [open, setOpen] = useState(false);
  const [editLoc, setEditLoc] = useState(false);
  const n = (v: number | string) => (isEn ? String(v) : toPersianDigits(v));

  const date = data ? (day === "today" ? forecastToday(data) : addDaysIso(forecastToday(data), 1)) : null;
  const daily = data && date ? dayForDate(data, date) : null;
  const hours = data && date ? hoursForDate(data, date) : [];
  const nowHour = data?.current?.time?.slice(0, 13);
  const shownHours = day === "today" && nowHour ? hours.filter((h) => h.time.slice(0, 13) >= nowHour) : hours;
  const headlineCode = day === "today" && data?.current ? data.current.weather_code : daily?.code;
  const headlineTemp = day === "today" && data?.current ? Math.round(data.current.temperature_2m) : daily ? Math.round(daily.max) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setEditLoc(!location); }}
        className="h-9 min-w-9 px-2 rounded-full border border-border/60 bg-card/70 inline-flex items-center gap-1 text-xs font-semibold hover:bg-muted"
        aria-label={isEn ? "Weather details" : "جزئیات هواشناسی"}
        data-testid={`weather-chip-${day}`}
      >
        {loading && !data ? <Loader2 className="w-4 h-4 animate-spin" /> : headlineCode !== undefined && headlineCode !== null ? <WeatherIcon code={headlineCode} /> : <MapPin className="w-4 h-4 text-muted-foreground" />}
        {headlineTemp !== null && <span className="tabular-nums">{n(headlineTemp)}°</span>}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]" data-testid={`weather-sheet-${day}`}>
          <DrawerHeader className="text-start">
            <DrawerTitle className="flex items-center gap-2">
              {day === "today" ? (isEn ? "Today's weather" : "هوای امروز") : (isEn ? "Tomorrow's weather" : "هوای فردا")}
              {location && <span className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{location.name}</span>}
            </DrawerTitle>
            <DrawerDescription className="text-[11px]" data-testid="weather-updated-at">
              {data
                ? `${isEn ? "Updated" : "به‌روزرسانی"}: ${formatDate(data.fetched_at, "HH:mm · d MMM")}${data.offline || data.stale ? (isEn ? " (offline copy)" : " (نسخهٔ آفلاین)") : ""}`
                : isEn ? "Choose a location to see the forecast" : "برای دیدن پیش‌بینی، موقعیت را انتخاب کن"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto space-y-4" dir={isEn ? "ltr" : "rtl"}>
            {editLoc || !location ? (
              <WeatherLocationPicker location={location} isEn={isEn} onDone={() => setEditLoc(false)} />
            ) : (
              <>
                {daily && (
                  <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3" data-testid="weather-day-summary">
                    <WeatherIcon code={headlineCode ?? daily.code} className="w-10 h-10" />
                    <div className="flex-1">
                      <div className="text-2xl font-bold tabular-nums">{n(headlineTemp ?? Math.round(daily.max))}°</div>
                      <div className="text-xs text-muted-foreground">
                        {isEn ? WEATHER_LABEL[weatherGroup(daily.code)].en : WEATHER_LABEL[weatherGroup(daily.code)].fa} · {n(Math.round(daily.min))}° / {n(Math.round(daily.max))}°
                      </div>
                    </div>
                    <div className="text-xs text-sky-600 inline-flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />{n(daily.rain)}%</div>
                  </div>
                )}
                {error && !data && <p className="text-xs text-destructive">{isEn ? "Weather unavailable right now." : "هواشناسی فعلاً در دسترس نیست."}</p>}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="weather-hourly-list">
                  {shownHours.map((h) => (
                    <div key={h.time} className="shrink-0 w-16 rounded-xl border border-border/60 bg-card p-2 flex flex-col items-center gap-1 text-[11px]">
                      <span className="text-muted-foreground tabular-nums">{n(h.time.slice(11, 16))}</span>
                      <WeatherIcon code={h.code} className="w-5 h-5" />
                      <span className="font-semibold tabular-nums">{n(Math.round(h.temp))}°</span>
                      <span className="text-sky-600 tabular-nums">{n(h.rain)}%</span>
                      <span className="text-muted-foreground inline-flex items-center gap-0.5 tabular-nums"><Wind className="w-2.5 h-2.5" />{n(Math.round(h.wind))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-10 gap-1 flex-1" onClick={() => void refresh()} disabled={loading} data-testid="weather-refresh">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{isEn ? "Refresh" : "به‌روزرسانی"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-10 gap-1 flex-1" onClick={() => setEditLoc(true)} data-testid="weather-change-location">
                    <MapPin className="w-4 h-4" />{isEn ? "Change location" : "تغییر موقعیت"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
