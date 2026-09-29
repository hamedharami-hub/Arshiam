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
  /** Explicit owner fields conflicted when this queued record was created. */
  ownershipConflict?: boolean;
  createdAt: number;
  attempts: number;
  nextRetryAt?: number;
  lastError?: string;
  /** A newer cloud revision exists; retain this for explicit retry only. */
  conflictReason?: "remote-newer";
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

export type EnqueueOpInput = Omit<QueuedOp, "id" | "createdAt" | "attempts" | "nextRetryAt" | "lastError">;

export async function enqueueOp(op: EnqueueOpInput): Promise<boolean> {
  return enqueueOps([op]);
}

/** Persist a related set of mutations as one transaction or one verified fallback write. */
export async function enqueueOps(ops: EnqueueOpInput[]): Promise<boolean> {
  if (ops.length === 0) return true;

  const items = await Promise.all(ops.map(async (op) => {
    const explicitOwnerId = getQueuedOpOwnerId(op);
    const ownershipConflict = hasConflictingQueuedOpOwners(op);
    const ownerId = ownershipConflict
      ? undefined
      : explicitOwnerId || await getAuthenticatedUserId();
    return { ...op, ownerId, ownershipConflict: ownershipConflict || undefined, createdAt: Date.now(), attempts: 0 };
  }));

  let queued = false;
  try {
    const db = await getDB();
    if (db) {
      const transaction = db.transaction(STORE, "readwrite");
      try {
        for (const item of items) await transaction.store.add(item);
        await transaction.done;
        queued = true;
      } catch (error) {
        try { transaction.abort(); } catch {}
        try { await transaction.done; } catch {}
        console.warn("[offlineQueue] IndexedDB batch enqueue failed; trying verified localStorage fallback:", error);
      }
    }
  } catch (error) {
    console.warn("Could not enqueue offline operations:", error);
  }

  if (!queued) {
    const fullItems = items.map((item) => ({ ...item, id: memoryOutboxAutoInc++ }));
    const list = loadLocalStorageOutbox();
    if (saveLocalStorageOutbox([...list, ...fullItems])) {
      for (const item of fullItems) memoryOutbox.set(item.id!, item);
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

type QueueOwnershipFields = Pick<QueuedOp, "ownerId" | "payload" | "match" | "ownershipConflict">;

function explicitQueueOwnerClaims(item: QueueOwnershipFields): string[] {
  const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload as Record<string, unknown>
    : undefined;
  return [item.ownerId, payload?.user_id, payload?.userId, item.match?.user_id]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

/** Return an owner only when every explicit owner field agrees. */
export function getQueuedOpOwnerId(item: QueueOwnershipFields): string | undefined {
  if (item.ownershipConflict) return undefined;
  const claims = explicitQueueOwnerClaims(item);
  if (claims.length === 0 || claims.some((claim) => claim !== claims[0])) return undefined;
  return claims[0];
}

export function hasConflictingQueuedOpOwners(item: QueueOwnershipFields): boolean {
  return Boolean(item.ownershipConflict || new Set(explicitQueueOwnerClaims(item)).size > 1);
}

/** A queued mutation must never cross the account boundary that created it. */
export function canReplayForOwner(item: QueueOwnershipFields, activeOwnerId: string | undefined): boolean {
  return Boolean(activeOwnerId && getQueuedOpOwnerId(item) === activeOwnerId);
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

function legacyMutationConfirmed(item: QueuedOp, response: unknown): boolean {
  if (!response || typeof response !== "object" || responseHasError(response) || !("data" in response)) {
    return false;
  }

  // Deleting an already absent row is an idempotent success. For writes, an
  // empty result means the requested insert/update was not actually applied.
  if (item.op === "delete") return true;
  const data = (response as { data?: unknown }).data;
  return Array.isArray(data) ? data.length > 0 : data !== null && data !== undefined;
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
    return legacyMutationConfirmed(item, response);
  } catch (error) {
    console.warn(`[offlineQueue] Legacy replay failed for ${item.table}:`, error);
    return false;
  }
}

type ReplayOutcome = "saved" | "stale" | "failed";

async function replayItem(item: QueuedOp, userId: string): Promise<ReplayOutcome> {
  let firestoreAttempted = false;
  let firestoreOutcome: ReplayOutcome = "failed";
  try {
    const taskIdForLinkCleanup = item.match?.task_id;
    if (item.table === "task_knowledge_links" && item.op === "delete" && !item.match?.id &&
      typeof taskIdForLinkCleanup === "string" && taskIdForLinkCleanup) {
      firestoreAttempted = true;
      const response = await firebaseStore
        .from("task_knowledge_links")
        .delete()
        .eq("user_id", userId)
        .eq("task_id", taskIdForLinkCleanup);
      firestoreOutcome = legacyMutationConfirmed(item, response) ? "saved" : "failed";
    }

    const firestoreTables = [
      "tasks", "notes", "habits", "folders", "tags", "contacts", "task_contacts",
      "knowledge_folders", "knowledge_documents", "knowledge_import_manifests", "leitner_cards", "leitner_reviews", "task_knowledge_links",
      "interactive_study_sessions", "socratic_sessions", "pharmacy_practice",
    ];
    if (!firestoreAttempted && userId && firestoreTables.includes(item.table)) {
      firestoreAttempted = true;
      const { saveEntityToFirestoreWithOutcome, deleteEntityFromFirestore } = await import("./firestoreSync");
      if (item.op === "delete") {
        const docId = item.match?.id as string;
        firestoreOutcome = docId && await deleteEntityFromFirestore(userId, item.table as any, docId)
          ? "saved"
          : "failed";
      } else {
        const payload = (item.payload || {}) as Record<string, any>;
        const docId = (payload.id || item.match?.id) as string;
        firestoreOutcome = docId
          ? await saveEntityToFirestoreWithOutcome(userId, item.table as any, docId, payload, true)
          : "failed";
      }
    }
  } catch (error) {
    console.warn("[offlineQueue] Firestore replay warning:", error);
    throw error;
  }

  // For supported entities, the direct Firestore path is authoritative. Never
  // bypass a failed write (including a stale-write conflict) via the legacy
  // adapter: it targets the same Firestore documents without conflict checks.
  if (firestoreAttempted) return firestoreOutcome;
  return await replayWithLegacyStore(item) ? "saved" : "failed";
}

let syncing = false;
export async function flushQueue(options: { retryConflicts?: boolean; forceRetry?: boolean } = {}): Promise<{ ok: number; failed: number }> {
  if (syncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { ok: 0, failed: 0 };
  }
  syncing = true;
  let ok = 0;
  let failed = 0;
  let notifiedFailure = false;
  let notifiedConflict = false;
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
      if (!options.forceRetry && item.nextRetryAt && item.nextRetryAt > now) continue;
      if (item.conflictReason && !options.retryConflicts) continue;
      // Legacy records with explicit, consistent owner data remain replayable;
      // records without one attributable owner stay intact for manual recovery.
      if (!canReplayForOwner(item, activeOwnerId)) continue;
      try {
        const outcome = await replayItem(item, activeOwnerId);
        if (outcome === "stale") {
          failed++;
          const conflict: QueuedOp = {
            ...item,
            conflictReason: "remote-newer",
            lastError: "A newer cloud revision exists; this change was not replayed.",
            nextRetryAt: undefined,
          };
          if (source === "indexeddb" && db) await db.put(STORE, conflict);
          else if (source === "localStorage") updateLocalStorageOutbox(conflict, false);
          else if (item.id !== undefined) memoryOutbox.set(item.id, conflict);
          if (!notifiedConflict) {
            toast.error("نسخهٔ جدیدتری در فضای ابری وجود دارد", {
              description: "این تغییر از صف حذف نشده، اما تلاش خودکار برایش متوقف شد. پس از بررسی، دکمهٔ همگام‌سازی را بزنید.",
            });
            notifiedConflict = true;
          }
          continue;
        }
        if (outcome !== "saved") throw new Error("Cloud write was not confirmed");
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
          conflictReason: undefined,
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
