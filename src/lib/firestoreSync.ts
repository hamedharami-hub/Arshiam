import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "./firebase";
import type { AppUser } from "./authService";
import { cacheGet, cacheSet } from "./offlineQueue";
import type { Task } from "./taskTypes";

export interface SyncStats {
  tasksCount: number;
  notesCount: number;
  habitsCount: number;
  checkinsCount: number;
  lastSyncedAt: string | null;
}

/**
 * Saves a single entity to user's private Firestore subcollection:
 * /users/{userId}/{collectionName}/{docId}
 */
export async function saveEntityToFirestore(
  userId: string,
  collectionName: "tasks" | "notes" | "habits" | "checkins" | "settings",
  docId: string,
  data: Record<string, any>
): Promise<boolean> {
  if (!userId || !docId) return false;
  try {
    const docRef = doc(db, "users", userId, collectionName, docId);
    await setDoc(
      docRef,
      {
        ...data,
        id: docId,
        userId,
        updatedAt: new Date().toISOString(),
        _firestoreSyncAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn(`[FirestoreSync] Failed to save ${collectionName}/${docId}:`, error);
    return false;
  }
}

/**
 * Deletes an entity from user's private Firestore subcollection
 */
export async function deleteEntityFromFirestore(
  userId: string,
  collectionName: "tasks" | "notes" | "habits" | "checkins",
  docId: string
): Promise<boolean> {
  if (!userId || !docId) return false;
  try {
    const docRef = doc(db, "users", userId, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn(`[FirestoreSync] Failed to delete ${collectionName}/${docId}:`, error);
    return false;
  }
}

/**
 * Reads user's local tasks and notes cache and pushes all items to Firestore
 */
export async function backupAllToFirestore(
  user: AppUser,
  localTasks: Task[] = [],
  localNotes: any[] = []
): Promise<{ success: boolean; stats: SyncStats; message: string }> {
  if (!user || !user.id) {
    return {
      success: false,
      stats: { tasksCount: 0, notesCount: 0, habitsCount: 0, checkinsCount: 0, lastSyncedAt: null },
      message: "کاربر وارد نشده است",
    };
  }

  try {
    // 1. Gather tasks from all potential sources
    let tasksToSync: Task[] = [...localTasks];
    if (!tasksToSync.length) {
      const cached = (await cacheGet<Task[]>(`tasks:all:${user.id}`)) ||
                     (await cacheGet<Task[]>("tasks")) ||
                     (await cacheGet<Task[]>("offline_tasks"));
      if (Array.isArray(cached) && cached.length) {
        tasksToSync = cached;
      }
    }

    // If still empty and online, try fetching from firebaseStore
    if (!tasksToSync.length && typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const { data: supaTasks } = await (firebaseStore.from("tasks") as any)
          .select("*")
          .eq("user_id", user.id)
          .limit(2000);
        if (Array.isArray(supaTasks) && supaTasks.length) {
          tasksToSync = supaTasks as Task[];
          await cacheSet(`tasks:all:${user.id}`, tasksToSync);
        }
      } catch {}
    }

    // 2. Gather notes from all potential sources
    let notesToSync: any[] = [...localNotes];
    if (!notesToSync.length) {
      const cachedNotes = (await cacheGet<any[]>(`notes:all:${user.id}`)) ||
                          (await cacheGet<any[]>("notes")) ||
                          (await cacheGet<any[]>("offline_notes"));
      if (Array.isArray(cachedNotes) && cachedNotes.length) {
        notesToSync = cachedNotes;
      } else {
        try {
          const raw = localStorage.getItem("arshnaz_notes") || localStorage.getItem("notes");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) notesToSync = parsed;
          }
        } catch {}
      }
    }

    // If still empty and online, try fetching notes from firebaseStore
    if (!notesToSync.length && typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const { data: supaNotes } = await (firebaseStore.from("notes") as any)
          .select("*")
          .eq("user_id", user.id)
          .limit(1000);
        if (Array.isArray(supaNotes) && supaNotes.length) {
          notesToSync = supaNotes;
          await cacheSet(`notes:all:${user.id}`, notesToSync);
        }
      } catch {}
    }

    let savedTasks = 0;
    let savedNotes = 0;

    // Batch sync tasks
    for (const t of tasksToSync) {
      if (!t.id) continue;
      const ok = await saveEntityToFirestore(user.id, "tasks", t.id, {
        title: t.title || "",
        description: t.description || "",
        completed: !!t.completed,
        priority: t.priority || "none",
        due_date: t.due_date || null,
        created_at: t.created_at || new Date().toISOString(),
        folder_id: t.folder_id || null,
        pinned: !!t.pinned,
        status: t.status || "todo",
      });
      if (ok) savedTasks++;
    }

    // Batch sync notes
    for (const n of notesToSync) {
      if (!n.id) continue;
      const ok = await saveEntityToFirestore(user.id, "notes", n.id, {
        title: n.title || "",
        content: n.content || "",
        folder_id: n.folder_id || null,
        created_at: n.created_at || new Date().toISOString(),
        pinned: !!n.pinned,
      });
      if (ok) savedNotes++;
    }

    // Update user sync status doc in Firestore
    const nowIso = new Date().toISOString();
    const syncStatusRef = doc(db, "users", user.id, "syncMeta", "current");
    await setDoc(
      syncStatusRef,
      {
        userId: user.id,
        userEmail: user.email,
        lastSyncedAt: nowIso,
        lastSyncedTimestamp: Date.now(),
        tasksCount: savedTasks,
        notesCount: savedNotes,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const stats: SyncStats = {
      tasksCount: savedTasks,
      notesCount: savedNotes,
      habitsCount: 0,
      checkinsCount: 0,
      lastSyncedAt: nowIso,
    };

    // Cache sync meta locally
    cacheSet(`firestore_sync_stats_${user.id}`, stats);

    return {
      success: true,
      stats,
      message: `همگام‌سازی ابری کامل شد: ${savedTasks} تسک و ${savedNotes} یادداشت در Firestore ذخیره شدند.`,
    };
  } catch (error: any) {
    console.error("[FirestoreSync] Backup error:", error);
    return {
      success: false,
      stats: { tasksCount: 0, notesCount: 0, habitsCount: 0, checkinsCount: 0, lastSyncedAt: null },
      message: error?.message || "خطا در همگام‌سازی ابری فایربیس",
    };
  }
}

/**
 * Retrieves all tasks and notes stored in user's Firestore subcollections
 */
export async function fetchFromFirestore(
  userId: string
): Promise<{ success: boolean; tasks: any[]; notes: any[]; message: string }> {
  if (!userId) return { success: false, tasks: [], notes: [], message: "شناسه کاربر نامعتبر است" };

  try {
    const tasksRef = collection(db, "users", userId, "tasks");
    const notesRef = collection(db, "users", userId, "notes");

    const [tasksSnap, notesSnap] = await Promise.all([
      getDocs(tasksRef),
      getDocs(notesRef),
    ]);

    const tasks: any[] = [];
    tasksSnap.forEach((docSnap) => tasks.push({ id: docSnap.id, ...docSnap.data() }));

    const notes: any[] = [];
    notesSnap.forEach((docSnap) => notes.push({ id: docSnap.id, ...docSnap.data() }));

    return {
      success: true,
      tasks,
      notes,
      message: `${tasks.length} تسک و ${notes.length} یادداشت از Firestore بارگذاری شد.`,
    };
  } catch (error: any) {
    console.error("[FirestoreSync] Fetch error:", error);
    return {
      success: false,
      tasks: [],
      notes: [],
      message: error?.message || "خطا در دریافت اطلاعات از فایربیس",
    };
  }
}

/**
 * Gets last sync stats for the user
 */
export async function getFirestoreSyncStats(userId: string): Promise<SyncStats | null> {
  if (!userId) return null;
  const local = await cacheGet<SyncStats>(`firestore_sync_stats_${userId}`);
  if (local) return local;

  try {
    const syncStatusRef = doc(db, "users", userId, "syncMeta", "current");
    const snap = await getDoc(syncStatusRef);
    if (snap.exists()) {
      const d = snap.data();
      const stats: SyncStats = {
        tasksCount: d.tasksCount || 0,
        notesCount: d.notesCount || 0,
        habitsCount: d.habitsCount || 0,
        checkinsCount: d.checkinsCount || 0,
        lastSyncedAt: d.lastSyncedAt || null,
      };
      await cacheSet(`firestore_sync_stats_${userId}`, stats);
      return stats;
    }
  } catch {
    // ignore
  }
  return null;
}
