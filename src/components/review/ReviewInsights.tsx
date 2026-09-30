import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronDown, Flame, Target, Hand } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { getLeitnerCards } from "@/lib/leitnerService";
import type { LeitnerCard, LeitnerRating } from "@/lib/leitnerTypes";
import { toPersianDigits } from "@/lib/jalali";
import {
  getDailyGoal, getDesiredRetention, getGestureSettings, REVIEW_SETTINGS_EVENT, setDailyGoal, setDesiredRetention,
  setGestureSettings, MAX_RETENTION, MIN_RETENTION, type GestureSettings, type SwipeDir,
} from "@/lib/reviewSettings";
import { forecastReviews, getReviewDays, reviewedTodayCount, reviewStreak } from "@/lib/reviewStats";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import { filterCardsForDocuments, filterKnowledgeForFolderBranch } from "@/lib/reviewScope";

const RATINGS: { v: LeitnerRating; fa: string; en: string }[] = [
  { v: 1, fa: "دوباره", en: "Again" }, { v: 2, fa: "سخت", en: "Hard" }, { v: 3, fa: "خوب", en: "Good" }, { v: 4, fa: "آسان", en: "Easy" },
];
const DIRS: { d: SwipeDir; fa: string; en: string }[] = [
  { d: "right", fa: "کشیدن به راست", en: "Swipe right" }, { d: "left", fa: "کشیدن به چپ", en: "Swipe left" },
  { d: "up", fa: "کشیدن به بالا", en: "Swipe up" }, { d: "down", fa: "کشیدن به پایین", en: "Swipe down" },
];

export function ReviewInsights({ userId, isEn, scopeRootFolderId }: { userId: string; isEn: boolean; scopeRootFolderId?: string }) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [retention, setRetention] = useState(getDesiredRetention);
  const [goal, setGoal] = useState(getDailyGoal);
  const [gestures, setGestures] = useState<GestureSettings>(getGestureSettings);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadIdRef = useRef(0);
  const n = (v: number | string) => (isEn ? String(v) : toPersianDigits(v));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const requestId = ++loadIdRef.current;
      setCards([]);
      setLoading(true);
      setLoadFailed(false);
      try {
        const [allCards, folders, documents] = await Promise.all([
          getLeitnerCards(userId),
          getKnowledgeFolders(userId),
          getKnowledgeDocuments(userId),
        ]);
        if (!alive || requestId !== loadIdRef.current) return;
        const scopedKnowledge = filterKnowledgeForFolderBranch(folders, documents, scopeRootFolderId);
        setCards(scopeRootFolderId ? filterCardsForDocuments(allCards, scopedKnowledge.documents) : allCards);
        setLoadFailed(false);
      } catch {
        if (!alive || requestId !== loadIdRef.current) return;
        setCards([]);
        setLoadFailed(true);
      } finally {
        if (alive && requestId === loadIdRef.current) setLoading(false);
      }
    };
    void load();
    const on = () => { setRetention(getDesiredRetention()); setGoal(getDailyGoal()); setGestures(getGestureSettings()); void load(); };
    window.addEventListener(REVIEW_SETTINGS_EVENT, on);
    window.addEventListener("focus", load);
    return () => { alive = false; window.removeEventListener(REVIEW_SETTINGS_EVENT, on); window.removeEventListener("focus", load); };
  }, [scopeRootFolderId, userId]);

  const forecast = useMemo(() => forecastReviews(cards, 14), [cards]);
  const today = reviewedTodayCount(cards);
  const streak = reviewStreak([...getReviewDays(userId), ...cards.map((c) => c.last_reviewed_at || "")]);
  const max = Math.max(1, ...forecast.map((f) => f.count));
  const goalPct = Math.min(100, Math.round((today / goal) * 100));

  const updateGestures = (g: GestureSettings) => { setGestures(g); setGestureSettings(g); };

  return (
    <section className="rounded-2xl border border-border bg-card/60" data-testid="review-insights">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 text-start" data-testid="review-insights-toggle" aria-expanded={open}>
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap text-xs">
          {!scopeRootFolderId && <span className="inline-flex items-center gap-1 font-semibold" data-testid="review-streak"><Flame className="w-4 h-4 text-orange-500" />{n(streak)} {isEn ? "day streak · all folders" : "روز پیاپی · همهٔ پوشه‌ها"}</span>}
          {loading ? (
            <span className="text-muted-foreground" data-testid="review-insights-loading">{isEn ? "Loading this scope…" : "در حال بارگذاری این محدوده…"}</span>
          ) : loadFailed ? (
            <span className="text-destructive" data-testid="review-insights-error">{isEn ? "Scope statistics unavailable" : "آمار این محدوده در دسترس نیست"}</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1" data-testid="review-goal-progress"><Target className="w-4 h-4 text-primary" />{n(today)}/{n(goal)} {isEn ? "today" : "امروز"}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground" data-testid="review-due-today"><BarChart3 className="w-4 h-4" />{n(forecast[0]?.count || 0)} {isEn ? "due" : "آمادهٔ مرور"}</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="px-3 pb-1">{!loading && !loadFailed && <Progress value={goalPct} className="h-1.5" />}</div>

      {open && (
        <div className="p-3 pt-2 space-y-5">
          {!loading && !loadFailed && <div>
            <div className="text-xs font-semibold mb-2">{isEn ? "Review forecast (14 days)" : "پیش‌بینی حجم مرور (۱۴ روز)"}</div>
            <div className="flex items-end gap-1 h-24" data-testid="review-forecast-chart">
              {forecast.map((f, i) => (
                <div key={f.date} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0" title={`${f.date}: ${f.count}`}>
                  <span className="text-[9px] text-muted-foreground tabular-nums">{f.count ? n(f.count) : ""}</span>
                  <div className={`w-full rounded-t ${i === 0 ? "bg-primary" : "bg-primary/40"}`} style={{ height: `${Math.max(3, (f.count / max) * 64)}px` }} />
                  <span className="text-[9px] text-muted-foreground">{i === 0 ? (isEn ? "T" : "ا") : n(i)}</span>
                </div>
              ))}
            </div>
          </div>}

          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span>{isEn ? "Desired retention" : "درصد یادآوری هدف"}</span>
              <span className="tabular-nums text-primary" data-testid="desired-retention-value">{n(Math.round(retention * 100))}%</span>
            </div>
            <Slider
              min={MIN_RETENTION * 100} max={MAX_RETENTION * 100} step={1}
              value={[Math.round(retention * 100)]}
              onValueChange={([v]) => setRetention(v / 100)}
              onValueCommit={([v]) => setDesiredRetention(v / 100)}
              data-testid="desired-retention-slider"
              aria-label={isEn ? "Desired retention" : "درصد یادآوری هدف"}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {isEn ? "Higher = remember more, but more reviews per day. 90% is a good default." : "عدد بالاتر یعنی یادآوری بیشتر ولی مرور روزانهٔ بیشتر. ۹۰٪ پیش‌فرض مناسبی است."}
            </p>
          </div>

          <label className="flex items-center justify-between gap-3 text-xs font-semibold">
            <span>{isEn ? "Daily goal (cards)" : "هدف روزانه (کارت)"}</span>
            <input type="number" min={1} max={500} value={goal} onChange={(e) => setGoal(Number(e.target.value))} onBlur={() => setDailyGoal(goal)}
              className="w-20 h-9 rounded-lg border border-border bg-background px-2 text-center" data-testid="daily-goal-input" />
          </label>

          <div className="space-y-2" data-testid="gesture-settings">
            <label className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1"><Hand className="w-4 h-4" />{isEn ? "Card gestures" : "ژست‌های کارت"}</span>
              <Switch checked={gestures.enabled} onCheckedChange={(v) => updateGestures({ ...gestures, enabled: v })} data-testid="gestures-enabled-toggle" />
            </label>
            {gestures.enabled && (
              <div className="space-y-1.5">
                {DIRS.map(({ d, fa, en }) => (
                  <label key={d} className="flex items-center justify-between gap-2 text-xs">
                    <span>{isEn ? en : fa}</span>
                    <select
                      value={gestures.swipe[d] ?? ""}
                      onChange={(e) => updateGestures({ ...gestures, swipe: { ...gestures.swipe, [d]: e.target.value ? (Number(e.target.value) as LeitnerRating) : null } })}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                      data-testid={`gesture-${d}-select`}
                    >
                      <option value="">{isEn ? "Off" : "خاموش"}</option>
                      {RATINGS.map((r) => <option key={r.v} value={r.v}>{isEn ? r.en : r.fa}</option>)}
                    </select>
                  </label>
                ))}
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span>{isEn ? "Double-tap to flip" : "دبل‌تپ = برگرداندن کارت"}</span>
                  <Switch checked={gestures.doubleTapFlip} onCheckedChange={(v) => updateGestures({ ...gestures, doubleTapFlip: v })} data-testid="gesture-doubletap-toggle" />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span>{isEn ? "Long-press to edit" : "نگه‌داشتن = ویرایش"}</span>
                  <Switch checked={gestures.longPressEdit} onCheckedChange={(v) => updateGestures({ ...gestures, longPressEdit: v })} data-testid="gesture-longpress-toggle" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
