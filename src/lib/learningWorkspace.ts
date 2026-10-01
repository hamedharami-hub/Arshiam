import { splitKnowledgeSections } from "./knowledgeSections";
import type { UploadedMedia } from './uploadMedia';
import { classifyLessonCard, buildLessonCards, type LessonContentCard, type LessonCardGroup } from './lessonCards';
import { TEMPLATE_GROUPS } from './lessonTemplates';
import { sanitizeKnowledgeHtml } from './knowledgeHtmlSanitizer';
import type { KnowledgeDocument } from './knowledgeTypes';

export type LearningLanguage = 'fa' | 'en';
export type LearningLayout = 'grid' | 'sequence' | 'fullWidth';
export interface LearningAnchor {
  language: LearningLanguage; version: string; quote: string; prefix: string; suffix: string; card_id?: string; note_id?: string;
}
export interface LearningCard {
  id: string; aliases: string[]; sources: Partial<Record<LearningLanguage, string>>;
  titles: Partial<Record<LearningLanguage, string>>; group: LessonCardGroup; wide: boolean; hidden: boolean;
}
export interface LearningNote { id: string; title: string; html: string; media?: UploadedMedia[]; anchor: LearningAnchor; deleted?: boolean; updated_at: string }
export interface LearningQuestion {
  id: string; type: 'short' | 'choice'; prompt: string; answer: string; explanation: string;
  options: { id: string; text: string }[]; correct_id: string; anchor: LearningAnchor;
  review_card_id?: string; note_id?: string; deleted?: boolean; updated_at: string;
}
export interface LearningWorkspace {
  schema_version: 1; revision: string; source_versions: Record<LearningLanguage, string>;
  cards: LearningCard[]; groups: Partial<Record<LessonCardGroup, LearningLayout>>;
  notes: LearningNote[]; questions: LearningQuestion[]; enabled: boolean;
}
export const learningGroups = Array.from(new Map(Object.values(TEMPLATE_GROUPS).flat().map(group => [group.id, group])).values());
export const learningId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
/** A revision identifier, not a medical-content validation or security digest. */
const versionCache = new Map<string, string>();
export function learningVersion(html: string = '') {
  const cached = versionCache.get(html); if (cached) return cached;
  const safe = sanitizeKnowledgeHtml(html);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < safe.length; i++) { a = Math.imul(a ^ safe.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ safe.charCodeAt(i); }
  const version = `${safe.length}-${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`;
  if (versionCache.size >= 8) versionCache.delete(versionCache.keys().next().value!);
  versionCache.set(html, version); return version;
}
export function sourceCards(document: Pick<KnowledgeDocument, "id" | "title" | "title_en" | "content_html" | "content_en">, language: LearningLanguage): LessonContentCard[] {
  const html = sanitizeKnowledgeHtml(language === 'fa' ? document.content_html : document.content_en || '');
  if (!html.trim()) return [];
  const cards = buildLessonCards(html, language, document.id, [document.title, document.title_en]);
  if (cards.length) return cards;
  const split = splitKnowledgeSections(html);
  if (split.sections.length) {
    const pieces = [...(split.introduction.replace(/<[^>]*>/g, '').trim() || /<(img|video|audio|table)\b/i.test(split.introduction) ? [{ id: 'introduction', title: language === 'fa' ? 'مقدمه' : 'Overview', html: split.introduction }] : []), ...split.sections];
    const sourceKeys = new Set<string>();
    const counts = new Map<string, number>();
    for (const piece of pieces) counts.set(piece.title, (counts.get(piece.title) || 0) + 1);
    return pieces.map(piece => {
      const element = window.document.createElement('div'); element.innerHTML = piece.html;
      const heading = element.querySelector('h2,h3');
      const sourceKeyBase = piece.id === 'introduction' ? 'introduction' : heading?.id || `section-${learningVersion(piece.title)}${counts.get(piece.title)! > 1 ? '-' + learningVersion(piece.html) : ''}`;
      let sourceKey = sourceKeyBase; let duplicate = 1;
      while (sourceKeys.has(sourceKey)) sourceKey = `${sourceKeyBase}-${learningVersion(piece.html)}-${duplicate++}`; sourceKeys.add(sourceKey);
      if (heading && !heading.querySelector('a,img,[id]')) { const anchor = window.document.createElement('span'); if (heading.id) anchor.id = heading.id; heading.replaceWith(anchor); }
      const classified = classifyLessonCard(piece.title);
      return { id: sourceKey, title: piece.title, ...classified, sourceHtml: piece.html, html: element.innerHTML, wide: classified.kind === 'safety' || !!element.querySelector('table,pre') || element.textContent.length > 1600, safetyProtected: classified.kind === 'safety' || /warning|contraindicat|referral|red flag|هشدار|منع مصرف|ارجاع/i.test(piece.html) };
    });
  }
  // Rich or unsupported legacy documents remain intact in one named card.
  return cards.length ? cards : [{ id: 'original', title: language === 'en' ? document.title_en || document.title : document.title, kind: 'overview', group: 'understand', html, sourceHtml: html, wide: true, safetyProtected: /warning|contraindicat|referral|red flag|هشدار|منع مصرف|ارجاع/i.test(html) || classifyLessonCard(document.title).kind === "safety" }];
}
export function createLearningWorkspace(document: KnowledgeDocument): LearningWorkspace {
  if (document.learning_workspace) return structuredClone(document.learning_workspace);
  const cards: LearningCard[] = [];
  for (const language of ['fa', 'en'] as const) for (const source of sourceCards(document, language)) {
    cards.push({ id: learningId('lc'), aliases: [], sources: { [language]: source.id }, titles: { [language]: source.title }, group: source.group, wide: source.wide, hidden: false });
  }
  // No guessed Persian/English matches: pairing is an explicit editor operation.
  return { schema_version: 1, revision: learningId('rev'), source_versions: { fa: learningVersion(document.content_html), en: learningVersion(document.content_en) }, cards, groups: {}, notes: [], questions: [], enabled: true };
}
export function applyLearningWorkspace(cards: LessonContentCard[], workspace: LearningWorkspace | undefined, language: LearningLanguage, sourceHtml: string) {
  if (!workspace?.enabled || workspace.source_versions[language] !== learningVersion(sourceHtml)) return cards;
  const mapped = new Map(cards.map(card => [card.id, card]));
  const used = new Set<string>();
  const result = workspace.cards.flatMap(card => {
    const sourceId = card.sources[language]; const source = sourceId ? mapped.get(sourceId) : undefined;
    if (!source) return [];
    used.add(source.id);
    if (card.hidden && !source.safetyProtected && source.kind !== 'safety') return [];
    return [{ ...source, id: card.id, title: card.titles[language] || source.title, group: source.kind === 'metadata' ? source.group : card.group, wide: source.wide || card.wide }];
  });
  // An unrecognised source block never disappears after a parser upgrade.
  return [...result, ...cards.filter(card => !used.has(card.id))];
}
export function normalizeLearningWorkspace(value: unknown): LearningWorkspace | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const workspace = value as LearningWorkspace;
  if (workspace.schema_version !== 1 || typeof workspace.revision !== 'string' || !workspace.source_versions || typeof workspace.source_versions.fa !== 'string' || typeof workspace.source_versions.en !== 'string' || !Array.isArray(workspace.cards) || !Array.isArray(workspace.notes) || !Array.isArray(workspace.questions) || !workspace.groups || Array.isArray(workspace.groups) || typeof workspace.groups !== 'object' || typeof workspace.enabled !== 'boolean') throw new Error('Unsupported learning workspace. Preserve the original and update the app.');
  const ids = new Set<string>();
  const claimId = (id: string) => { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(id) || ids.has(id)) throw new Error('Invalid or duplicate learning record ID.'); ids.add(id); };
  const sourceBindings = new Set<string>();
  const validGroup = (group: string) => learningGroups.some(item => item.id === group);
  for (const card of workspace.cards) {
    claimId(card.id);
    if (!validGroup(card.group) || !card.sources || !card.titles || !Array.isArray(card.aliases) || card.aliases.some(id => typeof id !== 'string') || typeof card.hidden !== 'boolean' || typeof card.wide !== 'boolean') throw new Error('Invalid learning card.');
    for (const language of ['fa', 'en'] as const) if ((card.sources[language] !== undefined && typeof card.sources[language] !== 'string') || (card.titles[language] !== undefined && typeof card.titles[language] !== 'string')) throw new Error('Invalid card language.');
  }
  for (const card of workspace.cards) for (const language of ['fa', 'en'] as const) {
    const source = card.sources[language]; if (source === undefined) continue;
    const binding = `${language}:${source}`;
    if (!source || sourceBindings.has(binding)) throw new Error('Duplicate card source binding.');
    sourceBindings.add(binding);
  }
  for (const [group, layout] of Object.entries(workspace.groups)) if (!validGroup(group) || !['grid', 'sequence', 'fullWidth'].includes(layout)) throw new Error('Invalid card layout.');
  const validAnchor = (anchor: LearningAnchor) => anchor && ['fa', 'en'].includes(anchor.language) && [anchor.version, anchor.quote, anchor.prefix, anchor.suffix].every(item => typeof item === 'string') && (anchor.card_id === undefined || typeof anchor.card_id === 'string') && (anchor.note_id === undefined || typeof anchor.note_id === 'string');
  for (const card of workspace.cards) for (const alias of card.aliases) claimId(alias);
  const notes = workspace.notes.map(note => {
    claimId(note.id); if (!validAnchor(note.anchor) || typeof note.title !== 'string' || typeof note.html !== 'string' || typeof note.updated_at !== 'string') throw new Error('Invalid learning note.');
    if (note.media !== undefined && (!Array.isArray(note.media) || note.media.some(media => !media || [media.path, media.url, media.mime, media.name].some(value => typeof value !== 'string') || !Number.isSafeInteger(media.size) || media.size <= 0 || media.size > 25 * 1024 * 1024))) throw new Error('Invalid note attachment.');
    return { ...note, html: sanitizeKnowledgeHtml(note.html) };
  });
  const questions = workspace.questions.map(question => {
    claimId(question.id);
    if (!validAnchor(question.anchor) || !['short', 'choice'].includes(question.type) || [question.prompt, question.answer, question.explanation, question.correct_id, question.updated_at].some(item => typeof item !== 'string') || !Array.isArray(question.options) || question.options.some(option => !option || typeof option.id !== 'string' || typeof option.text !== 'string') || new Set(question.options.map(option => option.id)).size !== question.options.length) throw new Error('Invalid learning question.');
    if (question.review_card_id !== undefined && (typeof question.review_card_id !== 'string' || !question.review_card_id)) throw new Error('Invalid review link.');
    if (!question.prompt.trim() || (question.type === 'short' ? !question.answer.trim() : question.options.filter(option => option.text.trim()).length < 2 || !question.options.some(option => option.id === question.correct_id && option.text.trim()))) throw new Error('Question requires a valid saved answer.');
    return question;
  });
  const result = { ...workspace, notes, questions };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 650000) throw new Error('This lesson workspace is too large. Split it into smaller lessons.');
  return result;
}
export function learningSourceUrl(documentId: string, cardId?: string, questionId?: string, language?: LearningLanguage) {
  const query = new URLSearchParams({ docId: documentId, lesson: documentId });
  if (cardId) query.set('card', cardId);
  if (questionId) query.set('question', questionId);
  if (language) query.set('sourceLang', language);
  return `/app/knowledge?${query}`;
}
export function captureLearningAnchor(document: KnowledgeDocument, language: LearningLanguage, quote: string): LearningAnchor {
  const selection = window.getSelection();
  const element = selection?.anchorNode?.parentElement;
  const card = element?.closest<HTMLElement>('[data-lesson-card]');
  const body = card?.querySelector('.lesson-content-card__body');
  const context = body?.textContent || '';
  const offset = context.indexOf(quote);
  const id = card?.dataset.lessonCard;
  return { language, version: learningVersion(language === 'fa' ? document.content_html : document.content_en), quote, prefix: offset >= 0 ? context.slice(Math.max(0, offset - 40), offset) : '', suffix: offset >= 0 ? context.slice(offset + quote.length, offset + quote.length + 40) : '', ...(id?.startsWith('lc-') ? { card_id: id } : {}) };
}

export function learningQuestionVersion(question: LearningQuestion) {
  return learningVersion(JSON.stringify({ type: question.type, prompt: question.prompt, answer: question.answer, explanation: question.explanation, options: question.options, correct_id: question.correct_id }));
}
