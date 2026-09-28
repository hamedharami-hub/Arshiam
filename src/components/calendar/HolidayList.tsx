import { HOLIDAY_TONE, type Holiday, type HolidayKind } from "@/lib/holidays";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { format } from "date-fns";

const KIND_LABEL: Record<HolidayKind, { fa: string; en: string }> = {
  off: { fa: "تعطیل", en: "Day off" },
  occasion: { fa: "مناسبت", en: "Occasion" },
  lunar: { fa: "قمری · تقریبی", en: "Lunar · approx." },
};

export function HolidayLegend({ isEn }: { isEn: boolean }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap" data-testid="holiday-legend">
      {(Object.keys(KIND_LABEL) as HolidayKind[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${HOLIDAY_TONE[k].dot}`} />
          {isEn ? KIND_LABEL[k].en : KIND_LABEL[k].fa}
        </span>
      ))}
    </div>
  );
}

/** Occasions list shown under the day / week / month views. */
export function HolidayList({ holidays, system, isEn, title }: { holidays: Holiday[]; system: CalendarSystem; isEn: boolean; title: string }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-2" data-testid="holiday-list">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">{title}</h3>
        <HolidayLegend isEn={isEn} />
      </div>
      {holidays.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="holiday-list-empty">{isEn ? "No holidays or occasions in this range." : "در این بازه مناسبتی نیست."}</p>
      ) : (
        <ul className="space-y-1.5">
          {holidays.map((h) => {
            const d = new Date(`${h.date}T12:00:00`);
            const dateText = system === "jalali" ? toPersianDigits(formatDate(d, "EEEE d MMMM", "jalali")) : format(d, "EEE d MMM");
            const tone = HOLIDAY_TONE[h.kind];
            return (
              <li key={h.id} className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 ${tone.bg} ${tone.border}`} data-testid={`holiday-item-${h.kind}`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" dir="auto">
                    {isEn ? h.name : h.local_name || h.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                    <span>{dateText}</span>
                    <span>{h.country_code === "IR" ? (isEn ? "Iran" : "ایران") : (isEn ? "Australia" : "استرالیا")}{h.region ? ` · ${h.region}` : ""}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold ${tone.text}`}>{isEn ? KIND_LABEL[h.kind].en : KIND_LABEL[h.kind].fa}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
