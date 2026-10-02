// In-memory "Recently Deleted" tray. Items auto-expire after TTL_MS.
// Used as a longer-lived companion to the immediate undo toast.

export type DeletedEntry = {
  id: string;            // unique entry id (not the task id)
  label: string;         // e.g. task title
  kind: "task" | "note" | "folder" | "tag" | "habit";
  deletedAt: number;
  restore: () => Promise<void> | void;
};

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const CAP = 50;
const items: DeletedEntry[] = [];
type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

function prune() {
  const now = Date.now();
  for (let i = items.length - 1; i >= 0; i--) {
    if (now - items[i].deletedAt > TTL_MS) items.splice(i, 1);
  }
}

export function pushDeleted(entry: Omit<DeletedEntry, "id" | "deletedAt"> & { id?: string }) {
  prune();
  items.unshift({
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: entry.label,
    kind: entry.kind,
    deletedAt: Date.now(),
    restore: entry.restore,
  });
  if (items.length > CAP) items.length = CAP;
  notify();
}

export function listDeleted(): DeletedEntry[] {
  prune();
  return [...items];
}

export async function restoreDeleted(id: string) {
  prune();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  const e = items[idx];
  await e.restore();
  items.splice(idx, 1);
  notify();
  return true;
}

export function clearDeleted() {
  items.length = 0;
  notify();
}

export function subscribeDeleted(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
