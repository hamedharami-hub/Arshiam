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
import {
  createTaskCacheEnvelope,
  isTaskCacheFresh,
  readTaskCacheEnvelope,
} from "./taskCache";
import { applyTaskOperations } from "./taskOperations";

const TASKS_CACHE_PREFIX = "tasks:all:";
const taskCache = new Map<string, Task[]>();
const taskCacheTimestamps = new Map<string, number>();

export const taskCacheKey = (userId: string) => `${TASKS_CACHE_PREFIX}${userId}`;
export const taskMemoryCache = taskCache;

function setTaskCache(userId: string, tasks: Task[], cachedAt = Date.now()): void {
  taskCache.set(userId, tasks);
  taskCacheTimestamps.set(userId, cachedAt);
}

export function isTaskCacheFreshForUser(userId: string): boolean {
  return isTaskCacheFresh(taskCacheTimestamps.get(userId));
}

function persistTaskCache(userId: string, tasks: Task[]): Promise<void> {
  return cacheSet(taskCacheKey(userId), createTaskCacheEnvelope(tasks));
}

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
  const persisted = await cacheGet<unknown>(taskCacheKey(userId));
  const envelope = readTaskCacheEnvelope(persisted);
  const tasks = envelope?.tasks || [];
  setTaskCache(userId, tasks, envelope?.cachedAt);
  return tasks;
}

export async function applyPendingTaskOperations(base: Task[]): Promise<Task[]> {
  const operations = await getPendingOps("tasks");
  return applyTaskOperations(base, operations);
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "tasks"));
    if (!snapshot.empty) {
      const tasks = sortTasks(snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Task),
      })));
      setTaskCache(userId, tasks);
      await persistTaskCache(userId, tasks);
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
      setTaskCache(userId, tasks);
      await persistTaskCache(userId, tasks);
      return tasks;
    }
  } catch (error) {
    console.warn("[TaskService] Firebase store fallback warning:", error);
  }

  return getCachedTasks(userId);
}

export function subscribeToTasks(userId: string, onUpdate: (tasks: Task[]) => void): () => void {
  return subscribeFirestoreTasks(userId, (tasks) => {
    setTaskCache(userId, tasks);
    void persistTaskCache(userId, tasks);
    onUpdate(tasks);
  });
}

export const saveTask = upsertFirestoreTask;
export const removeTask = deleteFirestoreTask;
