// Queues mutations while offline and replays them when back online.

import { openDB, type IDBPDatabase } from "idb";
import { clearQuotaPause, isQuotaError, markQuotaExhausted, quotaPausedUntil } from "./firestoreUsage";
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
  /** Revision observed before a delete; absent legacy deletes must fail closed. */
  expectedRevision?: string;
  /** Stable receipt used when cloud commit succeeds but outbox acknowledgement fails. */
  mutationId?: string;
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
    return { ...op, mutationId: op.mutationId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`), ownerId, ownershipConflict: ownershipConflict || undefined, createdAt: Date.now(), attempts: 0 };
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
  const payloads = Array.isArray(item.payload) ? item.payload : [item.payload];
  const payloadOwners = payloads.flatMap(payload => payload && typeof payload === "object"
    ? [(payload as Record<string, unknown>).user_id, (payload as Record<string, unknown>).userId] : []);
  return [item.ownerId, ...payloadOwners, item.match?.user_id]
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

function localKeyBelongsToUser(key: string, userId: string): boolean {
  // Hyphens belong to the account ID; matching an arbitrary separator on
  // both sides would erase account-a while deleting account.
  return key === userId || key.endsWith(`:${userId}`) || key.endsWith(`_${userId}`) ||
    key.startsWith(`task_notes_${userId}_`);
}

function cacheKeyBelongsToUser(key: string, value: unknown, userId: string): boolean | undefined {
  if (!localKeyBelongsToUser(key, userId)) return false;
  const values = Array.isArray(value) ? value : [value];
  const owners = values.flatMap(entry => entry && typeof entry === "object"
    ? explicitQueueOwnerClaims({ payload: entry }) : []);
  // Explicit owners override an ambiguous underscore-delimited legacy key.
  if (owners.length) return owners.every(owner => owner === userId);
  if (key.endsWith(`:${userId}`) || key === userId) return true;
  const fixedPrefixes = [
    "tasks_", "notes_", "folders_", "tags_", "habits_", "contacts_", "task_contacts_", "note_task_links_",
    "firestore_sync_stats_", "arshnaz_mind_garden_v1_", "arshnaz_island_v1_",
    "arshnaz_page_bg_v1_", "arshnaz_kanban_goals_v3_", "arshnaz_kanban_goals_sync_",
  ];
  if (fixedPrefixes.some(prefix => key === `${prefix}${userId}`)) return true;
  // Dynamic legacy key layouts cannot distinguish IDs containing underscores.
  // Retain them and report incomplete cleanup rather than guessing ownership.
  return undefined;
}

/** Clear one account's device data without deleting another account's offline work. */
export async function clearUserLocalData(userId: string): Promise<boolean> {
  if (!userId) return false;
  let cleared = true;
  try {
    const db = await getDB();
    if (db) {
      const transaction = db.transaction([STORE, CACHE_STORE], "readwrite");
      const [queued, cacheKeys] = await Promise.all([
        transaction.objectStore(STORE).getAll(),
        transaction.objectStore(CACHE_STORE).getAllKeys(),
      ]);
      for (const item of queued as QueuedOp[]) {
        if (canReplayForOwner(item, userId) && item.id !== undefined) transaction.objectStore(STORE).delete(item.id);
        else if (!getQueuedOpOwnerId(item)) cleared = false;
      }
      for (const key of cacheKeys) {
        if (typeof key === "string" && localKeyBelongsToUser(key, userId)) {
          const value = await transaction.objectStore(CACHE_STORE).get(key);
          const belongs = cacheKeyBelongsToUser(key, value, userId);
          if (belongs) transaction.objectStore(CACHE_STORE).delete(key);
          else if (belongs === undefined) cleared = false;
        }
      }
      await transaction.done;
    }
  } catch (error) {
    cleared = false;
    console.warn("[offlineQueue] Could not clear account's IndexedDB data:", error);
  }
  for (const [id, item] of memoryOutbox) if (canReplayForOwner(item, userId)) memoryOutbox.delete(id);
  try {
    const fallback = loadLocalStorageOutbox();
    const remaining = fallback.filter((item) => !canReplayForOwner(item, userId));
    if (remaining.some((item) => !getQueuedOpOwnerId(item))) cleared = false;
    if (remaining.length !== fallback.length && !saveLocalStorageOutbox(remaining)) cleared = false;
    const { memoryCache } = await import("./offlineDb");
    for (const [key, value] of memoryCache) {
      const belongs = cacheKeyBelongsToUser(key, value, userId);
      if (belongs) memoryCache.delete(key);
      else if (belongs === undefined) cleared = false;
    }
  } catch { cleared = false; }
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (!key || key === LS_OUTBOX_KEY) continue;
      if (localKeyBelongsToUser(key, userId)) {
        let value: unknown;
        try { value = JSON.parse(localStorage.getItem(key) || "null"); } catch { value = null; }
        const belongs = cacheKeyBelongsToUser(key, value, userId);
        if (belongs) localStorage.removeItem(key);
        else if (belongs === undefined) cleared = false;
      }
    }
    if (localStorage.getItem("arshnaz_garden_user") === userId) localStorage.removeItem("arshnaz_garden_user");
  } catch { cleared = false; }
  notifyChange();
  return cleared;
}

const retiredModuleTables = new Set(["pharmacy_practice", "leitner_reviews"]);

/** Cleanup is restricted to retired module changes belonging to the active UID. */
export async function retireOwnedModuleData(userId: string): Promise<{ removed: number; incomplete: boolean }> {
  if (!userId || await getAuthenticatedUserId() !== userId) throw new Error("The active account must own the cleanup.");
  const entries = await getQueue();
  let removed = 0;
  let incomplete = false;
  for (const item of entries) {
    if (!retiredModuleTables.has(item.table)) continue;
    if (!getQueuedOpOwnerId(item)) { incomplete = true; continue; }
    if (!canReplayForOwner(item, userId)) continue;
    try {
      await discardQueuedOp(item);
      removed++;
    } catch { incomplete = true; }
  }
  return { removed, incomplete };
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
    left.expectedRevision === right.expectedRevision &&
    left.mutationId === right.mutationId &&
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

async function replayWithLegacyStore(item: QueuedOp, userId: string): Promise<boolean> {
  if (await getAuthenticatedUserId() !== userId) return false;
  try {
    const q = firebaseStore.from(item.table, userId);
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

const revisionProtectedCollections = new Set([
  "tasks", "notes", "habits", "folders", "tags", "contacts", "task_contacts",
  "interactive_study_sessions", "socratic_sessions", "pharmacy_practice",
]);

async function replayItem(item: QueuedOp, userId: string): Promise<ReplayOutcome> {
  if (await getAuthenticatedUserId() !== userId) return "failed";
  if (retiredModuleTables.has(item.table)) return "saved";
  let firestoreAttempted = false;
  let firestoreOutcome: ReplayOutcome = "failed";
  try {
    const taskIdForLinkCleanup = item.match?.task_id;
    if (item.table === "task_knowledge_links" && item.op === "delete" && !item.match?.id &&
      typeof taskIdForLinkCleanup === "string" && taskIdForLinkCleanup) {
      firestoreAttempted = true;
      const response = await firebaseStore
        .from("task_knowledge_links", userId)
        .delete()
        .eq("user_id", userId)
        .eq("task_id", taskIdForLinkCleanup);
      firestoreOutcome = legacyMutationConfirmed(item, response) ? "saved" : "failed";
    }

    if (item.table === "note_task_links" && item.op === "delete" && !item.match?.id) {
      const endpoint = typeof item.match?.note_id === "string" ? "note_id"
        : typeof item.match?.task_id === "string" ? "task_id" : null;
      const endpointId = endpoint ? item.match?.[endpoint] : null;
      if (endpoint && typeof endpointId === "string" && endpointId) {
        firestoreAttempted = true;
        const response = await firebaseStore
          .from("note_task_links", userId)
          .delete()
          .eq("user_id", userId)
          .eq(endpoint, endpointId);
        firestoreOutcome = legacyMutationConfirmed(item, response) ? "saved" : "failed";
      }
    }

    if (item.table === "note_task_links" && item.op !== "delete") {
      const payload = item.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.id !== "string" || typeof payload.user_id !== "string" ||
        typeof payload.note_id !== "string" || typeof payload.task_id !== "string" ||
        payload.user_id !== userId) return "failed";
      const { replayQueuedNoteTaskLinkWithOutcome } = await import("./firestoreSync");
      const outcome = await replayQueuedNoteTaskLinkWithOutcome(userId, payload.id, payload as any);
      return outcome === "missing-endpoint" ? "failed" : outcome;
    }

    const firestoreTables = [
      "tasks", "notes", "habits", "folders", "tags", "contacts", "task_contacts",
      "knowledge_folders", "knowledge_documents", "knowledge_import_manifests", "leitner_cards", "leitner_reviews", "task_knowledge_links", "note_task_links",
      "interactive_study_sessions", "socratic_sessions", "pharmacy_practice",
    ];
    if (!firestoreAttempted && userId && firestoreTables.includes(item.table)) {
      firestoreAttempted = true;
      const { saveEntityToFirestoreWithOutcome, deleteEntityFromFirestore, replayQueuedEntityWithOutcome } = await import("./firestoreSync");
      const payload = (item.payload || {}) as Record<string, any>;
      const docId = (item.op === "delete" ? item.match?.id : payload.id || item.match?.id) as string | undefined;
      if (revisionProtectedCollections.has(item.table) && docId) {
        return replayQueuedEntityWithOutcome(userId, item.table as any, docId, {
          op: item.op, payload, createdAt: item.createdAt, expectedRevision: item.expectedRevision, mutationId: item.mutationId,
        });
      }
      if (item.op === "delete") {
        if (!docId) {
          // Deletes matched by other fields (e.g. task_id) go through the query adapter; deletes carry no revision to protect.
          return await replayWithLegacyStore(item, userId) ? "saved" : "failed";
        }
        if (!await deleteEntityFromFirestore(userId, item.table as any, docId)) {
          throw new Error(`Could not delete ${item.table}/${docId}`);
        }
        firestoreOutcome = "saved";
      } else {
        if (!docId) throw new Error(`Queued ${item.op} for ${item.table} has no document id`);
        firestoreOutcome = await saveEntityToFirestoreWithOutcome(userId, item.table as any, docId, payload, true);
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
  return await replayWithLegacyStore(item, userId) ? "saved" : "failed";
}

/** Remove one queued change on explicit user request (the local copy stays; the cloud is not changed). */
export async function discardQueuedOp(item: QueuedOp): Promise<void> {
  if (!canReplayForOwner(item, await getAuthenticatedUserId())) {
    throw new Error("This queued change does not belong to the active account.");
  }
  try {
    const db = await getDB();
    if (db && item.id !== undefined) {
      const stored = await db.get(STORE, item.id);
      if (stored && sameQueuedOp(stored as QueuedOp, item)) await db.delete(STORE, item.id);
    }
  } catch {}
  updateLocalStorageOutbox(item, true);
  if (item.id !== undefined && memoryOutbox.get(item.id) && sameQueuedOp(memoryOutbox.get(item.id)!, item)) {
    memoryOutbox.delete(item.id);
  }
  if ((await getQueue()).some(candidate => sameQueuedOp(candidate, item))) {
    throw new Error("The saved change could not be removed from device storage.");
  }
  notifyChange();
}

let syncing = false;
export async function flushQueue(options: { retryConflicts?: boolean; forceRetry?: boolean } = {}): Promise<{ ok: number; failed: number }> {
  if (syncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { ok: 0, failed: 0 };
  }
  // Retrying while the daily quota is exhausted only burns more units; wait for the reset.
  if (!options.forceRetry && quotaPausedUntil()) return { ok: 0, failed: 0 };
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
      if (await getAuthenticatedUserId() !== activeOwnerId) break;
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
        if (ok === 1) clearQuotaPause();
      } catch (error) {
        failed++;
        if (isQuotaError(error)) {
          const until = markQuotaExhausted();
          const updated: QueuedOp = { ...item, attempts: (item.attempts || 0) + 1, nextRetryAt: until, lastError: error instanceof Error ? error.message : String(error) };
          if (source === "indexeddb" && db) await db.put(STORE, updated);
          else if (source === "localStorage") updateLocalStorageOutbox(updated, false);
          else if (item.id !== undefined) memoryOutbox.set(item.id, updated);
          break;
        }
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
        if (attempts === MAX_ATTEMPTS_BEFORE_ALERT && !notifiedFailure) {
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
  window.addEventListener("arsh:fs-flush", onOnline);
  const timer = window.setInterval(() => {
    if (navigator.onLine) void flushQueue();
  }, 15_000);
  if (navigator.onLine) window.setTimeout(() => void flushQueue(), 1_500);
  syncCleanup = () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("arsh:fs-flush", onOnline);
    window.clearInterval(timer);
    syncCleanup = null;
  };
}
