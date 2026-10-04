import { useEffect, useState } from "react";
import { Flame, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { computeStreak, type StreakStats } from "@/lib/streak";
import { toPersianDigits } from "@/lib/persianDigits";

/**
 * Compact, calm engagement card: current streak, tasks done this week, and a
 * small 7-day activity bar. Reloads when the `tasks-changed` event fires so it
 * stays in sync with completions elsewhere in the app.
 */
export function StreakCard({ compact = false }: { compact?: boolean } = {}) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [stats, setStats] = useState<StreakStats | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      computeStreak(user.id).then((s) => {
        if (!cancelled) setStats(s);
      });
    };
    load();
    window.addEventListener("tasks-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("tasks-changed", load);
    };
  }, [user?.id]);

  if (!stats) return null;

  const maxDay = Math.max(1, ...stats.last7);
  const weekdays = isEn
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  // last7 is oldest→newest ending today; align labels to the same order.
  const todayIdx = new Date().getDay(); // 0=Sun
  const labels = stats.last7.map((_, i) => {
    const dayNum = (todayIdx - (6 - i) + 7) % 7;
    return weekdays[dayNum];
  });

  if (compact) {
    if (stats.streak <= 0) return null;
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground" data-testid="streak-card-compact" title={T("روز پیاپی", "day streak")}>
        <Flame className={`h-4 w-4 shrink-0 ${stats.streak > 0 ? "text-primary" : ""}`} />
        <span className="tabular-nums text-foreground">{toPersianDigits(stats.streak)}</span>
        <span>{T("روز پیاپی", "day streak")}</span>
      </span>
    );
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`grid place-items-center h-11 w-11 rounded-full ${stats.streak > 0 ? "bg-orange-500/15 text-orange-500" : "bg-muted text-muted-foreground"}`}>
            <Flame className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <div className="text-2xl font-bold">
              {toPersianDigits(stats.streak)}
              <span className="text-sm font-normal text-muted-foreground me-1 ms-1">
                {T("روز پیاپی", "day streak")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {T(
                `${toPersianDigits(stats.weekCompleted)} کار این هفته`,
                `${stats.weekCompleted} done this week`,
              )}
            </div>
          </div>
        </div>

        <div className="ms-auto flex shrink-0 items-end gap-1 h-10">
          {stats.last7.map((c, i) => {
            const h = Math.round((c / maxDay) * 100);
            const isToday = i === stats.last7.length - 1;
            return (
              <div key={i} className="flex flex-col items-center gap-1 w-4">
                <div className="h-8 w-2 rounded-full bg-muted/60 flex items-end overflow-hidden">
                  <div
                    className={`w-full rounded-full transition-all ${c > 0 ? (isToday ? "bg-primary" : "bg-primary/50") : "bg-transparent"}`}
                    style={{ height: `${c > 0 ? Math.max(20, h) : 0}%` }}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground">{labels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
