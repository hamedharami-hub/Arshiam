import { useEffect, useState } from "react";

export type TaskSwipeAction = "none" | "complete" | "today" | "tomorrow" | "menu";
export type TaskSwipeSettings = { left: TaskSwipeAction; right: TaskSwipeAction };
export const DEFAULT_TASK_SWIPES: TaskSwipeSettings = { left: "complete", right: "today" };
export const TASK_SWIPE_EVENT = "arshnaz:task-swipes";
const actions: TaskSwipeAction[] = ["none", "complete", "today", "tomorrow", "menu"];
const keyFor = (userId?: string) => `arshnaz_task_swipes_v1:${userId || "guest"}`;
const memory = new Map<string, TaskSwipeSettings>();

export function getTaskSwipeSettings(userId?: string): TaskSwipeSettings {
  const key = keyFor(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw) as TaskSwipeSettings;
      return {
        left: actions.includes(value?.left) ? value.left : DEFAULT_TASK_SWIPES.left,
        right: actions.includes(value?.right) ? value.right : DEFAULT_TASK_SWIPES.right,
      };
    }
  } catch { /* Storage may be unavailable; keep preferences usable in this session. */ }
  return memory.get(key) || { ...DEFAULT_TASK_SWIPES };
}

export function setTaskSwipeSettings(userId: string | undefined, settings: TaskSwipeSettings): void {
  const key = keyFor(userId);
  const valid = {
    left: actions.includes(settings.left) ? settings.left : DEFAULT_TASK_SWIPES.left,
    right: actions.includes(settings.right) ? settings.right : DEFAULT_TASK_SWIPES.right,
  };
  memory.set(key, valid);
  try { localStorage.setItem(key, JSON.stringify(valid)); } catch { /* Use in-memory fallback. */ }
  window.dispatchEvent(new Event(TASK_SWIPE_EVENT));
}

/** Preferences belong to this account on this device, like other list controls. */
export function useTaskSwipeSettings(userId?: string): TaskSwipeSettings {
  const [state, setState] = useState(() => ({ userId, value: getTaskSwipeSettings(userId) }));
  useEffect(() => {
    const sync = () => setState({ userId, value: getTaskSwipeSettings(userId) });
    sync();
    window.addEventListener(TASK_SWIPE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TASK_SWIPE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);
  return state.userId === userId ? state.value : getTaskSwipeSettings(userId);
}
