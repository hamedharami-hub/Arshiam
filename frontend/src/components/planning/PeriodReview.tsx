import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CornerDownLeft, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@/lib/taskTypes";
import { fromLocalISO, getTimeSettings, periodLabel, todayISO, type Period, type TimeSettings } from "@/lib/timeHorizon";
import { childLevel, defaultChildPeriod, periodsWithin } from "@/lib/planCascade";
import { isClosed, isDone } from "@/lib/planCascade";
import { nextPlanPeriod, periodText } from "@/lib/taskSchedule";
import { reviewFor, savePlanReview, savePlanReviewDraft, type PlanReview, type PlanReviewItem, type ReviewSnapshot } from "@/lib/planReviewService";
import { reportSave, toSaveStatus } from "@/lib/saveFeedback";
import { toPersianDigits } from "@/lib/jalali";
import { LEVEL_NAME, frac } from "./planningTheme";
import { ProgressLine } from "./PlanItemCard";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { clearTaskCreateIntent, getTaskCreateIntent, type TaskCreateIntent } from "@/lib/taskCreateIntent";
import { PeriodPicker } from "./PeriodPicker";

/** Which period deserves a review now: the last day of this one, or the first 3 days after an unreviewed one. */
export function reviewDue(reviews: Record<string, PlanReview>, enabled: boolean, current: Period, previous: Period, hasPrevItems: boolean, now = new Date(), calendar = getTimeSettings().calendar): Period | null {
  if (!enabled || (current.horizon !== "week" && current.horizon !== "month")) return null;
  const today = todayISO(now);
  if (today === current.end && !reviewFor(reviews, current, calendar)?.reviewed_at) return current;
  const dayIndex = Math.round((fromLocalISO(today).getTime() - fromLocalISO(current.start).getTime()) / 86_400_000);
  if (hasPrevItems && dayIndex < 3 && !reviewFor(reviews, previous, calendar)?.reviewed_at) return previous;
  return null;
}

type Props = {
  period: Period | null; items: Task[]; settings: TimeSettings; fa: boolean; onClose: () => void;
  reviews: Record<string, PlanReview>;
  onMove: (t: Task, p: Period) => Promise<TaskPersistenceStatus>; onDrop: (t: Task) => Promise<TaskPersistenceStatus>; onComplete: (t: Task) => unknown;
  onAdd: (title: string, p: Period, intentId: string) => Promise<TaskPersistenceStatus>;
  onContinue?: (t: Task) => Promise<TaskPersistenceStatus>;
  onWaiting?: (t: Task, reason?: string) => Promise<TaskPersistenceStatus>;
  onSetAside?: (t: Task) => Promise<TaskPersistenceStatus>;
};

const item = (t: Task, status: PlanReviewItem["status"]): PlanReviewItem => ({ id: t.id, title: t.title || "", status });

function firstContainedChildPeriod(period: Period, horizon: NonNullable<ReturnType<typeof childLevel>>, settings: TimeSettings): Period {
  return periodsWithin(horizon, period, settings).find((candidate) => candidate.start >= period.start && candidate.end <= period.end)
    || defaultChildPeriod(period, horizon, settings);
}

export function PeriodReviewDialog({ period, items, settings, fa, onClose, onMove, onDrop, onComplete, onAdd, onContinue, onWaiting, onSetAside, reviews }: Props) {
  const { user } = useAuth();
  const saved = period ? reviewFor(reviews, period, settings.calendar) : null;
  const [note, setNote] = useState(saved?.note || "");
  const dirty = useRef(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const createIntent = useRef<TaskCreateIntent | null>(null);
  const finishIntent = useRef<{ id: string; note: string; snapshot: ReviewSnapshot | null; reviewedAt: string } | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"pending" | "error" | "conflict" | null>(null);
  const [moveTarget, setMoveTarget] = useState<Period | null>(period ? nextPlanPeriod(period, settings) : null);
  const finer = period ? childLevel(period.horizon, settings) : null;
  const [shrinkTarget, setShrinkTarget] = useState<Period | null>(period && finer ? firstContainedChildPeriod(period, finer, settings) : null);
  const [waitingReasons, setWaitingReasons] = useState<Record<string, string>>({});
  // Cloud data may arrive after the dialog opened: adopt it only while the user has not typed.
  useEffect(() => { if (!dirty.current) setNote(saved?.note || ""); }, [saved?.note]);
  if (!period) return null;
  const lang = fa ? "fa" : "en";
  const next = nextPlanPeriod(period, settings);
  const shrinkLevel = childLevel(period.horizon, settings);
  const done = items.filter(isDone);
  const open = items.filter((t) => !isClosed(t));
  const setAside = items.filter((t) => t.status === "wont_do");
  const liveDone = items.filter(isDone).map((t) => item(t, "done"));
  const liveOpen = items.filter((t) => !isClosed(t)).map((t) => item(t, "open"));
  const liveSetAside = items.filter((t) => t.status === "wont_do").map((t) => item(t, "set_aside"));
  const historical = !!saved?.reviewed_at;
  const past = historical ? saved?.snapshot || null : null;
  const shownDone = past?.done || (historical ? [] : liveDone);
  const shownOpen = past?.open || (historical ? [] : liveOpen);
  const shownSetAside = past?.set_aside || (historical ? [] : liveSetAside);
  const counted = shownDone.length + shownOpen.length;
  const finish = async () => {
    if (!user || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let intent = finishIntent.current;
    if (!intent || intent.note !== note) {
      // Correcting a historical note must preserve the snapshot from that review.
      // Legacy records without a snapshot stay explicitly unknown; current tasks
      // must never be presented as if they were the historical list.
      const snapshot = historical
        ? saved?.snapshot || null
        : {
          done: done.map((t) => item(t, "done")),
          open: open.map((t) => item(t, "open")),
          set_aside: setAside.map((t) => item(t, "set_aside")),
        };
      let intentId: string;
      try { intentId = crypto.randomUUID(); } catch { intentId = `review_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
      intent = { id: intentId, note, snapshot, reviewedAt: new Date().toISOString() };
      finishIntent.current = intent;
    }
    let status: TaskPersistenceStatus;
    try {
      status = toSaveStatus(await savePlanReview(user.id, period, {
        note: intent.note, reviewed_at: intent.reviewedAt, snapshot: intent.snapshot,
      }, saved, settings.calendar, intent.id));
    } catch { status = "failed"; }
    finally { busyRef.current = false; setBusy(false); }
    reportSave(status, fa, fa ? "مرور ذخیره شد" : "Review saved");
    if (status !== "saved") {
      setReviewStatus(status === "queued" ? "pending" : saved?.draft_status === "conflict" ? "conflict" : "error");
      return; // keep the dialog and note until a server-confirmed commit
    }
    setReviewStatus(null);
    dirty.current = false;
    finishIntent.current = null;
    window.dispatchEvent(new Event("arsh:plan-reviewed"));
    onClose();
  };
  const addNext = async () => {
    const title = draft.trim();
    if (!title || busyRef.current) return;
    const intent = getTaskCreateIntent(createIntent, `review:${user?.id || ""}:${period.horizon}:${period.start}:${period.end}:${title}`);
    busyRef.current = true;
    setBusy(true);
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await onAdd(title, next, intent.id)); }
    catch { status = "failed"; }
    finally { busyRef.current = false; setBusy(false); }
    if (status !== "failed") {
      clearTaskCreateIntent(createIntent, intent);
      setDraft((current) => current.trim() === title ? "" : current);
    }
  };
  const runTaskUpdate = async (action: () => Promise<TaskPersistenceStatus>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { await action(); }
    catch { /* The callback reports its failure; still release the review controls. */ }
    finally { busyRef.current = false; setBusy(false); }
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
          <ProgressLine ratio={counted ? shownDone.length / counted : 0} level={period.horizon} />
          <span className="shrink-0 text-sm font-semibold tabular-nums" data-testid="planning-review-score">{frac(shownDone.length, counted, fa)}</span>
        </div>
        {past && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] leading-5 text-muted-foreground" data-testid="planning-review-record">
            {fa
              ? `ثبت پایان مرور: ${toPersianDigits(past.done.length)} انجام‌شده، ${toPersianDigits(past.open.length)} مانده${past.set_aside.length ? `، ${toPersianDigits(past.set_aside.length)} کنارگذاشته` : ""}${saved?.revision ? ` · اصلاح ${toPersianDigits(saved.revision)}` : ""}`
              : `Recorded at finish: ${past.done.length} done, ${past.open.length} left${past.set_aside.length ? `, ${past.set_aside.length} set aside` : ""}${saved?.revision ? ` · revision ${saved.revision}` : ""}`}
          </p>
        )}
        {historical && !past && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] leading-5 text-muted-foreground" data-testid="planning-review-history-missing">
            {fa ? "این مرور پیش از ثبت تاریخچه انجام شده؛ فهرست تاریخی در دسترس نیست." : "This review predates saved history; its task snapshot is unavailable."}
          </p>
        )}

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۱. انجام شد" : "1. Done"}</h4>
          {shownDone.length === 0 ? <p className="text-xs text-muted-foreground">{fa ? "اشکالی ندارد؛ دورهٔ بعد از نو." : "That's okay — fresh start next time."}</p> : (
            <ul className="space-y-1">{shownDone.map((t) => <li key={t.id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /><span className="truncate">{t.title}</span></li>)}</ul>
          )}
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۲. ماند — برای هرکدام تصمیم بگیر" : "2. Left — decide on each"}</h4>
          {!historical && shownOpen.length > 0 && <div className="grid gap-2 sm:grid-cols-2" data-testid="planning-review-targets">
            {moveTarget && <div className="min-w-0 rounded-xl border border-border/60 px-2 py-1 text-xs text-muted-foreground">
              <span>{fa ? "انتقال به دورهٔ انتخابی" : "Move to selected period"}</span>
              <PeriodPicker key={`move:${moveTarget.horizon}:${moveTarget.start}`} period={moveTarget} settings={settings} fa={fa} onPick={setMoveTarget} />
            </div>}
            {shrinkLevel && shrinkTarget && <div className="min-w-0 rounded-xl border border-border/60 px-2 py-1 text-xs text-muted-foreground">
              <span>{fa ? "کوچک‌کردن به دورهٔ ریزتر" : "Shrink to a finer period"}</span>
              <PeriodPicker key={`shrink:${shrinkTarget.horizon}:${shrinkTarget.start}`} period={shrinkTarget} settings={settings} fa={fa} onPick={setShrinkTarget} isAllowed={(candidate) => candidate.start >= period.start && candidate.end <= period.end} />
            </div>}
          </div>}
          {shownOpen.length === 0 ? <p className="text-xs text-muted-foreground">{fa ? "چیزی نماند. عالی!" : "Nothing left. Great!"}</p> : (
            <ul className="space-y-1.5">
              {shownOpen.map((record) => {
                const t = items.find((task) => task.id === record.id);
                return (
                <li key={record.id} className="rounded-xl border border-border/70 p-2" data-testid={`planning-review-open-${record.id}`}>
                  <p className="truncate text-sm">{record.title}</p>
                  {!historical && t && <div className="mt-1.5 flex flex-wrap gap-1">
                    {onContinue && <button type="button" disabled={busy} className={`${btn} bg-primary/10 font-medium text-primary hover:bg-primary/15 disabled:opacity-50`} onClick={() => void runTaskUpdate(() => onContinue(t))} data-testid={`planning-review-continue-${t.id}`}>{fa ? "ادامهٔ کار" : "Continue work"}</button>}
                    {shrinkLevel && shrinkTarget && <button type="button" disabled={busy} className={`${btn} hover:bg-muted disabled:opacity-50`} onClick={() => void runTaskUpdate(() => onMove(t, shrinkTarget))} data-testid={`planning-review-shrink-${t.id}`}>{fa ? `کوچک‌تر · ${periodText(shrinkTarget, settings, "fa")}` : `Shrink · ${periodText(shrinkTarget, settings, "en")}`}</button>}
                    {moveTarget && <button type="button" disabled={busy} className={`${btn} hover:bg-muted disabled:opacity-50`} onClick={() => void runTaskUpdate(() => onMove(t, moveTarget))} data-testid={`planning-review-move-${t.id}`}>{fa ? `انتقال · ${periodText(moveTarget, settings, "fa")}` : `Move · ${periodText(moveTarget, settings, "en")}`}</button>}
                    {onWaiting && <>
                      <input value={waitingReasons[t.id] || ""} onChange={(event) => setWaitingReasons((current) => ({ ...current, [t.id]: event.target.value }))} placeholder={fa ? "علت انتظار (اختیاری)" : "Waiting reason (optional)"} className="h-8 min-w-28 flex-1 rounded-full border bg-background px-2.5 text-[11px] outline-none focus:ring-2 focus:ring-primary/30" data-testid={`planning-review-waiting-reason-${t.id}`} />
                      <button type="button" disabled={busy} className={`${btn} hover:bg-muted disabled:opacity-50`} onClick={() => void runTaskUpdate(() => onWaiting(t, waitingReasons[t.id]))} data-testid={`planning-review-waiting-${t.id}`}>{fa ? "منتظر" : "Waiting"}</button>
                    </>}
                    <button type="button" disabled={busy} className={`${btn} hover:bg-muted disabled:opacity-50`} onClick={() => onComplete(t)} data-testid={`planning-review-done-${t.id}`}>{fa ? "انجام شده بود" : "It's done"}</button>
                    <button type="button" disabled={busy} className={`${btn} text-muted-foreground hover:bg-muted disabled:opacity-50`} onClick={() => void runTaskUpdate(() => onDrop(t))} data-testid={`planning-review-drop-${t.id}`}>{fa ? "حذف از برنامه" : "Remove from plan"}</button>
                    {onSetAside && <button type="button" disabled={busy} className={`${btn} text-muted-foreground hover:bg-muted disabled:opacity-50`} onClick={() => void runTaskUpdate(() => onSetAside(t))} data-testid={`planning-review-setaside-${t.id}`}>{fa ? "کنار بگذار" : "Set aside"}</button>}
                  </div>}
                </li>
              );})}
            </ul>
          )}
        </section>

        {historical && <section className="space-y-1.5" data-testid="planning-review-set-aside">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "کنار گذاشته شده در آن زمان" : "Set aside at that time"}</h4>
          {shownSetAside.length ? <ul className="space-y-1">{shownSetAside.map((r) => <li key={r.id} className="text-sm text-muted-foreground">{r.title}</li>)}</ul> : <p className="text-xs text-muted-foreground">{fa ? "موردی ثبت نشده." : "None recorded."}</p>}
        </section>}

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? `۳. مهم‌ترین کارهای ${periodLabel(next, settings, lang)}` : `3. Key items for ${periodLabel(next, settings, lang)}`}</h4>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void addNext(); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={fa ? "یک کار مهم بنویس و Enter بزن" : "Type a key item and press Enter"} className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="planning-review-next-input" />
            <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50" aria-label={fa ? "افزودن" : "Add"}><CornerDownLeft className="h-4 w-4" /></button>
          </form>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{fa ? "۴. یک جمله برای خودت (اختیاری)" : "4. One line for yourself (optional)"}</h4>
          <textarea value={note} onChange={(e) => { const value = e.target.value; dirty.current = true; if (finishIntent.current?.note !== value) finishIntent.current = null; setNote(value); if (user && period) savePlanReviewDraft(user.id, period, value, saved, settings.calendar); }} rows={2} placeholder={fa ? "چه چیزی کمک کرد؟ چه چیزی را عوض می‌کنی؟" : "What helped? What will you change?"} className="w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="planning-review-note" />
          {(reviewStatus || saved?.draft_status) && <p className="text-[11px] text-muted-foreground" role="status" data-testid="planning-review-sync-status">{reviewStatus === "conflict" || saved?.draft_status === "conflict"
            ? (fa ? "این مرور هم‌زمان در دستگاه دیگری تغییر کرده؛ یادداشت شما حفظ شده است." : "This review changed elsewhere; your note is preserved.")
            : reviewStatus === "pending" || saved?.draft_status === "pending"
              ? (fa ? "مرور روی این دستگاه نگه داشته شده و پس از اتصال دوباره تلاش می‌شود." : "Review kept on this device; it will retry when online.")
              : (fa ? "ذخیره نشد؛ متن شما حفظ شده است. برای تلاش دوباره پایان مرور را بزنید." : "Not saved; your text is kept. Select Finish review to retry.")}</p>}
        </section>

        <button type="button" onClick={() => void finish()} disabled={busy} className="h-11 w-full disabled:opacity-60 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90" data-testid="planning-review-finish">
          {fa ? "پایان مرور" : "Finish review"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
