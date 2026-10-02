import { lessonNavigation } from '@/lib/lessonNavigation';
import { learningGroups, type LearningWorkspace } from "@/lib/learningWorkspace";
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, FileText, FlaskConical, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useBilingual } from '@/hooks/useBilingual';
import { TEMPLATE_GROUPS, type LessonTemplate } from '@/lib/lessonTemplates';
import { type LessonContentCard } from '@/lib/lessonCards';
import './LessonCardLayout.css';

/** URL values are scoped to the document so an unrelated lesson cannot inherit a tab. */
function readPosition(documentId?: string) {
  const params = new URLSearchParams(window.location.search);
  const own = !params.get('lesson') || params.get('lesson') === documentId;
  return { tab: own ? params.get('lessonTab') : null, card: own ? params.get('card') : null };
}
function isRelated(card: LessonContentCard) {
  return !card.safetyProtected && card.kind !== 'metadata' &&
    /related|linked|پیوند|مرتبط|فرآورده.*قفسه/i.test(card.title) && /data-doc-link|lesson-related-link|lesson-related-unavailable/.test(card.html);
}

export function LessonCardLayout({ cards, sourceHtml, dir, contentClassName, template = 'general', documentId, onOpenDocument, workspace }: {
  cards: LessonContentCard[]; sourceHtml: string; dir: 'rtl' | 'ltr'; contentClassName: string; template?: LessonTemplate; documentId?: string; onOpenDocument?: (id: string) => void; workspace?: LearningWorkspace;
}) {
  const { T } = useBilingual();
  const [showTechnical, setShowTechnical] = useState(false);
  const [relatedOpen, setRelatedOpen] = useState(() => Boolean(cards.find(card => card.id === readPosition(documentId).card && isRelated(card))));
  const rootRef = useRef<HTMLDivElement>(null);
  const related = useMemo(() => cards.filter(isRelated), [cards]);
  const metadata = cards.filter(card => card.kind === 'metadata');
  const introductions = cards.filter(card => card.introduction);
  const reading = cards.filter(card => !card.introduction && card.kind !== 'metadata' && !isRelated(card));
  const customisedGroups = Boolean(workspace?.enabled && (Object.keys(workspace.groups).length || reading.some(card => card.sourceGroup && card.sourceGroup !== card.group)));
  // Navigation follows source sections. Generic categories apply only after a
  // deliberate grouping change by the owner, never merely by document type.
  const sections = customisedGroups
    ? [...TEMPLATE_GROUPS[template], ...learningGroups.filter(group => !TEMPLATE_GROUPS[template].some(item => item.id === group.id))].filter(group => reading.some(card => card.group === group.id)).map(group => ({ id: `group:${group.id}`, title: T(group.fa, group.en), cards: reading.filter(card => card.group === group.id), layout: workspace?.groups[group.id] || 'grid' }))
    : lessonNavigation(reading, template);
  const sectionFor = (card: LessonContentCard) => sections.find(section => section.cards.some(item => item.id === card.id))?.id || 'source';
  const initial = readPosition(documentId);
  const validTab = (wanted: string | null) => wanted === 'source' || sections.some(section => section.id === wanted) ? wanted! : sections.find(section => section.cards.some(card => card.group === wanted))?.id || sections[0]?.id || 'source';
  const canonicalId = (id: string | null) => {
    const card = workspace?.cards.find(card => card.id === id || card.aliases.includes(id || ''));
    if (!card) return id;
    return cards.some(item => item.id === card.id) ? card.id : card.sources[dir === 'rtl' ? 'fa' : 'en'] || id;
  };
  const target = cards.find(card => card.id === canonicalId(initial.card));
  const [activeTab, setActiveTab] = useState(() => target && !isRelated(target) ? target.kind === 'metadata' ? 'source' : sectionFor(target) : initial.card ? 'source' : validTab(initial.tab));
  const [linkedCard, setLinkedCard] = useState(canonicalId(initial.card));
  const hasTechnical = cards.some(card => card.html.includes('lesson-field--technical'));
  const navigationSignature = sections.map(section => section.id).join('|');

  useEffect(() => {
    const sync = () => {
      const next = readPosition(documentId);
      const card = cards.find(item => item.id === canonicalId(next.card));
      setLinkedCard(canonicalId(next.card));
      setActiveTab(card && !isRelated(card) ? card.kind === 'metadata' ? 'source' : sectionFor(card) : next.card ? 'source' : validTab(next.tab));
      setRelatedOpen(Boolean(card && isRelated(card)));
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
    // Source IDs, rather than titles, control restoring the active section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, navigationSignature]);

  const selectTab = (tab: string, cardId?: string) => {
    setActiveTab(tab); setLinkedCard(cardId ?? null);
    const url = new URL(window.location.href);
    if (documentId) url.searchParams.set('lesson', documentId);
    url.searchParams.set('lessonTab', tab);
    if (cardId) url.searchParams.set('card', cardId); else url.searchParams.delete('card');
    if (url.href !== window.location.href) {
      const previous = window.history.state;
      window.history.pushState(previous && typeof previous === 'object' ? { ...previous, idx: (previous.idx ?? 0) + 1 } : previous, '', url);
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }
  };
  useEffect(() => {
    if (!linkedCard) return;
    const frame = requestAnimationFrame(() => {
      const targetElement = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-lesson-card]') ?? []).find(element => element.dataset.lessonCard === linkedCard);
      targetElement?.scrollIntoView?.({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [linkedCard, activeTab]);
  const renderCard = (card: LessonContentCard) => {
    const Icon = card.kind === 'safety' ? AlertTriangle : card.kind === 'mechanism' ? FlaskConical : card.kind === 'reference' ? FileText : BookOpen;
    const params = new URLSearchParams(window.location.search); params.set('card', card.id);
    if (documentId) params.set('lesson', documentId); params.set('lessonTab', card.kind === 'metadata' ? 'source' : sectionFor(card));
    return <article key={card.id} data-lesson-card={card.id} data-kind={card.kind} className={`lesson-content-card ${card.wide ? 'lesson-content-card--wide' : ''} ${linkedCard === card.id ? 'lesson-content-card--linked' : ''}`}>
      {!card.wholeDocument && !card.introduction && <header className="lesson-content-card__header"><Icon className="lesson-content-card__icon" aria-hidden="true" />
        <h3><a href={`?${params}`} onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (isRelated(card)) return; selectTab(card.kind === 'metadata' ? 'source' : sectionFor(card), card.id); }}>{card.title}</a></h3>
      </header>}
      <div className={`lesson-content-card__body ${contentClassName}`} dangerouslySetInnerHTML={{ __html: card.html }} />
    </article>;
  };
  return <div ref={rootRef} dir={dir} className="lesson-card-layout" data-template={template} data-show-technical={showTechnical} data-testid="lesson-card-layout" onKeyDown={event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const targetElement = (event.target as Element).closest<HTMLElement>('[data-doc-link]');
    if (targetElement && !targetElement.matches('a,button')) { event.preventDefault(); targetElement.click(); }
  }} onClickCapture={event => {
    const link = (event.target as Element).closest?.('a[href^="#"]');
    if (!link || link.hasAttribute('data-doc-link')) return;
    let id: string; try { id = decodeURIComponent(link.getAttribute('href')!.slice(1)); } catch { return; }
    const source = document.createElement('div'); source.innerHTML = sourceHtml;
    if (!Array.from(source.querySelectorAll('[id]')).some(element => element.id === id)) return;
    event.preventDefault(); selectTab('source');
    requestAnimationFrame(() => Array.from(rootRef.current?.querySelectorAll('[id]') ?? []).find(element => element.id === id)?.scrollIntoView?.({ block: 'nearest' }));
  }}>
    {initial.card && !target && <p role="status" className="mb-3 text-xs text-muted-foreground">{T("کارت این پیوند در نسخهٔ فعلی پیدا نشد؛ متن اصلی محفوظ است.", "This linked card is unavailable in the current revision. Original text is retained.")}</p>}
    {activeTab !== 'source' && introductions.length > 0 && <div className="lesson-introduction">{introductions.map(renderCard)}</div>}
    <Tabs value={activeTab} onValueChange={selectTab} dir={dir}>
      {(sections.length > 1 || related.length > 0) && <div className="lesson-workspace-navigation">
        {sections.length > 1 && <TabsList className="lesson-workspace-tabs" aria-label={T('بخش‌های همین مطلب', 'Sections in this lesson')}>
          {sections.map(section => <TabsTrigger key={section.id} value={section.id} title={section.title}>{section.title}</TabsTrigger>)}
        </TabsList>}
        {related.length > 0 && <button type="button" className="lesson-related-trigger" onClick={() => setRelatedOpen(true)} aria-label={T('مرتبط‌ها', 'Related content')}><Link2 aria-hidden="true" /><span>{T('مرتبط‌ها', 'Related')}</span></button>}

      </div>}
      {sections.map(section => <TabsContent key={section.id} value={section.id} className="lesson-workspace-panel">
        <section data-layout={section.layout} className="lesson-card-group" aria-label={section.title}><div className="lesson-card-group__grid">{section.cards.map(renderCard)}</div></section>
      </TabsContent>)}
      <TabsContent value="source" className="lesson-workspace-panel"><div className={contentClassName} data-testid="lesson-original-text" dangerouslySetInnerHTML={{ __html: sourceHtml }} /></TabsContent>
    </Tabs>
    {activeTab !== 'source' && <>
      {hasTechnical && <button type="button" className="lesson-technical-toggle" aria-pressed={showTechnical} onClick={() => setShowTechnical(!showTechnical)}>{showTechnical ? T('پنهان‌کردن مشخصات فنی', 'Hide technical details') : T('نمایش مشخصات فنی', 'Show technical details')}</button>}
      {metadata.length > 0 && <details className="lesson-card-layout__metadata"><summary>{T('مشخصات مبدأ', 'Source metadata')}</summary><div className="lesson-card-group__grid">{metadata.map(renderCard)}</div></details>}
    </>}
    <Sheet open={relatedOpen} onOpenChange={setRelatedOpen}>
      <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="lesson-related-sheet" dir={dir}>
        <SheetHeader><SheetTitle>{T('مرتبط‌ها', 'Related content')}</SheetTitle><SheetDescription>{T('پیوندهای متن منبع؛ به‌معنای پیشنهاد درمان نیستند.', 'Source links; not treatment recommendations.')}</SheetDescription></SheetHeader>
        <div className="lesson-related-sheet__content" data-show-technical={showTechnical} onClick={event => {
          const link = (event.target as Element).closest<HTMLElement>('[data-doc-link]');
          const id = link?.getAttribute('data-doc-link');
          if (!id || !onOpenDocument || (link?.matches('a') && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey))) return;
          event.preventDefault(); event.stopPropagation(); setRelatedOpen(false); onOpenDocument(id);
        }}>{related.map(renderCard)}</div>
      </SheetContent>
    </Sheet>
  </div>;
}
