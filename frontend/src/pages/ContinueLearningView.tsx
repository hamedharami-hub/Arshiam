import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { getKnowledgeDocument } from "@/lib/knowledgeService";
import { getLastStudy, syncLastStudy, type LastStudy } from "@/lib/lastStudy";

export default function ContinueLearningView() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  return <ContinueLearning key={userId} userId={userId} />;
}

function ContinueLearning({ userId }: { userId: string }) {
  const { T, isEn } = useBilingual();
  const [lastStudy, setLastStudy] = useState<LastStudy | null>(() => getLastStudy(userId));
  const [loaded, setLoaded] = useState(false);
  const [lastFailed, setLastFailed] = useState(false);
  const [lastMissing, setLastMissing] = useState(false);
  const lastStudyDocId = lastStudy?.docId;
  useEffect(() => {
    setLastMissing(false);
    if (!lastStudyDocId) return;
    let active = true;
    getKnowledgeDocument(userId, lastStudyDocId).then(doc => { if (active && doc === null) setLastMissing(true); }).catch(() => undefined);
    return () => { active = false; };
  }, [userId, lastStudyDocId]);
  const loadDue = useCallback(() => {
    setLastFailed(false);
    setLoaded(false);
    let active = true;
    syncLastStudy(userId).then(value => { if (active) setLastStudy(value); }).catch(() => { if (active) setLastFailed(true); }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => loadDue(), [loadDue]);

  const failed = lastFailed;
  const loading = !failed && !loaded;
  const empty = !failed && !loading && !lastStudy;
  const retry = () => { loadDue(); };
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
    <nav className="flex flex-wrap items-center gap-2" aria-label={T("دسترسی سریع", "Quick access")}>
      <Button asChild className="h-11 rounded-full px-5"><Link to="/app/recall" data-testid="continue-recall">{T("شروع مرور", "Start review")}</Link></Button>
      <Button asChild variant="outline" className="h-11 rounded-full px-5"><Link to="/app/knowledge"><BookOpen className="me-2 h-4 w-4" aria-hidden="true" />{T("کتابخانه", "Library")}</Link></Button>
    </nav>
  </main>;
}
