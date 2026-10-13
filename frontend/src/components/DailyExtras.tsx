import { useDailyExtrasSettings } from "@/lib/dailyExtrasSettings";
import { WeatherPanel } from "./weather/WeatherPanel";
import { DailyTreasury } from "./DailyTreasury";

export function DailyExtras({ isEn, calendarDate }: { isEn: boolean; calendarDate?: string }) {
  const settings = useDailyExtrasSettings();
  const weatherEnabled = calendarDate ? settings.calendarWeather : settings.weather;
  if (!weatherEnabled && (calendarDate || (!settings.news && !settings.inspiration))) return null;
  return <div className="space-y-2" data-testid="daily-extras">
    {weatherEnabled && <WeatherPanel isEn={isEn} date={calendarDate} />}
    {!calendarDate && settings.inspiration && <DailyTreasury isEn={isEn} bilingual={settings.bilingual} />}
    {!calendarDate && settings.news && <section className="rounded-xl border bg-card p-3 text-xs">
      <h2 className="text-sm font-medium">{isEn ? "Positive news" : "خبرهای مثبت"}</h2>
      <p className="mt-1 leading-6 text-muted-foreground">{isEn ? "Read current stories on the publisher's website. In-app headlines are not enabled until republication terms are confirmed." : "خبرهای جاری را در وب‌سایت ناشر بخوان. نمایش عنوان خبر داخل برنامه تا تأیید شرایط بازنشر فعال نشده است."}</p>
      <a href="https://www.positive.news/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline focus-visible:ring-2 focus-visible:ring-ring">Positive News ↗</a>
    </section>}
  </div>;
}
