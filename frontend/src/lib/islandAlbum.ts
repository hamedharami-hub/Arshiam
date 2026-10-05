import { openDB, type IDBPDatabase } from "idb";

export interface AlbumEntry {
  id: string;
  createdAt: string;
  level: number;
  buildings: number;
  phase: string;
  image: Blob;
  thumb: Blob;
}

const DB = "arshnaz-island-album";
const STORE = "snapshots";
const MAX_ENTRIES = 60;
export const ALBUM_EVENT = "arshnaz-island-album-updated";

let dbPromise: Promise<IDBPDatabase | null> | null = null;
function db() {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = openDB(DB, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id" }).createIndex("byUser", "userId");
      },
    }).catch(() => { dbPromise = null; return null; });
  }
  return dbPromise;
}

const userId = () => { try { return localStorage.getItem("arshnaz_garden_user") || "local"; } catch { return "local"; } };
const notify = () => { try { window.dispatchEvent(new Event(ALBUM_EVENT)); } catch { /* ignore */ } };

/** Snapshots for the current user, oldest first (so growth reads left-to-right in time). */
export async function listAlbum(): Promise<AlbumEntry[]> {
  const d = await db();
  if (!d) return [];
  const rows = (await d.getAllFromIndex(STORE, "byUser", userId())) as AlbumEntry[];
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function clearAlbumForUser(ownerId: string): Promise<boolean> {
  if (!ownerId) return false;
  const d = await db();
  if (!d) return true;
  try {
    const entries = await d.getAllFromIndex(STORE, "byUser", ownerId);
    const tx = d.transaction(STORE, "readwrite");
    await Promise.all(entries.map((entry) => tx.store.delete(entry.id)));
    await tx.done;
    return true;
  } catch (error) {
    console.warn("[islandAlbum] Could not clear account snapshots:", error);
    return false;
  }
}

export async function addToAlbum(entry: Omit<AlbumEntry, "id" | "createdAt">): Promise<AlbumEntry | null> {
  const d = await db();
  if (!d) return null;
  const row = {
    ...entry,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}`,
    createdAt: new Date().toISOString(),
    userId: userId(),
  };
  await d.put(STORE, row);
  const all = await listAlbum();
  for (const old of all.slice(0, Math.max(0, all.length - MAX_ENTRIES))) await d.delete(STORE, old.id);
  notify();
  return row;
}

export async function removeFromAlbum(id: string) {
  const d = await db();
  if (!d) return;
  await d.delete(STORE, id);
  notify();
}
