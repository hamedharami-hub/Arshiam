import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CornerDownLeft, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@/lib/taskTypes";
import { fromLocalISO, periodLabel, todayISO, type Period, type TimeSettings } from "@/lib/timeHorizon";
import { isClosed, isDone } from "@/lib/planCascade";
import { nextPlanPeriod, periodText } from "@/lib/taskSchedule";
import { reviewFor, savePlanReview, type PlanReview, type PlanReviewItem } from "@/lib/planReviewService";
import { reportSave, toSaveStatus } from "@/lib/saveFeedback";
import { toPersianDigits } from "@/lib/jalali";
import { LEVEL_NAME, frac } from "./planningTheme";
import { ProgressLine } from "./PlanItemCard";

/** Which period deserves a review now: the last day of this one, or the first 3 days after an unreviewed one. */
export function reviewDue(reviews: Record<string, PlanReview>, enabled: boolean, current: Period, previous: Period, hasPrevItems: boolean, now = new Date()): Period | null {
  if (!enabled || (current.horizon !== "week" && current.horizon !== "month")) return null;
  const today = todayISO(now);
  if (today === current.end && !reviewFor(reviews, current)?.reviewed_at) return current;
  const dayIndex = Math.round((fromLocalISO(today).getTime() - fromLocalISO(current.start).getTime()) / 86_400_000);
  if (hasPrevItems && dayIndex < 3 && !reviewFor(reviews, previous)?.reviewed_at) return previous;
  return null;
}

type Props = {
  period: Period | null; items: Task[]; settings: TimeSettings; fa: boolean; onClose: () => void;
  reviews: Record<string, PlanReview>;
  onMove: (t: Task, p: Period) => unknown; onDrop: (t: Task) => unknown; onComplete: (t: Task) => unknown; onAdd: (title: string, p: Period) => unknown;
  onSetAside?: (t: Task) => unknown;
};

const item = (t: Task, status: PlanReviewItem["status"]): PlanReviewItem => ({ id: t.id, title: t.title || "", status });

export function PeriodReviewDialog({ period, items, settings, fa, onClose, onMove, onDrop, onComplete, onAdd, onSetAside, reviews }: Props) {
  const { user } = useAuth();
  const saved = period ? reviewFor(reviews, period) : null;
  const [note, setNote] = useState(saved?.note || "");
  const dirty = useRef(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // Cloud data may arrive after the dialog opened: adopt it only while the user has not typed.
  useEffect(() => { if (!dirty.current) setNote(saved?.note || ""); }, [saved?.note]);
  if (!period) return null;
  const lang = fa ? "fa" : "en";
  const next = nextPlanPeriod(period, settings);
  const setAside = items.filter((t) => t.status === "wont_do");
  const done = items.filter(isDone);
  const open = items.filter((t) => !isClosed(t));
  const counted = done.length + open.length;
  const finish = async () => {
    if (!user || busy) return;
    setBusy(true);
    const status = await savePlanReview(user.id, period, {
      note, reviewed_at: new Date().toISOString(),
      snapshot: { done: done.map((t) => item(t, "done")), open: open.map((t) => item(t, "open")), set_aside: setAside.map((t) => item(t, "set_aside")) },
    }, saved);
    setBusy(false);
    reportSave(status, fa, fa ? "مرور ذخیره شد" : "Review saved");
    if (status === "failed") return; // keep the dialog and the note
    dirty.current = false;
    window.dispatchEvent(new Event("arsh:plan-reviewed"));
    onClose();
  };
  const past = saved?.reviewed_at && saved.snapshot ? saved.snapshot : null;
  const btn = "h-8 rounded-full px-2.5 text-[11px] transition-colors duration-150";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-3xl" dir={fa ? "rtl" : "ltr"} data-testid="planning-review-dialog">
        <DialogHeader className="space-y-1 text-start">
          <DialogTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-4 w-4 text-amber-500" />{fa ? `مرور ${periodLabel(period, settings, lang)}` : `Review · ${periodLabel(period, settings, lang)}`}</DialogTitle>
          <DialogDescription>{fa ? "چه شد، چه ماند، و دورهٔ بعد چه باشد — کمتر از دو دقیقه." : "What happened, what's left, and what comes next — under two minutes."}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
          <ProgressLine ratio={counted ? done.length / counted : 0} level={period.horizon} />
          <span className="shrink-0 text-sm font-semibold tabular-nums" data-testid="planning-review-score">{frac(done.length, counted, fa)}</span>
        </div>
        {past && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] leading-5 text-muted-foreground" data-testid="planning-review-record">
            {fa
              ? `ثبت پایان مرور: ${toPersianDigits(past.done.length)} انجام‌شده، ${toPersianDigits(past.open.length)} مانده${past.set_aside.length ? `، ${toPersianDigits(past.set_aside.length)} کنارگذاشته` : ""}${saved?.revision ? ` · اصلاح ${toPersianDigits(saved.revision)}` : ""}`
              : `Recorded at finish: ${past.done.length} done, ${past.open.length} left${past.set_aside.length ? `, ${past.set_aside.length} set aside` : ""}${saved?.revision ? ` · revision ${saved.revision}` : ""}`}
          </p>
        )}

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۱. انجام شد" : "1. Done"}</h4>
          {done.length === 0 ? <p className="text-xs text-muted-foreground">{fa ? "اشکالی ندارد؛ دورهٔ بعد از نو." : "That's okay — fresh start next time."}</p> : (
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
                    <button type="button" className={`${btn} bg-primary/10 font-medium text-primary hover:bg-primary/15`} onClick={() => onMove(t, next)} data-testid={`planning-review-move-${t.id}`}>{fa ? `به ${periodText(next, settings, "fa")}` : `To ${periodText(next, settings, "en")}`}</button>
                    <button type="button" className={`${btn} hover:bg-muted`} onClick={() => onComplete(t)} data-testid={`planning-review-done-${t.id}`}>{fa ? "انجام شده بود" : "It's done"}</button>
                    <button type="button" className={`${btn} text-muted-foreground hover:bg-muted`} onClick={() => onDrop(t)} data-testid={`planning-review-drop-${t.id}`}>{fa ? "حذف از برنامه" : "Remove from plan"}</button>
                    {onSetAside && <button type="button" className={`${btn} text-muted-foreground hover:bg-muted`} onClick={() => onSetAside(t)} data-testid={`planning-review-setaside-${t.id}`}>{fa ? "کنار بگذار" : "Set aside"}</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? `۳. مهم‌ترین کارهای ${periodLabel(next, settings, lang)}` : `3. Key items for ${periodLabel(next, settings, lang)}`}</h4>
          <form className="flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const title = draft.trim();
            if (!title || busy) return;
            setBusy(true);
            const status = toSaveStatus(await onAdd(title, next));
            setBusy(false);
            if (status !== "failed") setDraft((cur) => (cur.trim() === title ? "" : cur));
          }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={fa ? "یک کار مهم بنویس و Enter بزن" : "Type a key item and press Enter"} className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="planning-review-next-input" />
            <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground" aria-label={fa ? "افزودن" : "Add"}><CornerDownLeft className="h-4 w-4" /></button>
          </form>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۴. یک جمله برای خودت (اختیاری)" : "4. One line for yourself (optional)"}</h4>
          <textarea value={note} onChange={(e) => { dirty.current = true; setNote(e.target.value); }} rows={2} placeholder={fa ? "چه چیزی کمک کرد؟ چه چیزی را عوض می‌کنی؟" : "What helped? What will you change?"} className="w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="planning-review-note" />
        </section>

        <button type="button" onClick={() => void finish()} disabled={busy} className="h-11 w-full disabled:opacity-60 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90" data-testid="planning-review-finish">
          {fa ? "پایان مرور" : "Finish review"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
