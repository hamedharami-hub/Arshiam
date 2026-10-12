import React from "react";
import {
  Flame,
  BookOpen,
  Zap,
  Brain,
  TrendingUp,
  Calendar,
  Heart,
} from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { getDistortionLabel, type Distortion } from "@/lib/distortions";
import { toPersianDigits } from "@/lib/jalali";

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2 text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${tone}`} />
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function HeatmapCell({ score, status = "rated" }: { score: number | null; status?: MindHeatmapDay["status"] }) {
  const op = score === null ? 0.08 : 0.25 + (score / 10) * 0.7;
  return (
    <div
      className="aspect-square rounded-md transition-all duration-200 hover:scale-135 hover:z-10 shadow-2xs hover:shadow-sm ring-1 ring-border/20 cursor-pointer"
      style={{ background: status === "unrated" ? "hsl(var(--muted))" : `hsl(var(--primary) / ${op})`, border: status === "unrated" ? "1px dashed hsl(var(--muted-foreground))" : undefined }}
    />
  );
}

function MindTrendTooltip({ active, payload, isEn }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2 min-w-[170px]"
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="font-semibold text-foreground border-b border-border/60 pb-1.5 text-[13px]">
        {data.fullDate || data.date}
      </div>
      {data.mood != null && (
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-2xs" /> {isEn ? "Mood" : "خلق"}
          </span>
          <span className="font-bold text-foreground font-mono">
            {isEn ? `${data.mood} / 10` : `${toPersianDigits(data.mood)} / ۱۰`}
          </span>
        </div>
      )}
      {data.energy != null && (
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ background: "hsl(200 80% 55%)" }} /> {isEn ? "Energy" : "انرژی"}
          </span>
          <span className="font-bold text-foreground font-mono">
            {isEn ? `${data.energy} / 10` : `${toPersianDigits(data.energy)} / ۱۰`}
          </span>
        </div>
      )}
      {data.focus != null && (
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ background: "hsl(30 90% 55%)" }} /> {isEn ? "Focus" : "تمرکز"}
          </span>
          <span className="font-bold text-foreground font-mono">
            {isEn ? `${data.focus} / 10` : `${toPersianDigits(data.focus)} / ۱۰`}
          </span>
        </div>
      )}
      {data.stress != null && (
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ background: "hsl(0 75% 60%)" }} /> {isEn ? "Stress" : "استرس"}
          </span>
          <span className="font-bold text-foreground font-mono">
            {isEn ? `${data.stress} / 10` : `${toPersianDigits(data.stress)} / ۱۰`}
          </span>
        </div>
      )}
    </div>
  );
}

export interface MindTrendDataPoint {
  rawDate: string;
  date: string;
  fullDate: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  stress: number | null;
}

type HeatmapScore = { status: "rated"; score: number } | { status: "missing" | "unrated"; score: null };
export type MindHeatmapDay = {
  date: string;
  jalaliDate: string;
} & HeatmapScore;

export type MindMetric = "mood" | "energy" | "focus" | "stress";

/** Fill unlogged dates with nulls so a chart cannot silently bridge missing days. */
export function dateScaledTrend(trend: MindTrendDataPoint[]) {
  if (!trend.length) return [];
  const sorted = [...trend].sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  const byDate = new Map(sorted.map((point) => [point.rawDate, point]));
  const start = Date.parse(sorted[0].rawDate);
  const end = Date.parse(sorted[sorted.length - 1].rawDate);
  const result: (MindTrendDataPoint & { timestamp: number })[] = [];
  for (let timestamp = start; timestamp <= end; timestamp += 86400000) {
    const rawDate = new Date(timestamp).toISOString().slice(0, 10);
    result.push({ ...(byDate.get(rawDate) || { rawDate, date: rawDate, fullDate: rawDate, mood: null, energy: null, focus: null, stress: null }), timestamp });
  }
  return result;
}

export function metricSegments(trend: MindTrendDataPoint[], metric: MindMetric) {
  const segments: { timestamp: number; value: number }[][] = [];
  let current: { timestamp: number; value: number }[] = [];
  for (const point of dateScaledTrend(trend)) {
    const value = point[metric];
    if (value === null) { if (current.length) segments.push(current); current = []; }
    else current.push({ timestamp: point.timestamp, value });
  }
  if (current.length) segments.push(current);
  return segments;
}

export function heatmapScore(checkin?: { mood: number | null; energy: number | null; focus: number | null }): HeatmapScore {
  if (!checkin) return { status: "missing", score: null };
  const rated = [checkin.mood, checkin.energy, checkin.focus].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return rated.length ? { status: "rated", score: rated.reduce((sum, value) => sum + value, 0) / rated.length } : { status: "unrated", score: null };
}

export function MindMetricTable({ trend, metrics, isEn, T }: { trend: MindTrendDataPoint[]; metrics: MindMetric[]; isEn: boolean; T: (fa: string, en: string) => string }) {
  const labels = { mood: T("خلق", "Mood"), energy: T("انرژی", "Energy"), focus: T("تمرکز", "Focus"), stress: T("استرس", "Stress") };
  return <div className="space-y-2 text-xs" data-testid="mind-metric-data">
    <p>{T("امتیازهای ثبت‌شده از ۱ تا ۱۰؛ فاصلهٔ تاریخ‌ها واقعی است. خط در روزهای بدون امتیاز قطع می‌شود و امتیازی حدس زده نمی‌شود.", "Logged ratings range from 1 to 10; dates are spaced by elapsed time. Lines break on days without ratings; no scores are inferred.")}</p>
    <p>{metrics.map((metric) => `${labels[metric]}: ${isEn ? trend.filter((point) => point[metric] !== null).length : toPersianDigits(trend.filter((point) => point[metric] !== null).length)} ${T("امتیاز ثبت‌شده", "logged ratings")}`).join(" · ")}</p>
    <details><summary className="cursor-pointer font-medium">{T("جدول امتیازها و تاریخ‌ها", "Ratings and dates table")}</summary>
      <div className="overflow-x-auto"><table className="w-full text-start">
        <caption className="sr-only">{T("امتیازهای ثبت‌شده؛ بدون امتیاز با مقدار صفر متفاوت است", "Logged ratings; no rating is different from zero")}</caption>
        <thead><tr><th scope="col">{T("تاریخ", "Date")}</th>{metrics.map((metric) => <th key={metric} scope="col">{labels[metric]} / {isEn ? "10" : "۱۰"}</th>)}</tr></thead>
        <tbody>{dateScaledTrend(trend).map((point) => <tr key={point.rawDate}><th scope="row">{point.fullDate}</th>{metrics.map((metric) => <td key={metric}>{point[metric] === null ? T("بدون امتیاز", "No rating") : isEn ? point[metric] : toPersianDigits(point[metric])}</td>)}</tr>)}</tbody>
      </table></div>
    </details>
  </div>;
}

export interface MindTrendChartsProps {
  showStreak: boolean;
  streak: number;
  thoughtCount: number;
  abcCount: number;
  trend: MindTrendDataPoint[];
  heatmap: MindHeatmapDay[];
  topDistortions: Array<{ key: string; n: number }>;
  isEn: boolean;
  T: (fa: string, en: string) => string;
}

export function MindTrendCharts({
  showStreak,
  streak,
  thoughtCount,
  abcCount,
  trend,
  heatmap,
  topDistortions,
  isEn,
  T,
}: MindTrendChartsProps) {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {showStreak && (
          <StatCard
            label={T("روزهای متوالی Check-in", "Check-in Streak")}
            value={isEn ? `${streak} days` : `${toPersianDigits(streak)} روز`}
            icon={Flame}
            tone="text-orange-500"
          />
        )}
        <StatCard
          label={T("ثبت افکار · ۳۰ روز", "Thoughts · 30 Days")}
          value={isEn ? thoughtCount : toPersianDigits(thoughtCount)}
          icon={BookOpen}
          tone="text-violet-500"
        />
        <StatCard
          label={T("ABC · ۳۰ روز", "ABC · 30 Days")}
          value={isEn ? abcCount : toPersianDigits(abcCount)}
          icon={Zap}
          tone="text-amber-500"
        />
      </div>

      {/* Trend Chart */}
      {trend.length > 1 ? (
        <Card className="p-5 border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <TrendingUp className="w-4 h-4 text-primary" />
                {T("روند ۳۰ روز اخیر", "Recent 30-Day Trend")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {T("خلق، انرژی، تمرکز و استرس", "Mood, energy, focus & stress")}
              </p>
            </div>
          </div>
          <div className="w-full overflow-hidden" aria-hidden="true">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dateScaledTrend(trend)}>
                <defs>
                  <linearGradient id="moodG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(value) => trend.find((point) => Date.parse(point.rawDate) === value)?.date || new Date(value).toISOString().slice(0, 10)} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 10]} fontSize={10} tickLine={false} axisLine={false} width={24} />
                <Tooltip content={<MindTrendTooltip isEn={isEn} />} />
                <Area type="linear" connectNulls={false} dataKey="mood" stroke="hsl(var(--primary))" fill="url(#moodG)" strokeWidth={2.5} />
                <Line type="linear" connectNulls={false} dataKey="energy" stroke="hsl(200 80% 55%)" strokeWidth={1.75} dot={false} />
                <Line type="linear" connectNulls={false} dataKey="focus" stroke="hsl(30 90% 55%)" strokeWidth={1.75} dot={false} />
                <Line type="linear" connectNulls={false} dataKey="stress" stroke="hsl(0 75% 60%)" strokeWidth={1.75} dot={false} strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> {T("خلق", "Mood")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: "hsl(200 80% 55%)" }} /> {T("انرژی", "Energy")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: "hsl(30 90% 55%)" }} /> {T("تمرکز", "Focus")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: "hsl(0 75% 60%)" }} /> {T("استرس", "Stress")}
            </span>
          </div>
          <MindMetricTable trend={trend} metrics={["mood", "energy", "focus", "stress"]} isEn={isEn} T={T} />
        </Card>
      ) : (
        <Card className="p-6 text-center text-muted-foreground text-sm border-dashed">
          <p>
            {T(
              "با ثبت حداقل ۲ روز Check-in، نمودار روند ۳۰ روز شما اینجا رسم می‌شود.",
              "Log at least 2 daily check-ins to unlock your 30-day trend chart."
            )}
          </p>
        </Card>
      )}

      {/* Heatmap */}
      <Card className="p-5 border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              {T("تقویم حرارتی ۹۰ روزه", "90-Day Heatmap")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {T("میانگین خلق/انرژی/تمرکز در هر روز", "Daily average mood/energy/focus")}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{T("کم", "Low")}</span>
            {[1, 3, 5, 7, 10].map((v) => (
              <HeatmapCell key={v} score={v} />
            ))}
            <span>{T("زیاد", "High")}</span>
          </div>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">{T("رنگ فقط میانگین امتیازهای واقعی (۱ تا ۱۰) است؛ خانهٔ کم‌رنگ: بدون ثبت؛ حاشیهٔ خط‌چین: ثبت بدون امتیاز. هیچ‌کدام صفر نیست.", "Color represents only actual average ratings (1–10). Faint cell: no entry; dashed border: entry without ratings. Neither means zero.")}</p>
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(15,_minmax(18px,_1fr))] sm:grid-cols-[repeat(15,_minmax(0,_1fr))] gap-1.5 p-1 min-w-[280px]">
            {heatmap.map((d) => (
              <div
                key={d.date}
                role="img"
                aria-label={`${d.jalaliDate} · ${d.status === "missing" ? T("بدون ثبت", "No entry") : d.status === "unrated" ? T("ثبت بدون امتیاز", "Entry without ratings") : (isEn ? d.score.toFixed(1) + "/10" : toPersianDigits(d.score.toFixed(1)) + "/۱۰")}`}
                title={`${d.jalaliDate} · ${d.status === "missing" ? T("بدون ثبت", "No entry") : d.status === "unrated" ? T("ثبت بدون امتیاز", "Entry without ratings") : (isEn ? d.score.toFixed(1) + "/10" : toPersianDigits(d.score.toFixed(1)) + "/۱۰")}`}
              >
                <HeatmapCell score={d.score} status={d.status} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Top Distortions */}
      {topDistortions.length > 0 && (
        <Card className="p-5 border-border/60 bg-card/60 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-foreground">
            <Heart className="w-4 h-4 text-rose-500" />
            {T("الگوهای شناختی پرتکرار (۳۰ روز)", "Frequent Cognitive Patterns (30 Days)")}
          </h3>
          <div className="space-y-2">
            {topDistortions.map((d) => (
              <div key={d.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                <span className="text-sm text-foreground/90">{getDistortionLabel(d.key as any, isEn)}</span>
                <span className="text-xs font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full">
                  ×{d.n}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
