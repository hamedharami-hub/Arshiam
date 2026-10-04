import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookMarked, CheckCircle2, ClipboardList, HeartHandshake, Loader2, NotebookPen, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Back, MethodCard, PackSection, SafetyNotice, checkInfo } from "@/components/needs/NeedsBits";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { getCategory, getTopic, TOOLS } from "@/lib/needs/tree";
import {
  convertSuggestion, hasAI, localQuestions, makeQuestions, makeResult, needsSafetyNotice, newSessionId, saveSession, subscribeSessions, suggestTopics,
} from "@/lib/needs/service";
import type { NeedsSession, NeedsSuggestion } from "@/lib/needs/types";

type Stage = "describe" | "classify" | "asking" | "working" | "result";
const taClass = "w-full resize-none rounded-xl border border-border bg-card p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--rose-gold)/0.6)]";

export default function NeedsSessionView() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const lang = isEn ? "en" : "fa";
  const L = (b?: { fa: string; en: string }) => (b ? b[lang] : "");

  const [s, setS] = useState<NeedsSession | null>(null);
  const [stage, setStage] = useState<Stage>("describe");
  const [answer, setAnswer] = useState("");
  const [matches, setMatches] = useState<Array<{ cat: string; topic: string }>>([]);
  const [converted, setConverted] = useState<Record<number, boolean>>({});
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const loaded = useRef(false);
  const isNew = id === "new";

  // Initialise a new session or load a saved one.
  useEffect(() => {
    if (loaded.current) return;
    if (isNew) {
      const now = new Date().toISOString();
      setS({ id: newSessionId(), category: sp.get("cat") || "unknown", topic: sp.get("topic"), detail: sp.get("detail"), text: "", qa: [], questions: [], result: null, lang, created_at: now, updated_at: now });
      loaded.current = true;
      return;
    }
    if (!user?.id) return;
    return subscribeSessions(user.id, (items) => {
      if (loaded.current) return;
      const found = items.find((x) => x.id === id);
      if (!found) return;
      loaded.current = true;
      setS(found);
      setStage(found.result ? "result" : found.questions.length ? "asking" : "describe");
    });
  }, [id, isNew, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: NeedsSession) => { setS(next); if (user?.id) void saveSession(user.id, next); };
  const cat = getCategory(s?.category);
  const topic = getTopic(s?.category, s?.topic);
  const showSafety = useMemo(() => (s ? needsSafetyNotice(s) : false), [s]);
  const answeredCount = s ? s.qa.length : 0;

  const startQuestions = async (base: NeedsSession) => {
    setStage("working");
    const questions = await makeQuestions(base);
    persist({ ...base, questions });
    setAnswer("");
    setStage("asking");
  };

  const submitDescribe = async () => {
    if (!s || !answer.trim()) return;
    const base = { ...s, text: answer.trim(), lang: lang as "fa" | "en" };
    if (base.category === "unknown" || !base.topic) {
      if (base.category === "unknown") {
        setS(base); setStage("working");
        const m = await suggestTopics(base.text, base.lang);
        setMatches(m); persist(base); setStage("classify");
        return;
      }
    }
    await startQuestions(base);
  };

  const pickMatch = async (m: { cat: string; topic: string }) => {
    if (!s) return;
    await startQuestions({ ...s, category: m.cat, topic: m.topic });
  };

  const submitAnswer = async (skip: boolean) => {
    if (!s) return;
    const q = s.questions[answeredCount];
    const qa = [...s.qa, { q, a: skip ? "" : answer.trim() }];
    const next = { ...s, qa };
    setAnswer("");
    if (qa.length < s.questions.length) { persist(next); return; }
    setS(next); setStage("working");
    const result = await makeResult(next);
    persist({ ...next, result });
    setStage("result");
  };

  const convert = async (sug: NeedsSuggestion, i: number) => {
    if (!user?.id || !s) return;
    setBusyIdx(i);
    const ok = await convertSuggestion(user.id, sug, s.id);
    setBusyIdx(null);
    if (ok) { setConverted((c) => ({ ...c, [i]: true })); toast.success(T("ذخیره شد", "Saved")); } else toast.error(T("ذخیره نشد", "Could not save"));
  };

  if (!s) return <div className="page-shell grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const title = topic ? L(topic.title) : cat ? L(cat.title) : T("نیاز جدید", "New need");
  const kindIcon = { task: ClipboardList, note: NotebookPen, habit: Repeat } as const;
  const kindLabel = { task: T("تسک", "Task"), note: T("یادداشت", "Note"), habit: T("عادت", "Habit") } as const;
  const qIndex = Math.min(answeredCount, Math.max(0, s.questions.length - 1));

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-28 animate-fade-in" data-testid="needs-session">
      <HeaderTitlePortal title={title} />
      <Back to={cat && cat.id !== "unknown" ? `/app/mind/needs/${cat.id}${topic ? "/" + topic.id : ""}` : "/app/mind"} label={T("بازگشت", "Back")} />
      {showSafety && <SafetyNotice />}

      {stage === "describe" && (
        <section className="space-y-3" data-testid="needs-describe">
          <h1 className="text-lg font-bold">{s.category === "unknown" ? T("هر چه در ذهن داری بنویس", "Write whatever is on your mind") : T("بگو چه خبر است", "Tell me what's going on")}</h1>
          <p className="text-xs leading-5 text-muted-foreground">{T("هر چه راحتی بنویس؛ نه غلط دارد نه صحیح.", "Write as freely as you like — there's no wrong way.")}{hasAI() ? "" : ` ${T("(بدون کلید هوش مصنوعی، از پرسش‌ها و روش‌های آماده استفاده می‌شود.)", "(Without an AI key, ready-made questions and methods are used.)")}`}</p>
          {topic && <p className="rounded-xl bg-muted/50 p-2.5 text-xs leading-5">{L(topic.question)}</p>}
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={7} className={taClass} placeholder={T("می‌خواهم بگویم…", "I want to say…")} data-testid="needs-text" />
          <button type="button" onClick={submitDescribe} disabled={!answer.trim()} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40" data-testid="needs-continue">{T("ادامه", "Continue")}</button>
        </section>
      )}

      {stage === "working" && (
        <div className="grid place-items-center gap-2 py-16 text-sm text-muted-foreground" role="status" data-testid="needs-working"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--rose-gold))]" />{T("در حال فکر به نوشته‌ات…", "Thinking about what you wrote…")}</div>
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
          {matches.length === 0 && <p className="text-sm text-muted-foreground">{T("نتوانستم حدس بزنم — خودت دسته را انتخاب کن.", "I couldn't guess — please pick a category yourself.")}</p>}
          <Link to="/app/mind" className="inline-block text-sm font-medium text-primary hover:underline" data-testid="needs-choose-self">{T("خودم دسته را انتخاب می‌کنم", "I'll choose a category myself")}</Link>
        </section>
      )}

      {stage === "asking" && s.questions.length > 0 && (
        <section className="space-y-3" data-testid="needs-asking">
          <p className="text-xs text-muted-foreground" data-testid="needs-progress">{T(`پرسش ${qIndex + 1} از ${s.questions.length}`, `Question ${qIndex + 1} of ${s.questions.length}`)}</p>
          <h1 className="text-base font-bold leading-7" data-testid="needs-question">{s.questions[qIndex]}</h1>
          <textarea key={qIndex} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} className={taClass} placeholder={T("جوابت…", "Your answer…")} data-testid="needs-answer" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => submitAnswer(false)} disabled={!answer.trim()} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40" data-testid="needs-next">{qIndex + 1 >= s.questions.length ? T("دیدن نتیجه", "See guidance") : T("بعدی", "Next")}</button>
            <button type="button" onClick={() => submitAnswer(true)} className="text-sm text-muted-foreground hover:text-foreground" data-testid="needs-skip">{T("رد کردن", "Skip")}</button>
          </div>
        </section>
      )}

      {stage === "result" && s.result && (
        <div className="space-y-5" data-testid="needs-result">
          <section className="surface-card space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><HeartHandshake className="h-4 w-4 text-[hsl(var(--rose-gold))]" />{T("برداشت من از وضعیتت", "What I understood")}</div>
            <p className="text-sm leading-7" data-testid="needs-summary">{s.result.summary}</p>
            {s.result.causes.length > 0 && (<><p className="pt-1 text-xs font-semibold text-muted-foreground">{T("علت‌های ممکن (فقط حدس)", "Possible contributors (just a guess)")}</p><ul className="list-disc space-y-1 ps-5 text-sm leading-6">{s.result.causes.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
            <p className="text-[11px] text-muted-foreground" data-testid="needs-source">{s.result.source === "ai" ? T("با کمک هوش مصنوعی با کلید خودت", "Written with the AI key you provided") : <>{T("از کتابخانهٔ آماده. برای پیشنهاد شخصی‌تر، کلید هوش مصنوعی را در ", "From the ready-made library. For more personal guidance add an AI key in ")}<Link to="/app/settings" className="text-primary hover:underline">{T("تنظیمات", "Settings")}</Link></>}</p>
          </section>

          {s.result.suggestions.length > 0 && (
            <section className="space-y-2" data-testid="needs-suggestions"><h3 className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4 text-[hsl(var(--rose-gold))]" />{T("پیشنهادها — از ساده‌ترین قدم", "Suggestions — easiest step first")}</h3>
              {s.result.suggestions.map((sug, i) => { const Ic = kindIcon[sug.kind]; return (
                <div key={i} className="surface-card flex items-start gap-3 p-3" data-testid={`needs-suggestion-${i}`}>
                  <span className="min-w-0 flex-1 text-sm leading-6">{sug.text}</span>
                  <button type="button" disabled={converted[i] || busyIdx === i} onClick={() => convert(sug, i)} data-testid={`needs-convert-${i}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-medium hover:bg-muted/70 disabled:opacity-60">
                    {converted[i] ? <CheckCircle2 className="h-4 w-4 text-primary" /> : busyIdx === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ic className="h-4 w-4" />}{converted[i] ? T("ذخیره شد", "Saved") : kindLabel[sug.kind]}
                  </button>
                </div>); })}
            </section>
          )}

          {s.result.methodIds.length > 0 && <section className="space-y-2" data-testid="needs-methods"><h3 className="text-sm font-bold">{T("روش حل مناسب", "A method that fits")}</h3>{s.result.methodIds.map((m) => <MethodCard key={m} id={m} sessionId={s.id} />)}</section>}

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
    </div>
  );
}
