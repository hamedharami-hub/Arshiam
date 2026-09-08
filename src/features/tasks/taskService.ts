import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseStore } from "@/lib/firebaseStore";
import {
  cacheGet,
  cacheSet,
  getPendingOps,
} from "@/lib/offlineQueue";
import {
  deleteTask as deleteFirestoreTask,
  subscribeTasks as subscribeFirestoreTasks,
  upsertTask as upsertFirestoreTask,
} from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";

const TASKS_CACHE_PREFIX = "tasks:all:";
const taskCache = new Map<string, Task[]>();

export const taskCacheKey = (userId: string) => `${TASKS_CACHE_PREFIX}${userId}`;
export const taskMemoryCache = taskCache;

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const positionA = (a as Task & { position?: number }).position ?? 0;
    const positionB = (b as Task & { position?: number }).position ?? 0;
    if (positionA !== positionB) return positionA - positionB;
    return new Date((b as Task & { created_at?: string }).created_at || 0).getTime()
      - new Date((a as Task & { created_at?: string }).created_at || 0).getTime();
  });
}

export async function getCachedTasks(userId: string): Promise<Task[]> {
  const memory = taskCache.get(userId);
  if (memory) return memory;
  const persisted = await cacheGet<Task[]>(taskCacheKey(userId));
  const tasks = persisted || [];
  taskCache.set(userId, tasks);
  return tasks;
}

export async function applyPendingTaskOperations(base: Task[]): Promise<Task[]> {
  const operations = await getPendingOps("tasks");
  const inserts = new Map<string, Task>();
  const deletes = new Set<string>();
  const updates = new Map<string, Partial<Task>>();

  for (const operation of operations) {
    if (operation.op === "insert" && operation.payload) {
      const task = operation.payload as Task;
      if (task.id) inserts.set(task.id, task);
    } else if (operation.op === "delete" && operation.match?.id) {
      deletes.add(operation.match.id as string);
    } else if (operation.op === "update" && operation.match?.id && operation.payload) {
      const id = operation.match.id as string;
      updates.set(id, { ...(updates.get(id) || {}), ...(operation.payload as Partial<Task>) });
    }
  }

  let next = base.filter((task) => !deletes.has(task.id));
  for (const task of inserts.values()) {
    if (!next.some((item) => item.id === task.id)) next = [task, ...next];
  }
  return next.map((task) => updates.has(task.id)
    ? { ...task, ...updates.get(task.id) }
    : task);
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "tasks"));
    if (!snapshot.empty) {
      const tasks = sortTasks(snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Task),
      })));
      taskCache.set(userId, tasks);
      await cacheSet(taskCacheKey(userId), tasks);
      return tasks;
    }
  } catch (error) {
    console.warn("[TaskService] Firestore fetch warning:", error);
  }

  try {
    const { data, error } = await firebaseStore.from("tasks")
      .select("*")
      .order("position")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (!error && data?.length) {
      const tasks = sortTasks(data as unknown as Task[]);
      taskCache.set(userId, tasks);
      await cacheSet(taskCacheKey(userId), tasks);
      return tasks;
    }
  } catch (error) {
    console.warn("[TaskService] Firebase store fallback warning:", error);
  }

  return getCachedTasks(userId);
}

export function subscribeToTasks(userId: string, onUpdate: (tasks: Task[]) => void): () => void {
  return subscribeFirestoreTasks(userId, (tasks) => {
    taskCache.set(userId, tasks);
    onUpdate(tasks);
  });
}

export const saveTask = upsertFirestoreTask;
export const removeTask = deleteFirestoreTask;
