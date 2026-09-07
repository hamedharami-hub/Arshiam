// Offline-first mutation queue using IndexedDB.
// Queues mutations while offline and replays them when back online.

import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QueuedOp = {
  id?: number;
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  payload?: unknown;
  match?: Record<string, unknown>;
  upsertOptions?: { onConflict?: string };
  createdAt: number;
  attempts: number;
  nextRetryAt?: number;
};

const DB_NAME = "taskflow-offline";
const STORE = "outbox";
const CACHE_STORE = "cache";

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

export async function enqueueOp(op: Omit<QueuedOp, "id" | "createdAt" | "attempts" | "nextRetryAt">) {
  try {
    const db = await getDB();
    if (db) {
      await db.add(STORE, { ...op, createdAt: Date.now(), attempts: 0 });
    }
  } catch (err) {
    console.warn("Could not enqueue offline op:", err);
  }
  notifyChange();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    setTimeout(() => {
      flushQueue().catch(() => {});
    }, 50);
  }
}

export async function getQueue(): Promise<QueuedOp[]> {
  try {
    const db = await getDB();
    if (!db) return [];
    return await db.getAll(STORE);
  } catch {
    return [];
  }
}

export async function getPendingOps(table?: string): Promise<QueuedOp[]> {
  try {
    const db = await getDB();
    if (!db) return [];
    const all = await db.getAll(STORE);
    return table ? all.filter((op) => op.table === table) : all;
  } catch {
    return [];
  }
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
    if (!db) return undefined;
    return (await db.get(CACHE_STORE, key)) as T | undefined;
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
  listeners.forEach((l) => l());
}

let syncing = false;
export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (syncing || typeof navigator === "undefined" || !navigator.onLine) return { ok: 0, failed: 0 };
  syncing = true;
  let ok = 0;
  let failed = 0;
  let notifiedDrop = false;
  try {
    const db = await getDB();
    if (!db) return { ok: 0, failed: 0 };
    const items = await db.getAll(STORE);
    const now = Date.now();
    for (const item of items) {
      if (item.nextRetryAt && item.nextRetryAt > now) continue;
      try {
        const q = (supabase.from as (t: string) => ReturnType<typeof supabase.from>)(item.table);
        let res;
        if (item.op === "insert") {
          res = await q.insert(item.payload as Record<string, unknown>);
        } else if (item.op === "upsert") {
          res = await q.upsert(item.payload as Record<string, unknown>, item.upsertOptions);
        } else if (item.op === "update") {
          let b = q.update(item.payload as Record<string, unknown>);
          for (const [k, v] of Object.entries(item.match || {})) b = b.eq(k, v);
          res = await b;
        } else if (item.op === "delete") {
          let b = q.delete();
          for (const [k, v] of Object.entries(item.match || {})) b = b.eq(k, v);
          res = await b;
        }
        if (res?.error) throw res.error;

        // Dual-write to Firestore for cloud persistence
        try {
          const { data: authSession } = await supabase.auth.getSession();
          const userId = authSession?.session?.user?.id;
          if (userId && (item.table === "tasks" || item.table === "notes" || item.table === "habits")) {
            const { saveEntityToFirestore, deleteEntityFromFirestore } = await import("./firestoreSync");
            if (item.op === "insert" || item.op === "upsert" || item.op === "update") {
              const p = (item.payload || {}) as Record<string, any>;
              const docId = (p.id || item.match?.id) as string;
              if (docId) {
                await saveEntityToFirestore(userId, item.table as any, docId, p);
              }
            } else if (item.op === "delete") {
              const docId = item.match?.id as string;
              if (docId) {
                await deleteEntityFromFirestore(userId, item.table as any, docId);
              }
            }
          }
        } catch {
          // Non-blocking Firestore sync
        }

        await db.delete(STORE, item.id!);
        ok++;
      } catch {
        failed++;
        item.attempts++;
        const backoff = Math.min(2 ** item.attempts * 1000, 300_000);
        item.nextRetryAt = Date.now() + backoff;
        if (item.attempts >= 10) {
          await db.delete(STORE, item.id!);
          if (!notifiedDrop) {
            toast.error("برخی تغییرات آفلاین سینک نشدند", {
              description: `تغییر روی «${item.table}» پس از چند تلاش ذخیره نشد.`,
            });
            notifiedDrop = true;
          }
        } else {
          await db.put(STORE, item);
        }
      }
    }
  } catch (err) {
    console.warn("flushQueue encountered error:", err);
  } finally {
    syncing = false;
    notifyChange();
  }
  return { ok, failed };
}

export function initOfflineSync() {
  if (typeof window === "undefined") return;

  try {
    window.addEventListener("online", () => {
      flushQueue().catch(() => {});
    });

    // try once on startup
    if (typeof navigator !== "undefined" && navigator.onLine) {
      setTimeout(() => {
        flushQueue().catch(() => {});
      }, 1500);
    }

    // periodic retry — the queue itself skips items that are not due yet
    setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        flushQueue().catch(() => {});
      }
    }, 15_000);
  } catch (e) {
    console.warn("initOfflineSync setup notice:", e);
  }
}
