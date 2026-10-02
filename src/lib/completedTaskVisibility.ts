import { useEffect, useState } from "react";
import type { Task } from "@/lib/taskTypes";

export const SHOW_COMPLETED_TASKS_KEY = "arshnaz_show_completed_tasks_v1";
export const COMPLETED_TASK_VISIBILITY_EVENT = "arshnaz:completed-task-visibility";

/** Completed items stay visible unless the user explicitly opts out. */
export function getShowCompletedTasks(): boolean {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem(SHOW_COMPLETED_TASKS_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setShowCompletedTasks(show: boolean): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SHOW_COMPLETED_TASKS_KEY, String(show));
    }
  } catch {
    // Keep the in-memory preference usable when storage is unavailable.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPLETED_TASK_VISIBILITY_EVENT));
  }
}

export function useShowCompletedTasks(): boolean {
  const [show, setShow] = useState(getShowCompletedTasks);

  useEffect(() => {
    const sync = () => setShow(getShowCompletedTasks());
    window.addEventListener(COMPLETED_TASK_VISIBILITY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMPLETED_TASK_VISIBILITY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return show;
}

export function filterTasksForVisibility<T extends Pick<Task, "completed">>(
  tasks: T[],
  showCompleted: boolean,
): T[] {
  return showCompleted ? tasks : tasks.filter((task) => !task.completed);
}
