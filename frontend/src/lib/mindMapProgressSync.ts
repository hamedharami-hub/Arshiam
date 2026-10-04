import { auth, db, doc, onSnapshot } from "@/lib/firebase";
import { runTransaction } from "firebase/firestore";
import {
  compareProgressEntries, entriesFromCloud, mergeProgressEntries, progressFromEntries,
  readProgressEntries, sanitizeProgress,
  type MindMapProgressEntries, type MindMapStudyProgress, type MindMapStudyStatus,
} from "./mindMapProgressState";

export const MIND_MAP_PROGRESS_EVENT = "arsh:mind-map-progress";
const RETRY_EVENT = "arsh:mind-map-progress-retry";
const keyFor = (uid: string) => `arsh_mind_map_progress_v2:${uid}`;
const legacyKeyFor = (uid: string) => `arsh_mind_map_progress_v1:${uid}`;
const memory = new Map<string, MindMapProgressEntries>();
const storageErrors = new Map<string, string>();
const cloudErrors = new Map<string, string>();
const inFlight = new Map<string, Promise<boolean>>();
export type MindMapSyncState = {
  status: "local" | "pending" | "synced" | "error";
  pendingCount: number;
  error?: string;
  savedOnDevice: boolean;
};
const online = () => typeof navigator === "undefined" || navigator.onLine;
const ownsSession = (uid: string) => auth.currentUser?.uid === uid;
const messageFor = (error: unknown) => error instanceof Error ? error.message : String(error);

function loadEntries(uid: string): MindMapProgressEntries {
  if (!uid) return {};
  try {
    const value = localStorage.getItem(keyFor(uid));
    if (value) {
      const disk = readProgressEntries(JSON.parse(value), true);
      if (!storageErrors.has(uid)) return disk;
      const combined = { ...disk };
      for (const [id, entry] of Object.entries(memory.get(uid) || {})) {
        if (!combined[id] || compareProgressEntries(entry, combined[id]) >= 0) combined[id] = entry;
      }
      return combined;
    }
    const legacy = sanitizeProgress(JSON.parse(localStorage.getItem(legacyKeyFor(uid)) || "{}"));
    const migrated = Object.fromEntries(Object.entries(legacy).map(([id, status]) => [id, {
      status, updatedAt: 0, revision: 0, mutationId: `legacy:${id}:${status}`, pending: true,
    }]));
    return { ...migrated, ...(memory.get(uid) || {}) };
  } catch (error) {
    storageErrors.set(uid, messageFor(error));
    return memory.get(uid) || {};
  }
}

function persist(uid: string, entries: MindMapProgressEntries) {
  memory.set(uid, entries);
  try {
    // v2 is authoritative; retain v1 as a compatibility mirror, never as an acknowledgement.
    localStorage.setItem(keyFor(uid), JSON.stringify(entries));
    storageErrors.delete(uid);
    try { localStorage.setItem(legacyKeyFor(uid), JSON.stringify(progressFromEntries(entries))); } catch { /* v2 is durable */ }
  } catch (error) {
    storageErrors.set(uid, messageFor(error));
  }
}

export function loadMindMapStudyProgress(uid: string): MindMapStudyProgress {
  return progressFromEntries(loadEntries(uid));
}

export function getMindMapSyncState(uid: string): MindMapSyncState {
  const entries = loadEntries(uid);
  const pendingCount = Object.values(entries).filter((entry) => entry.pending).length;
  const error = storageErrors.get(uid) || cloudErrors.get(uid);
  return { status: error ? "error" : pendingCount ? "pending" : Object.keys(entries).length ? "synced" : "local",
    pendingCount, error, savedOnDevice: !storageErrors.has(uid) };
}

function notify(uid: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MIND_MAP_PROGRESS_EVENT,
    { detail: { userId: uid, progress: loadMindMapStudyProgress(uid), sync: getMindMapSyncState(uid) } }));
}

export function saveLocalMindMapStudyProgress(uid: string, progress: MindMapStudyProgress): void {
  if (!uid) return;
  const entries = loadEntries(uid);
  for (const [id, status] of Object.entries(sanitizeProgress(progress))) {
    if (entries[id]?.status === status) continue;
    const previous = entries[id];
    entries[id] = { status, updatedAt: Math.max(Date.now(), (previous?.updatedAt || 0) + 1),
      revision: (previous?.revision || 0) + 1, mutationId: crypto.randomUUID(), pending: true };
  }
  persist(uid, entries);
  notify(uid);
}

/** Per-user single-flight transactions merge each document independently, never replacing newer edits. */
export function syncMindMapStudyProgressToCloud(uid: string, progress?: MindMapStudyProgress): Promise<boolean> {
  if (!uid) return Promise.resolve(false);
  if (progress) saveLocalMindMapStudyProgress(uid, progress);
  if (!ownsSession(uid) || !online()) { notify(uid); return Promise.resolve(false); }
  const running = inFlight.get(uid);
  if (running) return running;
  const operation = (async () => {
    try {
      while (ownsSession(uid) && online()) {
        const captured = loadEntries(uid);
        const pending = Object.fromEntries(Object.entries(captured).filter(([, entry]) => entry.pending));
        if (!Object.keys(pending).length) { cloudErrors.delete(uid); notify(uid); return true; }
        const reference = doc(db, "users", uid, "mind_settings", "mind_map_progress");
        const committed = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(reference);
          if (!ownsSession(uid)) throw new Error("Account changed; local progress remains pending.");
          const remote = entriesFromCloud(snapshot.exists() ? snapshot.data() : undefined);
          const winners = { ...remote };
          for (const [id, entry] of Object.entries(pending)) {
            if (!winners[id] || compareProgressEntries(entry, winners[id]) > 0) winners[id] = { ...entry, pending: false };
          }
          transaction.set(reference, { entries: winners, progress: progressFromEntries(winners),
            user_id: uid, updated_at: new Date().toISOString(), schema_version: 2 }, { merge: true });
          return winners;
        });
        // Re-read local state: an edit made while awaiting commit must not be acknowledged by this older commit.
        if (!ownsSession(uid)) return false;
        persist(uid, mergeProgressEntries(loadEntries(uid), committed, true));
        cloudErrors.delete(uid);
        notify(uid);
      }
      return false;
    } catch (error) {
      if (ownsSession(uid) && online()) cloudErrors.set(uid, messageFor(error));
      notify(uid);
      return false;
    }
  })();
  inFlight.set(uid, operation);
  void operation.finally(() => {
    if (inFlight.get(uid) === operation) inFlight.delete(uid);
    if (ownsSession(uid) && online() && !cloudErrors.has(uid) && getMindMapSyncState(uid).pendingCount) {
      queueMicrotask(() => { void syncMindMapStudyProgressToCloud(uid); });
    }
  });
  return operation;
}

export function saveMindMapStudyStatus(uid: string, documentId: string, status: MindMapStudyStatus): MindMapStudyProgress {
  return saveMindMapStudyProgress(uid, { [documentId]: status });
}

export function saveMindMapStudyProgress(uid: string, progress: MindMapStudyProgress): MindMapStudyProgress {
  saveLocalMindMapStudyProgress(uid, progress);
  void syncMindMapStudyProgressToCloud(uid);
  return loadMindMapStudyProgress(uid);
}

export function retryMindMapStudyProgressSync(uid: string): Promise<boolean> {
  persist(uid, loadEntries(uid));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(RETRY_EVENT, { detail: { userId: uid } }));
  return syncMindMapStudyProgressToCloud(uid);
}

export function subscribeMindMapStudyProgress(uid: string,
  onUpdate: (progress: MindMapStudyProgress) => void, onState?: (state: MindMapSyncState) => void): () => void {
  let active = true;
  let generation = 0;
  let unsubscribe = () => {};
  const emit = () => {
    if (!active) return;
    onUpdate(loadMindMapStudyProgress(uid));
    onState?.(getMindMapSyncState(uid));
  };
  emit();
  if (!uid) return () => { active = false; };
  const attach = () => {
    unsubscribe();
    const ticket = ++generation;
    if (!ownsSession(uid)) return;
    const valid = () => active && generation === ticket && ownsSession(uid);
    try {
      unsubscribe = onSnapshot(doc(db, "users", uid, "mind_settings", "mind_map_progress"),
        { includeMetadataChanges: true }, (snapshot) => {
          if (!valid()) return;
          const confirmed = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
          persist(uid, mergeProgressEntries(loadEntries(uid), entriesFromCloud(snapshot.exists() ? snapshot.data() : undefined), confirmed));
          if (confirmed) cloudErrors.delete(uid);
          notify(uid);
          if (confirmed && getMindMapSyncState(uid).pendingCount) void syncMindMapStudyProgressToCloud(uid);
        }, (error) => {
          if (!valid()) return;
          cloudErrors.set(uid, messageFor(error));
          notify(uid);
        });
    } catch (error) {
      if (valid()) { cloudErrors.set(uid, messageFor(error)); emit(); }
    }
  };
  const localChange = (event: Event) => {
    if ((event as CustomEvent).detail?.userId === uid) emit();
  };
  const storageChange = (event: StorageEvent) => {
    if (event.key === keyFor(uid)) { emit(); void syncMindMapStudyProgressToCloud(uid); }
  };
  const reconnect = () => { if (active && ownsSession(uid)) { attach(); void syncMindMapStudyProgressToCloud(uid); } };
  const retry = (event: Event) => { if ((event as CustomEvent).detail?.userId === uid) reconnect(); };
  window.addEventListener(MIND_MAP_PROGRESS_EVENT, localChange);
  window.addEventListener(RETRY_EVENT, retry);
  window.addEventListener("storage", storageChange);
  window.addEventListener("online", reconnect);
  window.addEventListener("offline", emit);
  attach();
  return () => {
    active = false;
    generation++;
    unsubscribe();
    window.removeEventListener(MIND_MAP_PROGRESS_EVENT, localChange);
    window.removeEventListener(RETRY_EVENT, retry);
    window.removeEventListener("storage", storageChange);
    window.removeEventListener("online", reconnect);
    window.removeEventListener("offline", emit);
  };
}
