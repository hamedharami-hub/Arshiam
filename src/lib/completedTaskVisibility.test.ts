import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETED_TASK_VISIBILITY_EVENT,
  filterTasksForVisibility,
  getShowCompletedTasks,
  setShowCompletedTasks,
  SHOW_COMPLETED_TASKS_KEY,
} from "./completedTaskVisibility";

beforeEach(() => {
  localStorage.clear();
});

describe("completed task visibility", () => {
  it("shows completed tasks by default so existing data is not hidden", () => {
    expect(getShowCompletedTasks()).toBe(true);
  });

  it("persists the user choice and notifies other views in the same tab", () => {
    const listener = vi.fn();
    window.addEventListener(COMPLETED_TASK_VISIBILITY_EVENT, listener);

    setShowCompletedTasks(false);
    expect(localStorage.getItem(SHOW_COMPLETED_TASKS_KEY)).toBe("false");
    expect(getShowCompletedTasks()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);

    setShowCompletedTasks(true);
    expect(localStorage.getItem(SHOW_COMPLETED_TASKS_KEY)).toBe("true");
    expect(getShowCompletedTasks()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(COMPLETED_TASK_VISIBILITY_EVENT, listener);
  });

  it("filters only completed tasks when visibility is disabled", () => {
    const tasks = [
      { id: "open", completed: false },
      { id: "done", completed: true },
    ];

    expect(filterTasksForVisibility(tasks, true)).toEqual(tasks);
    expect(filterTasksForVisibility(tasks, false)).toEqual([tasks[0]]);
  });
});
