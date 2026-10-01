import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, CloudOff, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { newAttemptId, type FredProgressRecord, type FredStatus, type SaveState } from "./fredProgress";
import { LESSON_SECTIONS, type FredLesson, type FredToolId, type L } from "./fredLessons";
import { FredWorkflowPanel } from "./FredWorkflowPanel";

const tools: Record<FredToolId, React.ComponentType> = {
  dispense: lazy(() => import("./modules/FredDispenseModule").then(m => ({ default: m.FredDispenseModule }))),
  safetynet: lazy(() => import("./modules/FredSafetynetModule").then(m => ({ default: m.FredSafetynetModule }))),
  labeling: lazy(() => import("./modules/FredLabelingModule").then(m => ({ default: m.FredLabelingModule }))),
  retention: lazy(() => import("./modules/FredRetentionModule").then(m => ({ default: m.FredRetentionModule }))),
  visualizer: lazy(() => import("./modules/FredVisualizerModule").then(m => ({ default: m.FredVisualizerModule }))),
  terminal: lazy(() => import("./modules/FredTerminalModule").then(m => ({ default: m.FredTerminalModule }))),
  review: lazy(() => import("./modules/FredReviewModule").then(m => ({ default: m.FredReviewModule }))),
  odt: lazy(() => import("./modules/FredOdtModule").then(m => ({ default: m.FredOdtModule }))),
  pbspos: lazy(() => import("./modules/FredPbsposModule").then(m => ({ default: m.FredPbsposModule }))),
  workflow: FredWorkflowPanel,
};
const TOOL_LABEL: Record<FredToolId, L> = {
  visualizer: ["نمایشگر نسخه", "Script visualizer"], terminal: ["ترمینال تمرینی", "Practice terminal"], dispense: ["شبیه‌ساز Dispense", "Dispense simulator"],
  labeling: ["طراحی برچسب", "Label designer"], pbspos: ["دسته‌بندی PBS/POS", "PBS/POS categorisation"], safetynet: ["محاسبهٔ Safety Net", "Safety Net calculation"],
  workflow: ["گردش کار کامل", "Full workflow"], review: ["بازبینی نهایی", "Final review"], retention: ["نگهداری مدارک", "Document retention"], odt: ["ثبت جلسه ODT", "ODT session"],
};
export const STATUS_LABEL: Record<FredStatus, L> = { not_started: ["شروع‌نشده", "Not started"], learning: ["در حال یادگیری", "Learning"], practised: ["تمرین‌شده", "Practised"] };
const STEP_LABEL: Record<(typeof LESSON_SECTIONS)[number], L> = {
  goal: ["هدف", "Goal"], concept: ["مفهوم", "Concept"], example: ["مثال حل‌شده", "Worked example"], guided: ["تمرین هدایت‌شده", "Guided practice"], independent: ["تمرین مستقل", "Independent practice"], keypoints: ["نکات کلیدی", "Key points"],
};

export function SaveBadge({ state, cloud, onRetry }: { state: SaveState | undefined; cloud: boolean; onRetry: () => void }) {
  const { T } = useBilingual();
  if (!cloud) return <span data-testid="fred-save-state" data-state="local" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CloudOff className="h-3.5 w-3.5" aria-hidden="true" />{T("فقط ذخیرهٔ محلی؛ برای همگام‌سازی وارد شو", "Local only; sign in to sync")}</span>;
  if (!state) return null;
  if (state === "saved") return <span data-testid="fred-save-state" data-state="saved" role="status" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{T("ذخیره شد", "Saved")}</span>;
  if (state === "queued") return <span data-testid="fred-save-state" data-state="queued" role="status" className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><Loader2 className="h-3.5 w-3.5" aria-hidden="true" />{T("در صف ارسال؛ پس از اتصال ذخیره می‌شود", "Queued; will save when online")}</span>;
  return <span data-testid="fred-save-state" data-state="failed" role="alert" className="inline-flex items-center gap-2 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" aria-hidden="true" />{T("ذخیره نشد", "Not saved")}<Button type="button" size="sm" variant="outline" className="h-7" onClick={onRetry}>{T("تلاش دوباره", "Retry")}</Button></span>;
}

interface Props {
  lesson: FredLesson; record: FredProgressRecord | undefined; saveState: SaveState | undefined; cloud: boolean;
  nextLesson: FredLesson | null; cardsMessage: string | null; reviewTopicId: string | null; onNextLesson: () => void;
  onStep: (index: number) => void; onPracticed: (attemptId: string) => void; onRetry: () => void;
}

export function FredLessonView({ lesson, record, saveState, cloud, nextLesson, cardsMessage, reviewTopicId, onNextLesson, onStep, onPracticed, onRetry }: Props) {
  const { T } = useBilingual();
  const loc = (t: L) => T(t[0], t[1]);
  const step = Math.min(record?.stepIndex ?? 0, LESSON_SECTIONS.length - 1);
  const section = LESSON_SECTIONS[step];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [tool, setTool] = useState<FredToolId | null>(null);
  const attemptRef = useRef<string | null>(null);
  const allCorrect = useMemo(() => lesson.guided.every(q => answers[q.id] === q.correct), [answers, lesson]);
  const choose = (qid: string, index: number) => {
    const next = { ...answers, [qid]: index };
    setAnswers(next);
    if (lesson.guided.every(q => next[q.id] === q.correct)) { attemptRef.current ??= newAttemptId(); onPracticed(attemptRef.current); }
  };
  const ActiveTool = tool ? tools[tool] : null;
  const toolPicker = (ids: readonly FredToolId[]) => ids.length > 0 && <div className="mt-4 border-t pt-3" data-testid="fred-tool-area">
    <p className="text-xs text-muted-foreground mb-2">{T("ابزار تمرین", "Practice tool")}</p>
    <div className="flex flex-wrap gap-2">{ids.map(id => <Button key={id} type="button" size="sm" variant={tool === id ? "default" : "outline"} aria-pressed={tool === id} data-testid={`fred-tool-${id}`} onClick={() => setTool(tool === id ? null : id)}>{loc(TOOL_LABEL[id])}</Button>)}</div>
    {ActiveTool && <div className="mt-3"><Suspense fallback={<p role="status" className="text-sm text-muted-foreground p-3">{T("در حال آماده‌سازی ابزار…", "Preparing the tool…")}</p>}><ActiveTool /></Suspense></div>}
  </div>;

  return <article className="min-w-0 space-y-4" aria-label={loc(lesson.title)} data-testid={`fred-lesson-${lesson.id}`}>
    <header className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span data-testid="fred-lesson-status" data-status={record?.status ?? "not_started"} className="text-xs rounded-full border px-2.5 py-1">{loc(STATUS_LABEL[record?.status ?? "not_started"])}</span>
        <SaveBadge state={saveState} cloud={cloud} onRetry={onRetry} />
      </div>
      <h2 className="text-xl font-semibold leading-8">{loc(lesson.title)}</h2>
      {lesson.needsVerification && <p data-testid="fred-verify-banner" className="flex items-start gap-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-2.5 text-xs leading-6"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><span>{T("نیاز به تأیید + منبع: قانون‌ها، مبلغ‌ها و سقف‌ها در این درس فقط از دادهٔ نمونهٔ برنامه می‌آیند و مرجع جاری نیستند؛ پیش از استفادهٔ واقعی با منبع رسمی جاری تطبیق بده.", "Needs verification + source: rules, amounts and limits here come only from the app's sample data and are not a current reference; check the current official source before real use.")}</span></p>}
    </header>
    <nav aria-label={T("مراحل درس", "Lesson steps")} className="flex flex-wrap gap-1 border-b pb-2">
      {LESSON_SECTIONS.map((s, i) => <button key={s} type="button" data-testid={`fred-step-${s}`} aria-current={i === step ? "step" : undefined} onClick={() => onStep(i)} className={`min-h-9 rounded-md px-2.5 text-xs ${i === step ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{i + 1}. {loc(STEP_LABEL[s])}</button>)}
    </nav>
    <div className="min-h-[12rem] space-y-4" data-testid={`fred-section-${section}`}>
      {section === "goal" && <p className="text-base leading-8">{loc(lesson.goal)}</p>}
      {section === "concept" && <><div className="space-y-3">{lesson.concept.map((p, i) => <p key={i} className="text-sm leading-8">{loc(p)}</p>)}</div>
        <ul className="flex flex-wrap gap-2" aria-label={T("اصطلاحات", "Terms")}>{lesson.terms.map((t, i) => <li key={i} dir="auto" className="rounded border px-2 py-1 text-xs">{loc(t)}</li>)}</ul></>}
      {section === "example" && <><h3 className="font-medium text-sm">{loc(lesson.example.title)}</h3>
        <ol className="space-y-2">{lesson.example.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">{i + 1}</span><span className="text-sm leading-7">{loc(s)}</span></li>)}</ol>
        {toolPicker(lesson.tools)}</>}
      {section === "guided" && <div className="space-y-5">{lesson.guided.map((q, qi) => {
        const picked = answers[q.id]; const done = picked !== undefined; const right = picked === q.correct;
        return <fieldset key={q.id} className="space-y-2" data-testid={`fred-question-${q.id}`}><legend className="text-sm font-medium leading-7">{qi + 1}. {loc(q.prompt)}</legend>
          {q.choices.map((c, ci) => <label key={ci} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"><input type="radio" name={`${lesson.id}-${q.id}`} checked={picked === ci} onChange={() => choose(q.id, ci)} className="mt-1" data-testid={`fred-choice-${q.id}-${ci}`} />{loc(c)}</label>)}
          {done && <div role="status" data-testid={`fred-feedback-${q.id}`} data-correct={right} className="flex gap-2 border-s-2 border-primary ps-3 text-sm">{right ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />}<span><strong>{right ? T("درست است.", "Correct.") : T("دوباره فکر کن.", "Think again.")}</strong> {loc(q.explanation)}</span></div>}
        </fieldset>;
      })}
        {allCorrect && <p role="status" data-testid="fred-practised-note" className="text-sm font-medium">{T("تمرین هدایت‌شده کامل شد؛ وضعیت درس «تمرین‌شده» است.", "Guided practice complete; the lesson is now “Practised”.")}</p>}</div>}
      {section === "independent" && <><p className="text-xs text-muted-foreground">{T("اختیاری؛ برای ادامه لازم نیست.", "Optional; not needed to continue.")}</p><p className="text-sm leading-8">{loc(lesson.independent.prompt)}</p>{toolPicker(lesson.independent.tool ? [lesson.independent.tool] : [])}</>}
      {section === "keypoints" && <><ul className="space-y-3">{lesson.keyPoints.map((kp, i) => <li key={i} className="rounded-lg border p-3" data-testid={`fred-keypoint-${i}`}><p className="text-sm font-medium">{loc(kp.front)}</p><p className="mt-1 text-sm text-muted-foreground leading-7">{loc(kp.back)}</p></li>)}</ul>
        <p role="status" data-testid="fred-cards-status" className="text-xs text-muted-foreground">{cardsMessage ?? T("در حال افزودن نکات به صف مرور…", "Adding key points to the review queue…")} <Link className="text-primary underline" data-testid="fred-review-topic-link" to={`/app/review?domain=pharmacy${reviewTopicId ? `&topic=${encodeURIComponent(reviewTopicId)}` : ""}`}>{T("باز کردن مرور", "Open review")}</Link></p></>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <Button type="button" variant="ghost" size="sm" disabled={step === 0} onClick={() => onStep(step - 1)}>{T("مرحلهٔ قبل", "Previous step")}</Button>
      {step < LESSON_SECTIONS.length - 1 ? <Button type="button" size="sm" onClick={() => onStep(step + 1)} data-testid="fred-next-step">{T("مرحلهٔ بعد", "Next step")}</Button>
        : nextLesson && <Button type="button" size="sm" onClick={onNextLesson} data-testid="fred-next-lesson">{T("درس بعدی", "Next lesson")}: {loc(nextLesson.title)}</Button>}
    </footer>
  </article>;
}
