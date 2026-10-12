// Task bundles use verified, owner-scoped device storage; closures are session-only.
// This is a ten-minute device recovery window, not a cloud recycle bin.
import { auth } from "@/lib/firebase";
import type { TaskCascadeRecovery } from "@/features/tasks/taskService";

export type DeletedEntry = {
  id: string;            // unique entry id (not the task id)
  label: string;         // e.g. task title
  kind: "task" | "note" | "folder" | "tag" | "habit";
  deletedAt: number;
  ownerId?: string;
  recoveryMode?: "device" | "session";
  /** Resolve false (or throw) when the restore did not fully succeed; the entry is then kept. */
  restore: () => Promise<boolean | void> | boolean | void;
};

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const CAP = 50;
const items: DeletedEntry[] = [];
type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());
// localStorage keys accept raw UIDs; the account suffix must match the existing
// clearUserLocalData ownership convention (encoding it breaks exotic UIDs).
const storageKey = (ownerId: string) => `arshnaz:recently-deleted:tasks:v1:${ownerId}`;
type StoredTask = Pick<DeletedEntry, "id" | "label" | "deletedAt"> & { ownerId: string; bundle: TaskCascadeRecovery };

function readStored(ownerId: string): StoredTask[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(storageKey(ownerId)) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is StoredTask => row?.ownerId === ownerId &&
      typeof row.id === "string" && typeof row.label === "string" &&
      typeof row.deletedAt === "number" && Date.now() - row.deletedAt <= TTL_MS &&
      row.bundle && ["tasks", "tagLinks", "knowledgeLinks", "noteTaskLinks"].every((key) => Array.isArray(row.bundle[key])));
  } catch { return []; }
}

function writeStored(ownerId: string, rows: StoredTask[]): boolean {
  try {
    const serialized = JSON.stringify(rows.slice(0, CAP));
    localStorage.setItem(storageKey(ownerId), serialized);
    return localStorage.getItem(storageKey(ownerId)) === serialized;
  } catch { return false; }
}

async function restoreTaskBundle(entry: StoredTask): Promise<boolean> {
  if (auth.currentUser?.uid !== entry.ownerId) return false;
  const { persistTask } = await import("@/lib/firestoreDataService");
  const { firebaseStore } = await import("@/lib/firebaseStore");
  for (const task of entry.bundle.tasks) {
    if (auth.currentUser?.uid !== entry.ownerId || task.user_id !== entry.ownerId) return false;
    const status = await persistTask(entry.ownerId, task);
    if (status !== "saved" && status !== "queued") return false;
  }
  for (const [table, rows] of [
    ["task_tags", entry.bundle.tagLinks],
    ["task_knowledge_links", entry.bundle.knowledgeLinks],
    ["note_task_links", entry.bundle.noteTaskLinks],
  ] as const) {
    if (auth.currentUser?.uid !== entry.ownerId) return false;
    if (rows.some((row) => row.user_id !== entry.ownerId)) return false;
    if (rows.length) {
      const { error } = await firebaseStore.from(table).insert(rows as never);
      if (error) return false;
    }
  }
  window.dispatchEvent(new Event("tasks-changed"));
  return true;
}

/** False means only session recovery is available (device storage was denied/full). */
export function pushDeletedTask(ownerId: string, label: string, bundle: TaskCascadeRecovery): boolean {
  if (auth.currentUser?.uid !== ownerId) return false;
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const entry: StoredTask = { id, ownerId, label, deletedAt: Date.now(), bundle };
  if (writeStored(ownerId, [entry, ...readStored(ownerId)])) { notify(); return true; }
  pushDeleted({ id: entry.id, ownerId, label, kind: "task", restore: () => restoreTaskBundle(entry) });
  return false;
}

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
    ownerId: entry.ownerId ?? auth.currentUser?.uid,
    recoveryMode: "session",
    restore: entry.restore,
  });
  if (items.length > CAP) items.length = CAP;
  notify();
}

export function listDeleted(): DeletedEntry[] {
  prune();
  const ownerId = auth.currentUser?.uid;
  if (!ownerId) return [];
  return [
    ...readStored(ownerId).map((entry): DeletedEntry => ({
      ...entry, kind: "task", recoveryMode: "device", restore: () => restoreTaskBundle(entry),
    })),
    ...items.filter((entry) => entry.ownerId === ownerId),
  ].sort((a, b) => b.deletedAt - a.deletedAt);
}

export async function restoreDeleted(id: string) {
  prune();
  const ownerId = auth.currentUser?.uid;
  if (!ownerId) return false;
  const stored = readStored(ownerId);
  const persisted = stored.find((entry) => entry.id === id);
  if (persisted) {
    if (!await restoreTaskBundle(persisted)) throw new Error("Restore failed; the item was kept");
    if (!writeStored(ownerId, stored.filter((entry) => entry.id !== id))) throw new Error("Restored, but recovery entry could not be cleared");
    notify();
    return true;
  }
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1 || items[idx].ownerId !== ownerId) return false;
  const e = items[idx];
  const result = await e.restore();
  // Keep the entry until the restore is confirmed, so a partial/failed restore
  // stays visible and retryable instead of silently disappearing.
  if (result === false) throw new Error("Restore failed; the item was kept");
  const currentIndex = items.findIndex((entry) => entry.id === id);
  if (currentIndex !== -1) items.splice(currentIndex, 1);
  notify();
  return true;
}

export function clearDeleted() {
  const ownerId = auth.currentUser?.uid;
  if (!ownerId) return;
  writeStored(ownerId, []);
  for (let i = items.length - 1; i >= 0; i--) if (items[i].ownerId === ownerId) items.splice(i, 1);
  notify();
}

export function subscribeDeleted(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
