// One shared realtime listener per user collection. Repeated queries are answered
// from memory instead of re-reading the whole collection from the server.
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { trackRead, isQuotaError, markQuotaExhausted } from "./firestoreUsage";

type Row = Record<string, any>;
type Entry = {
  rows: Map<string, Row>;
  ready: Promise<boolean>;
  synced: boolean;
  failed: boolean;
  unsubscribe: () => void;
  settle: (ok: boolean) => void;
  fallback: ReturnType<typeof setTimeout> | null;
};

const registry = new Map<string, Entry>();
// Knowledge/learning data keeps its own loading strategy; server-managed collections are not client-readable.
const EXCLUDED = /^(knowledge|pharmacy|leitner|review|interactive_study|learning|user_roles|assistant_|cycle_profile_tombstones)/;

export function isLiveEligible(table: string): boolean {
  return import.meta.env.MODE !== "test" && !EXCLUDED.test(table);
}

function open(uid: string, table: string): Entry {
  const key = `${uid}/${table}`;
  const existing = registry.get(key);
  if (existing && !existing.failed) return existing;
  let settleFn: (ok: boolean) => void = () => {};
  const entry: Entry = {
    rows: new Map(),
    ready: new Promise((r) => { settleFn = r; }),
    synced: false,
    failed: false,
    unsubscribe: () => {},
    settle: (ok: boolean) => settleFn(ok),
    fallback: null,
  };
  registry.set(key, entry);
  let gotSnapshot = false;
  entry.fallback = setTimeout(() => entry.settle(gotSnapshot), 6000);
  const clearFallback = () => {
    if (entry.fallback) { clearTimeout(entry.fallback); entry.fallback = null; }
  };
  // Keep the unsubscribe handle: without it the listener survives sign-out and
  // every account switch (leaking listeners, quota and the previous user's rows).
  entry.unsubscribe = onSnapshot(
    collection(db, "users", uid, table),
    (snap) => {
      gotSnapshot = true;
      entry.synced = !snap.metadata.fromCache;
      for (const change of snap.docChanges()) {
        if (change.type === "removed") entry.rows.delete(change.doc.id);
        else entry.rows.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
      }
      if (!snap.metadata.fromCache) {
        trackRead(Math.max(1, snap.docChanges().length), table);
        clearFallback();
        entry.settle(true);
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        clearFallback();
        entry.settle(true);
      }
    },
    (error) => {
      if (isQuotaError(error)) markQuotaExhausted();
      entry.failed = true;
      registry.delete(key);
      clearFallback();
      entry.settle(gotSnapshot);
    },
  );
  return entry;
}

/** All rows of a user collection, or null when the caller must query Firestore directly. */
export async function liveRows(uid: string, table: string): Promise<Row[] | null> {
  if (!uid || !isLiveEligible(table)) return null;
  const entry = open(uid, table);
  const ok = await entry.ready;
  if (!ok && entry.rows.size === 0) return null;
  return [...entry.rows.values()];
}

/** Last known copy of a document from an active listener (undefined = listener not ready). */
export function liveDoc(uid: string, table: string, id: string): Row | null | undefined {
  const entry = registry.get(`${uid}/${table}`);
  if (!entry || entry.failed || !entry.synced) return undefined;
  return entry.rows.get(id) ?? null;
}

/** Whether the shared listener has received a server-backed snapshot for this collection. */
export function hasServerSnapshot(uid: string, table: string): boolean {
  const entry = registry.get(`${uid}/${table}`);
  return !!entry && !entry.failed && entry.synced;
}

/**
 * Tears down every shared listener and releases the cached rows.
 * Call on sign-out so the next account starts from an empty registry; pending
 * `liveRows` callers resolve to null and fall back to a direct query.
 */
export function stopLiveListeners(): void {
  for (const entry of registry.values()) {
    try { entry.unsubscribe(); } catch { /* listener already gone */ }
    if (entry.fallback) { clearTimeout(entry.fallback); entry.fallback = null; }
    entry.settle(false);
  }
  registry.clear();
}
