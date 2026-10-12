import { CACHE_STORE, getDB } from "@/lib/offlineDb";

/** One device-only draft per account+note, written before the cloud attempt. */
export type NoteDraftRecord = {
  accountId: string;
  noteId: string;
  md: string;
  html: string;
  updatedAt: number;
};

/** The key ends with the account id so `clearUserLocalData` can drop it. */
export function noteDraftKey(accountId: string, noteId: string) {
  return `note-draft:v1:${noteId}:${accountId}`;
}

/** Read the retained draft, if any. Returns null when no durable copy exists. */
export async function readNoteDraft(accountId: string, noteId: string): Promise<NoteDraftRecord | null> {
  const key = noteDraftKey(accountId, noteId);
  const valid = (value: unknown): NoteDraftRecord | null => {
    const record = value as NoteDraftRecord | undefined;
    return record && typeof record.md === "string" && typeof record.html === "string" && typeof record.updatedAt === "number" ? record : null;
  };
  try {
    const db = await getDB();
    if (db) {
      const stored = valid(await db.get(CACHE_STORE, key));
      if (stored) return stored;
    }
  } catch { /* fall through to the synchronous backup */ }
  try {
    return valid(JSON.parse(localStorage.getItem(key) || "null"));
  } catch { return null; }
}

/** Persist the draft and report whether a durable copy really landed. */
export async function writeNoteDraft(record: NoteDraftRecord): Promise<boolean> {
  const key = noteDraftKey(record.accountId, record.noteId);
  try {
    const db = await getDB();
    if (db) {
      await db.put(CACHE_STORE, record, key);
      const stored = (await db.get(CACHE_STORE, key)) as NoteDraftRecord | undefined;
      if (stored && stored.updatedAt === record.updatedAt && stored.md === record.md) return true;
    }
  } catch { /* fall through to localStorage */ }
  try {
    const serialized = JSON.stringify(record);
    localStorage.setItem(key, serialized);
    return localStorage.getItem(key) === serialized;
  } catch { return false; }
}

/** Drop the draft only after the cloud write is acknowledged. */
export async function clearNoteDraft(accountId: string, noteId: string): Promise<void> {
  const key = noteDraftKey(accountId, noteId);
  try { const db = await getDB(); if (db) await db.delete(CACHE_STORE, key); } catch { /* ignore */ }
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Debounce per record, serialize writes and flush before navigation/unmount. */
export function createDebouncedWrites(delay = 1200) {
  const pending = new Map<string, { write: () => Promise<unknown>; timer: ReturnType<typeof setTimeout> }>();
  const running = new Map<string, Promise<unknown>>();
  const cancel = (key: string) => {
    const item = pending.get(key);
    if (item) clearTimeout(item.timer);
    pending.delete(key);
  };
  const flush = (key: string): Promise<unknown> => {
    const item = pending.get(key);
    if (!item) return running.get(key) ?? Promise.resolve();
    cancel(key);
    const operation = (running.get(key) ?? Promise.resolve()).catch(() => undefined).then(item.write);
    running.set(key, operation);
    void operation.finally(() => { if (running.get(key) === operation) running.delete(key); }).catch(() => undefined);
    return operation;
  };
  return {
    schedule(key: string, write: () => Promise<unknown>) {
      cancel(key);
      pending.set(key, { write, timer: setTimeout(() => { void flush(key).catch(() => undefined); }, delay) });
    },
    flush, cancel,
    flushAll: () => Promise.allSettled([...pending.keys()].map(flush)),
    settle: (key: string) => running.get(key) ?? Promise.resolve(),
  };
}
