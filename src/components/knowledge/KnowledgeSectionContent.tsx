import { useId, useMemo, useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { splitKnowledgeSections } from "@/lib/knowledgeSections";
import { useBilingual } from "@/hooks/useBilingual";

/** Horizontal section navigation; All retains the complete source presentation. */
export function KnowledgeSectionContent({ html, dir, className }: { html: string; dir: "ltr" | "rtl"; className: string }) {
  const { T } = useBilingual();
  const sections = useMemo(() => splitKnowledgeSections(html), [html]);
  return <SectionPresentation key={html} html={html} dir={dir} className={className} introduction={sections.introduction} sections={sections.sections} T={T} />;
}
function SectionPresentation({ html, dir, className, introduction, sections, T }: {
  html: string; dir: "ltr" | "rtl"; className: string; introduction: string;
  sections: ReturnType<typeof splitKnowledgeSections>["sections"]; T: (fa: string, en: string) => string;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "all");
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
          <TabsTrigger value="all" className="shrink-0 h-auto min-h-9 px-3">{T("کل مطلب", "All sections")}</TabsTrigger>
          {sections.map(section => <TabsTrigger key={section.id} value={section.id} className="shrink-0 h-auto min-h-9 max-w-64 whitespace-normal text-start px-3 text-xs leading-5">{section.title}</TabsTrigger>)}
        </TabsList>
      </div>
      {active !== "all" && introduction && <div className={className} dangerouslySetInnerHTML={{ __html: introduction }} />}
      <TabsContent value="all" className="mt-0"><div className={className} dangerouslySetInnerHTML={{ __html: html }} /></TabsContent>
      {sections.map(section => <TabsContent key={section.id} value={section.id} className="mt-0" aria-describedby={`${id}-reading-hint`}><div className={className} dangerouslySetInnerHTML={{ __html: section.html }} /></TabsContent>)}
      <p id={`${id}-reading-hint`} className="text-xs text-muted-foreground border-t mt-4 pt-2">{T("برای دیدن همهٔ بخش‌ها و منابع در کنار هم، «کل مطلب» را انتخاب کنید.", "Choose All sections to read every section and its sources together.")}</p>
    </Tabs>
  </div>;
}
