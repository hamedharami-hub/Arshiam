// One shared realtime listener per user collection. Repeated queries are answered
// from memory instead of re-reading the whole collection from the server.
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { trackRead, isQuotaError, markQuotaExhausted } from "./firestoreUsage";

type Row = Record<string, any>;
type Entry = { rows: Map<string, Row>; ready: Promise<boolean>; synced: boolean; failed: boolean };

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
  let settle: (ok: boolean) => void = () => {};
  const entry: Entry = { rows: new Map(), ready: new Promise((r) => { settle = r; }), synced: false, failed: false };
  registry.set(key, entry);
  let gotSnapshot = false;
  const fallback = setTimeout(() => settle(gotSnapshot), 6000);
  onSnapshot(
    collection(db, "users", uid, table),
    (snap) => {
      gotSnapshot = true;
      for (const change of snap.docChanges()) {
        if (change.type === "removed") entry.rows.delete(change.doc.id);
        else entry.rows.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
      }
      if (!snap.metadata.fromCache) {
        trackRead(Math.max(1, snap.docChanges().length), table);
        entry.synced = true;
        settle(true);
        clearTimeout(fallback);
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        settle(true);
      }
    },
    (error) => {
      if (isQuotaError(error)) markQuotaExhausted();
      entry.failed = true;
      registry.delete(key);
      clearTimeout(fallback);
      settle(gotSnapshot);
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
