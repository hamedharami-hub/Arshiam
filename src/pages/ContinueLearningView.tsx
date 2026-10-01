import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, BrainCircuit, GraduationCap, Pill } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { getKnowledgeDocument } from "@/lib/knowledgeService";
import { getLastStudy, syncLastStudy, type LastStudy } from "@/lib/lastStudy";
import { computeDueCards, getLeitnerCards } from "@/lib/leitnerService";
import { FRED_LESSONS } from "@/components/pharmacy/fred/fredLessons";
import { useFredProgress } from "@/components/pharmacy/fred/useFredProgress";
import { STATUS_LABEL } from "@/components/pharmacy/fred/FredLessonView";

export default function ContinueLearningView() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  return <ContinueLearning key={userId} userId={userId} />;
}

function ContinueLearning({ userId }: { userId: string }) {
  const { T, isEn } = useBilingual();
  const fred = useFredProgress(userId);
  const [due, setDue] = useState<number | null>(null);
  const [dueFailed, setDueFailed] = useState(false);
  const [lastStudy, setLastStudy] = useState<LastStudy | null>(() => getLastStudy(userId));
  const [lastFailed, setLastFailed] = useState(false);
  const [lastMissing, setLastMissing] = useState(false);
  useEffect(() => {
    setLastMissing(false);
    if (!lastStudy) return;
    let active = true;
    getKnowledgeDocument(userId, lastStudy.docId).then(doc => { if (active && doc === null) setLastMissing(true); }).catch(() => undefined);
    return () => { active = false; };
  }, [userId, lastStudy]);
  const loadDue = useCallback(() => {
    setDueFailed(false); setDue(null); setLastFailed(false);
    getLeitnerCards(userId).then(cards => setDue(computeDueCards(cards, new Date()).length)).catch(() => setDueFailed(true));
    syncLastStudy(userId).then(setLastStudy).catch(() => setLastFailed(true));
  }, [userId]);
  useEffect(() => { loadDue(); }, [loadDue]);

  const inProgress = FRED_LESSONS.map(l => ({ lesson: l, record: fred.records[l.id] })).filter(x => x.record?.status === "learning").sort((a, b) => b.record!.updatedAt - a.record!.updatedAt)[0];
  const failed = dueFailed || lastFailed || fred.loadState === "error";
  const loading = !failed && (due === null || fred.loadState === "loading");
  const empty = !failed && !loading && !lastStudy && !inProgress && due === 0;
  const retry = () => { loadDue(); void fred.retry(); };
  const card = "rounded-lg border p-4 space-y-2";

  return <main dir={isEn ? "ltr" : "rtl"} className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6" data-testid="continue-learning">
    <HeaderTitlePortal title={T("ادامهٔ یادگیری", "Continue learning")} />
    {failed && <div role="alert" data-testid="continue-error" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/50 p-4 text-sm"><span>{T("بخشی از اطلاعات بارگذاری نشد.", "Part of your learning data could not be loaded.")}</span><Button size="sm" variant="outline" onClick={retry} data-testid="continue-retry">{T("تلاش دوباره", "Retry")}</Button></div>}
    {loading && <p role="status" data-testid="continue-loading" className="text-xs text-muted-foreground">{T("در حال بارگذاری…", "Loading…")}</p>}
    {empty && <div data-testid="continue-empty" className={card}><p className="text-sm">{T("هنوز چیزی را شروع نکرده‌ای. از یکی از مسیرهای زیر شروع کن.", "You haven't started anything yet. Begin with one of the paths below.")}</p></div>}
    {lastStudy && <section className={card} data-testid="continue-last-study"><h2 className="text-sm font-semibold">{T("آخرین مطالعه", "Last study")}</h2>
      {lastMissing
        ? <p role="status" data-testid="continue-last-missing" className="text-sm text-muted-foreground">{T("این مطلب دیگر وجود ندارد (حذف یا جابه‌جا شده). از کتابخانه مطلب دیگری باز کن.", "This page no longer exists (deleted or moved). Open another one from the library.")} <Link className="text-primary underline" to="/app/knowledge">{T("کتابخانه", "Library")}</Link></p>
        : <Link className="flex items-center gap-2 text-sm text-primary" to={`/app/knowledge?docId=${encodeURIComponent(lastStudy.docId)}`}><BookOpen className="h-4 w-4" aria-hidden="true" /><span dir="auto">{isEn ? lastStudy.titleEn || lastStudy.title : lastStudy.title}</span></Link>}</section>}
    {inProgress && <section className={card} data-testid="continue-fred"><h2 className="text-sm font-semibold">{T("درس نیمه‌تمام FRED", "FRED lesson in progress")}</h2>
      <Link className="flex items-center gap-2 text-sm text-primary" to={`/app/pharmacy-fred-practice?lesson=${inProgress.lesson.id}`}><GraduationCap className="h-4 w-4" aria-hidden="true" /><span>{T(inProgress.lesson.title[0], inProgress.lesson.title[1])}</span></Link>
      <p className="text-xs text-muted-foreground">{T(STATUS_LABEL.learning[0], STATUS_LABEL.learning[1])}</p></section>}
    {due !== null && due > 0 && <section className={card} data-testid="continue-due"><h2 className="text-sm font-semibold">{T("مرورهای موعددار", "Reviews due")}</h2>
      <Link className="flex items-center gap-2 text-sm text-primary" to="/app/review?domain=pharmacy"><BrainCircuit className="h-4 w-4" aria-hidden="true" /><span data-testid="continue-due-count">{T(`${due} کارت آمادهٔ مرور`, `${due} cards ready to review`)}</span></Link></section>}
    <nav className="flex flex-wrap gap-2" aria-label={T("دسترسی سریع", "Quick access")}>
      <Button asChild variant="outline" size="sm"><Link to="/app/pharmacy"><Pill className="me-2 h-4 w-4" aria-hidden="true" />{T("فارماسی", "Pharmacy")}</Link></Button>
      <Button asChild variant="outline" size="sm"><Link to="/app/review?domain=pharmacy"><BrainCircuit className="me-2 h-4 w-4" aria-hidden="true" />{T("مرور", "Review")}</Link></Button>
      <Button asChild variant="outline" size="sm"><Link to="/app/pharmacy-fred-practice"><GraduationCap className="me-2 h-4 w-4" aria-hidden="true" />{T("یادگیری FRED", "FRED learning")}</Link></Button>
    </nav>
  </main>;
}
