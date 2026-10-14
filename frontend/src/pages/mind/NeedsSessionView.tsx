import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookMarked, CheckCircle2, ClipboardList, HeartHandshake, Loader2, NotebookPen, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Back, MethodCard, PackSection, SafetyNotice, checkInfo } from "@/components/needs/NeedsBits";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { useWorkspaceDraft } from "@/lib/mind/workspaceDraft";
import { readMindSession } from "@/lib/mind/sessionService";
import { ConcernNav } from "@/components/mind/ConcernNav";
import { DraftPrivacy } from "@/components/mind/DraftPrivacy";
import { getOpConfig } from "@/lib/aiSettings";
import { getCategory, getTopic, TOOLS } from "@/lib/needs/tree";
import {
  convertSuggestion, hasAI, localResult, makeQuestions, makeResult, needsDestinationId, needsSafetyNotice, newSessionId, saveSession, subscribeSessions, suggestTopics,
} from "@/lib/needs/service";
import type { NeedsDecision, NeedsSession, NeedsSuggestion, NeedsSuggestionFeedback } from "@/lib/needs/types";

type Stage = "describe" | "classify" | "asking" | "working" | "result";
type ConversionPreview = { suggestion: NeedsSuggestion; index: number; title: string; notes: string; due: string; frequency: "" | "daily" | "weekly" };
type Workspace = { s: NeedsSession | null; stage: Stage; answer: string; matches: Array<{ cat: string; topic: string }>; intensity: "short" | "more"; useAI: boolean; preview: ConversionPreview | null };
const taClass = "w-full resize-none rounded-xl border border-border bg-card p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--rose-gold)/0.6)]";

export default function NeedsSessionView() {
  const { user } = useAuth();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const query = new URLSearchParams();
  for (const field of ["cat", "topic", "detail", "session"]) if (sp.get(field)) query.set(field, sp.get(field)!);
  const slot = `needs:${id === "new" ? `new:${query.toString()}` : id || "new"}`;
  return <NeedsSessionEditor key={`${user?.id || "guest"}:${slot}`} ownerId={user?.id} id={id} slot={slot} concernId={sp.get("session")} catId={sp.get("cat")} topicId={sp.get("topic")} detailId={sp.get("detail")} />;
}

function NeedsSessionEditor({ ownerId, id, slot, concernId, catId, topicId, detailId }: { ownerId?: string; id?: string; slot: string; concernId: string | null; catId: string | null; topicId: string | null; detailId: string | null }) {
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const lang = isEn ? "en" : "fa";
  const L = (b?: { fa: string; en: string }) => (b ? b[lang] : "");

  const [initial] = useState<Workspace>(() => {
    const now = new Date().toISOString();
    const read = ownerId && concernId ? readMindSession(ownerId, concernId) : null;
    const text = read?.ok ? read.value?.text || "" : "";
    return { s: id === "new" ? { id: newSessionId(), category: catId || "unknown", topic: topicId, detail: detailId, text, qa: [], questions: [], result: null, lang, created_at: now, updated_at: now } : null, stage: "describe", answer: text, matches: [], intensity: "short", useAI: false, preview: null };
  });
  const draft = useWorkspaceDraft(ownerId, slot, initial);
  const current = useRef(draft.value);
  current.current = draft.value;
  const privacy = useRef({ temporary: draft.temporary, conflict: draft.conflict });
  privacy.current = { temporary: draft.temporary, conflict: draft.conflict };
  const revision = useRef(0);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "synced" | "failed">("idle");
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [remoteSession, setRemoteSession] = useState<NeedsSession | null>(null);
  const conversionLock = useRef(false);
  const { s, answer, matches, intensity, useAI, preview } = draft.value;
  const stage = busy ? "working" : draft.value.stage;
  const change = (patch: Partial<Workspace>) => {
    setSaveStatus("idle");
    revision.current += 1;
    current.current = { ...current.current, ...patch };
    return draft.setValue(current.current);
  };
  const setAnswer = (answer: string) => { setSaveStatus("idle"); change({ answer }); };
  const setPreview = (preview: ConversionPreview | null) => change({ preview });
  const cancelRequest = () => { request.current?.abort(); request.current = null; lock.current = false; revision.current += 1; setBusy(false); };
  useRecoverableExit(() => !draft.durable && !!(current.current.answer || current.current.s?.text), T("این نوشته هنوز روی دستگاه حفظ نشده؛ قبل از خروج آن را کپی کن. خارج می‌شوی؟", "This writing is not retained on this device. Copy it before leaving. Leave anyway?"), { watchSearch: true });
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; request.current?.abort(); };
  }, []);

  // Legacy cloud sessions are only hydrated into an empty workspace. Later
  // subscription updates never replace the local working copy implicitly.
  useEffect(() => {
    if (id === "new" || !ownerId) return;
    let live = true;
    setLoadError(false);
    const unsubscribe = subscribeSessions(ownerId, (items) => {
      if (!live || !active.current) return;
      setLoadError(false);
      const found = items.find((x) => x.id === id);
      if (!found) { setLoadError(true); return; }
      if (!current.current.s) change({ s: found, answer: found.questions.length || found.result ? "" : found.text, stage: found.result ? "result" : found.questions.length ? "asking" : "describe" });
      else if (found.updated_at > current.current.s.updated_at && JSON.stringify(found) !== JSON.stringify(current.current.s)) setRemoteSession(found);
    }, () => { if (live && active.current) setLoadError(true); });
    return () => { live = false; unsubscribe(); };
  }, [id, ownerId, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCloud = (next: NeedsSession, rev = revision.current) => {
    if (!ownerId || privacy.current.temporary || privacy.current.conflict || remoteSession) return;
    setSaveStatus("saving");
    saveQueue.current = saveQueue.current.then(async () => {
      if (!active.current || privacy.current.temporary || privacy.current.conflict || revision.current !== rev) { if (active.current) setSaveStatus("idle"); return; }
      const ok = await saveSession(ownerId, next);
      if (active.current && revision.current === rev) setSaveStatus(ok ? "synced" : "failed");
    }).catch(() => { if (active.current && revision.current === rev) setSaveStatus("failed"); });
  };
  const persist = (next: NeedsSession, patch: Partial<Workspace> = {}) => {
    const stamped = { ...next, updated_at: new Date().toISOString() };
    change({ ...patch, s: stamped });
  };
  const cat = getCategory(s?.category);
  const topic = getTopic(s?.category, s?.topic);
  const showSafety = useMemo(() => (s ? needsSafetyNotice(s) : false), [s]);
  const answeredCount = s ? s.qa.length : 0;

  const run = async (fields: string[], work: (signal: AbortSignal) => Promise<void>) => {
    if (lock.current) return;
    if (useAI) {
      const cfg = getOpConfig("chat");
      if (!hasAI()) { toast.error(T("ابتدا سرویس AI را در تنظیمات انتخاب کن، یا از راهنمای محلی استفاده کن.", "Configure an AI service first, or use local guidance.")); return; }
      if (!window.confirm(T(`ارسال به ${cfg.provider} / ${cfg.model || "مدل تنظیم‌شده"}: ${fields.join("، ")}. فقط همین جلسه، بدون شخصی‌سازی عمومی. موافقی؟`, `Send to ${cfg.provider} / ${cfg.model || "configured model"}: ${fields.join(", ")}. Only this session, no general personalization. Continue?`))) return;
    }
    lock.current = true;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (active.current && request.current === controller) {
        cancelRequest();
        toast.error(T("زمان درخواست تمام شد؛ می‌توانی دوباره تلاش کنی یا راهنمای محلی را انتخاب کنی.", "Request timed out. Retry or choose local guidance."));
      }
    }, 45000);
    try { await work(controller.signal); }
    catch { if (active.current && !controller.signal.aborted) toast.error(T("درخواست انجام نشد؛ دوباره تلاش کن.", "Request failed. Try again.")); }
    finally { window.clearTimeout(timeout); if (request.current === controller) { lock.current = false; request.current = null; if (active.current) setBusy(false); } }
  };
  const startQuestions = async (base: NeedsSession, signal: AbortSignal) => {
    const rev = revision.current;
    const questions = intensity === "short" ? [] : await makeQuestions(base, { useAI, signal });
    if (!active.current || signal.aborted || revision.current !== rev) return;
    if (!questions.length) {
      const result = await makeResult(base, { useAI, signal });
      if (!active.current || signal.aborted || revision.current !== rev) return;
      persist({ ...base, questions, result }, { answer: "", stage: "result" });
    } else persist({ ...base, questions }, { answer: "", stage: "asking" });
  };
  const submitDescribe = async () => {
    if (!s || !answer.trim()) return;
    const base = { ...s, text: answer.trim(), lang: lang as "fa" | "en" };
    await run(["situation text", "category/topic/detail", "answers (if any)"], async (signal) => {
      const rev = revision.current;
      if (base.category === "unknown" && intensity === "more") {
        const m = await suggestTopics(base.text, base.lang, { useAI, signal });
        if (!active.current || signal.aborted || revision.current !== rev) return;
        persist(base, { matches: m, stage: "classify" });
      } else await startQuestions(base, signal);
    });
  };

  const pickMatch = async (m: { cat: string; topic: string }) => {
    if (!s) return;
    await run(["situation text", "selected topic", "answers (if any)"], (signal) => startQuestions({ ...s, category: m.cat, topic: m.topic }, signal));
  };

  const submitAnswer = async (skip: boolean) => {
    if (!s) return;
    const q = s.questions[answeredCount];
    const qa = q ? [...s.qa, { q, a: skip ? "" : answer.trim() }] : s.qa;
    const next = { ...s, qa };
    if (qa.length < s.questions.length) { persist(next, { answer: "" }); return; }
    await run(["situation text", "category/topic/detail", "answered questions"], async (signal) => {
      // Retain the last response before waiting for AI, so reload can retry it.
      persist(next, { answer: "" });
      const rev = revision.current;
      const result = await makeResult(next, { useAI, signal });
      if (!active.current || signal.aborted || revision.current !== rev) return;
      persist({ ...next, result }, { stage: "result", answer: "" });
    });
  };

  const convert = async () => {
    if (!ownerId || !s || !preview || conversionLock.current) return;
    const { suggestion: sug, index: i } = preview;
    if (sug.kind === "habit" && !preview.frequency) return;
    conversionLock.current = true;
    const rev = revision.current;
    const suggestionId = sug.id || `suggestion-${i}`;
    setBusyIdx(i);
    try {
      const ok = await convertSuggestion(ownerId, sug, s.id, { suggestionId, title: preview.title, privateNotes: preview.notes, dueDate: preview.due || null, frequency: preview.frequency || undefined });
      if (!active.current || revision.current !== rev) return;
      if (ok) {
        persist({ ...s, converted: { ...s.converted, [suggestionId]: { kind: sug.kind, destinationId: needsDestinationId(s.id, suggestionId, sug.kind) } } }, { preview: null });
        toast.success(T("مقصد ساخته شد؛ وضعیت ثبت پیوند جلسه را جدا بررسی کن.", "Destination created. Session link saving is reported separately."));
      } else toast.error(T("مقصد ساخته نشد؛ دوباره تلاش کن.", "Destination was not created. Try again."));
    } finally { conversionLock.current = false; if (active.current) setBusyIdx(null); }
  };

  const giveFeedback = (suggestion: NeedsSuggestion, index: number, feedback: NeedsSuggestionFeedback) => {
    const session = current.current.s;
    if (!session?.result || conversionLock.current || lock.current) return;
    const suggestionId = suggestion.id || `suggestion-${index}`;
    const history = session.decisionHistory ?? [];
    if (history.some((decision) => decision.suggestionId === suggestionId)) return;
    const decision: NeedsDecision = { suggestionId, feedback, suggestion, alternative: null, created_at: new Date().toISOString() };
    const next = { ...session, decisionHistory: [...history, decision] };
    // Feedback is a local-library decision, even when the original was AI.
    // Preserve original result/text; never call AI or silently apply an idea.
    decision.alternative = localResult(next).suggestions[0] ?? null;
    persist(next, { preview: null });
  };

  if (!s) return <div className="page-shell grid place-items-center gap-3 py-20">{loadError || !ownerId ? <><p role="alert">{T("جلسه بارگذاری نشد؛ ممکن است حذف شده یا ارتباط قطع باشد.", "Session could not be loaded. It may be deleted or unavailable.")}</p><button onClick={() => setRetry((n) => n + 1)}>{T("تلاش دوباره", "Retry")}</button></> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}</div>;

  const title = topic ? L(topic.title) : cat ? L(cat.title) : T("نیاز جدید", "New need");
  const kindIcon = { task: ClipboardList, note: NotebookPen, habit: Repeat } as const;
  const kindLabel = { task: T("تسک", "Task"), note: T("یادداشت", "Note"), habit: T("عادت", "Habit") } as const;
  const qIndex = Math.min(answeredCount, Math.max(0, s.questions.length - 1));
  const decisions = s.decisionHistory ?? [];
  const displayedSuggestions = (s.result?.suggestions ?? []).map((original, index) => {
    let suggestion: NeedsSuggestion | null = original;
    for (const decision of decisions) if (suggestion && decision.suggestionId === (suggestion.id || `suggestion-${index}`)) suggestion = decision.alternative;
    return suggestion;
  });

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-28 animate-fade-in" data-testid="needs-session">
      <HeaderTitlePortal title={title} />
      <ConcernNav ownerId={ownerId} concernId={concernId} toolId="needs" slot={slot} />
      <DraftPrivacy {...draft} />
      <Back to={cat && cat.id !== "unknown" ? `/app/mind/needs/${cat.id}${topic ? "/" + topic.id : ""}` : "/app/mind"} label={T("بازگشت", "Back")} />
      <div className="surface-card space-y-2 p-3 text-xs" aria-live="polite" data-testid="needs-save-status">
        <p>{draft.durable ? T("نسخهٔ این مرحله روی دستگاه حفظ شده است.", "This stage is retained on this device.") : T("حفظ روی دستگاه تأیید نشده؛ نوشته را کپی کن یا دوباره ذخیره کن.", "Device retention is not confirmed. Copy your writing or retry saving.")}</p>
        {!draft.durable && !draft.conflict && <button type="button" onClick={() => draft.setValue(current.current)}>{T("تلاش دوباره روی دستگاه", "Retry device saving")}</button>}
        <p>{saveStatus === "saving" ? T("در حال ذخیره در حساب…", "Saving to account…") : saveStatus === "synced" ? T("این نسخه در حساب ذخیره شد.", "This version is saved to your account.") : saveStatus === "failed" ? T("ذخیره در حساب انجام نشد؛ نتیجه همچنان در این صفحه است.", "Account saving failed; the guidance is still shown here.") : T("ذخیرهٔ این نسخه در حساب هنوز تأیید نشده است.", "Account saving of this version is not yet confirmed.")}</p>
        {ownerId && !busy && <button type="button" disabled={saveStatus === "saving" || draft.temporary || draft.conflict || !!remoteSession} onClick={() => saveCloud({ ...s, text: stage === "describe" ? answer : s.text })}>{T("ذخیره / تلاش دوباره در حساب", "Save / retry account saving")}</button>}
        {(draft.conflict || remoteSession) && <div role="alert" className="space-y-2"><p>{T("نسخهٔ دیگری تغییر کرده؛ نوشتهٔ شما جایگزین نشده است. قبل از انتخاب نسخهٔ دیگر، متن فعلی را کپی کن.", "Another version changed. Your writing was not replaced. Copy your current text before choosing the other version.")}</p><button type="button" onClick={() => { cancelRequest(); if (remoteSession) { change({ s: remoteSession, answer: remoteSession.questions.length || remoteSession.result ? "" : remoteSession.text, stage: remoteSession.result ? "result" : remoteSession.questions.length ? "asking" : "describe", preview: null }); setRemoteSession(null); } else draft.acceptRemote(); setSaveStatus("idle"); }}>{T("پذیرش نسخهٔ دیگر", "Accept other version")}</button><button type="button" onClick={() => { cancelRequest(); if (draft.keepLocal()) setRemoteSession(null); setSaveStatus("idle"); }}>{T("حفظ نسخهٔ من", "Keep my version")}</button></div>}
        {loadError && <p role="alert">{T("جلسهٔ حساب در دسترس نیست یا حذف شده؛ نسخهٔ محلی نمایش داده می‌شود.", "The account session is unavailable or deleted; showing your local version.")} <button onClick={() => setRetry((n) => n + 1)}>{T("تلاش دوباره", "Retry")}</button></p>}
      </div>
      {showSafety && <SafetyNotice />}
      {!busy && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={busyIdx !== null} checked={useAI} onChange={(e) => change({ useAI: e.target.checked })} />{T("انتخاب AI؛ پیش از ارسال، سرویس و زمینه را تأیید می‌کنم", "Use AI; confirm service and shared fields before sending")}</label>}
      {!busy && <button type="button" disabled={busyIdx !== null} data-testid="needs-finish" onClick={() => { persist({ ...s, text: stage === "describe" ? answer : s.text, finished: true }); toast.success(T("فعلاً کافی است؛ ساخت قدم لازم نیست. وضعیت ذخیره را بالا ببین.", "Enough for now. No task is required. Check saving status above.")); }}>{s.finished ? T("فعلاً پایان یافته — می‌توانی ادامه بدهی", "Finished for now — you can still continue") : T("فعلاً کافی است — بدون ساخت قدم", "Enough for now — no task required")}</button>}

      {stage === "describe" && (
        <section className="space-y-3" data-testid="needs-describe">
          <h1 className="text-lg font-bold">{s.category === "unknown" ? T("هر چه در ذهن داری بنویس", "Write whatever is on your mind") : T("بگو چه خبر است", "Tell me what's going on")}</h1>
          <p className="text-xs leading-5 text-muted-foreground">{T("هر چه راحتی بنویس. راهنمای محلی پیش‌فرض است و نوشته‌ات را به AI نمی‌فرستد.", "Write freely. Local guidance is the default and sends no writing to AI.")}</p>
          <fieldset className="flex flex-wrap gap-3"><legend className="text-xs">{T("میزان همراهی", "Guidance length")}</legend>{(["short", "more"] as const).map((choice) => <label key={choice} className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="intensity" checked={intensity === choice} onChange={() => change({ intensity: choice })} />{choice === "short" ? T("کوتاه", "Short") : T("بیشتر بررسی کنیم", "Explore more")}</label>)}</fieldset>
          <fieldset className="flex flex-wrap gap-3" data-testid="needs-goal"><legend className="text-xs">{T("هدف اختیاری — لازم نیست انتخاب کنی", "Optional goal — no selection required")}</legend>{([null, "calm", "clarify", "step"] as const).map((goal) => <label key={goal || "none"} className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="needs-goal" checked={(s.preferences?.goal ?? null) === goal} onChange={() => change({ s: { ...s, preferences: { ...s.preferences, goal } } })} />{goal === "calm" ? T("آرام‌تر شوم", "Feel calmer") : goal === "clarify" ? T("روشن‌تر ببینم", "See more clearly") : goal === "step" ? T("یک قدم انتخاب کنم", "Choose a step") : T("بدون ترجیح", "No goal preference")}</label>)}</fieldset>
          <fieldset className="flex flex-wrap gap-3" data-testid="needs-capacity"><legend className="text-xs">{T("ظرفیت اختیاری برای همین تمرین", "Optional capacity for this exercise")}</legend>{([null, "low", "usual"] as const).map((capacity) => <label key={capacity || "none"} className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="needs-capacity" checked={(s.preferences?.capacity ?? null) === capacity} onChange={() => change({ s: { ...s, preferences: { ...s.preferences, capacity } } })} />{capacity === "low" ? T("انرژی کم — فقط یک بخش کوچک", "Low energy — one small instruction") : capacity === "usual" ? T("ظرفیت معمول", "Usual capacity") : T("بدون ترجیح ظرفیت", "No capacity preference")}</label>)}</fieldset>
          <p className="text-xs text-muted-foreground">{T("هدف، ظرفیت و بازخورد پیشنهادها فقط انتخاب راهنمای محلی را تغییر می‌دهند؛ به AI ارسال نمی‌شوند.", "Goal, capacity and suggestion feedback only change local library choices; they are not sent to AI.")}</p>
          {topic && <p className="rounded-xl bg-muted/50 p-2.5 text-xs leading-5">{L(topic.question)}</p>}
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={7} className={taClass} placeholder={T("می‌خواهم بگویم…", "I want to say…")} data-testid="needs-text" />
          <button type="button" onClick={submitDescribe} disabled={!answer.trim()} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40" data-testid="needs-continue">{T("ادامه", "Continue")}</button>
        </section>
      )}

      {stage === "working" && (
        <div className="grid place-items-center gap-2 py-16 text-sm text-muted-foreground" role="status" data-testid="needs-working"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--rose-gold))]" />{T("در حال آماده‌کردن راهنما…", "Preparing guidance…")}<button type="button" onClick={cancelRequest}>{T("لغو نمایش پاسخ؛ پردازش سرویس ممکن است ادامه یابد", "Cancel response; provider processing may continue")}</button></div>
      )}

      {stage === "classify" && (
        <section className="space-y-3" data-testid="needs-classify">
          <h1 className="text-lg font-bold">{T("به نظر می‌رسد این‌ها نزدیک‌ترین هستند", "These seem closest")}</h1>
          <div className="grid gap-2">
            {matches.map((m) => { const c = getCategory(m.cat); const t = getTopic(m.cat, m.topic); return (
              <button key={`${m.cat}/${m.topic}`} type="button" onClick={() => pickMatch(m)} data-testid={`needs-match-${m.topic}`} className="surface-card p-3.5 text-start hover:border-[hsl(var(--rose-gold)/0.6)]">
                <span className="block text-xs text-muted-foreground">{L(c?.title)}</span><span className="block text-sm font-bold">{L(t?.title)}</span>
              </button>); })}
          </div>
          {matches.length === 0 && <p className="text-sm text-muted-foreground">{T("موضوع مشخصی پیدا نشد؛ انتخاب دسته لازم نیست.", "No topic matched. A category is not required.")}</p>}
          <button type="button" onClick={() => run(["situation text", "answers (if any)"], (signal) => startQuestions(s, signal))}>{T("ادامه بدون انتخاب دسته", "Continue without a category")}</button>
          <Link to="/app/mind" className="inline-block text-sm font-medium text-primary hover:underline" data-testid="needs-choose-self">{T("خودم دسته را انتخاب می‌کنم", "I'll choose a category myself")}</Link>
        </section>
      )}

      {stage === "asking" && s.questions.length > 0 && (
        <section className="space-y-3" data-testid="needs-asking">
          <p className="text-xs text-muted-foreground" data-testid="needs-progress">{T(`پرسش ${qIndex + 1} از ${s.questions.length}`, `Question ${qIndex + 1} of ${s.questions.length}`)}</p>
          <p className="text-xs text-muted-foreground">{T("تأمل اختیاری؛ در راهنمای محلی این پاسخ‌ها روش‌های کتابخانه را تغییر نمی‌دهند.", "Optional reflection; in local guidance these answers do not change the library methods.")}</p>
          <h1 className="text-base font-bold leading-7" data-testid="needs-question">{answeredCount >= s.questions.length ? T("پاسخ‌ها حفظ شده‌اند؛ می‌توانی تهیهٔ راهنما را دوباره امتحان کنی.", "Your answers are retained. You can retry preparing guidance.") : s.questions[qIndex]}</h1>
          {answeredCount < s.questions.length && <textarea key={qIndex} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} className={taClass} placeholder={T("جوابت…", "Your answer…")} data-testid="needs-answer" />}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => submitAnswer(false)} disabled={answeredCount < s.questions.length && !answer.trim()} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40" data-testid="needs-next">{qIndex + 1 >= s.questions.length ? T("دیدن نتیجه", "See guidance") : T("بعدی", "Next")}</button>
            <button type="button" onClick={() => submitAnswer(true)} className="text-sm text-muted-foreground hover:text-foreground" data-testid="needs-skip">{T("رد کردن", "Skip")}</button>
          </div>
        </section>
      )}

      {stage === "result" && s.result && (
        <div className="space-y-5" data-testid="needs-result">
          <section className="surface-card space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><HeartHandshake className="h-4 w-4 text-[hsl(var(--rose-gold))]" />{s.result.source === "local" ? T("گزینه‌های کتابخانه — نه برداشت از نوشته", "Library options — not an interpretation") : T("برداشت احتمالی AI", "Tentative AI interpretation")}</div>
            <p className="text-sm leading-7" data-testid="needs-summary">{s.result.summary}</p>
            {s.result.causes.length > 0 && (<><p className="pt-1 text-xs font-semibold text-muted-foreground">{T("علت‌های ممکن (فقط حدس)", "Possible contributors (just a guess)")}</p><ul className="list-disc space-y-1 ps-5 text-sm leading-6">{s.result.causes.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
            <p className="text-[11px] text-muted-foreground" data-testid="needs-source">{s.result.source === "ai" ? T("با کمک AI؛ برداشت احتمالی است.", "AI-assisted; this is a tentative interpretation.") : T("از کتابخانهٔ محلی؛ این نتیجه خروجی AI نیست.", "From the local library; this guidance is not AI output.")}</p>
          </section>

          {s.result.suggestions.length > 0 && (
            <section className="space-y-2" data-testid="needs-suggestions"><h3 className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4 text-[hsl(var(--rose-gold))]" />{T("پیشنهادها — از ساده‌ترین قدم", "Suggestions — easiest step first")}</h3>
              {displayedSuggestions.map((sug, i) => { if (!sug) return <div key={i} className="surface-card p-3 text-sm" data-testid={`needs-suggestion-${i}`}>{T("گزینهٔ کوچکِ بازبینی‌شدهٔ دیگری باقی نمانده؛ فعلاً کافی است هم انتخاب معتبری است.", "No further reviewed option remains in this branch. Enough for now is a valid choice.")}</div>; const Ic = kindIcon[sug.kind]; const link = s.converted?.[sug.id || `suggestion-${i}`]; return (
                <div key={i} className="surface-card space-y-2 p-3" data-testid={`needs-suggestion-${i}`}>
                  <div className="flex items-start gap-3"><span className="min-w-0 flex-1 text-sm leading-6">{sug.text}<span className="block text-xs text-muted-foreground">{sug.reason || T("یک ایدهٔ احتمالی است، نه تشخیص.", "A possible idea, not a diagnosis.")}</span>{sug.source === "local" && <span className="block text-xs text-muted-foreground">{T("گزینهٔ محلی؛ بدون ارسال تازه به AI", "Local option; no new AI request")}</span>}</span>
                  {link ? <Link className="inline-flex min-h-11 items-center gap-2 text-xs" to={link.kind === "task" ? `/app/tasks/${encodeURIComponent(link.destinationId)}` : link.kind === "note" ? `/app/notes?select=${encodeURIComponent(link.destinationId)}` : "/app/today"}><CheckCircle2 className="h-4 w-4" />{T("بازکردن", "Open")}</Link> : <button type="button" disabled={!ownerId || busyIdx !== null} onClick={() => setPreview({ suggestion: sug, index: i, title: sug.text, notes: "", due: "", frequency: "" })} data-testid={`needs-convert-${i}`} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-medium hover:bg-muted/70 disabled:opacity-60"><Ic className="h-4 w-4" />{T("پیش‌نمایش", "Preview")} {kindLabel[sug.kind]}</button>}
                  </div>
                  {!link && <div className="flex flex-wrap gap-2" aria-label={T("بازخورد اختیاری پیشنهاد", "Optional suggestion feedback")}>{(["irrelevant", "no_energy", "other"] as const).map((feedback) => <button key={feedback} type="button" disabled={busyIdx !== null} onClick={() => giveFeedback(sug, i, feedback)} data-testid={`needs-feedback-${i}-${feedback}`} className="min-h-11 rounded-lg border border-border px-3 text-xs">{feedback === "irrelevant" ? T("نامرتبط", "Not relevant") : feedback === "no_energy" ? T("انرژی‌اش را ندارم", "No energy for this") : T("گزینهٔ دیگر", "Another option")}</button>)}</div>}
                </div>); })}
            </section>
          )}
          {decisions.length > 0 && <details className="surface-card p-3 text-xs" data-testid="needs-decision-history"><summary className="min-h-11 cursor-pointer">{T("پیشنهادهای اصلی و انتخاب‌های تو — بدون بازنویسی", "Original suggestions and your choices — kept unchanged")}</summary><ul className="space-y-2">{s.result.suggestions.map((suggestion, index) => <li key={`original-${index}`}>{suggestion.text}</li>)}{decisions.map((decision, index) => <li key={`decision-${index}`}>{decision.feedback === "irrelevant" ? T("نامرتبط", "Not relevant") : decision.feedback === "no_energy" ? T("انرژی‌اش را ندارم", "No energy for this") : T("گزینهٔ دیگر", "Another option")}: {decision.suggestion.text} → {decision.alternative?.text || T("فعلاً کافی است", "Enough for now")}</li>)}</ul></details>}

          {s.result.methodIds.length > 0 && <section className="space-y-2" data-testid="needs-methods"><h3 className="text-sm font-bold">{T("روش حل مناسب", "A method that fits")}</h3>{s.result.methodIds.map((m) => <MethodCard key={m} id={m} sessionId={s.id} temporary={draft.temporary} />)}</section>}

          {s.result.reflections.length > 0 && <section className="space-y-2"><h3 className="text-sm font-bold">{T("پرسش‌های تأمل", "Questions to reflect on")}</h3><ul className="list-disc space-y-1 ps-5 text-sm leading-6">{s.result.reflections.map((r, i) => <li key={i}>{r}</li>)}</ul></section>}

          <PackSection methods={[]} sessionId={s.id}
            checks={[...new Set([...(s.result.checkIds || []), ...(topic?.checks ?? [])])].filter((c) => checkInfo(c, isEn)).slice(0, 3)}
            tools={(topic?.tools ?? []).filter((t) => TOOLS[t])} />

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/app/mind/my-needs" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-muted px-4 text-sm font-medium" data-testid="needs-saved-link"><BookMarked className="h-4 w-4" />{T("نیازهای من", "My needs")}</Link>
            <button type="button" onClick={() => navigate("/app/mind")} className="inline-flex h-10 items-center rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground" data-testid="needs-change-topic">{T("دسته یا موضوع دیگر", "Try another topic")}</button>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">{T("این راهنمایی برای آگاهی و خودیاری است؛ تشخیص یا درمان نیست.", "This guidance is for awareness and self-help — not a diagnosis or treatment.")}</p>
        </div>
      )}
      {preview && <section role="dialog" aria-modal="false" aria-labelledby="needs-preview-title" className="surface-card space-y-3 p-4" data-testid="needs-conversion-preview">
        <h2 id="needs-preview-title" className="font-bold">{T("پیش‌نمایش قدم", "Step preview")} — {kindLabel[preview.suggestion.kind]}</h2>
        <p className="text-xs">{T("پیش‌فرض: بدون موعد و بدون یادداشت خصوصی. عنوان را پیش از ساخت بررسی کن.", "Default: no due date and no private notes. Review the title before creating.")}</p>
        <label className="block text-sm">{T("عنوان", "Title")}<textarea disabled={busyIdx !== null} className={taClass} value={preview.title} onChange={(e) => setPreview({ ...preview, title: e.target.value })} /></label>
        {preview.suggestion.kind !== "habit" && <label className="block text-sm">{T("جزئیات خصوصی اختیاری — فقط با افزودن تو کپی می‌شود", "Optional private details — copied only if you add them")}<textarea disabled={busyIdx !== null} className={taClass} value={preview.notes} onChange={(e) => setPreview({ ...preview, notes: e.target.value })} /></label>}
        {preview.suggestion.kind === "task" && <label className="block text-sm">{T("موعد اختیاری", "Optional due date")}<input disabled={busyIdx !== null} type="date" value={preview.due} onChange={(e) => setPreview({ ...preview, due: e.target.value })} /></label>}
        {preview.suggestion.kind === "habit" && <label className="block text-sm">{T("تناوب را خودت انتخاب کن", "Choose recurrence explicitly")}<select disabled={busyIdx !== null} value={preview.frequency} onChange={(e) => setPreview({ ...preview, frequency: e.target.value as "" | "daily" | "weekly" })}><option value="">{T("انتخاب نشده", "Not selected")}</option><option value="daily">{T("روزانه", "Daily")}</option><option value="weekly">{T("هفتگی", "Weekly")}</option></select></label>}
        <button className="min-h-11 px-3" type="button" disabled={busyIdx !== null || !preview.title.trim() || (preview.suggestion.kind === "habit" && !preview.frequency)} onClick={convert}>{busyIdx !== null ? T("در حال ساخت…", "Creating…") : T("تأیید و ساخت", "Confirm and create")}</button><button className="min-h-11 px-3" type="button" disabled={busyIdx !== null} onClick={() => setPreview(null)}>{T("لغو", "Cancel")}</button>
      </section>}
    </div>
  );
}
