import type { ReactNode } from 'react';

// Data/auth adapters only: NotesView, list rows, filtering, previews and editor
// remain production modules. No cloud account, writes, listeners or network timings.
const user = { id: 'qa-synthetic-owner', email: 'qa@example.invalid' };
export const syntheticNotes = Array.from({ length: 5000 }, (_, index) => ({
  id: `qa-note-${index}`, user_id: user.id,
  title: `Synthetic note ${String(index).padStart(4, '0')} · یادداشت آزمایشی`,
  content: (`## Synthetic section\n\nمتن مصنوعی **bold** and [reference](https://example.com).\n`).repeat(20)
    + (index === 4999 ? '\nunique-library-tail-marker' : ''),
  pinned: index < 3, updated_at: '2026-10-13T00:00:00Z',
  folder_id: index % 2 ? 'qa-work' : null, tag_ids: index % 3 ? [] : ['qa-tag'],
}));
const auth = { user, session: null, loading: false, signOut: async () => {}, setUser: () => {} };
export const useAuth = () => auth;
export const AuthProvider = ({ children }: { children: ReactNode }) => children;
const chain = (table: string): any => new Proxy({}, {
  get: (_target, key) => key === 'then'
    ? (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'folders' ? [{ id: 'qa-work', name: 'QA Work' }] : table === 'tags' ? [{ id: 'qa-tag', name: 'QA Tag' }] : [], error: null }).then(resolve)
    : () => chain(table),
});
export const firebaseStore = { from: chain, channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: () => {} };
export const liveRows = async () => syntheticNotes;
export const stopLiveListeners = () => {};
export const subscribeNotes = (_owner: string, callback: (notes: typeof syntheticNotes) => void) => {
  queueMicrotask(() => callback(syntheticNotes));
  return () => {};
};
export const upsertNote = async () => true;
export const deleteNote = async () => true;
export const cacheGet = async () => syntheticNotes;
export const cacheSet = async () => {};
export const getPendingOps = async () => [];
export const getNoteTaskLinks = async () => [];
