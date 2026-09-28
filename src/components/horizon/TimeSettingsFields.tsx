import { Switch } from "@/components/ui/switch";
import { getCalendarSystem, setCalendarSystem, type CalendarSystem } from "@/lib/jalali";
import { setSeasonsEnabled, setWeekStart, type TimeSettings } from "@/lib/timeHorizon";

export function TimeSettingsFields({ settings, fa, onChanged }: { settings: TimeSettings; fa: boolean; onChanged: () => void }) {
  const seg = (active: boolean) => `flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`;
  return (
    <div className="space-y-3" data-testid="time-settings-fields">
      <div>
        <div className="text-xs font-semibold mb-1.5">{fa ? "روز اول هفته" : "First day of week"}</div>
        <div className="flex gap-1.5">
          <button type="button" className={seg(settings.weekStart === "sat")} onClick={() => { setWeekStart("sat"); onChanged(); }} data-testid="week-start-sat">{fa ? "شنبه" : "Saturday"}</button>
          <button type="button" className={seg(settings.weekStart === "mon")} onClick={() => { setWeekStart("mon"); onChanged(); }} data-testid="week-start-mon">{fa ? "دوشنبه" : "Monday"}</button>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold mb-1.5">{fa ? "تقویم" : "Calendar"}</div>
        <div className="flex gap-1.5">
          {(["jalali", "gregorian"] as CalendarSystem[]).map((c) => (
            <button key={c} type="button" className={seg(getCalendarSystem() === c)} onClick={() => { setCalendarSystem(c); window.dispatchEvent(new Event("arsh:time-settings")); onChanged(); }} data-testid={`calendar-${c}`}>
              {c === "jalali" ? (fa ? "شمسی" : "Jalali") : (fa ? "میلادی" : "Gregorian")}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span>{fa ? "نمایش فصل‌ها" : "Show seasons (quarters)"}</span>
        <Switch checked={settings.seasonsEnabled} onCheckedChange={(v) => { setSeasonsEnabled(v); onChanged(); }} data-testid="seasons-toggle" />
      </label>
      <p className="text-[11px] text-muted-foreground">{fa ? "همهٔ مرزهای روز و هفته بر اساس منطقهٔ زمانی دستگاه محاسبه می‌شوند." : "Day and week boundaries follow your device time zone (DST-safe)."}</p>
    </div>
  );
}
