import { useEffect, useState } from "react";
import { Link, MemoryRouter, useSearchParams } from "react-router-dom";
import { Keyboard, Search } from "lucide-react";
import { PharmacyPageHeader } from "@/components/pharmacy/PharmacyPageHeader";
import { PharmacyStatusBadge } from "@/components/pharmacy/PharmacyStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBilingual } from "@/hooks/useBilingual";
import { FRED_LESSONS, LEGACY_MODULE_TO_LESSON, LESSON_SECTIONS, getLesson, isFredLessonId, type FredLesson } from "./fredLessons";
import { FredLessonView, STATUS_LABEL } from "./FredLessonView";
import { FredOwingNoticeDialog } from "./FredOwingNoticeDialog";
import { addKeyPointCards } from "./fredReviewCards";
import { useFredProgress } from "./useFredProgress";
import "./FredLearningWorkspace.css";

const KEYPOINTS_STEP = LESSON_SECTIONS.indexOf("keypoints");

export function FredRoutedWorkspace({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("lesson");
  const legacy = params.get("module");
  const lessonId = isFredLessonId(raw) ? raw : legacy ? LEGACY_MODULE_TO_LESSON[legacy] ?? FRED_LESSONS[0].id : FRED_LESSONS[0].id;
  useEffect(() => {
    if (raw === lessonId && !legacy && !params.has("mode")) return;
    setParams(prev => { const next = new URLSearchParams(prev); next.set("lesson", lessonId); next.delete("module"); next.delete("mode"); return next; }, { replace: true });
  }, [raw, legacy, lessonId, params, setParams]);
  return <FredWorkspace userId={userId} lessonId={lessonId} onLesson={id => setParams(prev => { const next = new URLSearchParams(prev); next.set("lesson", id); return next; })} />;
}

export function FredStandaloneWorkspace({ userId }: { userId: string }) {
  return <MemoryRouter><FredRoutedWorkspace userId={userId} /></MemoryRouter>;
}

function FredWorkspace({ userId, lessonId, onLesson }: { userId: string; lessonId: string; onLesson: (id: string) => void }) {
  const { T, isEn } = useBilingual();
  const loc = (t: readonly [string, string]) => T(t[0], t[1]);
  const { records, saveStates, loadState, cloud, update, retry } = useFredProgress(userId);
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Record<string, { message: string; topicId: string | null }>>({});
  const lesson = getLesson(lessonId) ?? FRED_LESSONS[0];
  const record = records[lesson.id];
  const index = FRED_LESSONS.findIndex(l => l.id === lesson.id);
  const next: FredLesson | null = FRED_LESSONS[index + 1] ?? null;
  const visible = FRED_LESSONS.filter(l => loc(l.title).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const step = record?.stepIndex ?? 0;

  useEffect(() => {
    if (!record || record.status === "not_started") void update(lesson.id, { status: "learning", stepIndex: record?.stepIndex ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, record?.status]);

  useEffect(() => {
    if (step !== KEYPOINTS_STEP || cards[lesson.id]) return;
    let active = true;
    addKeyPointCards(userId, lesson).then(r => {
      const done = r.added + r.moved;
      if (active) setCards(m => ({ ...m, [lesson.id]: { topicId: r.folderId, message: r.already ? T("نکات کلیدی قبلاً به موضوع مرور این درس اضافه شده‌اند.", "Key points are already in this lesson's review topic.") : T(`${done} کارت به موضوع مرور این درس اضافه شد.`, `${done} cards added to this lesson's review topic.`) } }));
    }).catch(() => {
      if (active) setCards(m => ({ ...m, [lesson.id]: { topicId: null, message: T("افزودن به مرور ناموفق بود؛ دوباره این مرحله را باز کن.", "Could not add to review; reopen this step to retry.") } }));
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lesson.id, userId]);

  const goStep = (i: number) => { void update(lesson.id, { stepIndex: i }); if (i === KEYPOINTS_STEP && cards[lesson.id]?.topicId === null) setCards(m => { const { [lesson.id]: _removed, ...rest } = m; return rest; }); };

  return <main className="fred-learning mx-auto w-full max-w-7xl px-3 py-4 sm:px-5" dir={isEn ? "ltr" : "rtl"} data-testid="fred-learning-workspace">
    <div className="mb-3"><PharmacyPageHeader icon={Keyboard} title={T("یادگیری کار داروخانه (FRED)", "Learning pharmacy work (FRED)")} description={T("هفت درس کوتاه از دریافت نسخه تا ثبت سوابق؛ هر درس: هدف، مثال، تمرین و نکات کلیدی.", "Seven short lessons from receiving a script to record keeping; each has a goal, example, practice and key points.")}
      aside={<p className="ms-auto text-xs text-muted-foreground" data-testid="fred-progress-summary">{T(`${FRED_LESSONS.filter(l => records[l.id]?.status === "practised").length} از ${FRED_LESSONS.length} درس تمرین‌شده`, `${FRED_LESSONS.filter(l => records[l.id]?.status === "practised").length} of ${FRED_LESSONS.length} lessons practised`)}</p>} /></div>
    <p data-testid="fred-edu-notice" className="mb-2 text-xs text-muted-foreground">{T("فقط آموزشی: هیچ ابزاری ادعای فروش، دوز یا درمان واقعی ندارد و به سیستم داروخانه وصل نیست.", "Educational only: these tools make no claim of real sales, doses or treatment and are not connected to any pharmacy system.")}</p>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs">
      <p className="text-muted-foreground">{T("درس‌ها قفل نیستند؛ از هر جا شروع کن.", "Lessons are never locked; start anywhere.")}</p>
      <div className="flex items-center gap-3"><Link to="/app/pharmacy" className="text-primary">{T("فارماسی", "Pharmacy")}</Link><Link to="/app/review?domain=pharmacy" className="text-primary">{T("مرور", "Review")}</Link></div>
    </div>
    {loadState === "error" && <div role="alert" data-testid="fred-load-error" className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-destructive/50 p-3 text-sm"><span>{T("پیشرفت همگام‌شده بارگذاری نشد؛ پیشرفت محلی نشان داده می‌شود.", "Synced progress could not be loaded; showing local progress.")}</span><Button size="sm" variant="outline" onClick={() => void retry()} data-testid="fred-load-retry">{T("تلاش دوباره", "Retry")}</Button></div>}
    {loadState === "loading" && <p role="status" className="mb-3 text-xs text-muted-foreground">{T("در حال همگام‌سازی پیشرفت…", "Syncing progress…")}</p>}
    <div className="fred-learning-layout">
      <aside className="fred-course-navigation">
        <div className="relative mb-3"><Search aria-hidden="true" className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label={T("جست‌وجوی درس‌ها", "Search lessons")} placeholder={T("پیدا کردن درس…", "Find a lesson…")} className="ps-9" /></div>
        <label className="fred-mobile-picker text-xs" htmlFor="fred-lesson-picker">{T("درس انتخاب‌شده", "Selected lesson")}</label>
        <select id="fred-lesson-picker" className="fred-mobile-picker w-full rounded-md border bg-background p-2 text-sm" value={lesson.id} onChange={e => onLesson(e.target.value)}>
          {FRED_LESSONS.map((l, i) => <option key={l.id} value={l.id}>{i + 1}. {loc(l.title)} — {loc(STATUS_LABEL[records[l.id]?.status ?? "not_started"])}</option>)}
        </select>
        <nav className="fred-desktop-lessons" aria-label={T("درس‌های FRED", "FRED lessons")}>
          {visible.map(l => { const status = records[l.id]?.status ?? "not_started"; return <button key={l.id} type="button" aria-pressed={l.id === lesson.id} data-testid={`fred-nav-${l.id}`} data-status={status} onClick={() => onLesson(l.id)} className="fred-lesson-button"><span>{FRED_LESSONS.indexOf(l) + 1}. {loc(l.title)}</span><PharmacyStatusBadge status={status} /></button>; })}
          {visible.length === 0 && <p className="p-2 text-xs">{T("درسی پیدا نشد.", "No lessons found.")}</p>}
        </nav>
      </aside>
      <section className="min-w-0">
        <FredLessonView key={lesson.id} lesson={lesson} record={record} saveState={saveStates[lesson.id]} cloud={cloud} nextLesson={next} cardsMessage={cards[lesson.id]?.message ?? null} reviewTopicId={cards[lesson.id]?.topicId ?? null}
          onNextLesson={() => next && onLesson(next.id)} onStep={goStep} onRetry={() => void retry()}
          onPracticed={attemptId => void update(lesson.id, { status: "practised", attemptId })} />
      </section>
    </div>
    <FredOwingNoticeDialog />
  </main>;
}
