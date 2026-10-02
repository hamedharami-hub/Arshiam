import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecurrenceRule } from "@/lib/recurrence";
import { describeRule } from "@/lib/recurrence";

const WEEKDAYS_FA = [
  { key: "SA" as const, label: "ش" }, { key: "SU" as const, label: "ی" }, { key: "MO" as const, label: "د" },
  { key: "TU" as const, label: "س" }, { key: "WE" as const, label: "چ" }, { key: "TH" as const, label: "پ" },
  { key: "FR" as const, label: "ج" },
];
const WEEKDAYS_EN = [
  { key: "SA" as const, label: "Sa" }, { key: "SU" as const, label: "Su" }, { key: "MO" as const, label: "Mo" },
  { key: "TU" as const, label: "Tu" }, { key: "WE" as const, label: "We" }, { key: "TH" as const, label: "Th" },
  { key: "FR" as const, label: "Fr" },
];

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export function RecurrenceEditor({
  value,
  onChange,
  defaultTime,
}: {
  value: RecurrenceRule | null;
  onChange: (v: RecurrenceRule | null) => void;
  defaultTime?: string | null;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const WEEKDAYS = isEn ? WEEKDAYS_EN : WEEKDAYS_FA;
  const [enabled, setEnabled] = useState(!!value);
  const v: RecurrenceRule = value || { freq: "daily", interval: 1 };

  useEffect(() => setEnabled(!!value), [value]);

  const update = (patch: Partial<RecurrenceRule>) => onChange({ ...v, ...patch });
  const toggleDay = (day: NonNullable<RecurrenceRule["byweekday"]>[number]) => {
    const days = new Set(v.byweekday || []);
    if (days.has(day)) days.delete(day);
    else days.add(day);
    update({ byweekday: Array.from(days) });
  };
  const enable = () => {
    setEnabled(true);
    const [hour, minute] = defaultTime?.split(":").map(Number) || [];
    onChange({
      ...v,
      ...(Number.isFinite(hour) && Number.isFinite(minute) ? { byhour: hour, byminute: minute } : {}),
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      {!enabled ? (
        <button
          type="button"
          onClick={enable}
          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-start transition hover:bg-muted/60"
        >
          <span>
            <span className="block text-xs font-medium text-foreground">{T("تکرار تسک", "Repeat task")}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{T("بدون تکرار", "Does not repeat")}</span>
          </span>
          <span className="rounded-full border bg-background px-3 py-1 text-[11px] font-medium text-primary">{T("افزودن", "Add")}</span>
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">{T("تکرار تسک", "Repeat task")}</Label>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{describeRule(v, isEn)}</p>
            </div>
            <button
              type="button"
              onClick={() => { setEnabled(false); onChange(null); }}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {T("خاموش", "Off")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={T("دورهٔ تکرار", "Repeat frequency")}>
            {FREQUENCIES.map((freq) => {
              const label = freq === "daily" ? T("روزانه", "Daily") : freq === "weekly" ? T("هفتگی", "Weekly") : freq === "monthly" ? T("ماهانه", "Monthly") : T("سالانه", "Yearly");
              return (
                <button
                  key={freq}
                  type="button"
                  aria-pressed={v.freq === freq}
                  onClick={() => update({ freq })}
                  className={`min-h-9 rounded-lg border px-3 text-xs font-medium transition ${v.freq === freq ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background hover:bg-muted"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_6rem] items-center gap-3">
            <div>
              <Label htmlFor="recurrence-interval" className="text-[11px] text-muted-foreground">
                {T("هر چند", "Repeat every")} {v.freq === "daily" ? T("روز", "days") : v.freq === "weekly" ? T("هفته", "weeks") : v.freq === "monthly" ? T("ماه", "months") : T("سال", "years")}
              </Label>
            </div>
            <Input
              id="recurrence-interval"
              type="number"
              min={1}
              max={365}
              value={v.interval}
              onChange={(event) => update({ interval: Math.min(365, Math.max(1, parseInt(event.target.value, 10) || 1)) })}
              className="h-9 text-center text-sm tabular-nums"
            />
          </div>

          {v.freq === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{T("روزهای هفته", "Days of the week")}</Label>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => {
                  const active = v.byweekday?.includes(day.key) || false;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-label={day.label}
                      aria-pressed={active}
                      onClick={() => toggleDay(day.key)}
                      className={`aspect-square min-w-0 rounded-full text-[11px] font-medium transition ${active ? "bg-primary text-primary-foreground" : "border border-border/60 bg-background hover:bg-muted"}`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-[1fr_7rem] items-center gap-3 border-t border-border/50 pt-2">
            <Label htmlFor="recurrence-time" className="text-[11px] text-muted-foreground">{T("ساعت تکرار", "Repeat at")}</Label>
            <Input
              id="recurrence-time"
              type="time"
              value={typeof v.byhour === "number" ? `${String(v.byhour).padStart(2, "0")}:${String(v.byminute || 0).padStart(2, "0")}` : ""}
              onChange={(event) => {
                const [hour, minute] = event.target.value.split(":").map(Number);
                update(event.target.value ? { byhour: hour, byminute: minute } : { byhour: undefined, byminute: undefined });
              }}
              className="h-9 text-xs tabular-nums"
            />
          </div>
        </>
      )}
    </div>
  );
}
