import type { KnowledgeDocument, KnowledgeFolder } from './knowledgeTypes';
import { normalizeLessonLabel } from './lessonTemplates';

export type PharmacyCollectionKind = 'academic' | 'schedule';
export interface PharmacyLessonCollection { id: string; fa: string; en: string; lessons: KnowledgeDocument[] }
const modules = [
  ['m1', 'سیستم سلامت استرالیا', 'Australian health system'],
  ['m2', 'قانون و مقررات دارو', 'Medicine law & regulation'],
  ['m3', 'OTC و نقش دستیار داروخانه', 'OTC & pharmacy assistant practice'],
  ['m4', 'مشاوره و تاریخچهٔ دارویی', 'Counselling & medication history'],
  ['m5', 'پژوهش و نگارش علمی', 'Research & academic writing'],
  ['m6', 'محیط کار و دیسپنسینگ', 'Workplace & dispensing'],
] as const;

/** A view over existing documents; no folders, IDs or account data are migrated. */
export function buildPharmacyLessonCollections(lessons: KnowledgeDocument[], kind: PharmacyCollectionKind): PharmacyLessonCollection[] {
  const specs = kind === 'academic'
    ? modules.map(([id, fa, en]) => ({ id, fa, en }))
    : ['S2', 'S3', 'S4', 'S8', 'Unscheduled'].map(id => ({ id, fa: id === 'Unscheduled' ? 'فاقد Schedule' : id, en: id }));
  const collections = specs.map(spec => ({ ...spec, lessons: [] as KnowledgeDocument[] }));
  const other: PharmacyLessonCollection = { id: 'other', fa: kind === 'academic' ? 'سایر درس‌ها' : 'سایر برچسب‌ها', en: kind === 'academic' ? 'Other lessons' : 'Other / untagged', lessons: [] };
  for (const lesson of lessons) {
    const schedules = lesson.tags?.filter(tag => /^Schedule\b/i.test(tag)) ?? [];
    const id = kind === 'academic' ? lesson.id.match(/^doc-(m[1-6])-sec\d+$/)?.[1] : schedules.length === 1 && /^Schedule (S2|S3|S4|S8|Unscheduled)$/.test(schedules[0]) ? schedules[0].slice(9) : undefined;
    (collections.find(collection => collection.id === id) ?? other).lessons.push(lesson);
  }
  for (const collection of collections) collection.lessons.sort((a, b) => kind === 'academic'
    ? Number(a.id.match(/sec(\d+)$/)?.[1] || 0) - Number(b.id.match(/sec(\d+)$/)?.[1] || 0) || a.title.localeCompare(b.title)
    : a.title.localeCompare(b.title));
  other.lessons.sort((a, b) => a.title.localeCompare(b.title));
  return [...collections, other].filter(collection => collection.lessons.length);
}

export function pharmacyLessonMatches(lesson: KnowledgeDocument, query: string): boolean {
  const terms = normalizeLessonLabel(query).split(' ').filter(Boolean);
  const text = normalizeLessonLabel(`${lesson.title} ${lesson.title_en ?? ''} ${(lesson.tags ?? []).join(' ')}`);
  return terms.every(term => text.includes(term));
}

export function pharmacyDescendantLessons(categoryId: string, folders: KnowledgeFolder[], documents: KnowledgeDocument[]): KnowledgeDocument[] {
  const descendants = new Set([categoryId]);
  const pending = [categoryId];
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parent_id) continue;
    const siblings = children.get(folder.parent_id) ?? [];
    siblings.push(folder.id); children.set(folder.parent_id, siblings);
  }
  while (pending.length) for (const id of children.get(pending.pop()!) ?? []) {
    if (!descendants.has(id)) { descendants.add(id); pending.push(id); }
  }
  return documents.filter(document => descendants.has(document.folder_id ?? ''));
}
