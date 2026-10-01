import { runTransaction } from "firebase/firestore";
import { sanitizeKnowledgeHtml } from "./knowledgeHtmlSanitizer";
import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "./firebase";
import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet } from "./offlineDb";
import {
  extractTasksFromCache,
  createTaskCacheEnvelope,
  withTaskCacheMutationLock,
} from "@/features/tasks/taskCache";
import type { Task } from "./taskTypes";
import { prepareFirestoreBackupRecord } from "./backupRecord";

export interface AppUser {
  id: string;
  email?: string | null;
  [key: string]: any;
}

export type SupportedFirestoreCollection =
  | "tasks"
  | "notes"
  | "habits"
  | "checkins"
  | "settings"
  | "folders"
  | "tags"
  | "contacts"
  | "task_contacts"
  | "knowledge_folders"
  | "knowledge_documents"
  | "knowledge_import_manifests"
  | "leitner_cards"
  | "leitner_reviews"
  | "task_knowledge_links"
  | "interactive_study_sessions"
  | "cycle_profiles"
  | "cycle_logs"
  | "mind_values"
  | "mind_goals"
  | "thought_records"
  | "socratic_sessions"
  | "assessment_results"
  | "pharmacy_practice";

export interface SyncStats {
  tasksCount: number;
  notesCount: number;
  habitsCount: number;
  checkinsCount: number;
  lastSyncedAt: string | null;
  failedTasksCount?: number;
  failedNotesCount?: number;
}

/**
 * Saves a single entity to user's private Firestore subcollection:
 * /users/{userId}/{collectionName}/{docId}
 * Supports both:
 * - 4-arg: (userId, collectionName, docId, data)
 * - 2-arg: (collectionName, entity)
 * Includes conflict protection against overwriting newer remote documents.
 */
export type FirestoreSaveOutcome = "saved" | "stale" | "failed";

const conflictReviewCollections = new Set<SupportedFirestoreCollection>([
  "tasks", "notes", "habits", "folders", "tags", "contacts", "task_contacts",
  "knowledge_folders", "knowledge_documents", "knowledge_import_manifests",
  "leitner_cards", "leitner_reviews", "task_knowledge_links",
  "interactive_study_sessions", "socratic_sessions", "pharmacy_practice",
]);

/** Read a queued stale-write's current cloud version without mutating either copy. */
export async function getFirestoreConflictSnapshot(
  userId: string,
  collectionName: string,
  docId: string,
): Promise<{ exists: boolean; data?: Record<string, unknown> }> {
  if (!userId || auth.currentUser?.uid !== userId) {
    throw new Error("Sign in to the same account that owns this queued change.");
  }
  if (!docId || !conflictReviewCollections.has(collectionName as SupportedFirestoreCollection)) {
    throw new Error("This queued change does not support cloud-version review.");
  }

  const snapshot = await getDoc(doc(db, "users", userId, collectionName, docId));
  if (!snapshot.exists()) return { exists: false };
  return { exists: true, data: { ...snapshot.data(), id: snapshot.id } };
}

// Firestore rejects `undefined` anywhere in a document; drop those fields instead of failing the write.
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).map(stripUndefinedDeep) as unknown as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

export async function saveEntityToFirestoreWithOutcome(
  userIdOrCollection: string,
  collectionOrData: SupportedFirestoreCollection | string | Record<string, any>,
  docIdOrNothing?: string,
  dataOrNothing?: Record<string, any>,
  throwOnError = false,
): Promise<FirestoreSaveOutcome> {
  let userId = "";
  let collectionName = "";
  let docId = "";
  let data: Record<string, any> = {};

  if (typeof docIdOrNothing === "string" && dataOrNothing) {
    userId = userIdOrCollection;
    collectionName = collectionOrData as string;
    docId = docIdOrNothing;
    data = dataOrNothing;
  } else if (typeof collectionOrData === "object" && collectionOrData !== null) {
    collectionName = userIdOrCollection;
    data = collectionOrData;
    docId = String(data.id || "");
    userId = String(data.user_id || data.userId || auth.currentUser?.uid || "");
  }

  if (!userId || !docId || !collectionName) return "failed";

  try {
    const docRef = doc(db, "users", userId, collectionName, docId);
    if (collectionName === "leitner_cards" && data._create_once === true) {
      if (auth.currentUser?.uid !== userId) return "failed";
      return await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(docRef);
        if (snapshot.exists()) return "saved";
        const { _create_once, ...clean } = data; void _create_once;
        if (auth.currentUser?.uid !== userId) return "failed";
        transaction.set(docRef, stripUndefinedDeep({ ...clean, id: docId, userId, updatedAt: new Date().toISOString() }));
        return "saved";
      });
    }
    if (collectionName === "knowledge_documents" && (typeof data._expected_learning_revision === "string" || typeof data._expected_document_updated_at === "string")) {
      if (auth.currentUser?.uid !== userId) return "failed";
      return await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists()) return "stale";
        const remote = snapshot.data();
        if (data.last_mutation_id && remote?.last_mutation_id === data.last_mutation_id) return "saved";
        const revision = remote?.learning_workspace?.revision || "";
        if (data._learning_patch_only !== true && data._expected_document_updated_at !== undefined && remote?.updated_at !== data._expected_document_updated_at) return "stale";
        if (snapshot.exists() && data._learning_patch_only === true && revision === data.learning_workspace?.revision) return "saved";
        if (snapshot.exists() && ((typeof data._expected_learning_revision === "string" && revision !== data._expected_learning_revision && revision !== data.learning_workspace?.revision) ||
          (data._learning_patch_only === true && (sanitizeKnowledgeHtml(remote?.content_html || "") !== sanitizeKnowledgeHtml(data.content_html || "") ||
          sanitizeKnowledgeHtml(remote?.content_en || "") !== sanitizeKnowledgeHtml(data.content_en || ""))))) return "stale";
        const { _expected_learning_revision, _expected_document_updated_at, _learning_patch_only, learning_workspace_unavailable, ...clean } = data;
        void _expected_learning_revision; void _expected_document_updated_at; void learning_workspace_unavailable;
        if (auth.currentUser?.uid !== userId) return "failed";
        transaction.set(docRef, stripUndefinedDeep(_learning_patch_only && snapshot.exists()
          ? { learning_workspace: clean.learning_workspace, last_mutation_id: clean.last_mutation_id, updated_at: clean.updated_at, updatedAt: new Date().toISOString() }
          : { ...clean, id: docId, userId, updatedAt: new Date().toISOString() }), { merge: true });
        return "saved";
      });
    }


    // Conflict protection: check if remote document is newer than incoming local data
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = snap.data();
        // `updated_at` is the application's revision timestamp when available.
        // `updatedAt` is refreshed here as a Firestore sync receipt timestamp,
        // so preferring it can incorrectly reject a newer local application edit.
        // Keep `updatedAt` as a fallback for legacy/camel-case-only entities.
        const remoteUpdatedAt = remoteData?.updated_at || remoteData?.updatedAt;
        const localUpdatedAt = data.updated_at || data.updatedAt;
        if (remoteUpdatedAt && localUpdatedAt) {
          const remoteTime = new Date(remoteUpdatedAt).getTime();
          const localTime = new Date(localUpdatedAt).getTime();
          if (remoteTime > localTime) {
            console.info(`[FirestoreSync] Remote document is newer than local data for ${collectionName}/${docId}. Rejecting stale write.`);
            return "stale";
          }
        }
      }
    } catch (error) {
      // A durable outbox may retry this mutation later, but writing without a
      // readable current revision could overwrite a newer remote document.
      console.warn(`[FirestoreSync] Could not verify ${collectionName}/${docId}; refusing the write.`, error);
      if (throwOnError) throw error;
      return "failed";
    }

    await setDoc(
      docRef,
      {
        ...stripUndefinedDeep(data),
        id: docId,
        userId,
        updatedAt: new Date().toISOString(),
        _firestoreSyncAt: Date.now(),
      },
      { merge: true }
    );
    return "saved";
  } catch (error) {
    console.warn(`[FirestoreSync] Failed to save ${collectionName}/${docId}:`, error);
    if (throwOnError) throw error;
    return "failed";
  }
}

/** Boolean compatibility wrapper for existing non-queue callers. */
export async function saveEntityToFirestore(
  userIdOrCollection: string,
  collectionOrData: SupportedFirestoreCollection | string | Record<string, any>,
  docIdOrNothing?: string,
  dataOrNothing?: Record<string, any>,
): Promise<boolean> {
  return (await saveEntityToFirestoreWithOutcome(
    userIdOrCollection,
    collectionOrData,
    docIdOrNothing,
    dataOrNothing,
  )) === "saved";
}

/**
 * Deletes an entity from user's private Firestore subcollection.
 * Supports both:
 * - 3-arg: (userId, collectionName, docId)
 * - 2-arg: (collectionName, docId)
 */
export async function deleteEntityFromFirestore(
  userIdOrCollection: string,
  collectionOrDocId: SupportedFirestoreCollection | string,
  docIdOrNothing?: string
): Promise<boolean> {
  let userId = "";
  let collectionName = "";
  let docId = "";

  if (docIdOrNothing) {
    userId = userIdOrCollection;
    collectionName = collectionOrDocId;
    docId = docIdOrNothing;
  } else {
    collectionName = userIdOrCollection;
    docId = collectionOrDocId;
    userId = auth.currentUser?.uid || "";
  }

  if (!userId || !docId || !collectionName) return false;

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
      stats: { tasksCount: 0, notesCount: 0, habitsCount: 0, checkinsCount: 0, lastSyncedAt: null, failedTasksCount: 0, failedNotesCount: 0 },
      message: "کاربر وارد نشده است",
    };
  }

  let savedTasks = 0;
  let savedNotes = 0;
  let failedTasks = 0;
  let failedNotes = 0;

  try {
    // 1. Gather tasks from all potential sources
    let tasksToSync: Task[] = [...localTasks];
    if (!tasksToSync.length) {
      const cached = (await cacheGet<unknown>(`tasks:all:${user.id}`)) ??
                     (await cacheGet<unknown>("tasks")) ??
                     (await cacheGet<unknown>("offline_tasks"));
      const extracted = extractTasksFromCache(cached);
      if (extracted.length) {
        tasksToSync = extracted;
      }
    }

    // If still empty and online, try fetching from firebaseStore
    if (!tasksToSync.length && typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const response = await (firebaseStore.from("tasks") as any)
          .select("*")
          .eq("user_id", user.id)
          .limit(2000);
        if (response.error || !Array.isArray(response.data)) {
          throw response.error || new Error("Task source could not be verified");
        }
        if (response.data.length) {
          await withTaskCacheMutationLock(user.id, async () => {
            let latestLocalTasks: Task[] = [];
            try {
              latestLocalTasks = extractTasksFromCache(
                await cacheGet<unknown>(`tasks:all:${user.id}`),
              );
            } catch {
              // Continue using the verified remote result if local cache is unavailable.
            }
            const tasksById = new Map<string, Task>();
            for (const task of response.data as Task[]) tasksById.set(task.id, task);
            // A cache mutation that completed while the backup query was in
            // flight is newer than the response and must not be overwritten.
            for (const task of latestLocalTasks) tasksById.set(task.id, task);
            tasksToSync = Array.from(tasksById.values());
            await cacheSet(`tasks:all:${user.id}`, createTaskCacheEnvelope(tasksToSync));
          });
        }
      } catch (error) {
        console.warn("[FirestoreSync] Could not verify task source for backup:", error);
        throw new Error("تسک‌های موجود از منبع ابری قابل بررسی نبودند؛ برای جلوگیری از گزارش موفقیت ناقص، همگام‌سازی انجام نشد.");
      }
    } else if (!tasksToSync.length && typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("اتصال اینترنت نیست و نسخهٔ محلی تسک‌ها برای همگام‌سازی پیدا نشد.");
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
        const response = await (firebaseStore.from("notes") as any)
          .select("*")
          .eq("user_id", user.id)
          .limit(1000);
        if (response.error || !Array.isArray(response.data)) {
          throw response.error || new Error("Note source could not be verified");
        }
        if (response.data.length) {
          notesToSync = response.data;
          await cacheSet(`notes:all:${user.id}`, notesToSync);
        }
      } catch (error) {
        console.warn("[FirestoreSync] Could not verify note source for backup:", error);
        throw new Error("یادداشت‌های موجود از منبع ابری قابل بررسی نبودند؛ برای جلوگیری از گزارش موفقیت ناقص، همگام‌سازی انجام نشد.");
      }
    } else if (!notesToSync.length && typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("اتصال اینترنت نیست و نسخهٔ محلی یادداشت‌ها برای همگام‌سازی پیدا نشد.");
    }

    // Batch sync tasks
    for (const t of tasksToSync) {
      if (!t || typeof t.id !== "string" || !t.id.trim()) {
        failedTasks++;
        continue;
      }
      const ok = await saveEntityToFirestore(
        user.id,
        "tasks",
        t.id,
        prepareFirestoreBackupRecord(t as unknown as Record<string, unknown>, user.id),
      );
      if (ok) savedTasks++;
      else failedTasks++;
    }

    // Batch sync notes
    for (const n of notesToSync) {
      if (!n || typeof n.id !== "string" || !n.id.trim()) {
        failedNotes++;
        continue;
      }
      const ok = await saveEntityToFirestore(
        user.id,
        "notes",
        n.id,
        prepareFirestoreBackupRecord(n as Record<string, unknown>, user.id),
      );
      if (ok) savedNotes++;
      else failedNotes++;
    }

    const nowIso = new Date().toISOString();
    const stats: SyncStats = {
      tasksCount: savedTasks,
      notesCount: savedNotes,
      habitsCount: 0,
      checkinsCount: 0,
      lastSyncedAt: nowIso,
      failedTasksCount: failedTasks,
      failedNotesCount: failedNotes,
    };

    let syncStatusSaved = true;
    try {
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
          failedTasksCount: failedTasks,
          failedNotesCount: failedNotes,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      syncStatusSaved = false;
      console.warn("[FirestoreSync] Could not save backup status:", error);
    }

    try {
      await cacheSet(`firestore_sync_stats_${user.id}`, stats);
    } catch (error) {
      // All data rows can still be safely backed up even if this display-only
      // cache cannot be updated; the Firestore sync status is authoritative.
      console.warn("[FirestoreSync] Could not cache backup status:", error);
    }

    const allRowsSaved = failedTasks === 0 && failedNotes === 0;
    const success = allRowsSaved && syncStatusSaved;
    const message = success
      ? `همگام‌سازی ابری کامل شد: ${savedTasks} تسک و ${savedNotes} یادداشت در Firestore ذخیره شدند.`
      : `همگام‌سازی کامل نشد: ${savedTasks} از ${tasksToSync.length} تسک و ${savedNotes} از ${notesToSync.length} یادداشت ذخیره شدند؛ ${failedTasks} تسک و ${failedNotes} یادداشت ناموفق بودند.${syncStatusSaved ? "" : " وضعیت همگام‌سازی هم ذخیره نشد."}`;

    return {
      success,
      stats,
      message,
    };
  } catch (error: any) {
    console.error("[FirestoreSync] Backup error:", error);
    return {
      success: false,
      stats: {
        tasksCount: savedTasks,
        notesCount: savedNotes,
        habitsCount: 0,
        checkinsCount: 0,
        lastSyncedAt: savedTasks + savedNotes > 0 ? new Date().toISOString() : null,
        failedTasksCount: failedTasks,
        failedNotesCount: failedNotes,
      },
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
        failedTasksCount: d.failedTasksCount || 0,
        failedNotesCount: d.failedNotesCount || 0,
      };
      await cacheSet(`firestore_sync_stats_${userId}`, stats);
      return stats;
    }
  } catch {
    // ignore
  }
  return null;
}
