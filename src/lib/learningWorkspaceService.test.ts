import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeDocument } from './knowledgeTypes';
import { learningVersion, type LearningNote, type LearningWorkspace } from './learningWorkspace';
import { saveLearningLayout, saveLearningRecord } from './learningWorkspaceService';
const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock('./knowledgeService', () => ({ getKnowledgeDocument: mocks.get, updateKnowledgeDocumentWithPersistence: mocks.update }));
let document: KnowledgeDocument;
const note = (id: string): LearningNote => ({ id, title: id, html: '<p>Study note</p>', updated_at: id, anchor: { language: 'en', version: learningVersion(''), quote: '', prefix: '', suffix: '' } });
beforeEach(() => {
  vi.clearAllMocks();
  document = { id: 'lesson', user_id: 'owner', folder_id: null, title: 'Lesson', content_html: '', created_at: 'created', updated_at: 'local-first', _expected_learning_revision: 'cloud-base', learning_workspace: { schema_version: 1, revision: 'local-first', source_versions: { fa: learningVersion(''), en: learningVersion('') }, cards: [], groups: {}, notes: [], questions: [], enabled: false } };
  mocks.get.mockImplementation(async () => document);
  mocks.update.mockImplementation(async (_owner: string, _id: string, patch: Partial<KnowledgeDocument>) => { document = { ...document, ...patch }; return { document, persistence: 'queued' }; });
});
describe('lesson workspace revision protection', () => {
  it('chains successive queued edits to their immediate predecessor rather than the old cloud base', async () => {
    await saveLearningRecord('owner', 'lesson', 'notes', note('note-one'), '');
    expect(mocks.update.mock.calls[0][2]._expected_learning_revision).toBe('local-first');
    const firstRevision = document.learning_workspace!.revision;
    await saveLearningRecord('owner', 'lesson', 'notes', note('note-two'), '');
    expect(mocks.update.mock.calls[1][2]._expected_learning_revision).toBe(firstRevision);
    expect(document.learning_workspace!.notes.map(item => item.id)).toEqual(['note-one', 'note-two']);
  });
  it('rejects stale layout previews without losing the current notebook', async () => {
    const preview = structuredClone(document.learning_workspace!) as LearningWorkspace;
    await expect(saveLearningLayout('owner', 'lesson', 'older-revision', preview)).rejects.toThrow('lesson changed');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(document.learning_workspace!.revision).toBe('local-first');
  });
});
