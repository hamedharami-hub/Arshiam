import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CornerDownLeft, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { firebaseStore } from "@/lib/firebaseStore";
import type { Task } from "@/lib/taskTypes";
import { nextPeriod, periodLabel, todayISO, type Period, type TimeSettings } from "@/lib/timeHorizon";
import { isClosed } from "@/lib/planCascade";
import { continueReviewPatch, mergeReviewHistory, reviewHistoryLabel, reviewSnapshotDocument, reviewSnapshotId } from "@/lib/dayFlow";
import { LEVEL_NAME, frac } from "./planningTheme";
import { ProgressLine } from "./PlanItemCard";

const key = (uid: string, p: Period) => `arsh_plan_review_v1:${uid}:${p.horizon}:${p.start}`;

type SavedReview = { at?: string; note?: string; items?: unknown };

export function reviewOf(uid: string | undefined, p: Period): SavedReview | null {
  if (!uid) return null;
  try { return JSON.parse(localStorage.getItem(key(uid, p)) || "null"); } catch { return null; }
}

/** Which period deserves a review now: the last day of this one, or the first 3 days after an unreviewed one. */
export function reviewDue(uid: string | undefined, current: Period, previous: Period, hasPrevItems: boolean): Period | null {
  if (!uid || (current.horizon !== "week" && current.horizon !== "month")) return null;
  const today = todayISO();
  if (today === current.end && !reviewOf(uid, current)) return current;
  const dayIndex = Math.round((new Date(today).getTime() - new Date(current.start).getTime()) / 86_400_000);
  if (hasPrevItems && dayIndex < 3 && !reviewOf(uid, previous)) return previous;
  return null;
}

type Props = {
  period: Period | null; items: Task[]; settings: TimeSettings; fa: boolean; onClose: () => void;
  onMove: (t: Task, p: Period) => void; onDrop: (t: Task) => void; onComplete: (t: Task) => void; onAdd: (title: string, p: Period) => void;
  onWait?: (t: Task) => void; onAddChild?: (parent: Task, title: string) => void;
};

export function PeriodReviewDialog({ period, items, settings, fa, onClose, onMove, onDrop, onComplete, onAdd, onWait, onAddChild }: Props) {
  const { user } = useAuth();
  const initialReview = period && user?.id ? reviewOf(user.id, period) : null;
  const dirtyRef = useRef(false);
  const noteInitRef = useRef(!!(initialReview && typeof initialReview.note === "string"));
  const [note, setNote] = useState(initialReview && typeof initialReview.note === "string" ? initialReview.note : "");
  const [draft, setDraft] = useState("");
  const [smaller, setSmaller] = useState<Record<string, string>>({});
  const [continued, setContinued] = useState<Record<string, true>>({});
  const [history, setHistory] = useState<SavedReview | null>(initialReview);

  useEffect(() => {
    if (!period || !user?.id) return;
    let cancelled = false;
    const local = reviewOf(user.id, period);
    if (local) setHistory(local);
    if (!dirtyRef.current && !noteInitRef.current && local && typeof local.note === "string") {
      noteInitRef.current = true;
      setNote(local.note);
    }
    void firebaseStore.from("planning_reviews").select("*").eq("horizon", period.horizon).eq("period_start", period.start).limit(1).then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data) || !data[0]) return;
      const remote = data[0] as SavedReview;
      setHistory((current) => mergeReviewHistory(current, remote));
      if (!dirtyRef.current && !noteInitRef.current && typeof remote.note === "string") {
        noteInitRef.current = true;
        setNote(remote.note);
      }
    });
    return () => { cancelled = true; };
  }, [period, user?.id]);

  if (!period) return null;
  const lang = fa ? "fa" : "en";
  const next = nextPeriod(period, settings);
  const done = items.filter(isClosed);
  const open = items.filter((t) => !isClosed(t));
  const historyLabel = reviewHistoryLabel(history, fa);
  const finish = async () => {
    const at = new Date().toISOString();
    const snapshot = reviewSnapshotDocument({
      id: reviewSnapshotId(period),
      user_id: user?.id || "",
      horizon: period.horizon,
      period_start: period.start,
      period_end: period.end,
      at,
      note,
      tasks: items,
    });
    if (user) {
      localStorage.setItem(key(user.id, period), JSON.stringify({ at, note, items: snapshot.items }));
      await firebaseStore.from("planning_reviews").upsert(snapshot);
    }
    window.dispatchEvent(new Event("arsh:plan-reviewed"));
    onClose();
  };
  const confirmSmaller = (task: Task) => {
    const title = (smaller[task.id] || "").trim();
    if (!title || !onAddChild) return;
    onAddChild(task, title);
    setSmaller((prev) => ({ ...prev, [task.id]: "" }));
  };
  const btn = "h-8 rounded-full px-2.5 text-[11px] transition-colors duration-150";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-3xl" dir={fa ? "rtl" : "ltr"} data-testid="planning-review-dialog">
        <DialogHeader className="space-y-1 text-start">
          <DialogTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-4 w-4 text-amber-500" />{fa ? `مرور ${periodLabel(period, settings, lang)}` : `Review · ${periodLabel(period, settings, lang)}`}</DialogTitle>
          <DialogDescription>{fa ? "چه شد، چه ماند، و دورهٔ بعد چه باشد — کمتر از دو دقیقه." : "What happened, what's left, and what comes next — under two minutes."}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
          <ProgressLine ratio={items.length ? done.length / items.length : 0} level={period.horizon} />
          <span className="shrink-0 text-sm font-semibold tabular-nums" data-testid="planning-review-score">{frac(done.length, items.length, fa)}</span>
        </div>

        {historyLabel && <p className="text-xs text-muted-foreground" data-testid="planning-review-history-missing">{historyLabel}</p>}

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۱. انجام شد" : "1. Done"}</h4>
          {historyLabel ? null : done.length === 0 ? <p className="text-xs text-muted-foreground">{fa ? "اشکالی ندارد؛ دورهٔ بعد از نو." : "That's okay — fresh start next time."}</p> : (
            <ul className="space-y-1">{done.map((t) => <li key={t.id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /><span className="truncate">{t.title}</span></li>)}</ul>
          )}
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۲. ماند — برای هرکدام تصمیم بگیر" : "2. Left — decide on each"}</h4>
          {open.length === 0 ? <p className="text-xs text-muted-foreground">{fa ? "چیزی نماند. عالی!" : "Nothing left. Great!"}</p> : (
            <ul className="space-y-1.5">
              {open.map((t) => (
                <li key={t.id} className="rounded-xl border border-border/70 p-2" data-testid={`planning-review-open-${t.id}`}>
                  <p className="truncate text-sm">{t.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <button type="button" className={`${btn} hover:bg-muted ${continued[t.id] ? "font-medium" : ""}`} onClick={() => { continueReviewPatch(); setContinued((prev) => ({ ...prev, [t.id]: true })); }} data-testid={`planning-review-continue-${t.id}`}>{fa ? "ادامه" : "Continue"}</button>
                    <button type="button" className={`${btn} bg-primary/10 font-medium text-primary hover:bg-primary/15`} onClick={() => onMove(t, next)} data-testid={`planning-review-move-${t.id}`}>{fa ? `به ${LEVEL_NAME[period.horizon].fa} بعد` : `To next ${LEVEL_NAME[period.horizon].en.toLowerCase()}`}</button>
                    <button type="button" className={`${btn} hover:bg-muted`} onClick={() => onWait?.(t)} data-testid={`planning-review-wait-${t.id}`}>{fa ? "منتظر" : "Wait"}</button>
                    <button type="button" className={`${btn} hover:bg-muted`} onClick={() => onComplete(t)} data-testid={`planning-review-done-${t.id}`}>{fa ? "انجام شده بود" : "It's done"}</button>
                    <button type="button" className={`${btn} text-muted-foreground hover:bg-muted`} onClick={() => onDrop(t)} data-testid={`planning-review-drop-${t.id}`}>{fa ? "رها کن" : "Let go"}</button>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <input
                      value={smaller[t.id] || ""}
                      onChange={(event) => setSmaller((prev) => ({ ...prev, [t.id]: event.target.value }))}
                      placeholder={fa ? "گام کوچک‌تر" : "Smaller step"}
                      className="h-8 min-w-0 flex-1 rounded-full border bg-background px-2.5 text-[11px] outline-none"
                      data-testid={`planning-review-smaller-${t.id}`}
                    />
                    <button type="button" className={`${btn} hover:bg-muted`} onClick={() => confirmSmaller(t)} data-testid={`planning-review-smaller-confirm-${t.id}`}>{fa ? "تأیید" : "Confirm"}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? `۳. مهم‌ترین کارهای ${periodLabel(next, settings, lang)}` : `3. Key items for ${periodLabel(next, settings, lang)}`}</h4>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onAdd(draft.trim(), next); setDraft(""); } }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={fa ? "یک کار مهم بنویس و Enter بزن" : "Type a key item and press Enter"} className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="planning-review-next-input" />
            <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground" aria-label={fa ? "افزودن" : "Add"}><CornerDownLeft className="h-4 w-4" /></button>
          </form>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۴. یک جمله برای خودت (اختیاری)" : "4. One line for yourself (optional)"}</h4>
          <textarea value={note} onChange={(e) => { dirtyRef.current = true; setNote(e.target.value); }} rows={2} placeholder={fa ? "چه چیزی کمک کرد؟ چه چیزی را عوض می‌کنی؟" : "What helped? What will you change?"} className="w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="planning-review-note" />
        </section>

        <button type="button" onClick={() => { void finish(); }} className="h-11 w-full rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90" data-testid="planning-review-finish">
          {fa ? "پایان مرور" : "Finish review"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
