import { applyLearningWorkspace, sourceCards, type LearningWorkspace } from "@/lib/learningWorkspace";
import { useId, useMemo, useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { splitKnowledgeSections } from "@/lib/knowledgeSections";
import { useBilingual } from "@/hooks/useBilingual";
import { DrugTiers, isDrugLike } from "./DrugTiers";
import { PharmacyImageViewer, enhanceImagesHtml, replaceBrokenImage } from "./PharmacyImageViewer";
import { buildLessonCards } from "@/lib/lessonCards";
import { getLessonTemplate } from "@/lib/lessonTemplates";
import { parseLessonQuiz } from "@/lib/lessonQuiz";
import { PharmacyLessonQuiz } from "./PharmacyLessonQuiz";
import { LessonCardLayout } from "./LessonCardLayout";

function readSectionParam(): string | null {
  try { return new URLSearchParams(window.location.search).get("section"); } catch { return null; }
}
function writeSectionParam(id: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("section", id);
    window.history.replaceState(window.history.state, "", url);
  } catch { /* history unavailable */ }
}

/** Navigation follows source headings; a single topic stays a complete article. */
export function KnowledgeSectionContent({ html: rawHtml, dir, className, multiCard = false, documentId, visibleTitles, onOpenDocument, userId, workspace }: { html: string; dir: "ltr" | "rtl"; className: string; multiCard?: boolean; documentId?: string; visibleTitles?: (string | undefined)[]; onOpenDocument?: (id: string) => void; userId?: string; workspace?: LearningWorkspace }) {
  const { T } = useBilingual();
  const html = useMemo(() => enhanceImagesHtml(rawHtml), [rawHtml]);
  const sections = useMemo(() => splitKnowledgeSections(html), [html]);
  const cards = useMemo(() => {
    const built = multiCard || workspace?.enabled ? buildLessonCards(html, dir === "rtl" ? "fa" : "en", documentId, visibleTitles) : [];
    const original = (multiCard || workspace?.enabled) && !built.length ? sourceCards({ id: documentId || 'draft', title: visibleTitles?.[0] || T('متن درس', 'Lesson text'), title_en: visibleTitles?.[1], content_html: rawHtml, content_en: rawHtml }, dir === 'rtl' ? 'fa' : 'en') : built;
    return applyLearningWorkspace(original, workspace, dir === "rtl" ? "fa" : "en", rawHtml);
  }, [html, rawHtml, dir, multiCard, documentId, visibleTitles, workspace, T]);
  const template = getLessonTemplate(documentId);
  const quiz = useMemo(() => multiCard && template === "quiz" ? parseLessonQuiz(html) : null, [html, multiCard, template]);
  const [viewer, setViewer] = useState<{ src: string; alt: string } | null>(null);
  const tiered = isDrugLike(sections.sections);
  return <div data-learning-language={dir === "rtl" ? "fa" : "en"} className="min-w-0" onClickCapture={event => {
    const target = event.target as Element;
    if (target.tagName === "IMG" && !target.closest("a")) { const img = target as HTMLImageElement; setViewer({ src: img.currentSrc || img.src, alt: img.alt }); }
  }} onErrorCapture={event => {
    if ((event.target as Element).tagName === "IMG") replaceBrokenImage(event.target as HTMLImageElement, T("تصویر در دسترس نیست", "Image unavailable"));
  }}>
    {quiz ? <PharmacyLessonQuiz key={`${userId}:${documentId}:${html}`} documentId={documentId} userId={userId} quiz={quiz} visibleTitles={visibleTitles} sourceHtml={html} dir={dir} className={className} /> : cards.length > 0
      ? <LessonCardLayout key={html} documentId={documentId} onOpenDocument={onOpenDocument} template={template} workspace={workspace} cards={cards} sourceHtml={html} dir={dir} contentClassName={className} />
      : tiered
      ? <DrugTiers introduction={sections.introduction} sections={sections.sections} dir={dir} className={className} />
      : <SectionPresentation key={html} html={html} dir={dir} className={className} introduction={sections.introduction} sections={sections.sections} T={T} />}
    <PharmacyImageViewer image={viewer} onClose={() => setViewer(null)} />
  </div>;
}
function SectionPresentation({ html, dir, className, introduction, sections, T }: {
  html: string; dir: "ltr" | "rtl"; className: string; introduction: string;
  sections: ReturnType<typeof splitKnowledgeSections>["sections"]; T: (fa: string, en: string) => string;
}) {
  const [active, setActiveRaw] = useState(() => {
    const wanted = readSectionParam();
    return wanted && (wanted === "all" || sections.some(section => section.id === wanted)) ? wanted : sections[0]?.id ?? "all";
  });
  const setActive = (next: string) => { setActiveRaw(next); writeSectionParam(next); };
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  if (!sections.length) return <div dir={dir} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  return <div ref={rootRef} dir={dir} className="min-w-0" data-testid="knowledge-section-content" onClickCapture={event => {
    const link = (event.target as Element).closest?.('a[href^="#"]');
    if (!link || link.hasAttribute("data-doc-link")) return;
    const targetId = link.getAttribute("href")?.slice(1);
    if (!targetId) return;
    let decoded: string;
    try { decoded = decodeURIComponent(targetId); } catch { return; }
    const source = window.document.createElement("div"); source.innerHTML = html;
    if (![...source.querySelectorAll("[id]")].some(element => element.id === decoded)) return;
    event.preventDefault(); setActive("all");
    requestAnimationFrame(() => [...(rootRef.current?.querySelectorAll("[id]") ?? [])].find(element => element.id === decoded)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }}>
    <Tabs value={active} onValueChange={setActive} dir={dir}>
      <div className="overflow-x-auto max-w-full border-b mb-4 pb-1" role="region" aria-label={T("بخش‌های مطلب", "Lesson sections")}>
        <TabsList className="w-max min-w-full justify-start h-auto gap-1 bg-transparent p-0">
          {sections.map(section => <TabsTrigger key={section.id} value={section.id} className="shrink-0 h-auto min-h-9 max-w-64 whitespace-normal text-start px-3 text-xs leading-5">{section.title}</TabsTrigger>)}
        </TabsList>
      </div>
      {active !== "all" && introduction && <div className={className} dangerouslySetInnerHTML={{ __html: introduction }} />}
      <TabsContent value="all" className="mt-0"><div className={className} dangerouslySetInnerHTML={{ __html: html }} /></TabsContent>
      {sections.map(section => <TabsContent key={section.id} value={section.id} className="mt-0" aria-describedby={`${id}-reading-hint`}><div className={className} dangerouslySetInnerHTML={{ __html: section.html }} /></TabsContent>)}
      <p id={`${id}-reading-hint`} className="sr-only">{T("بخش‌ها از تیترهای همین مطلب گرفته شده‌اند.", "Sections follow this lesson’s own headings.")}</p>
    </Tabs>
  </div>;
}
