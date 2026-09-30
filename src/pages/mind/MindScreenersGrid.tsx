import React from "react";
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
          "پرسشنامه‌های استاندارد روان‌سنجی (PHQ-9, GAD-7, WHO-5) و فرم‌های خودپایشی شخصی (مانند خستگی). برای شروع روی هر کارت بزنید.",
          "Standard psychological screeners (PHQ-9, GAD-7, WHO-5) and personal self-monitoring forms. Tap any card to begin."
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCREENER_LIST.map(({ type }) => {
          const meta = SCREENERS[type];
          const last = latestScreeners[type];
          const sev = last?.analysis?.severity;

          return (
            <Link
              key={type}
              to={`/app/screener/${type}`}
              className="group rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm hover:bg-accent/30 hover:border-primary/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <Badge
                    variant={meta.isStandardized ? "secondary" : "outline"}
                    className="text-[10px] py-0 px-1.5"
                  >
                    {meta.isStandardized
                      ? T("استاندارد", "Standard")
                      : T("فرم شخصی", "Personal")}
                  </Badge>
                  {sev && (
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

              {last && last.scores?.raw != null ? (
                <div className="mt-3 pt-2 border-t border-border/40">
                  <div className="text-2xl font-bold tabular-nums text-foreground">
                    {isEn ? last.scores.raw : toPersianDigits(last.scores.raw)}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {isEn ? last.analysis?.severityLabel_en || last.analysis?.severityLabel : last.analysis?.severityLabel}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-primary font-medium mt-3 pt-2 border-t border-border/40 flex items-center gap-1">
                  <span>{T("شروع آزمون", "Start screener")}</span>
                  {isEn ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
