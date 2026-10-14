import { useState } from "react";
import { Card } from "@/components/ui/card";
import { getDistortionLabel } from "@/lib/distortions";
import { getCalendarSystem, toPersianDigits } from "@/lib/jalali";
import { calendarCoordinate, calendarWeeks, datesInRange, mindDateLabel, parseLocalDate, validRating, type MindMetric } from "@/lib/mind/dateRanges";
export type { MindMetric } from "@/lib/mind/dateRanges";

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
export type MindHeatmapDay = { date: string; jalaliDate: string } & HeatmapScore;

export function dateScaledTrend(trend: MindTrendDataPoint[]) {
  const sorted = trend.filter((point) => parseLocalDate(point.rawDate)).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  if (!sorted.length) return [];
  const byDate = new Map(sorted.map((point) => [point.rawDate, point]));
  return datesInRange(sorted[0].rawDate, sorted[sorted.length - 1].rawDate).map((rawDate) => ({
    ...(byDate.get(rawDate) || { rawDate, date: rawDate, fullDate: rawDate, mood: null, energy: null, focus: null, stress: null }),
    timestamp: calendarCoordinate(rawDate),
  }));
}

export function metricSegments(trend: MindTrendDataPoint[], metric: MindMetric) {
  const segments: { timestamp: number; value: number }[][] = [];
  let current: { timestamp: number; value: number }[] = [];
  for (const point of dateScaledTrend(trend)) {
    const value = point[metric];
    if (!validRating(value)) { if (current.length) segments.push(current); current = []; }
    else current.push({ timestamp: point.timestamp, value });
  }
  if (current.length) segments.push(current);
  return segments;
}

export function heatmapScore(checkin?: Partial<Record<MindMetric, number | null>>, metric: MindMetric = "mood"): HeatmapScore {
  if (!checkin) return { status: "missing", score: null };
  const score = checkin[metric];
  return validRating(score) ? { status: "rated", score } : { status: "unrated", score: null };
}

export function MindMetricTable({ trend, metrics, isEn, T }: { trend: MindTrendDataPoint[]; metrics: MindMetric[]; isEn: boolean; T: (fa: string, en: string) => string }) {
  const labels = { mood: T("خلق", "Mood"), energy: T("انرژی", "Energy"), focus: T("تمرکز", "Focus"), stress: T("استرس", "Stress") };
  return <div className="space-y-2 text-xs" data-testid="mind-metric-data">
    <p>{T("امتیازهای ثبت‌شده از ۱ تا ۱۰؛ روزهای تقویمی هم‌فاصله‌اند. خط در روزهای بدون امتیاز قطع می‌شود و امتیازی حدس زده نمی‌شود.", "Logged ratings range from 1 to 10; calendar days are equally spaced. Lines break on days without ratings; no scores are inferred.")}</p>
    <p>{metrics.map((metric) => `${labels[metric]}: ${isEn ? trend.filter((point) => validRating(point[metric])).length : toPersianDigits(trend.filter((point) => validRating(point[metric])).length)} ${T("امتیاز ثبت‌شده", "logged ratings")}`).join(" · ")}</p>
    <details><summary className="cursor-pointer font-medium">{T("جدول امتیازها و تاریخ‌ها", "Ratings and dates table")}</summary>
      <div className="overflow-x-auto"><table className="w-full text-start">
        <caption className="sr-only">{T("امتیازهای ثبت‌شده؛ بدون امتیاز با مقدار صفر متفاوت است", "Logged ratings; no rating is different from zero")}</caption>
        <thead><tr><th scope="col">{T("تاریخ", "Date")}</th>{metrics.map((metric) => <th key={metric} scope="col">{labels[metric]} / {isEn ? "10" : "۱۰"}</th>)}</tr></thead>
        <tbody>{dateScaledTrend(trend).map((point) => <tr key={point.rawDate}><th scope="row">{point.fullDate === point.rawDate ? mindDateLabel(parseLocalDate(point.rawDate)!, isEn, true) : point.fullDate}</th>{metrics.map((metric) => <td key={metric}>{!validRating(point[metric]) ? T("بدون امتیاز", "No rating") : isEn ? point[metric] : toPersianDigits(point[metric])}</td>)}</tr>)}</tbody>
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
  metric?: MindMetric;
  T: (fa: string, en: string) => string;
}

export function MindTrendCharts({ showStreak, streak, thoughtCount, abcCount, heatmap, topDistortions, isEn, metric = "mood", T }: MindTrendChartsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const weekStart = getCalendarSystem() === "jalali" ? 6 : 0;
  const weeks = calendarWeeks(heatmap, weekStart);
  const metricLabel = { mood: T("خلق", "Mood"), energy: T("انرژی", "Energy"), focus: T("تمرکز", "Focus"), stress: T("استرس", "Stress") }[metric];
  const describe = (day: MindHeatmapDay) => `${day.jalaliDate} · ${day.status === "missing" ? T("بدون ثبت", "No entry") : day.status === "unrated" ? T("ثبت بدون امتیاز", "Entry without ratings") : `${isEn ? day.score.toFixed(1) : toPersianDigits(day.score.toFixed(1))}/${isEn ? "10" : "۱۰"}`}`;
  const selectedDay = heatmap.find((day) => day.date === selected);
  const num = (value: number) => isEn ? String(value) : toPersianDigits(value);
  return <>
    <div className="grid grid-cols-2 gap-3 text-sm">
      {showStreak && <Card className="p-4">{T("روزهای متوالی ثبت حال", "Consecutive check-in days")}: <b>{num(streak)}</b></Card>}
      <Card className="p-4">{T("ثبت افکار · ۳۰ روز", "Thoughts · 30 days")}: <b>{num(thoughtCount)}</b></Card>
      <Card className="p-4">{T("ABC · ۳۰ روز", "ABC · 30 days")}: <b>{num(abcCount)}</b></Card>
    </div>
    <Card className="space-y-3 p-4">
      <h3 className="font-semibold">{T("تقویم امتیازها", "Ratings calendar")} · {metricLabel}</h3>
      <p className="text-xs text-muted-foreground">{T("رنگ فقط امتیاز شاخص انتخابی از ۱ تا ۱۰ است؛ بدون ثبت و ثبت بدون امتیاز متفاوت‌اند و هیچ‌کدام صفر نیست. رنگ بیشتر استرس به معنای بهتر بودن نیست.", "Color shows only the selected rating from 1–10. No entry and an entry without a rating are distinct; neither means zero. Higher stress is not better.")}</p>
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <div className="grid grid-rows-7 gap-1 text-xs">
            {Array.from({ length: 7 }, (_, index) => <span key={index} className="flex h-11 items-center pe-2">{new Intl.DateTimeFormat(isEn ? "en-US" : "fa-IR", { weekday: "short" }).format(new Date(2026, 9, 11 + (weekStart + index) % 7, 12))}</span>)}
          </div>
          {weeks.map((week, index) => <div key={index} className="grid grid-rows-7 gap-1" data-testid="mind-calendar-week">
            {week.map((day, weekday) => day ? <button key={day.date} type="button" aria-label={describe(day)} title={describe(day)} onClick={() => setSelected(day.date)}
              className="h-11 w-11 rounded-md border text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              style={{ background: day.status === "rated" ? `hsl(var(--primary) / ${0.15 + day.score / 10 * 0.7})` : "hsl(var(--muted))", borderStyle: day.status === "unrated" ? "dashed" : "solid" }}>
              {day.status === "rated" ? num(day.score) : day.status === "unrated" ? "?" : "—"}
            </button> : <span key={`pad-${weekday}`} aria-hidden="true" className="h-11 w-11" />)}
          </div>)}
        </div>
      </div>
      <p aria-live="polite" className="text-xs min-h-5">{selectedDay ? `${metricLabel} · ${describe(selectedDay)}` : T("یک روز را برای جزئیات انتخاب کنید.", "Select a day for details.")}</p>
      <details><summary className="cursor-pointer text-xs">{T("جدول تقویم", "Calendar table")}</summary><table className="w-full text-start text-xs"><thead><tr><th scope="col">{T("تاریخ", "Date")}</th><th scope="col">{metricLabel}</th></tr></thead><tbody>{heatmap.map((day) => <tr key={day.date}><th scope="row">{day.jalaliDate}</th><td>{describe(day).split(" · ")[1]}</td></tr>)}</tbody></table></details>
    </Card>
    {topDistortions.length > 0 && <Card className="space-y-2 p-4"><h3 className="font-semibold">{T("الگوهای شناختی ثبت‌شده (۳۰ روز)", "Logged cognitive patterns (30 days)")}</h3>{topDistortions.map((item) => <p key={item.key} className="text-sm">{getDistortionLabel(item.key as Parameters<typeof getDistortionLabel>[0], isEn)}: {num(item.n)}</p>)}</Card>}
  </>;
}
