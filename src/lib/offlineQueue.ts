// Queues mutations while offline and replays them when back online.

import { openDB, type IDBPDatabase } from "idb";
import { firebaseStore } from "@/lib/firebaseStore";
import { toast } from "sonner";

export type QueuedOp = {
  id?: number;
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  payload?: unknown;
  match?: Record<string, unknown>;
  upsertOptions?: { onConflict?: string };
  /** Firebase user that owned the operation when it was created. */
  ownerId?: string;
  createdAt: number;
  attempts: number;
  nextRetryAt?: number;
  lastError?: string;
};

const DB_NAME = "taskflow-offline";
const STORE = "outbox";
const CACHE_STORE = "cache";
const MAX_RETRY_DELAY_MS = 300_000;
const MAX_ATTEMPTS_BEFORE_ALERT = 10;

let dbPromise: Promise<IDBPDatabase | null> | null = null;
async function getDB(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
      },
    }).catch((err) => {
      console.warn("IndexedDB not available in this context:", err);
      return null;
    });
  }
  return dbPromise;
}

export async function enqueueOp(
  op: Omit<QueuedOp, "id" | "createdAt" | "attempts" | "nextRetryAt" | "lastError">
): Promise<boolean> {
  let queued = false;
  try {
    const db = await getDB();
    if (db) {
      const ownerId = await getAuthenticatedUserId();
      await db.add(STORE, { ...op, ownerId, createdAt: Date.now(), attempts: 0 });
      queued = true;
    }
  } catch (err) {
    console.warn("Could not enqueue offline op:", err);
  }
  notifyChange();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    setTimeout(() => void flushQueue(), 50);
  }
  return queued;
}

async function getAuthenticatedUserId(): Promise<string | undefined> {
  try {
    const { auth } = await import("./firebase");
    return auth.currentUser?.uid || undefined;
  } catch {
    return undefined;
  }
}

/** A queued mutation must never cross the account boundary that created it. */
export function canReplayForOwner(item: Pick<QueuedOp, "ownerId">, activeOwnerId: string | undefined): boolean {
  return Boolean(activeOwnerId && item.ownerId && item.ownerId === activeOwnerId);
}

export async function getQueue(): Promise<QueuedOp[]> {
  try {
    const db = await getDB();
    return db ? await db.getAll(STORE) : [];
  } catch {
    return [];
  }
}

export async function getPendingOps(table?: string): Promise<QueuedOp[]> {
  const all = await getQueue();
  return table ? all.filter((op) => op.table === table) : all;
}

export async function clearQueue() {
  try {
    const db = await getDB();
    if (db) await db.clear(STORE);
  } catch {}
  notifyChange();
}

export async function cacheSet(key: string, value: unknown) {
  try {
    const db = await getDB();
    if (db) await db.put(CACHE_STORE, value, key);
  } catch {}
}

export async function cacheGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return db ? ((await db.get(CACHE_STORE, key)) as T | undefined) : undefined;
  } catch {
    return undefined;
  }
}

const listeners = new Set<() => void>();
export function onQueueChange(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notifyChange() {
  listeners.forEach((listener) => listener());
}

function responseHasError(response: unknown): boolean {
  return Boolean(
    response &&
      typeof response === "object" &&
      "error" in response &&
      (response as { error?: unknown }).error
  );
}

async function replayWithLegacyStore(item: QueuedOp): Promise<boolean> {
  try {
    const q = firebaseStore.from(item.table);
    let response: unknown;
    if (item.op === "insert") {
      response = await q.insert(item.payload as Record<string, unknown>);
    } else if (item.op === "upsert") {
      response = await q.upsert(item.payload as Record<string, unknown>, item.upsertOptions);
    } else if (item.op === "update") {
      let builder = q.update(item.payload as Record<string, unknown>);
      for (const [key, value] of Object.entries(item.match || {})) builder = builder.eq(key, value);
      response = await builder;
    } else {
      let builder = q.delete();
      for (const [key, value] of Object.entries(item.match || {})) builder = builder.eq(key, value);
      response = await builder;
    }
    return !responseHasError(response);
  } catch (error) {
    console.warn(`[offlineQueue] Legacy replay failed for ${item.table}:`, error);
    return false;
  }
}

async function replayItem(item: QueuedOp, userId: string): Promise<boolean> {
  let firestoreAttempted = false;
  let firestoreSucceeded = false;
  try {
    const firestoreTables = ["tasks", "notes", "habits", "folders", "tags"];
    if (userId && firestoreTables.includes(item.table)) {
      firestoreAttempted = true;
      const { saveEntityToFirestore, deleteEntityFromFirestore } = await import("./firestoreSync");
      if (item.op === "delete") {
        const docId = item.match?.id as string;
        firestoreSucceeded = Boolean(
          docId && await deleteEntityFromFirestore(userId, item.table as "tasks" | "notes" | "habits", docId)
        );
      } else {
        const payload = (item.payload || {}) as Record<string, any>;
        const docId = (payload.id || item.match?.id) as string;
        firestoreSucceeded = Boolean(
          docId && await saveEntityToFirestore(userId, item.table as "tasks" | "notes" | "habits", docId, payload)
        );
      }
    }
  } catch (error) {
    console.warn("[offlineQueue] Firestore replay warning:", error);
  }

  // For supported entities, the direct Firestore path is authoritative. The legacy
  // mirror is used only if the direct path was not attempted or failed.
  if (firestoreSucceeded) return true;
  if (firestoreAttempted || !firestoreSucceeded) return replayWithLegacyStore(item);
  return false;
}

let syncing = false;
export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (syncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { ok: 0, failed: 0 };
  }
  syncing = true;
  let ok = 0;
  let failed = 0;
  let notifiedFailure = false;
  try {
    const db = await getDB();
    if (!db) return { ok: 0, failed: 0 };
    const activeOwnerId = await getAuthenticatedUserId();
    if (!activeOwnerId) return { ok: 0, failed: 0 };
    const items = await db.getAll(STORE);
    const now = Date.now();

    for (const item of items) {
      if (item.nextRetryAt && item.nextRetryAt > now) continue;
      // Keep old/unattributable records intact for recovery, but never replay
      // them under whichever account happens to sign in later.
      if (!canReplayForOwner(item, activeOwnerId)) continue;
      try {
        const succeeded = await replayItem(item, activeOwnerId);
        if (!succeeded) throw new Error("Cloud write was not confirmed");
        await db.delete(STORE, item.id!);
        ok++;
      } catch (error) {
        failed++;
        const attempts = (item.attempts || 0) + 1;
        const message = error instanceof Error ? error.message : "خطای نامشخص در همگام‌سازی";
        const updated: QueuedOp = {
          ...item,
          attempts,
          lastError: message,
          nextRetryAt: Date.now() + Math.min(2 ** attempts * 1000, MAX_RETRY_DELAY_MS),
        };
        // Never discard user data automatically. After repeated failures, keep the
        // operation in the outbox and alert the user so it can be diagnosed/retried.
        await db.put(STORE, updated);
        if (attempts >= MAX_ATTEMPTS_BEFORE_ALERT && !notifiedFailure) {
          toast.error("برخی تغییرات هنوز همگام نشده‌اند", {
            description: "تغییرات شما حفظ شده‌اند و بعداً دوباره تلاش می‌شود.",
          });
          notifiedFailure = true;
        }
      }
    }
  } catch (error) {
    console.warn("flushQueue encountered error:", error);
  } finally {
    syncing = false;
    notifyChange();
  }
  return { ok, failed };
}

let syncCleanup: (() => void) | null = null;
export function initOfflineSync() {
  if (typeof window === "undefined" || syncCleanup) return;
  const onOnline = () => void flushQueue();
  window.addEventListener("online", onOnline);
  const timer = window.setInterval(() => {
    if (navigator.onLine) void flushQueue();
  }, 15_000);
  if (navigator.onLine) window.setTimeout(() => void flushQueue(), 1_500);
  syncCleanup = () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(timer);
    syncCleanup = null;
  };
}
