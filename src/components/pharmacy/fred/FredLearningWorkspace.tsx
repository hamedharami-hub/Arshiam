import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBilingual } from "@/hooks/useBilingual";
import { FRED_CURRICULUM, FRED_LESSON_GROUPS, isFredModule, type FredLesson, type FredModuleId } from "./fredCurriculum";
import { FredOwingNoticeDialog } from "./FredOwingNoticeDialog";
import { FredWorkflowPanel } from "./FredWorkflowPanel";
import "./FredLearningWorkspace.css";

const exercises = {
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
type LearningMode = "learn" | "practice" | "check";
interface WorkspaceProps {
  module: FredModuleId; mode: LearningMode; onModule: (id: FredModuleId) => void;
  onMode: (mode: LearningMode) => void; userId: string; inRouter?: boolean;
}

export function FredRoutedWorkspace({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams();
  const selectedModule = params.get("module");
  const selectedMode = params.get("mode");
  const update = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous); next.set(key, value); return next;
  });
  return <FredLearningWorkspace userId={userId} inRouter module={isFredModule(selectedModule) ? selectedModule : FRED_CURRICULUM[0].id} mode={selectedMode === "practice" || selectedMode === "check" ? selectedMode : "learn"} onModule={id => update("module", id)} onMode={mode => update("mode", mode)} />;
}
export function FredStandaloneWorkspace({ userId }: { userId: string }) {
  const [module, setModule] = useState<FredModuleId>(FRED_CURRICULUM[0].id);
  const [mode, setMode] = useState<LearningMode>("learn");
  return <FredLearningWorkspace userId={userId} module={module} mode={mode} onModule={setModule} onMode={setMode} />;
}

function readCompleted(key: string): FredModuleId[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? [...new Set(value.filter((id): id is FredModuleId => typeof id === "string" && isFredModule(id)))] : []; }
  catch { return []; }
}

function FredLearningWorkspace({ module, mode, onModule, onMode, userId, inRouter }: WorkspaceProps) {
  const { T, lang } = useBilingual(); const isEn = lang === "en";
  const localize = (text: readonly [string, string]) => T(text[0], text[1]);
  const lesson = FRED_CURRICULUM.find(item => item.id === module)!;
  const Exercise = exercises[module];
  const [workflowVisited, setWorkflowVisited] = useState(module === "workflow");
  useEffect(() => { if (module === "workflow") setWorkflowVisited(true); }, [module]);
  const [query, setQuery] = useState("");
  const progressKey = `arshnaz:fred-understanding:v1:${userId}`;
  const [completed, setCompleted] = useState<FredModuleId[]>(() => readCompleted(progressKey));
  const [storageError, setStorageError] = useState(false);
  const visible = FRED_CURRICULUM.filter(item => `${item.title.join(" ")} ${item.goal.join(" ")}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const index = FRED_CURRICULUM.findIndex(item => item.id === module);
  const complete = () => {
    const next = [...new Set([...completed, module])]; setCompleted(next);
    try { localStorage.setItem(progressKey, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
  };
  return <main className="fred-learning mx-auto w-full max-w-7xl px-3 py-4 sm:px-5" dir={isEn ? "ltr" : "rtl"} data-testid="fred-learning-workspace">
    <HeaderTitlePortal title={T("آزمایشگاه یادگیری FRED", "FRED Learning Lab")} />
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-4 text-xs">
      <p className="text-muted-foreground">{T("بفهم، تمرین کن، درک خودت را بسنج.", "Understand, practise, check your understanding.")}</p>
      {inRouter && <div className="flex items-center gap-3"><Link to="/app/pharmacy" className="text-primary">{T("داروسازی", "Pharmacy")}</Link><Link to="/app/review/pharmacy" className="text-primary">{T("مرور مطالب", "Review lessons")}</Link></div>}
    </div>
    <div className="fred-learning-layout">
      <aside className="fred-course-navigation">
        <div className="relative mb-3"><Search aria-hidden="true" className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={T("جست‌وجوی درس‌های FRED", "Search FRED lessons")} placeholder={T("پیدا کردن درس…", "Find a lesson…")} className="ps-9" /></div>
        <label className="fred-mobile-picker text-xs" htmlFor="fred-lesson-picker">{T("درس انتخاب‌شده", "Selected lesson")}</label>
        <select id="fred-lesson-picker" className="fred-mobile-picker w-full rounded-md border bg-background p-2 text-sm" value={module} onChange={event => { if (isFredModule(event.target.value)) onModule(event.target.value); }}>
          {FRED_LESSON_GROUPS.map(group => <optgroup key={group.id} label={localize(group.title)}>{FRED_CURRICULUM.filter(item => item.group === group.id).map(item => <option key={item.id} value={item.id}>{localize(item.title)}</option>)}</optgroup>)}
        </select>
        <nav className="fred-desktop-lessons" aria-label={T("ماژول‌های آموزشی", "Educational modules")}>
          {FRED_LESSON_GROUPS.map(group => <section key={group.id} className="mb-4"><h2 className="text-xs text-muted-foreground font-medium px-2 mb-2">{localize(group.title)}</h2>{visible.filter(item => item.group === group.id).map(item => <button key={item.id} type="button" aria-pressed={item.id === module} data-testid={`fred-module-${item.id}`} onClick={() => onModule(item.id)} className="fred-lesson-button"><span>{localize(item.title)}</span>{completed.includes(item.id) && <CheckCircle2 aria-label={T("درک مطلب سنجیده شده", "Understanding checked")} className="h-4 w-4 shrink-0 text-primary" />}</button>)}</section>)}
        </nav>
        {query.trim() && <div className="fred-search-results" role="region" aria-label={T("نتایج جست‌وجوی درس", "Lesson search results")}>{visible.length ? visible.map(item => <button key={item.id} type="button" onClick={() => { onModule(item.id); setQuery(""); }} className="fred-lesson-button">{localize(item.title)}</button>) : <p className="text-xs p-2">{T("درسی پیدا نشد.", "No lessons found.")}</p>}</div>}
        <p className="text-xs text-muted-foreground mt-3" aria-live="polite">{T(`درک مطلب ${completed.length} از ${FRED_CURRICULUM.length} درس سنجیده شده؛ روی این دستگاه.`, `Understanding checked for ${completed.length} of ${FRED_CURRICULUM.length} lessons; on this device.`)}</p>
        {storageError && <p role="alert" className="text-xs text-destructive">{T("پیشرفت روی این دستگاه ذخیره نشد.", "Progress could not be saved on this device.")}</p>}
      </aside>
      <section className="min-w-0" aria-label={localize(lesson.title)}>
        <Tabs value={mode} onValueChange={value => onMode(value as LearningMode)} dir={isEn ? "ltr" : "rtl"}>
          <TabsList className="w-full h-auto flex flex-wrap justify-start bg-transparent border-b rounded-none p-0 pb-2 gap-1 mb-4">
            <TabsTrigger value="learn" className="min-h-10">{T("آموزش", "Learn")}</TabsTrigger>
            <TabsTrigger value="practice" className="min-h-10">{T("تمرین", "Practice")}</TabsTrigger>
            <TabsTrigger value="check" className="min-h-10">{T("سنجش درک مطلب", "Check understanding")}</TabsTrigger>
          </TabsList>
          <TabsContent value="learn" className="mt-0 space-y-5">
            <div><h2 className="text-xl font-semibold mb-2">{localize(lesson.title)}</h2><p className="text-sm text-muted-foreground leading-relaxed">{localize(lesson.goal)}</p></div>
            <ol className="space-y-4">{lesson.steps.map((step, number) => <li key={number} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">{number + 1}</span><p className="text-sm leading-7">{localize(step)}</p></li>)}</ol>
            <p className="text-xs text-muted-foreground border-t pt-3">{T("نمونه‌ها آموزشی‌اند؛ متن منبع و هشدارها را در تمرین بخوان. این بخش به سیستم واقعی داروخانه متصل نیست.", "Samples are educational; read source text and warnings in the exercise. This workspace is not connected to a real pharmacy system.")}</p>
            <Button onClick={() => onMode("practice")} className="gap-2"><BookOpen className="h-4 w-4" />{T("شروع تمرین این درس", "Start this lesson's practice")}</Button>
          </TabsContent>
          <TabsContent value="practice" forceMount hidden={mode !== "practice"} className="mt-0"><div hidden={module !== "workflow"}>{workflowVisited && <FredWorkflowPanel />}</div>{module !== "workflow" && <Suspense fallback={<p role="status" className="text-sm text-muted-foreground p-3">{T("در حال آماده‌سازی تمرین…", "Preparing the exercise…")}</p>}><Exercise /></Suspense>}</TabsContent>
          <TabsContent value="check" className="mt-0"><FredCheckpoint key={module} lesson={lesson} onPass={complete} /></TabsContent>
        </Tabs>
        <footer className="mt-6 border-t pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => onModule(FRED_CURRICULUM[index - 1].id)}>{isEn ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{T("درس قبلی", "Previous lesson")}</Button>
          <span className="text-muted-foreground">{index + 1} / {FRED_CURRICULUM.length}</span>
          <Button variant="ghost" size="sm" disabled={index === FRED_CURRICULUM.length - 1} onClick={() => onModule(FRED_CURRICULUM[index + 1].id)}>{T("درس بعدی", "Next lesson")}{isEn ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</Button>
        </footer>
      </section>
    </div>
    <FredOwingNoticeDialog />
  </main>;
}

function FredCheckpoint({ lesson, onPass }: { lesson: FredLesson; onPass: () => void }) {
  const { T } = useBilingual(); const [selected, setSelected] = useState<number | null>(null); const [checked, setChecked] = useState(false);
  const correct = selected === lesson.correct;
  return <div className="space-y-4 max-w-2xl"><h2 className="font-semibold">{T(lesson.question[0], lesson.question[1])}</h2>
    <fieldset className="space-y-2"><legend className="sr-only">{T("یک پاسخ انتخاب کن", "Choose an answer")}</legend>{lesson.answers.map((answer, index) => <label key={index} className="flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer"><input type="radio" name={`fred-check-${lesson.id}`} checked={selected === index} onChange={() => { setSelected(index); setChecked(false); }} className="mt-1" />{T(answer[0], answer[1])}</label>)}</fieldset>
    <Button disabled={selected === null} onClick={() => { setChecked(true); if (correct) onPass(); }}>{T("بررسی پاسخ", "Check answer")}</Button>
    {checked && <div role="status" className="border-s-2 border-primary ps-3"><p className="font-medium text-sm">{correct ? T("پاسخ درست است.", "Correct answer.") : T("دوباره بررسی کن.", "Review your answer.")}</p><p className="text-sm text-muted-foreground mt-1 leading-relaxed">{T(lesson.explanation[0], lesson.explanation[1])}</p></div>}
    <p className="text-xs text-muted-foreground">{T("این پرسش درک ابزار را می‌سنجد؛ تأیید مهارت بالینی نیست.", "This question checks your understanding of the tool; it does not certify clinical competence.")}</p>
  </div>;
}
