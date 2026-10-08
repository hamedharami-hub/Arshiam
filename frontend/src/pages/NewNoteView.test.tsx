import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import NewNoteView from './NewNoteView';
const mocks = vi.hoisted(() => ({ save: vi.fn(), navigate: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn(), user: { id: 'owner-1' } }));
vi.mock('@/hooks/useLearningDraft', async () => {
  const React = await import('react');
  return { useLearningDraft: (_key: string, initial: Record<string, unknown>) => {
    const [value, setValue] = React.useState(initial);
    const [canUndo, setCanUndo] = React.useState(false);
    const change = (next: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>)) => {
      setValue(previous => typeof next === 'function' ? next(previous) : next);
      setCanUndo(true);
    };
    return { value, ready: true, status: 'saved', conflict: null, canUndo, canRedo: false, change, undo: vi.fn(), redo: vi.fn(), restore: vi.fn(), clear: async () => {}, flush: async () => true };
  } };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useBilingual', () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }));
vi.mock('@/lib/firestoreDataService', () => ({ persistNote: mocks.save }));
vi.mock('@/lib/firebaseStore', () => ({ firebaseStore: { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [] }) }) }) } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, info: mocks.info, error: mocks.error } }));
vi.mock('@/components/HeaderTitlePortal', () => ({ HeaderTitlePortal: () => null }));
vi.mock('@/components/VoiceInputButton', () => ({ VoiceInputButton: () => null }));
vi.mock('@/components/RichEditor', () => ({ RichEditor: ({ onChange, initialMarkdown, controlledHtml }: { onChange: (html: string, md: string) => void; initialMarkdown?: string; controlledHtml?: string }) => <textarea aria-label="Body" value={controlledHtml ?? initialMarkdown ?? ''} onChange={e => onChange(e.target.value, e.target.value)} /> }));
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'owner-1' }; });
function view() { return <MemoryRouter><NewNoteView /></MemoryRouter>; }
it('keeps failed text on screen and retries with the same record ID', async () => {
  mocks.save.mockResolvedValueOnce('failed').mockResolvedValueOnce('queued');
  render(view());
  fireEvent.change(screen.getByPlaceholderText('Note title...'), { target: { value: 'My note' } });
  fireEvent.change(await screen.findByLabelText('Body'), { target: { value: 'Keep this text' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Body')).toHaveValue('Keep this text');
  fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));
  await waitFor(() => expect(mocks.info).toHaveBeenCalledWith('Note queued for sync'));
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.save.mock.calls[1][1].id).toBe(mocks.save.mock.calls[0][1].id);
  expect(mocks.navigate).toHaveBeenCalledTimes(1);
});
it('does not navigate or report success from an old account save', async () => {
  let resolve!: (status: string) => void;
  mocks.save.mockImplementation(() => new Promise<string>(done => { resolve = done; }));
  const rendered = render(view());
  fireEvent.change(screen.getByPlaceholderText('Note title...'), { target: { value: 'Private title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));
  mocks.user = { id: 'owner-2' };
  rendered.rerender(view());
  expect(screen.getByPlaceholderText('Note title...')).toHaveValue('');
  await act(async () => resolve('synced'));
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
});

it('offers note templates for empty content and keeps the selected outline editable', async () => {
  render(view());
  fireEvent.keyDown(screen.getByRole('button', { name: 'Template' }), { key: 'Enter' });
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Meeting notes' }));
  expect((await screen.findByLabelText('Body') as HTMLTextAreaElement).value).toContain('<h2>Agenda</h2>');
  expect(screen.getByPlaceholderText('Note title...')).toHaveValue('Meeting notes');

  fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'My edited outline' } });
  expect(screen.getByLabelText('Body')).toHaveValue('My edited outline');
});

it('persists raw legacy table markup returned by the visual editor', async () => {
  mocks.save.mockResolvedValue('synced');
  render(view());
  fireEvent.change(screen.getByPlaceholderText('Note title...'), { target: { value: 'Legacy table note' } });
  const legacyTable = '<table><tbody><tr><td>Preserved cell</td></tr></tbody></table>';
  fireEvent.change(await screen.findByLabelText('Body'), { target: { value: legacyTable } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));

  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(mocks.save.mock.calls.at(-1)?.[1].content).toContain('<table>');
  expect(mocks.save.mock.calls.at(-1)?.[1].content).toContain('Preserved cell');
});
