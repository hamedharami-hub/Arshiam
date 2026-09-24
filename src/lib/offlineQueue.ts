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

import { getDB, STORE, CACHE_STORE, cacheGet, cacheSet } from "./offlineDb";
export { cacheGet, cacheSet };

const MAX_RETRY_DELAY_MS = 300_000;
const MAX_ATTEMPTS_BEFORE_ALERT = 10;

const LS_OUTBOX_KEY = "arshnaz_offline_outbox_fallback";

function loadLocalStorageOutbox(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(LS_OUTBOX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalStorageOutbox(items: QueuedOp[]): boolean {
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(LS_OUTBOX_KEY, serialized);
    return localStorage.getItem(LS_OUTBOX_KEY) === serialized;
  } catch (e) {
    console.warn("[offlineQueue] Failed to save outbox to localStorage:", e);
    return false;
  }
}

const memoryOutbox = new Map<number, QueuedOp>();
let memoryOutboxAutoInc = 1;

export async function enqueueOp(
  op: Omit<QueuedOp, "id" | "createdAt" | "attempts" | "nextRetryAt" | "lastError">
): Promise<boolean> {
  let queued = false;
  const payload = op.payload && typeof op.payload === "object"
    ? op.payload as Record<string, unknown>
    : undefined;
  const ownerId = op.ownerId ||
    (typeof payload?.user_id === "string" ? payload.user_id : undefined) ||
    (typeof payload?.userId === "string" ? payload.userId : undefined) ||
    (typeof op.match?.user_id === "string" ? op.match.user_id : undefined) ||
    await getAuthenticatedUserId();
  const item = { ...op, ownerId, createdAt: Date.now(), attempts: 0 };

  try {
    const db = await getDB();
    if (db) {
      try {
        await db.add(STORE, item);
        queued = true;
      } catch (err) {
        console.warn("[offlineQueue] IndexedDB enqueue failed; trying verified localStorage fallback:", err);
      }
    }
  } catch (err) {
    console.warn("Could not enqueue offline op:", err);
  }

  if (!queued) {
    const id = memoryOutboxAutoInc++;
    const fullItem = { ...item, id };
    const list = loadLocalStorageOutbox();
    if (saveLocalStorageOutbox([...list, fullItem])) {
      memoryOutbox.set(id, fullItem);
      queued = true;
    }
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
  let indexedDbItems: QueuedOp[] = [];
  try {
    const db = await getDB();
    if (db) indexedDbItems = await db.getAll(STORE);
  } catch {}
  const lsItems = loadLocalStorageOutbox();
  const fallbackItems = lsItems.length ? lsItems : Array.from(memoryOutbox.values());
  return [...indexedDbItems, ...fallbackItems];
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
  memoryOutbox.clear();
  try {
    localStorage.removeItem(LS_OUTBOX_KEY);
  } catch {}
  try {
    const { memoryCache } = await import("./offlineDb");
    memoryCache.clear();
  } catch {}
  notifyChange();
}

const listeners = new Set<() => void>();
export function onQueueChange(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notifyChange() {
  listeners.forEach((listener) => listener());
}

type QueueEntrySource = "indexeddb" | "localStorage" | "memory";
type QueueEntry = { item: QueuedOp; source: QueueEntrySource };

function sameQueuedOp(left: QueuedOp, right: QueuedOp): boolean {
  return left.id === right.id && left.createdAt === right.createdAt &&
    left.table === right.table && left.op === right.op &&
    left.ownerId === right.ownerId &&
    JSON.stringify(left.payload) === JSON.stringify(right.payload) &&
    JSON.stringify(left.match) === JSON.stringify(right.match);
}

function updateLocalStorageOutbox(item: QueuedOp, remove: boolean): boolean {
  const items = loadLocalStorageOutbox();
  const index = items.findIndex((candidate) => sameQueuedOp(candidate, item));
  if (index < 0) return false;
  if (remove) items.splice(index, 1);
  else items[index] = item;
  return saveLocalStorageOutbox(items);
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
    const firestoreTables = [
      "tasks", "notes", "habits", "folders", "tags", "contacts", "task_contacts",
      "knowledge_folders", "knowledge_documents", "leitner_cards", "leitner_reviews", "task_knowledge_links",
    ];
    if (userId && firestoreTables.includes(item.table)) {
      firestoreAttempted = true;
      const { saveEntityToFirestore, deleteEntityFromFirestore } = await import("./firestoreSync");
      if (item.op === "delete") {
        const docId = item.match?.id as string;
        firestoreSucceeded = Boolean(
          docId && await deleteEntityFromFirestore(userId, item.table as any, docId)
        );
      } else {
        const payload = (item.payload || {}) as Record<string, any>;
        const docId = (payload.id || item.match?.id) as string;
        firestoreSucceeded = Boolean(
          docId && await saveEntityToFirestore(userId, item.table as any, docId, payload)
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
    const activeOwnerId = await getAuthenticatedUserId();
    if (!activeOwnerId) return { ok: 0, failed: 0 };
    const entries: QueueEntry[] = [];
    if (db) {
      for (const item of await db.getAll(STORE)) entries.push({ item, source: "indexeddb" });
    }
    const localStorageItems = loadLocalStorageOutbox();
    if (localStorageItems.length) {
      for (const item of localStorageItems) entries.push({ item, source: "localStorage" });
    } else if (!db) {
      for (const item of memoryOutbox.values()) entries.push({ item, source: "memory" });
    }
    const now = Date.now();

    for (const { item, source } of entries) {
      if (item.nextRetryAt && item.nextRetryAt > now) continue;
      // Keep old/unattributable records intact for recovery, but never replay
      // them under whichever account happens to sign in later.
      if (!canReplayForOwner(item, activeOwnerId)) continue;
      try {
        const succeeded = await replayItem(item, activeOwnerId);
        if (!succeeded) throw new Error("Cloud write was not confirmed");
        if (source === "indexeddb" && db) {
          await db.delete(STORE, item.id!);
        } else if (source === "localStorage") {
          if (!updateLocalStorageOutbox(item, true)) {
            throw new Error("Synced change remains queued because local storage could not be updated");
          }
          if (item.id !== undefined) memoryOutbox.delete(item.id);
        } else {
          if (item.id !== undefined) memoryOutbox.delete(item.id);
        }
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
        if (source === "indexeddb" && db) {
          await db.put(STORE, updated);
        } else if (source === "localStorage") {
          updateLocalStorageOutbox(updated, false);
        } else {
          if (item.id !== undefined) memoryOutbox.set(item.id, updated);
        }
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
