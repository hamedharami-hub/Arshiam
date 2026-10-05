import type { Task } from "./taskTypes";
import { auth } from "./firebase";
import { bindCloudState, type CloudBinding } from "./cloudStateSync";
import { readSchedule } from "./taskSchedule";

export type TodayPlanningData = {
  nextTaskId: string | null;
  nextTaskDate: string | null;
  importantByDay: Record<string, string[]>;
  wipEnabled: boolean;
  wipLimit: number;
};

export type TodayPlanningSnapshot = { updatedAt: number; data: TodayPlanningData };
type PendingUpdate = {
  before: TodayPlanningData;
  after: TodayPlanningData;
  clearNextTaskIf?: { taskId: string; day: string };
};

export const DEFAULT_TODAY_PLANNING: TodayPlanningData = {
  nextTaskId: null,
  nextTaskDate: null,
  importantByDay: {},
  wipEnabled: false,
  wipLimit: 3,
};

const storageKey = (uid: string) => `arshnaz:today-planning:v1:${uid}`;
const stores = new Map<string, Store>();

type Store = {
  uid: string;
  snapshot: TodayPlanningSnapshot;
  hasLocal: boolean;
  cloudReady: boolean;
  pendingUpdates: PendingUpdate[];
  listeners: Set<(snapshot: TodayPlanningSnapshot) => void>;
  binding: CloudBinding | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeTodayPlanningData(value: unknown): TodayPlanningData {
  if (!isRecord(value)) return { ...DEFAULT_TODAY_PLANNING };
  const rawImportant = isRecord(value.importantByDay) ? value.importantByDay : {};
  const importantByDay: Record<string, string[]> = {};
  for (const [day, ids] of Object.entries(rawImportant)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(ids)) {
      importantByDay[day] = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
    }
  }
  const limit = Number(value.wipLimit);
  return {
    nextTaskId: typeof value.nextTaskId === "string" && value.nextTaskId ? value.nextTaskId : null,
    nextTaskDate: typeof value.nextTaskDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.nextTaskDate) ? value.nextTaskDate : null,
    importantByDay,
    wipEnabled: value.wipEnabled === true,
    wipLimit: Number.isInteger(limit) && limit >= 1 && limit <= 99 ? limit : 3,
  };
}

export function readTodayPlanningSnapshot(uid: string, storage: Storage = localStorage): TodayPlanningSnapshot | null {
  if (!uid) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(storageKey(uid)) || "null");
    if (!isRecord(parsed)) return null;
    return {
      updatedAt: Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : 0,
      data: sanitizeTodayPlanningData(parsed.data),
    };
  } catch {
    return null;
  }
}

function writeSnapshot(uid: string, snapshot: TodayPlanningSnapshot, storage: Storage = localStorage): void {
  if (!uid) return;
  try { storage.setItem(storageKey(uid), JSON.stringify(snapshot)); } catch { /* cloud sync still gets the in-memory value */ }
}

function getStore(uid: string): Store {
  let store = stores.get(uid);
  if (store) return store;
  const local = readTodayPlanningSnapshot(uid);
  store = {
    uid,
    snapshot: local || { updatedAt: 0, data: { ...DEFAULT_TODAY_PLANNING } },
    hasLocal: !!local,
    cloudReady: false,
    pendingUpdates: [],
    listeners: new Set(),
    binding: null,
  };
  stores.set(uid, store);
  return store;
}

function notify(store: Store): void {
  for (const listener of store.listeners) listener(store.snapshot);
}

function rebasePendingUpdate(current: TodayPlanningData, update: PendingUpdate): TodayPlanningData {
  let next = current;
  if (update.clearNextTaskIf) {
    const { taskId, day } = update.clearNextTaskIf;
    if (getNextTaskIdForDay(next, day) === taskId) next = setNextTaskForDay(next, null, day);
  } else if (update.before.nextTaskId !== update.after.nextTaskId || update.before.nextTaskDate !== update.after.nextTaskDate) {
    next = { ...next, nextTaskId: update.after.nextTaskId, nextTaskDate: update.after.nextTaskDate };
  }

  for (const day of new Set([...Object.keys(update.before.importantByDay), ...Object.keys(update.after.importantByDay)])) {
    const beforeIds = new Set(update.before.importantByDay[day] || []);
    const afterIds = new Set(update.after.importantByDay[day] || []);
    const currentIds = new Set(next.importantByDay[day] || []);
    for (const taskId of new Set([...beforeIds, ...afterIds])) {
      if (beforeIds.has(taskId) === afterIds.has(taskId)) continue;
      if (afterIds.has(taskId)) currentIds.add(taskId);
      else currentIds.delete(taskId);
    }
    const importantByDay = { ...next.importantByDay };
    if (currentIds.size) importantByDay[day] = [...currentIds];
    else delete importantByDay[day];
    next = { ...next, importantByDay };
  }

  if (update.before.wipEnabled !== update.after.wipEnabled) next = { ...next, wipEnabled: update.after.wipEnabled };
  if (update.before.wipLimit !== update.after.wipLimit) next = { ...next, wipLimit: update.after.wipLimit };
  return sanitizeTodayPlanningData(next);
}

function startCloudBinding(store: Store): void {
  if (store.binding || !store.uid || auth.currentUser?.uid !== store.uid) return;
  const uid = store.uid;
  store.binding = bindCloudState(uid, "today_planning", {
    read: () => store!.hasLocal ? store!.snapshot : null,
    reconcilePending: (remote) => {
      if (!store!.pendingUpdates.length) return null;
      let data = sanitizeTodayPlanningData(remote.data);
      for (const update of store!.pendingUpdates) data = rebasePendingUpdate(data, update);
      return { updatedAt: Math.max(Date.now(), remote.updatedAt + 1), data };
    },
    onCloudInitialized: () => {
      store!.cloudReady = true;
      store!.pendingUpdates = [];
    },
    apply: (data, updatedAt) => {
      if (auth.currentUser?.uid !== uid || stores.get(uid) !== store) return;
      store!.snapshot = { updatedAt, data: sanitizeTodayPlanningData(data) };
      store!.hasLocal = true;
      store!.cloudReady = true;
      store!.pendingUpdates = [];
      writeSnapshot(uid, store!.snapshot);
      notify(store!);
    },
  });
}

export function subscribeTodayPlanning(uid: string, listener: (snapshot: TodayPlanningSnapshot) => void): () => void {
  if (!uid) return () => {};
  const store = getStore(uid);
  store.listeners.add(listener);
  listener(store.snapshot);
  startCloudBinding(store);
  if (store.pendingUpdates.length) store.binding?.push();
  return () => {
    store.listeners.delete(listener);
    if (!store.listeners.size && store.binding) {
      store.binding.stop();
      store.binding = null;
    }
  };
}

export function updateTodayPlanning(
  uid: string,
  update: (current: TodayPlanningData) => TodayPlanningData,
  options: { clearNextTaskIf?: { taskId: string; day: string } } = {},
): TodayPlanningSnapshot {
  const store = getStore(uid);
  const before = store.snapshot.data;
  const data = sanitizeTodayPlanningData(update(before));
  if (!store.cloudReady && JSON.stringify(before) !== JSON.stringify(data)) {
    store.pendingUpdates.push({ before, after: data, ...options });
  }
  const next: TodayPlanningSnapshot = {
    updatedAt: Math.max(Date.now(), store.snapshot.updatedAt + 1),
    data,
  };
  store.snapshot = next;
  store.hasLocal = true;
  writeSnapshot(uid, next);
  notify(store);
  startCloudBinding(store);
  store.binding?.push();
  return next;
}

/** Clear an invalid selection only if it is still the task that became invalid. */
export function clearNextTaskIf(uid: string, taskId: string, day: string): TodayPlanningSnapshot {
  const store = getStore(uid);
  if (getNextTaskIdForDay(store.snapshot.data, day) !== taskId) return store.snapshot;
  return updateTodayPlanning(
    uid,
    current => getNextTaskIdForDay(current, day) === taskId ? setNextTaskForDay(current, null, day) : current,
    { clearNextTaskIf: { taskId, day } },
  );
}

export function getNextTaskIdForDay(data: TodayPlanningData, day: string): string | null {
  return data.nextTaskDate === day ? data.nextTaskId : null;
}

export function setNextTaskForDay(data: TodayPlanningData, taskId: string | null, day: string): TodayPlanningData {
  return { ...data, nextTaskId: taskId, nextTaskDate: taskId ? day : null };
}

export function toggleImportantTaskForDay(data: TodayPlanningData, taskId: string, day: string): TodayPlanningData {
  const current = data.importantByDay[day] || [];
  const nextIds = current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId];
  const importantByDay = { ...data.importantByDay };
  if (nextIds.length) importantByDay[day] = nextIds;
  else delete importantByDay[day];
  return { ...data, importantByDay };
}

export function isTaskEligibleForNext(task: Pick<Task, "status" | "completed"> | null | undefined): boolean {
  if (!task || task.completed) return false;
  return task.status === "todo" || task.status === "in_progress";
}

export function shouldClearInvalidNextTask(taskId: string | null, tasks: Task[], serverAuthoritative: boolean): boolean {
  if (!taskId || !serverAuthoritative) return false;
  return !isTaskEligibleForNext(tasks.find(task => task.id === taskId));
}

export function isTaskScheduledInFuture(task: Task, today: string): boolean {
  const schedule = readSchedule(task);
  if (schedule.kind === "day") return schedule.date > today;
  if (schedule.kind === "datetime") {
    return schedule.date > today || (schedule.date === today && new Date(schedule.at).getTime() > Date.now());
  }
  if (schedule.kind === "period") return schedule.period.start > today;
  return false;
}

export function isTaskImportantForDay(data: TodayPlanningData, taskId: string, day: string): boolean {
  return data.importantByDay[day]?.includes(taskId) || false;
}

export function countActiveWip(tasks: Task[]): number {
  const children = new Map<string, Task[]>();
  for (const task of tasks) if (task.parent_id) children.set(task.parent_id, [...(children.get(task.parent_id) || []), task]);
  const isOpenInProgress = (task: Task) => !task.completed && task.status === "in_progress";
  const hasActiveDescendant = (taskId: string, visited = new Set<string>()): boolean => {
    if (visited.has(taskId)) return false;
    visited.add(taskId);
    for (const child of children.get(taskId) || []) {
      if (isOpenInProgress(child) || hasActiveDescendant(child.id, visited)) return true;
    }
    return false;
  };
  // A parent can be active work when no child is active. When an active descendant exists,
  // count the executable child work and treat the parent as its roll-up to avoid double-counting.
  return tasks.filter(task => isOpenInProgress(task) && !hasActiveDescendant(task.id)).length;
}

export function shouldWarnWipStart(enabled: boolean, currentWip: number, limit: number, task: Task): boolean {
  return enabled && isTaskEligibleForNext(task) && task.status !== "in_progress" && currentWip >= limit;
}
