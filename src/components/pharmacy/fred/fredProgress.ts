export type FredStatus = "not_started" | "learning" | "practised";
export type SaveState = "saved" | "queued" | "failed";

export interface FredProgressRecord {
  lessonId: string;
  status: FredStatus;
  stepIndex: number;
  attemptId: string | null;
  updatedAt: number;
}

export interface FredRemote {
  /** Merges `local` with the stored document atomically and returns the stored result. */
  merge(uid: string, local: FredProgressRecord): Promise<FredProgressRecord>;
  list(uid: string): Promise<FredProgressRecord[]>;
}

const RANK: Record<FredStatus, number> = { not_started: 0, learning: 1, practised: 2 };
export const isFredStatus = (v: unknown): v is FredStatus => v === "not_started" || v === "learning" || v === "practised";

export function emptyRecord(lessonId: string): FredProgressRecord {
  return { lessonId, status: "not_started", stepIndex: 0, attemptId: null, updatedAt: 0 };
}

/** Highest achievement wins; stepIndex follows the newest write; attemptId follows the record that holds the achievement. */
export function mergeProgress(a: FredProgressRecord, b: FredProgressRecord): FredProgressRecord {
  const newest = a.updatedAt >= b.updatedAt ? a : b;
  const higher = RANK[a.status] === RANK[b.status] ? newest : RANK[a.status] > RANK[b.status] ? a : b;
  return { lessonId: a.lessonId, status: higher.status, stepIndex: newest.stepIndex, attemptId: higher.attemptId ?? newest.attemptId ?? null, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

export const sameRecord = (a: FredProgressRecord, b: FredProgressRecord) =>
  a.status === b.status && a.stepIndex === b.stepIndex && a.attemptId === b.attemptId && a.updatedAt === b.updatedAt;

/** A retry carrying an attemptId the remote already holds records nothing new. */
export function isDuplicateAttempt(remote: FredProgressRecord | null, local: FredProgressRecord): boolean {
  return !!remote && !!local.attemptId && remote.attemptId === local.attemptId && RANK[remote.status] >= RANK[local.status] && remote.stepIndex === local.stepIndex;
}

export function parseRecord(lessonId: string, raw: unknown): FredProgressRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isFredStatus(r.status)) return null;
  const step = typeof r.stepIndex === "number" && Number.isFinite(r.stepIndex) ? Math.max(0, Math.floor(r.stepIndex)) : 0;
  return { lessonId, status: r.status, stepIndex: step, attemptId: typeof r.attemptId === "string" ? r.attemptId : null, updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0 };
}

export const newAttemptId = () => `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const cacheKey = (uid: string) => `arshnaz:fred-progress:v2:${uid}`;
const outboxKey = (uid: string) => `arshnaz:fred-outbox:v2:${uid}`;
const OUTBOX_PREFIX = "arshnaz:fred-outbox:v2:";
export const legacyKey = (uid: string) => `arshnaz:fred-understanding:v1:${uid}`;
const legacyArchiveKey = (uid: string) => `arshnaz:fred-progress-legacy:v1:${uid}`;

function readJson<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export function loadLocalProgress(uid: string): Record<string, FredProgressRecord> {
  const raw = readJson<Record<string, unknown>>(cacheKey(uid), {});
  const out: Record<string, FredProgressRecord> = {};
  for (const [id, value] of Object.entries(raw)) { const rec = parseRecord(id, value); if (rec) out[id] = rec; }
  return out;
}
export const saveLocalProgress = (uid: string, map: Record<string, FredProgressRecord>) => writeJson(cacheKey(uid), map);

export interface OutboxItem { record: FredProgressRecord; failed: boolean }
export type Outbox = Record<string, OutboxItem>;
export const loadOutbox = (uid: string): Outbox => readJson<Outbox>(outboxKey(uid), {});
export const saveOutbox = (uid: string, outbox: Outbox): boolean => {
  if (!Object.keys(outbox).length) { try { localStorage.removeItem(outboxKey(uid)); return true; } catch { return false; } }
  return writeJson(outboxKey(uid), outbox);
};

/** Account switch: every outbox that does not belong to `uid` is deleted. */
export function purgeForeignOutboxes(uid: string): void {
  try {
    const own = outboxKey(uid);
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(OUTBOX_PREFIX) && k !== own) doomed.push(k); }
    doomed.forEach(k => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

/** Old v1 progress is archived (never migrated) and the old key is removed. */
export function archiveLegacyProgress(uid: string): unknown | null {
  try {
    const raw = localStorage.getItem(legacyKey(uid));
    if (raw === null) return null;
    localStorage.setItem(legacyArchiveKey(uid), raw);
    localStorage.removeItem(legacyKey(uid));
    return JSON.parse(raw);
  } catch { return null; }
}

const RETRYABLE = /unavailable|network|offline|deadline|failed to fetch|timeout|resource-exhausted/i;
export const isRetryableError = (e: unknown) => {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  return RETRYABLE.test(code) || RETRYABLE.test(e instanceof Error ? e.message : "") || (typeof navigator !== "undefined" && navigator.onLine === false);
};

/** saved: stored remotely; queued: kept in this uid's outbox for automatic retry; failed: not saved (kept for manual retry when storage allows). */
export async function pushRecord(uid: string, record: FredProgressRecord, remote: FredRemote): Promise<{ state: SaveState; merged: FredProgressRecord }> {
  try {
    const merged = await remote.merge(uid, record);
    const outbox = loadOutbox(uid);
    if (outbox[record.lessonId]) { delete outbox[record.lessonId]; saveOutbox(uid, outbox); }
    return { state: "saved", merged };
  } catch (e) {
    const outbox = loadOutbox(uid);
    const prev = outbox[record.lessonId]?.record;
    const retryable = isRetryableError(e);
    outbox[record.lessonId] = { record: prev ? mergeProgress(prev, record) : record, failed: !retryable };
    const stored = saveOutbox(uid, outbox);
    return { state: stored && retryable ? "queued" : "failed", merged: record };
  }
}

export async function flushOutbox(uid: string, remote: FredRemote): Promise<Record<string, { state: SaveState; merged: FredProgressRecord }>> {
  const results: Record<string, { state: SaveState; merged: FredProgressRecord }> = {};
  for (const [id, item] of Object.entries(loadOutbox(uid))) results[id] = await pushRecord(uid, item.record, remote);
  return results;
}

export function createFirestoreRemote(): FredRemote {
  return {
    async merge(uid, local) {
      const { db } = await import("@/lib/firebase");
      const { doc, runTransaction } = await import("firebase/firestore");
      const ref = doc(db, "users", uid, "fredProgress", local.lessonId);
      return runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        const remote = snap.exists() ? parseRecord(local.lessonId, snap.data()) : null;
        if (isDuplicateAttempt(remote, local)) return remote!;
        const merged = remote ? mergeProgress(remote, local) : local;
        if (!remote || !sameRecord(remote, merged)) tx.set(ref, { status: merged.status, stepIndex: merged.stepIndex, attemptId: merged.attemptId, updatedAt: merged.updatedAt });
        return merged;
      });
    },
    async list(uid) {
      const { db } = await import("@/lib/firebase");
      const { collection, getDocs } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "users", uid, "fredProgress"));
      return snap.docs.map(d => parseRecord(d.id, d.data())).filter((r): r is FredProgressRecord => !!r);
    },
  };
}

export async function archiveLegacyToCloud(uid: string, legacy: unknown): Promise<void> {
  const { db } = await import("@/lib/firebase");
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "users", uid, "fredProgressLegacy", "v1"), { archivedAt: Date.now(), completedModules: Array.isArray(legacy) ? legacy.filter(x => typeof x === "string") : [] });
}
