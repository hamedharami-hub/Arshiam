import { useEffect, useState } from "react";
import { DEFAULT_FILTERS, SORT_KEYS, type SortLevel } from "./smartListService";

export const TASK_LIST_SORT_KEY = "task_sort_v2";
export const TASK_LIST_SORT_EVENT = "arshnaz:task-list-sort-changed";
export type TaskListSort = { sort_primary: SortLevel; sort_secondary: SortLevel };

function validLevel(value: unknown, fallback: SortLevel): SortLevel {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as SortLevel;
  return SORT_KEYS.includes(candidate.key) && ["asc", "desc"].includes(candidate.dir) ? candidate : fallback;
}
export function readTaskListSort(scope: string): TaskListSort {
  const fallback: TaskListSort = scope === "today:_"
    ? { sort_primary: { key: "priority", dir: "asc" }, sort_secondary: { key: "due", dir: "asc" } }
    : { sort_primary: DEFAULT_FILTERS.sort_primary, sort_secondary: DEFAULT_FILTERS.sort_secondary };
  try {
    const saved = JSON.parse(localStorage.getItem(TASK_LIST_SORT_KEY) || "{}");
    const value = saved[scope] || saved["default:_"];
    return {
      sort_primary: validLevel(value?.sort_primary, fallback.sort_primary),
      sort_secondary: validLevel(value?.sort_secondary, fallback.sort_secondary),
    };
  } catch { return fallback; }
}
export function saveTaskListSort(scope: string, next: TaskListSort): boolean {
  try {
    let saved: Record<string, unknown> = {};
    try {
      const raw = JSON.parse(localStorage.getItem(TASK_LIST_SORT_KEY) || "{}");
      if (raw && typeof raw === "object" && !Array.isArray(raw)) saved = raw;
    } catch { /* Recover a corrupt preference without touching task records. */ }
    const existing = saved[scope];
    saved[scope] = { ...(existing && typeof existing === "object" ? existing : {}), ...next };
    localStorage.setItem(TASK_LIST_SORT_KEY, JSON.stringify(saved));
    window.dispatchEvent(new Event(TASK_LIST_SORT_EVENT));
    return true;
  } catch { return false; }
}
export function useTaskListSort(scope: string): TaskListSort {
  const [value, setValue] = useState(() => readTaskListSort(scope));
  useEffect(() => {
    const update = () => setValue(readTaskListSort(scope));
    update();
    window.addEventListener(TASK_LIST_SORT_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(TASK_LIST_SORT_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [scope]);
  return value;
}

export function hasTaskListSort(scope: string): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(TASK_LIST_SORT_KEY) || "{}");
    return Boolean(saved?.[scope] || saved?.["default:_"]);
  } catch { return false; }
}
