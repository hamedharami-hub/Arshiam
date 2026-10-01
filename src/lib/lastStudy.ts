export interface LastStudy { docId: string; title: string; titleEn?: string; openedAt: number }
export interface LastStudyRemote {
  get(uid: string): Promise<LastStudy | null>;
  /** Writes only when `value` is at least as new as the stored one; returns what is stored afterwards. */
  setIfNewer(uid: string, value: LastStudy): Promise<LastStudy>;
}

const key = (uid: string) => `arshnaz:last-study:v1:${uid}`;
const pendingKey = (uid: string) => `arshnaz:last-study-pending:v1:${uid}`;
export const isCloudUid = (uid: string) => !!uid && uid !== "guest" && uid !== "anonymous-kb-user";

function parse(raw: unknown): LastStudy | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<LastStudy>;
  return typeof r.docId === "string" && typeof r.title === "string" ? { docId: r.docId, title: r.title, titleEn: typeof r.titleEn === "string" ? r.titleEn : undefined, openedAt: typeof r.openedAt === "number" ? r.openedAt : 0 } : null;
}

const studiedKey = (uid: string) => `arshnaz:studied-docs:v1:${uid}`;
export function getStudiedDocIds(uid: string): Set<string> {
  try { const raw = JSON.parse(localStorage.getItem(studiedKey(uid)) ?? "[]"); return new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : []); } catch { return new Set(); }
}
function markStudied(uid: string, docId: string) {
  try { const ids = getStudiedDocIds(uid); ids.add(docId); localStorage.setItem(studiedKey(uid), JSON.stringify([...ids])); } catch { /* storage unavailable */ }
}

export function getLastStudy(uid: string): LastStudy | null {
  try { return parse(JSON.parse(localStorage.getItem(key(uid)) ?? "null")); } catch { return null; }
}
function setLocal(uid: string, value: LastStudy) { try { localStorage.setItem(key(uid), JSON.stringify(value)); } catch { /* storage unavailable */ } }
const setPending = (uid: string, on: boolean) => { try { if (on) localStorage.setItem(pendingKey(uid), "1"); else localStorage.removeItem(pendingKey(uid)); } catch { /* ignore */ } };
const isPending = (uid: string) => { try { return localStorage.getItem(pendingKey(uid)) === "1"; } catch { return false; } };

export function createFirestoreLastStudyRemote(): LastStudyRemote {
  return {
    async get(uid) {
      const { db } = await import("@/lib/firebase");
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "users", uid, "studyState", "lastStudy"));
      return snap.exists() ? parse(snap.data()) : null;
    },
    async setIfNewer(uid, value) {
      const { db } = await import("@/lib/firebase");
      const { doc, runTransaction } = await import("firebase/firestore");
      const ref = doc(db, "users", uid, "studyState", "lastStudy");
      return runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        const stored = snap.exists() ? parse(snap.data()) : null;
        if (stored && stored.openedAt > value.openedAt) return stored;
        const data: Record<string, unknown> = { docId: value.docId, title: value.title, openedAt: value.openedAt };
        if (value.titleEn) data.titleEn = value.titleEn;
        tx.set(ref, data);
        return value;
      });
    },
  };
}
const defaultRemote = createFirestoreLastStudyRemote();

/** Saves locally at once, then pushes to the account; a failed push is retried on the next sync. */
export async function recordLastStudy(uid: string, doc: { docId: string; title: string; titleEn?: string }, remote: LastStudyRemote = defaultRemote): Promise<void> {
  const value: LastStudy = { ...doc, openedAt: Date.now() };
  setLocal(uid, value);
  markStudied(uid, doc.docId);
  if (!isCloudUid(uid)) return;
  setPending(uid, true);
  try { await remote.setIfNewer(uid, value); setPending(uid, false); } catch { /* stays pending */ }
}

/** Newest of this device and the account wins on both sides. Throws when the account cannot be reached. */
export async function syncLastStudy(uid: string, remote: LastStudyRemote = defaultRemote): Promise<LastStudy | null> {
  const local = getLastStudy(uid);
  if (!isCloudUid(uid)) return local;
  const stored = await remote.get(uid);
  if (stored && (!local || stored.openedAt > local.openedAt)) { setLocal(uid, stored); setPending(uid, false); return stored; }
  if (local && (isPending(uid) || !stored || local.openedAt > stored.openedAt)) {
    const result = await remote.setIfNewer(uid, local);
    setPending(uid, false);
    if (result.openedAt > local.openedAt) setLocal(uid, result);
    return result.openedAt > local.openedAt ? result : local;
  }
  return local;
}
