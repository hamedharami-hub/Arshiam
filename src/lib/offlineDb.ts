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
    }).catch((err) => {
      console.warn("[offlineDb] openDB error:", err);
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
}

export const memoryCache = new Map<string, unknown>();

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await db.put(CACHE_STORE, value, key);
      return;
    }
  } catch {}
  memoryCache.set(key, value);
}

export async function cacheGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    if (db) {
      const val = (await db.get(CACHE_STORE, key)) as T | undefined;
      if (val !== undefined) return val;
    }
  } catch {}
  return memoryCache.get(key) as T | undefined;
}
