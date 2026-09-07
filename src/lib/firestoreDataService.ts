import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from "./firebase";
import { cacheGet, cacheSet } from "./offlineQueue";
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

const CACHE_KEYS = {
  tasks: (uid: string) => `tasks:all:${uid}`,
  folders: (uid: string) => `folders:all:${uid}`,
  tags: (uid: string) => `tags:all:${uid}`,
  notes: (uid: string) => `notes:all:${uid}`,
  habits: (uid: string) => `habits:all:${uid}`,
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
  cacheGet<Task[]>(CACHE_KEYS.tasks(userId)).then((cached) => {
    if (cached && Array.isArray(cached)) {
      onUpdate(cached);
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

        cacheSet(CACHE_KEYS.tasks(userId), items);
        onUpdate(items);
      },
      async (err) => {
        console.warn("[FirestoreData] subscribeTasks notice:", err?.message);
        const cached = await cacheGet<Task[]>(CACHE_KEYS.tasks(userId));
        if (cached) onUpdate(cached);
      }
    );
    return unsub;
  } catch (err) {
    console.warn("[FirestoreData] Failed to subscribe to tasks:", err);
    return () => {};
  }
}

export async function upsertTask(userId: string, task: Partial<Task> & { id: string }): Promise<boolean> {
  if (!userId || !task.id) return false;
  try {
    const taskRef = doc(db, "users", userId, "tasks", task.id);
    const dataToSave = {
      ...task,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    await setDoc(taskRef, dataToSave, { merge: true });

    // Update local cache optimistically
    const cached = (await cacheGet<Task[]>(CACHE_KEYS.tasks(userId))) || [];
    const index = cached.findIndex((t) => t.id === task.id);
    let next: Task[];
    if (index >= 0) {
      next = [...cached];
      next[index] = { ...next[index], ...dataToSave } as Task;
    } else {
      next = [dataToSave as Task, ...cached];
    }
    await cacheSet(CACHE_KEYS.tasks(userId), next);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertTask error:", err);
    return false;
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  if (!userId || !taskId) return false;
  try {
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    await deleteDoc(taskRef);

    // Update local cache
    const cached = (await cacheGet<Task[]>(CACHE_KEYS.tasks(userId))) || [];
    const next = cached.filter((t) => t.id !== taskId);
    await cacheSet(CACHE_KEYS.tasks(userId), next);
    return true;
  } catch (err) {
    console.warn("[FirestoreData] deleteTask error:", err);
    return false;
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
  try {
    const noteRef = doc(db, "users", userId, "notes", note.id);
    const dataToSave = {
      ...note,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    await setDoc(noteRef, dataToSave, { merge: true });

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
    return true;
  } catch (err) {
    console.warn("[FirestoreData] upsertNote error:", err);
    return false;
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
