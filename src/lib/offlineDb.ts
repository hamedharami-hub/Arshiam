import { openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "taskflow-offline";
export const STORE = "outbox";
export const CACHE_STORE = "cache";

let dbPromise: Promise<IDBPDatabase | null> | null = null;

export async function getDB(): Promise<IDBPDatabase | null> {
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
    }).catch(() => null);
  }
  return dbPromise;
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
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
