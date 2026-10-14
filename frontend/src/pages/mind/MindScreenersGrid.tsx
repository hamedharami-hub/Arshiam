import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { SCREENERS, severityColor, type ScreenerType } from "@/lib/assessments/screeners";
import { toPersianDigits } from "@/lib/jalali";

export const SCREENER_LIST: { type: ScreenerType; gradient: string }[] = [
  { type: "phq9", gradient: "from-rose-500 to-red-600" },
  { type: "gad7", gradient: "from-amber-500 to-orange-600" },
  { type: "who5", gradient: "from-emerald-500 to-teal-600" },
  { type: "burnout", gradient: "from-slate-500 to-zinc-700" },
];

export interface MindScreenersGridProps {
  latestScreeners: Record<string, any>;
  isEn: boolean;
  T: (fa: string, en: string) => string;
}

export function MindScreenersGrid({
  latestScreeners,
  isEn,
  T,
}: MindScreenersGridProps) {
  return (
    <Card className="p-5 border-border/60 bg-card/60 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          {T("پرسشنامه‌ها و ابزارهای سنجش", "Screeners & Self-Report Instruments")}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {T(
          "نسخهٔ اصلی PHQ-9، GAD-7 و WHO-5 ابزارهای استاندارد هستند؛ اعتبارسنجی همین ترجمهٔ داخل برنامه تأیید نشده است. فرم خستگی، خودپایشی شخصی است و تشخیص نیست.",
          "The original PHQ-9, GAD-7 and WHO-5 are standardized instruments; validation of these in-app translations is not confirmed. The fatigue form is personal self-monitoring, not a diagnosis."
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCREENER_LIST.map(({ type }) => {
          const meta = SCREENERS[type];
          const last = latestScreeners[type];
          const sev = last?.analysis?.severity;
          const date = last?.completed_at ? new Date(last.completed_at) : null;
          const dateLabel = date && Number.isFinite(date.getTime())
            ? date.toLocaleDateString(isEn ? "en-US" : "fa-IR", { year: "numeric", month: "short", day: "numeric" })
            : T("تاریخ انجام نامعلوم", "Completion date unknown");
          const number = (n: number) => isEn ? String(n) : toPersianDigits(n);
          const min = meta.items.length * meta.scaleStart;
          const max = meta.items.length * (meta.scaleStart + meta.scale - 1);

          return (
            <article
              key={type}
              className="group rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm hover:bg-accent/30 hover:border-primary/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <Badge
                    variant={meta.isStandardized ? "secondary" : "outline"}
                    className="text-[10px] py-0 px-1.5"
                  >
                    {meta.isStandardized
                      ? T("نسخهٔ اصلی استاندارد", "Standardized original")
                      : T("فرم شخصی", "Personal")}
                  </Badge>
                   {meta.isStandardized && sev && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ background: severityColor(sev) }}
                    />
                  )}
                </div>
                <div className="text-base font-bold mt-2 text-foreground group-hover:text-primary transition-colors">
                  {isEn ? meta.title_en : meta.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {isEn ? meta.subtitle_en : meta.subtitle}
                </div>
              </div>

               {last ? (
                 <div className="mt-3 pt-2 border-t border-border/40">
                   <p className="text-xs font-semibold">{T("آخرین ثبت؛ نه وضعیت فعلی", "Last recorded result; not your current state")}</p>
                   <p className="text-[11px] text-muted-foreground" data-testid={`screener-date-${type}`}>{dateLabel}</p>
                   <p className="text-sm tabular-nums">{T("نمرهٔ خام", "Raw score")}: {last.scores?.raw != null ? number(last.scores.raw) : T("نامعلوم", "Unknown")}</p>
                   <p className="text-[11px] text-muted-foreground">{T("بازهٔ مقیاس فعلی", "Current scale range")}: {number(min)}–{number(max)}</p>
                   <details className="mt-2" data-testid={`screener-last-${type}`}>
                     <summary className="min-h-11 flex items-center cursor-pointer text-xs font-medium text-primary">{T("مشاهدهٔ آخرین نتیجهٔ ثبت‌شده", "View last recorded result")}</summary>
                     <div className="space-y-2 text-xs">
                       <p>{T("نسخه / زبان ثبت", "Recorded version / language")}: {last.scores?.instrument_version || T("نامعلوم", "Unknown")} / {last.scores?.language || T("نامعلوم", "Unknown")}</p>
                       {meta.isStandardized ? <>
                         <p>{isEn ? last.analysis?.severityLabel_en || last.analysis?.severityLabel : last.analysis?.severityLabel}</p>
                         <p>{isEn ? last.analysis?.recommendation_en || last.analysis?.recommendation : last.analysis?.recommendation}</p>
                       </> : <>
                         <p>{T("پاسخ‌های ذخیره‌شده؛ بدون آستانهٔ شدت بالینی", "Stored responses; no clinical severity threshold")}</p>
                         {meta.items.map((item) => {
                           const answer = last.scores?.answers?.[item.id];
                           const valid = Number.isInteger(answer) && answer >= meta.scaleStart && answer < meta.scaleStart + meta.scale;
                           return <p key={item.id}>{isEn ? item.text_en || item.text : item.text} — {valid ? (isEn ? meta.labels_en : meta.labels)[answer - meta.scaleStart] : T("پاسخ نامعلوم", "Answer unknown")}</p>;
                         })}
                       </>}
                       <p className="text-muted-foreground">{T("نتیجه مربوط به زمان ثبت است؛ تشخیص قطعی نیست.", "This reflects the recorded time, not a definitive diagnosis.")}</p>
                     </div>
                   </details>
                 </div>
               ) : <p className="mt-3 text-xs text-muted-foreground">{T("نتیجهٔ قبلی برای نمایش موجود نیست.", "No previous result available to display.")}</p>}
               {meta.sourceUrl && <a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 text-[11px] text-primary underline">{T("منبع نسخهٔ اصلی", "Original instrument source")}</a>}
                 <Link to={`/app/screener/${type}`} className="min-h-11 text-xs text-primary font-medium mt-3 pt-2 border-t border-border/40 flex items-center gap-1">
                   <span>{last ? T("شروع دوباره / ادامهٔ پیش‌نویس", "Retake / continue draft") : T("شروع پرسشنامه", "Start screener")}</span>
                   {isEn ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                 </Link>
             </article>
          );
        })}
      </div>
    </Card>
  );
}
