import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { useBilingual } from '@/hooks/useBilingual';
import { Input } from '@/components/ui/input';
import type { KnowledgeDocument } from '@/lib/knowledgeTypes';
import { buildPharmacyLessonCollections, pharmacyLessonMatches, type PharmacyCollectionKind } from '@/lib/pharmacyLessonCollections';
import { PharmacyStatusBadge, type LessonStatus } from './PharmacyStatusBadge';

export function PharmacyLessonCollection({ lessons, kind, statusOf, lastDocId }: {
  lessons: KnowledgeDocument[]; kind: PharmacyCollectionKind; statusOf: (id: string) => LessonStatus; lastDocId?: string;
}) {
  const { T, isEn } = useBilingual();
  const [params, setParams] = useSearchParams();
  const field = kind === 'academic' ? 'pharmacyModule' : 'pharmacySchedule';
  const queryField = kind === 'academic' ? 'moduleSearch' : 'shelfSearch';
  const collections = useMemo(() => buildPharmacyLessonCollections(lessons, kind), [lessons, kind]);
  const wanted = params.get(field) ?? 'all';
  const active = collections.some(collection => collection.id === wanted) ? wanted : 'all';
  const query = params.get(queryField) ?? '';
  const matching = useMemo(() => new Set(lessons.filter(lesson => pharmacyLessonMatches(lesson, query)).map(lesson => lesson.id)), [lessons, query]);
  const shown = collections.filter(collection => active === 'all' || collection.id === active).map(collection => ({ ...collection, lessons: collection.lessons.filter(lesson => matching.has(lesson.id)) })).filter(collection => collection.lessons.length);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  return <div className="pharmacy-lesson-collection" data-testid={`pharmacy-${kind}-collection`}>
    {kind === 'schedule' && <p className="pharmacy-collection-hint">{T('فیلتر بر اساس برچسب Schedule ثبت‌شده در همین درس‌ها', 'Filter by the Schedule tag recorded in these lessons')}</p>}
    <nav className="pharmacy-collection-filters" aria-label={kind === 'academic' ? T('ماژول‌های دانشگاهی', 'Academic modules') : T('طبقه‌بندی ثبت‌شدهٔ داروها', 'Recorded medicine schedules')}>
      <button type="button" aria-pressed={active === 'all'} onClick={() => update(field, 'all')}>{T('همه', 'All')} <span>{lessons.length}</span></button>
      {collections.map(collection => <button type="button" key={collection.id} aria-pressed={active === collection.id} onClick={() => update(field, collection.id)}>{kind === 'academic' && collection.id !== 'other' ? `${collection.id.toUpperCase()} · ` : ''}{T(collection.fa, collection.en)} <span>{collection.lessons.length}</span></button>)}
    </nav>
    <div className="pharmacy-collection-search"><Search className="h-4 w-4" aria-hidden="true" /><Input aria-label={kind === 'academic' ? T('جست‌وجو در ماژول‌ها', 'Search academic lessons') : T('جست‌وجو در داروهای ویژه', 'Search specialty medicines')} placeholder={T('نام درس، دارو یا برچسب…', 'Lesson, medicine or tag…')} value={query} onChange={event => update(queryField, event.target.value)} /></div>
    <p className="pharmacy-collection-hint" role="status">{T(`${shown.reduce((sum, group) => sum + group.lessons.length, 0)} درس`, `${shown.reduce((sum, group) => sum + group.lessons.length, 0)} lessons`)}</p>
    {!shown.length && <div className="pharmacy-collection-empty"><p>{T('درسی با این فیلتر پیدا نشد.', 'No lessons match these filters.')}</p><button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete(field); next.delete(queryField); setParams(next, { replace: true }); }}>{T('پاک‌کردن فیلترها', 'Clear filters')}</button></div>}
    {shown.map(collection => <section className="pharmacy-collection-group" key={collection.id} aria-label={T(collection.fa, collection.en)}>
      <h4>{kind === 'academic' && collection.id !== 'other' && <span className="pharmacy-module-code">{collection.id.toUpperCase()}</span>}{T(collection.fa, collection.en)}</h4>
      <ul className="pharmacy-collection-grid">{collection.lessons.map(lesson => <li key={lesson.id}><Link className="pharmacy-collection-lesson" data-current={lastDocId === lesson.id || undefined} to={`/app/knowledge?docId=${encodeURIComponent(lesson.id)}`}>
        <BookOpen className="h-4 w-4" aria-hidden="true" /><span className="pharmacy-collection-lesson-body"><b dir="auto">{isEn ? lesson.title_en || lesson.title : lesson.title}</b><span><PharmacyStatusBadge status={statusOf(lesson.id)} />{lastDocId === lesson.id && <small>{T('آخرین مطالعه', 'Last studied')}</small>}</span></span><ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link></li>)}</ul>
    </section>)}
  </div>;
}
