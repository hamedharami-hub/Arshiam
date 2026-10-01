import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, FileText, FlaskConical, Layers3 } from 'lucide-react';
import { useBilingual } from '@/hooks/useBilingual';
import { LESSON_GROUPS, type LessonContentCard, type LessonCardGroup } from '@/lib/lessonCards';
import './LessonCardLayout.css';

function readCardParam() {
  try { return new URLSearchParams(window.location.search).get('card'); } catch { return null; }
}

export function LessonCardLayout({ cards, sourceHtml, dir, contentClassName }: {
  cards: LessonContentCard[]; sourceHtml: string; dir: 'rtl' | 'ltr'; contentClassName: string;
}) {
  const { T } = useBilingual();
  const [view, setView] = useState<'cards' | 'source'>('cards');
  const [activeGroup, setActiveGroup] = useState<LessonCardGroup | 'all'>('all');
  const [linkedCard, setLinkedCard] = useState<string | null>(readCardParam);
  const rootRef = useRef<HTMLDivElement>(null);
  const targetCard = linkedCard;
  const groups = useMemo(() => LESSON_GROUPS.filter(group => cards.some(card => card.group === group.id && card.kind !== 'metadata')), [cards]);
  const metadata = cards.filter(card => card.kind === 'metadata');
  useEffect(() => {
    if (!targetCard) return;
    const target = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-lesson-card]') ?? []).find(element => element.dataset.lessonCard === targetCard);
    if (targetCard && cards.some(card => card.id === targetCard && card.kind === 'metadata')) {
      const details = rootRef.current?.querySelector<HTMLDetailsElement>('.lesson-card-layout__metadata');
      if (details) details.open = true;
    }
    target?.scrollIntoView?.({ block: 'center' });
  }, [targetCard, cards]);
  const openCard = (id: string) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('card', id);
      window.history.replaceState(window.history.state, '', url);
      setLinkedCard(id);
    } catch { /* the layout also works in embedded readers */ }
  };
  const renderCard = (card: LessonContentCard) => {
    const Icon = card.kind === 'safety' ? AlertTriangle : card.kind === 'mechanism' ? FlaskConical : card.kind === 'reference' ? FileText : BookOpen;
    return <article key={card.id} data-lesson-card={card.id} data-kind={card.kind} className={`lesson-content-card ${card.wide ? 'lesson-content-card--wide' : ''} ${targetCard === card.id ? 'lesson-content-card--linked' : ''}`}>
      <header className="lesson-content-card__header">
        <Icon className="lesson-content-card__icon" aria-hidden="true" />
        <h3><a href={`?${(() => { const params = new URLSearchParams(window.location.search); params.set('card', card.id); return params.toString(); })()}`} onClick={event => { event.preventDefault(); openCard(card.id); }}>{card.title}</a></h3>
      </header>
      <div className={`lesson-content-card__body ${contentClassName}`} dangerouslySetInnerHTML={{ __html: card.html }} />
    </article>;
  };
  return <div ref={rootRef} dir={dir} className="lesson-card-layout" data-testid="lesson-card-layout" onClickCapture={event => {
    const link = (event.target as Element).closest?.('a[href^="#"]');
    if (!link || link.hasAttribute("data-doc-link")) return;
    const rawId = link.getAttribute('href')?.slice(1);
    if (!rawId) return;
    let id: string;
    try { id = decodeURIComponent(rawId); } catch { return; }
    const source = document.createElement('div'); source.innerHTML = sourceHtml;
    if (!Array.from(source.querySelectorAll('[id]')).some(element => element.id === id)) return;
    event.preventDefault(); setView('source');
    requestAnimationFrame(() => Array.from(rootRef.current?.querySelectorAll('[id]') ?? []).find(element => element.id === id)?.scrollIntoView?.({ block: 'start' }));
  }}>
    <div className="lesson-card-layout__toolbar">
      <span className="lesson-card-layout__summary"><Layers3 aria-hidden="true" />{T(`${cards.filter(card => card.kind !== 'metadata').length} کارت آموزشی`, `${cards.filter(card => card.kind !== 'metadata').length} learning cards`)}</span>
      <div className="lesson-card-layout__view" role="group" aria-label={T('نمایش درس', 'Lesson view')}>
        <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>{T('کارت‌ها', 'Cards')}</button>
        <button type="button" aria-pressed={view === 'source'} onClick={() => setView('source')}>{T('متن اصلی', 'Original text')}</button>
      </div>
    </div>
    {view === 'source' ? <div className={contentClassName} data-testid="lesson-original-text" dangerouslySetInnerHTML={{ __html: sourceHtml }} /> : <>
      <nav className="lesson-card-layout__groups" aria-label={T('گروه کارت‌های درس', 'Lesson card groups')}>
        <button type="button" aria-pressed={activeGroup === 'all'} onClick={() => setActiveGroup('all')}>{T('همهٔ کارت‌ها', 'All cards')}</button>
        {groups.map(group => <button key={group.id} type="button" aria-pressed={activeGroup === group.id} onClick={() => setActiveGroup(group.id)}>{T(group.fa, group.en)}</button>)}
      </nav>
      {groups.filter(group => activeGroup === 'all' || activeGroup === group.id || group.id === 'safety').map(group => <section key={group.id} className="lesson-card-group" aria-label={T(group.fa, group.en)}>
        <h2 className="lesson-card-group__title"><span>{T(group.fa, group.en)}</span><span className="lesson-card-group__count">{cards.filter(card => card.group === group.id && card.kind !== 'metadata').length}</span></h2>
        <div className="lesson-card-group__grid">{cards.filter(card => card.group === group.id && card.kind !== 'metadata').map(renderCard)}</div>
      </section>)}
      {metadata.length > 0 && <details className="lesson-card-layout__metadata"><summary>{T('مشخصات مبدأ', 'Source metadata')} <span>({metadata.length})</span></summary><div className="lesson-card-group__grid">{metadata.map(renderCard)}</div></details>}
    </>}
  </div>;
}
