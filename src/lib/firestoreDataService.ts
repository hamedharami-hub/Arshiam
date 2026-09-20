import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
} from "./firebase";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { extractTasksFromCache, createTaskCacheEnvelope } from "@/features/tasks/taskCache";
import type { Task } from "./taskTypes";

export interface FolderItem {
  id: string;
  user_id?: string;
  name: string;
  parent_id: string | null;
  color: string;
  position?: number;
}

export interface TagItem {
  id: string;
  user_id?: string;
  name: string;
  color: string;
}

export interface NoteItem {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  pinned: boolean;
  updated_at: string;
  created_at?: string;
  task_id?: string | null;
  folder_id?: string | null;
}

export interface HabitItem {
  id: string;
  user_id?: string;
  title: string;
  frequency?: string;
  color?: string;
  created_at?: string;
  streak?: number;
  completedDates?: string[];
  [key: string]: any;
}

export interface DailyCheckinItem {
  id: string;
  user_id?: string;
  checkin_date: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  sleep_quality: number | null;
  stress: number | null;
  sleep_hours: number | null;
  notes: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface ThoughtRecordItem {
  id: string;
  user_id?: string;
  situation: string;
  automatic_thought: string;
  emotion_intensity_before?: number;
  emotion_intensity_after?: number | null;
  emotions?: string[];
  evidence_for?: string[];
  evidence_against?: string[];
  alternative_thought?: string | null;
  distortions?: string[];
  created_at?: string;
  [key: string]: any;
}

export interface AbcRecordItem {
  id: string;
  user_id?: string;
  trigger: string;
  belief: string;
  consequences?: string[];
  duration_minutes?: number | null;
  regret_level?: number;
  created_at?: string;
  [key: string]: any;
}

export interface AssessmentResultItem {
  id: string;
  user_id?: string;
  assessment_type: string;
  scores: any;
  analysis: any;
  completed_at?: string;
  created_at?: string;
  [key: string]: any;
}

const CACHE_KEYS = {
  tasks: (uid: string) => `tasks:all:${uid}`,
  folders: (uid: string) => `folders:all:${uid}`,
  tags: (uid: string) => `tags:all:${uid}`,
  notes: (uid: string) => `notes:all:${uid}`,
  habits: (uid: string) => `habits:all:${uid}`,
  checkins: (uid: string) => `checkins:all:${uid}`,
  thoughtRecords: (uid: string) => `thoughtRecords:all:${uid}`,
  abcRecords: (uid: string) => `abcRecords:all:${uid}`,
  assessmentResults: (uid: string, type?: string) => `assessmentResults:${type || "all"}:${uid}`,
  mindValues: (uid: string) => `mindValues:all:${uid}`,
  mindGoals: (uid: string) => `mindGoals:all:${uid}`,
};

// ==================== TASKS ====================

export function subscribeTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // 1. Immediately provide cached tasks if available
  cacheGet<unknown>(CACHE_KEYS.tasks(userId)).then((cached) => {
    const tasks = extractTasksFromCache(cached);
    if (tasks.length) {
      onUpdate(tasks);
    }
  });

  // 2. Realtime listener to Firestore subcollection
  try {
    const tasksCol = collection(db, "users", userId, "tasks");
    const unsub = onSnapshot(
      tasksCol,
      (snap) => {
        const items: Task[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });

        // Sort: pinned first, then position, then created_at desc
        items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          const posA = a.position ?? 0;
          const posB = b.position ?? 0;
          if (posA !== posB) return posA - posB;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        cacheSet(CACHE_KEYS.tasks(userId), createTaskCacheEnvelope(items));
        onUpdate(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeTasks notice:", err?.message);
        const cached = await cacheGet<unknown>(CACHE_KEYS.tasks(userId));
        const tasks = extractTasksFromCache(cached);
        if (tasks.length) onUpdate(tasks);
      }
    );
    return unsub;
  } catch (err) {
    console.warn("[FirestoreData] Failed to subscribe to tasks:", err);
    return () => {};
  }
}

export type TaskPersistenceStatus = "saved" | "queued" | "failed";

/**
 * Saves a task to Firestore and reports whether the cloud write completed now
 * or has been safely placed in the device outbox for a later retry.
 */
export async function persistTask(
  userId: string,
  task: Partial<Task> & { id: string }
): Promise<TaskPersistenceStatus> {
  if (!userId || !task.id) return "failed";
  const dataToSave = {
    ...task,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // 1. Update local cache optimistically first so task is never lost
  try {
    const cachedRaw = await cacheGet<unknown>(CACHE_KEYS.tasks(userId));
    const cached = extractTasksFromCache(cachedRaw);
    const index = cached.findIndex((t) => t.id === task.id);
    let next: Task[];
    if (index >= 0) {
      next = [...cached];
      next[index] = { ...next[index], ...dataToSave } as Task;
    } else {
      next = [dataToSave as Task, ...cached];
    }
    await cacheSet(CACHE_KEYS.tasks(userId), createTaskCacheEnvelope(next));
  } catch (cacheErr) {
    console.warn("[FirestoreData] upsertTask cache warning:", cacheErr);
  }

  // 2. Persist to Firestore
  try {
    const taskRef = doc(db, "users", userId, "tasks", task.id);
    await setDoc(taskRef, dataToSave, { merge: true });
    return "saved";
  } catch (err) {
    console.warn("[FirestoreData] task write deferred to offline outbox:", err);
    const queued = await enqueueOp({
      table: "tasks",
      op: "upsert",
      payload: dataToSave,
      match: { id: task.id },
    });
    return queued ? "queued" : "failed";
  }
}

// Existing creation flows only need a success/failure result. Keep that public
// contract while TaskDetail uses persistTask to display the precise state.
export async function upsertTask(userId: string, task: Partial<Task> & { id: string }): Promise<boolean> {
  return (await persistTask(userId, task)) !== "failed";
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  if (!userId || !taskId) return false;
  // Keep the device view coherent first. If cloud deletion is unavailable, the
  // owner-bound outbox below retains the deletion for a later replay.
  try {
    const cachedRaw = await cacheGet<unknown>(CACHE_KEYS.tasks(userId));
    const cached = extractTasksFromCache(cachedRaw);
    await cacheSet(CACHE_KEYS.tasks(userId), createTaskCacheEnvelope(cached.filter((task) => task.id !== taskId)));
  } catch (cacheErr) {
    console.warn("[FirestoreData] deleteTask cache warning:", cacheErr);
  }
  try {
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] task delete deferred to offline outbox:", err);
    return enqueueOp({ table: "tasks", op: "delete", match: { id: taskId } });
  }
}

// ==================== FOLDERS ====================

export function subscribeFolders(
  userId: string,
  onUpdate: (folders: FolderItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<FolderItem[]>(CACHE_KEYS.folders(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const foldersCol = collection(db, "users", userId, "folders");
    const unsub = onSnapshot(
      foldersCol,
      (snap) => {
        const items: FolderItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        cacheSet(CACHE_KEYS.folders(userId), items);
        onUpdate(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeFolders notice:", err?.message);
        const cached = await cacheGet<FolderItem[]>(CACHE_KEYS.folders(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertFolder(userId: string, folder: FolderItem): Promise<boolean> {
  if (!userId || !folder.id) return false;
  try {
    const folderRef = doc(db, "users", userId, "folders", folder.id);
    await setDoc(folderRef, { ...folder, user_id: userId }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertFolder error:", err);
    return false;
  }
}

export async function deleteFolder(userId: string, folderId: string): Promise<boolean> {
  if (!userId || !folderId) return false;
  try {
    const folderRef = doc(db, "users", userId, "folders", folderId);
    await deleteDoc(folderRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteFolder error:", err);
    return false;
  }
}

// ==================== TAGS ====================

export function subscribeTags(
  userId: string,
  onUpdate: (tags: TagItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<TagItem[]>(CACHE_KEYS.tags(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const tagsCol = collection(db, "users", userId, "tags");
    const unsub = onSnapshot(
      tagsCol,
      (snap) => {
        const items: TagItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        cacheSet(CACHE_KEYS.tags(userId), items);
        onUpdate(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeTags notice:", err?.message);
        const cached = await cacheGet<TagItem[]>(CACHE_KEYS.tags(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertTag(userId: string, tag: TagItem): Promise<boolean> {
  if (!userId || !tag.id) return false;
  try {
    const tagRef = doc(db, "users", userId, "tags", tag.id);
    await setDoc(tagRef, { ...tag, user_id: userId }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertTag error:", err);
    return false;
  }
}

export async function deleteTag(userId: string, tagId: string): Promise<boolean> {
  if (!userId || !tagId) return false;
  try {
    const tagRef = doc(db, "users", userId, "tags", tagId);
    await deleteDoc(tagRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteTag error:", err);
    return false;
  }
}

// ==================== NOTES ====================

export function subscribeNotes(
  userId: string,
  onUpdate: (notes: NoteItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const notesCol = collection(db, "users", userId, "notes");
    const unsub = onSnapshot(
      notesCol,
      (snap) => {
        const items: NoteItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        });
        cacheSet(CACHE_KEYS.notes(userId), items);
        onUpdate(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeNotes notice:", err?.message);
        const cached = await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertNote(userId: string, note: Partial<NoteItem> & { id: string }): Promise<boolean> {
  if (!userId || !note.id) return false;
  const dataToSave = {
    ...note,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // 1. Update local cache optimistically
  try {
    const cached = (await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId))) || [];
    const index = cached.findIndex((n) => n.id === note.id);
    let next: NoteItem[];
    if (index >= 0) {
      next = [...cached];
      next[index] = { ...next[index], ...dataToSave } as NoteItem;
    } else {
      next = [dataToSave as NoteItem, ...cached];
    }
    await cacheSet(CACHE_KEYS.notes(userId), next);
  } catch (cacheErr) {
    console.warn("[FirestoreData] upsertNote cache warning:", cacheErr);
  }

  // 2. Persist to Firestore
  try {
    const noteRef = doc(db, "users", userId, "notes", note.id);
    await setDoc(noteRef, dataToSave, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertNote remote save notice (saved to local cache):", err);
    return true;
  }
}

export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  if (!userId || !noteId) return false;
  try {
    const noteRef = doc(db, "users", userId, "notes", noteId);
    await deleteDoc(noteRef);

    const cached = (await cacheGet<NoteItem[]>(CACHE_KEYS.notes(userId))) || [];
    const next = cached.filter((n) => n.id !== noteId);
    await cacheSet(CACHE_KEYS.notes(userId), next);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteNote error:", err);
    return false;
  }
}

// ==================== HABITS ====================

export function subscribeHabits(
  userId: string,
  onUpdate: (habits: HabitItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<HabitItem[]>(CACHE_KEYS.habits(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const habitsCol = collection(db, "users", userId, "habits");
    const unsub = onSnapshot(
      habitsCol,
      (snap) => {
        const items: HabitItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        cacheSet(CACHE_KEYS.habits(userId), items);
        onUpdate(items);
      },
      async () => {
        const cached = await cacheGet<HabitItem[]>(CACHE_KEYS.habits(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertHabit(userId: string, habit: HabitItem): Promise<boolean> {
  if (!userId || !habit.id) return false;
  try {
    const habitRef = doc(db, "users", userId, "habits", habit.id);
    await setDoc(habitRef, { ...habit, user_id: userId }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertHabit error:", err);
    return false;
  }
}

export async function deleteHabit(userId: string, habitId: string): Promise<boolean> {
  if (!userId || !habitId) return false;
  try {
    const habitRef = doc(db, "users", userId, "habits", habitId);
    await deleteDoc(habitRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteHabit error:", err);
    return false;
  }
}

// ==================== DAILY CHECKINS ====================

export function subscribeDailyCheckins(
  userId: string,
  onUpdate: (checkins: DailyCheckinItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<DailyCheckinItem[]>(CACHE_KEYS.checkins(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "daily_checkins");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const items: DailyCheckinItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => (b.checkin_date || "").localeCompare(a.checkin_date || ""));
        cacheSet(CACHE_KEYS.checkins(userId), items);
        onUpdate(items);
      },
      async () => {
        const cached = await cacheGet<DailyCheckinItem[]>(CACHE_KEYS.checkins(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function getDailyCheckin(userId: string, date: string): Promise<DailyCheckinItem | null> {
  if (!userId || !date) return null;
  try {
    const docRef = doc(db, "users", userId, "daily_checkins", date);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) };
    }
  } catch (err) {
    console.warn("[FirestoreData] getDailyCheckin error:", err);
  }
  // Check local cache
  const cachedList = await cacheGet<DailyCheckinItem[]>(CACHE_KEYS.checkins(userId));
  return cachedList?.find((c) => c.checkin_date === date || c.id === date) || null;
}

export async function upsertDailyCheckin(userId: string, checkin: Partial<DailyCheckinItem> & { checkin_date: string }): Promise<boolean> {
  if (!userId || !checkin.checkin_date) return false;
  const docId = checkin.checkin_date;
  try {
    const docRef = doc(db, "users", userId, "daily_checkins", docId);
    await setDoc(docRef, { ...checkin, id: docId, user_id: userId, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertDailyCheckin error:", err);
    return false;
  }
}

// ==================== THOUGHT RECORDS (CBT) ====================

export function subscribeThoughtRecords(
  userId: string,
  onUpdate: (records: ThoughtRecordItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<ThoughtRecordItem[]>(CACHE_KEYS.thoughtRecords(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "thought_records");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const items: ThoughtRecordItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.thoughtRecords(userId), items);
        onUpdate(items);
      },
      async () => {
        const cached = await cacheGet<ThoughtRecordItem[]>(CACHE_KEYS.thoughtRecords(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertThoughtRecord(userId: string, record: Partial<ThoughtRecordItem>): Promise<string | null> {
  if (!userId) return null;
  const id = record.id || `thought_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const docRef = doc(db, "users", userId, "thought_records", id);
    const now = new Date().toISOString();
    await setDoc(
      docRef,
      {
        ...record,
        id,
        user_id: userId,
        created_at: record.created_at || now,
        updated_at: now,
      },
      { merge: true }
    );
    return id;
  } catch (err) {
    console.warn("[FirestoreData] upsertThoughtRecord error:", err);
    return null;
  }
}

export async function deleteThoughtRecord(userId: string, id: string): Promise<boolean> {
  if (!userId || !id) return false;
  try {
    const docRef = doc(db, "users", userId, "thought_records", id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteThoughtRecord error:", err);
    return false;
  }
}

// ==================== ABC RECORDS ====================

export function subscribeAbcRecords(
  userId: string,
  onUpdate: (records: AbcRecordItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<AbcRecordItem[]>(CACHE_KEYS.abcRecords(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "abc_records");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const items: AbcRecordItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.abcRecords(userId), items);
        onUpdate(items);
      },
      async () => {
        const cached = await cacheGet<AbcRecordItem[]>(CACHE_KEYS.abcRecords(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertAbcRecord(userId: string, record: Partial<AbcRecordItem>): Promise<string | null> {
  if (!userId) return null;
  const id = record.id || `abc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const docRef = doc(db, "users", userId, "abc_records", id);
    const now = new Date().toISOString();
    await setDoc(
      docRef,
      {
        ...record,
        id,
        user_id: userId,
        created_at: record.created_at || now,
        updated_at: now,
      },
      { merge: true }
    );
    return id;
  } catch (err) {
    console.warn("[FirestoreData] upsertAbcRecord error:", err);
    return null;
  }
}

export async function deleteAbcRecord(userId: string, recordId: string): Promise<boolean> {
  if (!userId || !recordId) return false;
  try {
    const docRef = doc(db, "users", userId, "abc_records", recordId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteAbcRecord error:", err);
    return false;
  }
}

// ==================== ASSESSMENTS & SCREENERS ====================

export function subscribeAssessmentResults(
  userId: string,
  type: string | undefined,
  onUpdate: (results: AssessmentResultItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<AssessmentResultItem[]>(CACHE_KEYS.assessmentResults(userId, type)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "assessment_results");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        let items: AssessmentResultItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        if (type) {
          items = items.filter((x) => x.assessment_type === type);
        }
        items.sort((a, b) => new Date(b.completed_at || b.created_at || 0).getTime() - new Date(a.completed_at || a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.assessmentResults(userId, type), items);
        onUpdate(items);
      },
      async () => {
        const cached = await cacheGet<AssessmentResultItem[]>(CACHE_KEYS.assessmentResults(userId, type));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertAssessmentResult(
  userId: string,
  result: Partial<AssessmentResultItem>
): Promise<AssessmentResultItem | null> {
  if (!userId || !result.assessment_type) return null;
  const id = result.id || `result_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const payload: AssessmentResultItem = {
    id,
    user_id: userId,
    assessment_type: result.assessment_type,
    scores: result.scores || {},
    analysis: result.analysis || {},
    completed_at: result.completed_at || now,
    created_at: result.created_at || now,
    ...result,
  };

  try {
    const docRef = doc(db, "users", userId, "assessment_results", id);
    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (err) {
    console.warn("[FirestoreData] upsertAssessmentResult error:", err);
    return null;
  }
}

export async function getAssessmentProgress(
  userId: string,
  type: string
): Promise<{ responses: Record<number, number>; currentIndex: number; completed: boolean } | null> {
  if (!userId || !type) return null;
  try {
    const docRef = doc(db, "users", userId, "assessment_progress", type);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as any;
    }
  } catch (err) {
    console.warn("[FirestoreData] getAssessmentProgress error:", err);
  }
  return null;
}

export async function saveAssessmentProgress(
  userId: string,
  type: string,
  responses: Record<number, number>,
  currentIndex: number,
  completed: boolean
): Promise<boolean> {
  if (!userId || !type) return false;
  try {
    const docRef = doc(db, "users", userId, "assessment_progress", type);
    await setDoc(
      docRef,
      {
        user_id: userId,
        assessment_type: type,
        responses,
        current_index: currentIndex,
        completed,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[FirestoreData] saveAssessmentProgress error:", err);
    return false;
  }
}

// ==================== MIND VALUES & GOALS (ACT) ====================

export interface MindGoalItem {
  id: string;
  user_id?: string;
  domain: string;
  text: string;
  horizon: "today" | "week" | "month" | "year";
  created_at: string;
  [key: string]: any;
}

export function subscribeMindValues(
  userId: string,
  onUpdate: (values: Record<string, any>) => void
): () => void {
  if (!userId) {
    onUpdate({});
    return () => {};
  }

  cacheGet<Record<string, any>>(CACHE_KEYS.mindValues(userId)).then((cached) => {
    if (cached) onUpdate(cached);
  });

  try {
    const docRef = doc(db, "users", userId, "mind_settings", "values");
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()?.values || {};
          cacheSet(CACHE_KEYS.mindValues(userId), data);
          onUpdate(data);
        }
      },
      async () => {
        const cached = await cacheGet<Record<string, any>>(CACHE_KEYS.mindValues(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function saveMindValues(userId: string, values: Record<string, any>): Promise<boolean> {
  if (!userId) return false;
  cacheSet(CACHE_KEYS.mindValues(userId), values);
  try {
    const docRef = doc(db, "users", userId, "mind_settings", "values");
    await setDoc(docRef, { values, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] saveMindValues error:", err);
    return false;
  }
}

export function subscribeMindGoals(
  userId: string,
  onUpdate: (goals: MindGoalItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  cacheGet<MindGoalItem[]>(CACHE_KEYS.mindGoals(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) onUpdate(cached);
  });

  try {
    const colRef = collection(db, "users", userId, "mind_goals");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const items: MindGoalItem[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        cacheSet(CACHE_KEYS.mindGoals(userId), items);
        onUpdate(items);
      },
      async () => {
        const cached = await cacheGet<MindGoalItem[]>(CACHE_KEYS.mindGoals(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function upsertMindGoal(userId: string, goal: Partial<MindGoalItem> & { id: string }): Promise<boolean> {
  if (!userId || !goal.id) return false;
  try {
    const docRef = doc(db, "users", userId, "mind_goals", goal.id);
    await setDoc(docRef, { ...goal, user_id: userId, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertMindGoal error:", err);
    return false;
  }
}

export async function deleteMindGoal(userId: string, goalId: string): Promise<boolean> {
  if (!userId || !goalId) return false;
  try {
    const docRef = doc(db, "users", userId, "mind_goals", goalId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteMindGoal error:", err);
    return false;
  }
}

// ==================== SOCRATIC SESSION ====================

export interface SocraticMessageItem {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  provenance?: "user_report" | "ai_suggestion";
}

export interface SocraticSessionItem {
  id: string;
  user_id: string;
  messages: SocraticMessageItem[];
  summary?: string | null;
  draft_text?: string;
  updated_at: string;
  created_at?: string;
}

export function subscribeSocraticSession(
  userId: string,
  onUpdate: (session: SocraticSessionItem | null) => void
): () => void {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  cacheGet<SocraticSessionItem>(`socratic:session:${userId}`).then((cached) => {
    if (cached) onUpdate(cached);
  });

  try {
    const docRef = doc(db, "users", userId, "socratic_sessions", "current");
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...(snap.data() as any) } as SocraticSessionItem;
          cacheSet(`socratic:session:${userId}`, data);
          onUpdate(data);
        } else {
          onUpdate(null);
        }
      },
      async () => {
        const cached = await cacheGet<SocraticSessionItem>(`socratic:session:${userId}`);
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function saveSocraticSession(
  userId: string,
  session: Partial<SocraticSessionItem>
): Promise<boolean> {
  if (!userId) return false;
  const now = new Date().toISOString();
  const payload: SocraticSessionItem = {
    id: "current",
    user_id: userId,
    messages: session.messages || [],
    summary: session.summary ?? null,
    draft_text: session.draft_text ?? "",
    updated_at: now,
    created_at: session.created_at || now,
    ...session,
  };

  cacheSet(`socratic:session:${userId}`, payload);

  try {
    const docRef = doc(db, "users", userId, "socratic_sessions", "current");
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn("[FirestoreData] saveSocraticSession error, queuing:", err);
    await enqueueOp({
      type: "upsert",
      collection: `users/${userId}/socratic_sessions`,
      id: "current",
      data: payload,
    });
    return true;
  }
}

export async function clearSocraticSession(userId: string): Promise<boolean> {
  if (!userId) return false;
  cacheSet(`socratic:session:${userId}`, null);
  try {
    const docRef = doc(db, "users", userId, "socratic_sessions", "current");
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] clearSocraticSession error:", err);
    return false;
  }
}

