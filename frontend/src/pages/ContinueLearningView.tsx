import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { getKnowledgeDocument } from "@/lib/knowledgeService";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import { learningVersion } from "@/lib/learningWorkspace";
import { getLastStudy, syncLastStudy, type LastStudy } from "@/lib/lastStudy";

export default function ContinueLearningView() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  return <ContinueLearning key={userId} userId={userId} />;
}

function ContinueLearning({ userId }: { userId: string }) {
  const { T, isEn } = useBilingual();
  const [lastStudy, setLastStudy] = useState<LastStudy | null>(() => getLastStudy(userId));
  const [lastDoc, setLastDoc] = useState<KnowledgeDocument | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lastFailed, setLastFailed] = useState(false);
  const [lastMissing, setLastMissing] = useState(false);
  const lastStudyDocId = lastStudy?.docId;
  useEffect(() => {
    setLastMissing(false);
    setLastDoc(null);
    if (!lastStudyDocId) return;
    let active = true;
    getKnowledgeDocument(userId, lastStudyDocId).then(doc => { if (!active) return; setLastDoc(doc); if (doc === null) setLastMissing(true); }).catch(() => undefined);
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

  // The stored source version is only used to decide whether the remembered
  // section/card still exists. Unknown or older resume data is treated as valid.
  const resumeVersionMatches = useMemo(() => {
    if (!lastStudy?.version) return true;
    if (!lastDoc) return false;
    return [lastDoc.content_html, lastDoc.content_en]
      .filter((value): value is string => typeof value === "string")
      .some(value => learningVersion(value) === lastStudy.version);
  }, [lastStudy?.version, lastDoc]);
  const resumeUrl = useMemo(() => {
    if (!lastStudy) return "/app/knowledge";
    const params = new URLSearchParams({ docId: lastStudy.docId });
    if (lastStudy.language) params.set("sourceLang", lastStudy.language);
    if (resumeVersionMatches) {
      if (lastStudy.section) params.set("section", lastStudy.section);
      if (lastStudy.card) params.set("card", lastStudy.card);
    }
    return `/app/knowledge?${params.toString()}`;
  }, [lastStudy, resumeVersionMatches]);
  // Distinct labels: practice resumes the generated practice, otherwise reading.
  const resumeLabel = lastStudy?.practice
    ? T("ادامهٔ تمرین", "Continue practice")
    : T("ادامهٔ مطالعه", "Continue reading");

  return <main dir={isEn ? "ltr" : "rtl"} className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6" data-testid="continue-learning">
    <HeaderTitlePortal title={T("ادامهٔ یادگیری", "Continue learning")} />
    {failed && <div role="alert" data-testid="continue-error" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/50 p-4 text-sm"><span>{T("بخشی از اطلاعات بارگذاری نشد.", "Part of your learning data could not be loaded.")}</span><Button size="sm" variant="outline" onClick={retry} data-testid="continue-retry">{T("تلاش دوباره", "Retry")}</Button></div>}
    {loading && <p role="status" data-testid="continue-loading" className="text-xs text-muted-foreground">{T("در حال بارگذاری…", "Loading…")}</p>}
    {empty && <div data-testid="continue-empty" className={card}><p className="text-sm">{T("هنوز چیزی را شروع نکرده‌ای. از یکی از مسیرهای زیر شروع کن.", "You haven't started anything yet. Begin with one of the paths below.")}</p></div>}
    {lastStudy && <section className={card} data-testid="continue-last-study"><h2 className="text-sm font-semibold">{T("آخرین مطالعه", "Last study")}</h2>
      {lastMissing
        ? <p role="status" data-testid="continue-last-missing" className="text-sm text-muted-foreground">{T("این مطلب دیگر وجود ندارد (حذف یا جابه‌جا شده). از کتابخانه مطلب دیگری باز کن.", "This page no longer exists (deleted or moved). Open another one from the library.")} <Link className="text-primary underline" to="/app/knowledge">{T("کتابخانه", "Library")}</Link></p>
        : <>
            <Link className="flex items-center gap-2 text-sm text-primary" to={resumeUrl} data-testid="continue-resume"><BookOpen className="h-4 w-4" aria-hidden="true" /><span className="font-semibold">{resumeLabel}</span></Link>
            <p dir="auto" className="text-sm text-muted-foreground">{isEn ? lastStudy.titleEn || lastStudy.title : lastStudy.title}</p>
          </>}</section>}
    <nav className="flex flex-wrap items-center gap-2" aria-label={T("دسترسی سریع", "Quick access")}>
      <Button asChild className="h-11 rounded-full px-5"><Link to="/app/recall" data-testid="continue-recall">{T("شروع مرور سررسید", "Start due review")}</Link></Button>
      <Button asChild variant="outline" className="h-11 rounded-full px-5"><Link to="/app/knowledge"><BookOpen className="me-2 h-4 w-4" aria-hidden="true" />{T("کتابخانه", "Library")}</Link></Button>
    </nav>
  </main>;
}
