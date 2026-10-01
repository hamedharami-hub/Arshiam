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
  const reading = cards.filter(card => card.kind !== 'metadata' && !isRelated(card));
  const groups = (workspace?.enabled ? [...TEMPLATE_GROUPS[template], ...learningGroups.filter(group => !TEMPLATE_GROUPS[template].some(item => item.id === group.id))] : TEMPLATE_GROUPS[template]).filter(group => reading.some(card => card.group === group.id));
  const initial = readPosition(documentId);
  const validTab = (wanted: string | null) => wanted === 'source' || wanted === 'warnings' || wanted === 'all' || groups.some(group => group.id === wanted) ? wanted! : groups[0]?.id ?? 'source';
  const canonicalId = (id: string | null) => {
    const card = workspace?.cards.find(card => card.id === id || card.aliases.includes(id || ''));
    if (!card) return id;
    return cards.some(item => item.id === card.id) ? card.id : card.sources[dir === 'rtl' ? 'fa' : 'en'] || id;
  };
  const target = cards.find(card => card.id === canonicalId(initial.card));
  const [activeTab, setActiveTab] = useState(() => target && !isRelated(target) ? target.kind === 'metadata' ? 'source' : target.group : initial.card ? 'source' : validTab(initial.tab));
  const [linkedCard, setLinkedCard] = useState(canonicalId(initial.card));
  const hasTechnical = cards.some(card => card.html.includes('lesson-field--technical'));
  const safety = reading.filter(card => card.safetyProtected || card.kind === 'safety');

  useEffect(() => {
    const sync = () => {
      const next = readPosition(documentId);
      const card = cards.find(item => item.id === canonicalId(next.card));
      setLinkedCard(canonicalId(next.card));
      setActiveTab(card && !isRelated(card) ? card.kind === 'metadata' ? 'source' : card.group : next.card ? 'source' : validTab(next.tab));
      setRelatedOpen(Boolean(card && isRelated(card)));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  });

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
    if (documentId) params.set('lesson', documentId); params.set('lessonTab', card.kind === 'metadata' ? 'source' : card.group);
    return <article key={card.id} data-lesson-card={card.id} data-kind={card.kind} className={`lesson-content-card ${card.wide ? 'lesson-content-card--wide' : ''} ${linkedCard === card.id ? 'lesson-content-card--linked' : ''}`}>
      <header className="lesson-content-card__header"><Icon className="lesson-content-card__icon" aria-hidden="true" />
        <h3><a href={`?${params}`} onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (isRelated(card)) return; selectTab(card.kind === 'metadata' ? 'source' : card.group, card.id); }}>{card.title}</a></h3>
      </header>
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
    <Tabs value={activeTab} onValueChange={selectTab} dir={dir}>
      <div className="lesson-workspace-navigation">
        <TabsList className="lesson-workspace-tabs" aria-label={T('بخش‌های درس', 'Lesson sections')}>
          {groups.map(group => <TabsTrigger key={group.id} value={group.id}>{T(group.fa, group.en)}</TabsTrigger>)}
          {safety.length > 0 && <TabsTrigger value="warnings">{T("همهٔ هشدارها", "All warnings")}</TabsTrigger>}
          <TabsTrigger value="source">{T('متن اصلی', 'Original text')}</TabsTrigger>
        </TabsList>
        {related.length > 0 && <button type="button" className="lesson-related-trigger" onClick={() => setRelatedOpen(true)} aria-label={T('مرتبط‌ها', 'Related content')}><Link2 aria-hidden="true" /><span>{T('مرتبط‌ها', 'Related')}</span></button>}
      </div>
      {safety.length > 0 && activeTab !== 'source' && activeTab !== 'warnings' && <div className="lesson-safety-access"><AlertTriangle aria-hidden="true" /><span>{T('ایمنی و معیارهای ارجاع', 'Safety & referral')}</span><button type="button" onClick={() => selectTab('warnings')}>{T('دیدن هشدارها', 'Read warnings')}</button></div>}
      {groups.map(group => <TabsContent key={group.id} value={group.id} className="lesson-workspace-panel">
        <section data-layout={workspace?.groups[group.id] || "grid"} className="lesson-card-group" aria-label={T(group.fa, group.en)}><div className="lesson-card-group__grid">{reading.filter(card => card.group === group.id).map(renderCard)}</div></section>
      </TabsContent>)}
      <TabsContent value="warnings" className="lesson-workspace-panel"><section aria-label={T('ایمنی و هشدارها', 'Safety & warnings')}><div className="lesson-card-group__grid">{safety.map(renderCard)}</div></section></TabsContent>
      <TabsContent value="all" className="lesson-workspace-panel"><div className="lesson-card-group__grid">{reading.map(renderCard)}</div></TabsContent>
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
