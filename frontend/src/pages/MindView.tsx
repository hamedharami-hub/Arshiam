import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ChevronDown, LineChart, PenLine, ShieldAlert, Wind, Brain, Check, CloudOff, Loader2 } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { subscribeDailyCheckins, upsertDailyCheckin } from "@/lib/firestoreDataService";
import { getLocalDateString } from "@/lib/taskDate";
import { toPersianDigits } from "@/lib/jalali";
import { NeedsEntry } from "@/components/needs/NeedsBits";
import { useMindDraft, type MindDraftPath } from "@/lib/mindDraft";
import { useWorkspaceDraft } from "@/lib/mind/workspaceDraft";
import { useLocalDay } from "@/lib/mind/useLocalDay";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { DraftConflictNotice } from "@/components/mind/DraftConflictNotice";
import { HelpfulTools } from "@/components/mind/HelpfulTools";
import { DeviceDrafts } from "@/components/mind/DeviceDrafts";
import { beginMindSession, readMindSession, updateMindSession } from "@/lib/mind/sessionService";

type SaveState = "idle" | "saving" | "saved" | "queued" | "failed";
type TodayRecord = { checkin_date: string; mood: number | null; energy: number | null; updated_at?: string };

const SAVE_ACK_TIMEOUT_MS = 4000;

function Slider({ label, value, onChange, testId, num, T }: { label: string; value: number | null; onChange: (n: number | null) => void; testId: string; num: (n: number) => string; T: (fa: string, en: string) => string }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{value === null ? T("انتخاب نشده", "Not selected") : `${num(value)}/${num(10)}`}</span>
      </span>
      <input
        type="range" min={1} max={10} step={1} value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full cursor-pointer accent-[hsl(var(--primary))]"
        aria-label={label} aria-valuetext={value === null ? T("انتخاب نشده؛ برای ثبت مقدار انتخاب کنید", "Not selected; choose a rating to record") : `${value} / 10`} data-testid={testId}
      />
      <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{T("۱: بسیار کم / ناخوشایند", "1: Very low / unpleasant")}</span><span>{T("۱۰: بسیار زیاد / خوشایند", "10: Very high / pleasant")}</span></span>
      {value !== null && <button type="button" className="min-h-9 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2" onClick={() => onChange(null)}>{T("رد کردن این شاخص", "Skip this rating")}</button>}
    </label>
  );
}

export default function MindView() {
  const { user } = useAuth();
  const day = useLocalDay();
  // Sensitive input and in-flight state must never survive an owner change.
  return <MindHome key={user?.id || "guest"} userId={user?.id} today={day} />;
}

function MindHome({ userId, today }: { userId?: string; today: string }) {
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const { draft, save: saveDraft } = useMindDraft(userId);
  const workspace = useWorkspaceDraft(userId, "home", { day: today, mood: null as number | null, energy: null as number | null, text: draft?.text ?? "", concernId: null as string | null });
  const { mood, energy, text } = workspace.value;

  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [touched, setTouched] = useState(mood !== null || energy !== null);
  const touchedRef = useRef(touched);
  touchedRef.current = touched;
  const baseRecord = useRef<{ updatedAt?: string } | null>(null);
  const [remoteConflict, setRemoteConflict] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [reload, setReload] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const requestRef = useRef(0);
  const editRevision = useRef(0);
  const savingRef = useRef(false);
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  useEffect(() => {
    if (workspace.value.day === today) return;
    // The concern text survives day changes even when storage is unavailable.
    workspace.setValue({ ...workspace.value, day: today, mood: null, energy: null });
    setTouched(false);
    setSaveState("idle");
  }, [today]);
  useRecoverableExit(() => (touched || !!text.trim()) && !workspace.durable,
    T("آخرین تغییرات روی دستگاه حفظ نشده‌اند. قبل از خروج نوشته را کپی کنید. خارج می‌شوید؟", "Your latest changes are not retained on this device. Copy your text before leaving. Leave anyway?"));

  useEffect(() => {
    setLoaded(false); setRecord(null); setLoadError(false); setSaveState("idle");
    requestRef.current += 1;
    let active = true;
    if (!userId) return;
    const unsubscribe = subscribeDailyCheckins(userId, (items: TodayRecord[], source) => {
      if (!active) return;
      const incoming = items.find((c) => c.checkin_date === today) ?? null;
      if (!touchedRef.current) baseRecord.current = incoming ? { updatedAt: incoming.updated_at } : null;
      else if (!savingRef.current && (incoming?.updated_at !== baseRecord.current?.updatedAt || !!incoming !== !!baseRecord.current)) setRemoteConflict(true);
      setRecord(incoming);
      setLoaded(true);
      setFromCache(source?.fromCache ?? false);
    }, () => { if (active) setLoadError(true); });
    return () => { active = false; requestRef.current += 1; unsubscribe(); };
  }, [userId, today, reload]);

  useEffect(() => {
    if (record && !touched && !workspace.conflict) { workspace.setValue({ ...workspace.value, mood: record.mood ?? null, energy: record.energy ?? null }); }
  }, [record, touched]);

  async function saveMood() {
    if (!userId || savingRef.current || remoteConflict || (mood === null && energy === null)) return;
    if (getLocalDateString() !== today) { setSaveState("failed"); return; }
    savingRef.current = true;
    const revision = editRevision.current;
    const ticket = ++requestRef.current;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      if (ticket === requestRef.current) setSaveState("queued");
    }, SAVE_ACK_TIMEOUT_MS);
    try {
      const ok = await upsertDailyCheckin(userId, { checkin_date: today, mood, energy }, { expected: baseRecord.current });
      if (ticket !== requestRef.current) return;
      setSaveState(ok ? (revision === editRevision.current ? "saved" : "idle") : "failed");
      if (ok && revision === editRevision.current) { setTouched(false); setRemoteConflict(false); }
    } catch {
      if (ticket === requestRef.current) setSaveState("failed");
    } finally {
      window.clearTimeout(timer);
      savingRef.current = false;
    }
  }

  function startPath(path: MindDraftPath | "step" | "calm") {
    if (!userId) return;
    const previous = workspace.value.concernId ? readMindSession(userId, workspace.value.concernId) : null;
    const result = previous
      ? previous.ok && previous.value
        ? updateMindSession(userId, { ...previous.value, text, goal: path === "calm" ? "calm" : path === "step" ? "step" : "clarify" }, previous.value.revision)
        : { ok: false as const, reason: "unreadable-session" }
      : beginMindSession(userId, text, isEn ? "en" : "fa");
    if (!result.ok || !workspace.setValue({ ...workspace.value, concernId: result.session.id })) { setDraftSaveFailed(true); return; }
    if (path === "step" || path === "calm") {
      setDraftSaveFailed(false);
      navigate(`${path === "step" ? "/app/mind/session/new?cat=unknown&" : "/app/calm?"}session=${encodeURIComponent(result.session.id)}`);
      return;
    }
    if (!saveDraft({ text, path })) { setDraftSaveFailed(true); return; }
    setDraftSaveFailed(false);
    navigate(`${path === "think" ? "/app/thoughts" : "/app/worry"}?session=${encodeURIComponent(result.session.id)}`);
  }

  const pathName = (p: MindDraftPath | null) => (p === "worry" ? T("نگرانی", "Worry") : T("بررسی فکر", "Thought check"));
  const draftTime = draft ? new Date(draft.updatedAt).toLocaleString(isEn ? "en-GB" : "fa-IR", { dateStyle: "short", timeStyle: "short" }) : "";

  const statusText: Record<SaveState, string> = {
    idle: "",
    saving: T("در حال ذخیره…", "Saving…"),
    saved: T("ذخیره و همگام شد", "Saved and synced"),
    queued: T("هنوز تأیید ذخیره نرسیده؛ این صفحه را باز نگه دارید.", "Save is not confirmed yet. Keep this page open."),
    failed: T("ذخیره نشد. دوباره تلاش کنید.", "Could not save. Try again."),
  };

  const cardClass = "surface-card flex flex-col gap-4 p-4 sm:p-5";
  const iconWrap = "grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary";

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--xl space-y-5 pb-28 animate-fade-in" data-testid="mind-home">
      <HeaderTitlePortal title={T("ذهن", "Mind")} />
      <DraftConflictNotice {...workspace} />

      {draft && (
        <Link
          to={draft.path === "worry" ? "/app/worry" : draft.path === "think" ? "/app/thoughts" : "/app/mind"}
          className="surface-card flex items-center gap-3 px-4 py-3 text-sm hover:border-primary/50"
          data-testid="mind-continue-draft"
        >
          <PenLine className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            {T("ادامهٔ آخرین نوشته", "Continue your last note")}
            {draft.path ? ` · ${pathName(draft.path)}` : ""}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{draftTime}</span>
        </Link>
      )}

      <h1 className="pt-1 text-base font-bold">{T("الان چه چیزی کمک می‌کند؟", "What would help right now?")}</h1>
      <p className="text-xs leading-5 text-muted-foreground">{T("می‌توانی فقط بنویسی، آرام‌سازی را امتحان کنی یا یک قدم انتخاب کنی؛ ثبت حال و ادامه‌دادن اختیاری‌اند.", "Write, try a calming exercise, or choose a small step. Logging your mood and continuing are optional.")}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <section className={cardClass} aria-labelledby="mind-busy-title" data-testid="mind-card-busy">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Brain className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id="mind-busy-title" className="text-base font-bold leading-tight">{T("ذهنم درگیر است", "My mind is busy")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("چه چیزی ذهنت را درگیر کرده؟", "What is on your mind?")}</p>
            </div>
          </header>
          <textarea value={text} rows={3} dir="auto" name="mind-concern" autoComplete="off"
            onChange={(e) => { const retained = workspace.setValue({ ...workspace.value, text: e.target.value }); setDraftSaveFailed(!saveDraft({ text: e.target.value }) || !retained); }}
            placeholder={T("چند کلمه بنویس…", "Write a few words…")}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={T("چه چیزی ذهنت را درگیر کرده؟", "What is on your mind?")} data-testid="mind-busy-input" />
          {draftSaveFailed && <p role="alert" className="text-xs text-destructive" data-testid="mind-draft-error">{T("پیش‌نویس ذخیره نشد؛ قبل از خروج متن را کپی کنید یا دوباره تلاش کنید.", "Draft could not be saved. Copy your text before leaving or try again.")}</p>}
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="h-auto min-h-11 justify-start whitespace-normal py-2 text-start" onClick={() => startPath("think")} data-testid="mind-path-think">{T("می‌خواهم فکرم را بررسی کنم", "I want to examine my thought")}</Button>
            <Button variant="outline" className="h-auto min-h-11 justify-start whitespace-normal py-2 text-start" onClick={() => startPath("worry")} data-testid="mind-path-worry">{T("می‌خواهم برای نگرانی‌ام کاری انجام دهم", "I want to do something about my worry")}</Button>
            <Button variant="outline" className="h-auto min-h-11 justify-start whitespace-normal py-2 text-start" onClick={() => startPath("step")}>{T("می‌خواهم یک قدم انتخاب کنم", "I want to choose a step")}</Button>
            <Button variant="ghost" className="min-h-11 justify-start" onClick={() => { const ok = workspace.setValue(workspace.value) && saveDraft({ text }); setDraftSaveFailed(!ok); }}>{T("فعلاً فقط نوشته را نگه دار", "Just keep my note for now")}</Button>
            {!!text.trim() && workspace.durable && !draftSaveFailed && <p role="status" className="text-xs text-muted-foreground">{T("پیش‌نویس روی این دستگاه حفظ شده؛ ذخیرهٔ ابری نیست.", "Draft retained on this device; not a cloud save.")}</p>}
          </div>
        </section>
        <section className={cardClass} aria-labelledby="mind-mood-title" data-testid="mind-card-mood">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Activity className="h-4 w-4" /></span>
            <div>
              <h2 id="mind-mood-title" className="text-base font-bold leading-tight">{T("حال امروز", "Today's mood")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {record ? T("آخرین ثبت امروز را ویرایش کنید؛ این امتیاز میانگین روز نیست.", "Edit today's latest rating; this is not a daily average.") : T("اختیاری: خلق و انرژی همین حالا را ثبت کنید.", "Optional: rate your mood and energy right now.")}
              </p>
            </div>
          </header>
          <Slider label={T("خلق", "Mood")} value={mood} onChange={(n) => { editRevision.current += 1; workspace.setValue({ ...workspace.value, mood: n }); setTouched(true); if (!savingRef.current) setSaveState("idle"); }} testId="mind-mood-slider" num={num} T={T} />
          <Slider label={T("انرژی", "Energy")} value={energy} onChange={(n) => { editRevision.current += 1; workspace.setValue({ ...workspace.value, energy: n }); setTouched(true); if (!savingRef.current) setSaveState("idle"); }} testId="mind-energy-slider" num={num} T={T} />
          {fromCache && <p className="text-xs text-muted-foreground">{T("اطلاعات ذخیره‌شدهٔ دستگاه؛ ممکن است آخرین تغییر سرور را نداشته باشد.", "Device-cached data; it may not include the latest server changes.")}</p>}
          {loadError && <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-destructive"><span>{T("دریافت ثبت‌ها ناموفق بود.", "Could not load your entries.")}</span><Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>{T("تلاش مجدد", "Retry")}</Button></div>}
          <div className="flex items-center gap-3">
            <Button onClick={saveMood} disabled={!loaded || remoteConflict || (mood === null && energy === null) || workspace.conflict || saveState === "saving" || saveState === "queued"} className="h-11 min-w-24" data-testid="mind-mood-save">
              {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : record ? T("به‌روزرسانی", "Update") : T("ثبت", "Save")}
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status" aria-live="polite" data-testid="mind-mood-status">
              {saveState === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              {(saveState === "queued" || saveState === "failed") && <CloudOff className="h-3.5 w-3.5 text-amber-600" />}
              {statusText[saveState]}
            </span>
          </div>
          {remoteConflict && <aside role="alert" className="space-y-2 text-xs">
            <p>{T("ثبت امروز در جای دیگری تغییر کرده؛ امتیازهای فعلی جایگزین نشده‌اند. پیش از ذخیره نسخهٔ تازه را بررسی کن.", "Today's entry changed elsewhere; your ratings were not replaced. Review the latest copy before saving.")}</p>
            <Button variant="outline" size="sm" onClick={() => { baseRecord.current = record ? { updatedAt: record.updated_at } : null; workspace.setValue({ ...workspace.value, mood: record?.mood ?? null, energy: record?.energy ?? null }); setTouched(false); setRemoteConflict(false); }}>{T("پذیرفتن امتیازهای تازه", "Use latest ratings")}</Button>
          </aside>}
          <details className="group text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-primary">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />{T("جزئیات بیشتر", "More details")}
            </summary>
            <p className="mt-2 leading-5 text-muted-foreground">{T("تمرکز، استرس و اطلاعات خواب را در فرم کامل ثبت کنید.", "Add focus, stress and sleep in the full form.")}</p>
            <Link to="/app/checkin" className="mt-1 inline-block font-semibold text-primary hover:underline" data-testid="mind-checkin-full">{T("باز کردن فرم کامل", "Open full form")}</Link>
          </details>
        </section>

        <section className={cardClass} aria-labelledby="mind-calm-title" data-testid="mind-card-calm">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Wind className="h-4 w-4" /></span>
            <div>
              <h2 id="mind-calm-title" className="text-base font-bold leading-tight">{T("آرام‌شدن", "Calm down")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("تنفس هدایت‌شده یا صدای آرام برای خواب.", "Guided breathing, or calming sound for sleep.")}</p>
            </div>
          </header>
          <div className="mt-auto flex flex-col gap-2">
            <Button asChild className="h-11"><Link to="/app/calm" data-testid="mind-calm-open">{T("آرام‌سازی را انتخاب کنم", "Choose a calming exercise")}</Link></Button>
          </div>
        </section>

      </div>
      <button type="button" onClick={() => startPath("step")} className="inline-flex min-h-11 items-center text-start text-sm font-medium text-primary hover:underline">{T("می‌خواهم یک قدم پیدا کنم؛ موضوعم را هنوز نمی‌دانم", "Help me choose a step; I do not know my topic yet")}</button>
      <HelpfulTools ownerId={userId} />
      <DeviceDrafts ownerId={userId} />
      <details className="surface-card p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">{T("موضوعات و ابزارهای بیشتر", "More topics and tools")}</summary>
        <div className="mt-3"><NeedsEntry /></div>
      </details>

      <div className="flex items-center justify-between">
        <Link to="/app/mind/trends" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" data-testid="mind-trends-link">
          <LineChart className="h-4 w-4" />{T("روند و سنجش‌ها", "Trends & check-ups")}
        </Link>
      </div>

      <Link
        to="/app/crisis"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/5"
        data-testid="mind-crisis-link"
        aria-label={T("کمک فوری (SOS)", "Urgent help (SOS)")}
      >
        <ShieldAlert className="h-4 w-4" />{T("کمک فوری", "SOS")}
      </Link>
    </div>
  );
}
