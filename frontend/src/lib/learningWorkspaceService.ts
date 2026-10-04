import { getKnowledgeDocument, updateKnowledgeDocumentWithPersistence } from './knowledgeService';
import { createLearningWorkspace, learningId, learningVersion, normalizeLearningWorkspace, sourceCards, type LearningWorkspace, type LearningNote, type LearningQuestion } from './learningWorkspace';
import type { KnowledgeDocument } from './knowledgeTypes';

const tails = new Map<string, Promise<unknown>>();
async function locked<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(action); tails.set(key, next);
  try { return await next; } finally { if (tails.get(key) === next) tails.delete(key); }
}
async function ownedDocument(userId: string, id: string) {
  const document = await getKnowledgeDocument(userId, id);
  if (!document || document.user_id !== userId || document.learning_workspace_unavailable) throw new Error('This lesson is unavailable or requires a newer app.');
  return document;
}
export function previewLearningMigration(document: KnowledgeDocument, previous?: LearningWorkspace): LearningWorkspace {
  const next = previous ? structuredClone(previous) : createLearningWorkspace(document);
  for (const language of ['fa', 'en'] as const) for (const source of sourceCards(document, language)) {
    if (!next.cards.some(card => card.sources[language] === source.id)) next.cards.push({ id: learningId('lc'), aliases: [], sources: { [language]: source.id }, titles: { [language]: source.title }, group: source.group, wide: source.wide, hidden: false });
  }
  next.source_versions = { fa: learningVersion(document.content_html), en: learningVersion(document.content_en) };
  next.enabled = true;
  return next;
}
async function persist(userId: string, current: KnowledgeDocument, workspace: LearningWorkspace) {
  const next = normalizeLearningWorkspace({ ...workspace, revision: learningId('rev') })!;
  if (new TextEncoder().encode(JSON.stringify({ ...current, learning_workspace: next })).length > 900000) throw new Error("Lesson plus notebook exceeds the cloud document limit. Split it into smaller lessons.");
  const result = await updateKnowledgeDocumentWithPersistence(userId, current.id, {
    learning_workspace: next,
    _expected_learning_revision: current.learning_workspace?.revision ?? '',
    _learning_patch_only: true,
  });
  if (result.persistence === "synced") { const fresh = await getKnowledgeDocument(userId, current.id); if (fresh) return { ...result, document: fresh }; }
  return result;
}
export function saveLearningLayout(userId: string, id: string, expectedRevision: string, layout: LearningWorkspace) {
  return locked(`${userId}:${id}`, async () => {
    const current = await ownedDocument(userId, id);
    if ((current.learning_workspace?.revision || '') !== expectedRevision) throw new Error('The lesson changed. Refresh the preview before saving; your draft is retained.');
    if (layout.enabled && (layout.source_versions.fa !== learningVersion(current.content_html) || layout.source_versions.en !== learningVersion(current.content_en))) throw new Error('The source text changed. Refresh and review the migration preview.');
    return persist(userId, current, { ...layout, notes: current.learning_workspace?.notes || [], questions: current.learning_workspace?.questions || [] });
  });
}
export function saveLearningRecord(userId: string, id: string, kind: 'notes', record: LearningNote, expectedUpdatedAt: string): ReturnType<typeof updateKnowledgeDocumentWithPersistence>;
export function saveLearningRecord(userId: string, id: string, kind: 'questions', record: LearningQuestion, expectedUpdatedAt: string): ReturnType<typeof updateKnowledgeDocumentWithPersistence>;
export function saveLearningRecord(userId: string, id: string, kind: 'notes' | 'questions', record: LearningNote | LearningQuestion, expectedUpdatedAt: string) {
  return locked(`${userId}:${id}`, async () => {
    const current = await ownedDocument(userId, id);
    if ('media' in record && record.media?.some(media => !media.path.startsWith(`users/${userId}/task-attachments/note-media/`))) throw new Error('Attachment owner mismatch.');
    const workspace = current.learning_workspace ? structuredClone(current.learning_workspace) : { ...createLearningWorkspace(current), cards: [], enabled: false };
    const records = workspace[kind] as (LearningNote | LearningQuestion)[];
    const index = records.findIndex(item => item.id === record.id);
    const previous = records[index];
    if (previous && JSON.stringify(previous) === JSON.stringify(record)) return { document: current, persistence: current._expected_learning_revision !== undefined ? 'queued' as const : 'synced' as const };
    if ((previous?.updated_at || '') !== expectedUpdatedAt) throw new Error('This record changed elsewhere. Your draft is retained; reopen the current record before saving.');
    if (index >= 0) records[index] = record; else records.push(record);
    return persist(userId, current, workspace);
  });
}
