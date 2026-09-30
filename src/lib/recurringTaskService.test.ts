import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isRecurringTask,
  resolveRecurrenceRule,
  calculateNextOccurrence,
  resetDescriptionCheckboxes,
  advanceRecurringTask,
} from "./recurringTaskService";
import type { Task } from "./taskTypes";

const mockPersistTask = vi.fn();
const mockGetCachedTasks = vi.fn();
const mockLogTaskActivity = vi.fn();
const mockFrom = vi.fn();

vi.mock("./firestoreDataService", () => ({
  persistTask: (...args: any[]) => mockPersistTask(...args),
}));

vi.mock("@/features/tasks/taskService", () => ({
  getCachedTasks: (...args: any[]) => mockGetCachedTasks(...args),
}));

vi.mock("./taskActivity", () => ({
  logTaskActivity: (...args: any[]) => mockLogTaskActivity(...args),
}));

vi.mock("./firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => mockFrom(table),
  },
}));

describe("recurringTaskService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPersistTask.mockResolvedValue("saved");
    mockGetCachedTasks.mockResolvedValue([]);
    mockLogTaskActivity.mockResolvedValue(undefined);
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [] }),
      in: vi.fn().mockResolvedValue({ data: [] }),
      update: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  describe("isRecurringTask and resolveRecurrenceRule", () => {
    it("identifies recurring tasks properly", () => {
      expect(isRecurringTask(null)).toBe(false);
      expect(isRecurringTask({ id: "1", title: "Task", recurrence: "none" } as Task)).toBe(false);
      expect(isRecurringTask({ id: "2", title: "Task", recurrence: "daily" } as Task)).toBe(true);
      expect(
        isRecurringTask({
          id: "3",
          title: "Task",
          recurrence_rule: { freq: "weekly", interval: 1 },
        } as Task)
      ).toBe(true);
    });

    it("resolves recurrence rule for explicit and legacy rules", () => {
      const explicit: Task = {
        id: "1",
        title: "T",
        recurrence_rule: { freq: "weekly", interval: 2 },
      } as Task;
      expect(resolveRecurrenceRule(explicit)).toEqual({ freq: "weekly", interval: 2 });

      const legacy: Task = {
        id: "2",
        title: "T",
        recurrence: "daily",
      } as Task;
      expect(resolveRecurrenceRule(legacy)).toEqual({ freq: "daily", interval: 1 });
    });
  });

  describe("resetDescriptionCheckboxes", () => {
    it("resets markdown checkboxes from [x] to [ ]", () => {
      const text = "- [x] Done item\n- [X] Another done\n- [ ] Todo item";
      const result = resetDescriptionCheckboxes(text);
      expect(result).toBe("- [ ] Done item\n- [ ] Another done\n- [ ] Todo item");
    });

    it("resets html task list checkboxes", () => {
      const html = '<li data-type="taskItem" data-checked="true"><input type="checkbox" checked="checked"><div>Work</div></li>';
      const result = resetDescriptionCheckboxes(html);
      expect(result).toContain('data-checked="false"');
      expect(result).not.toContain('checked="checked"');
    });
  });

  describe("advanceRecurringTask", () => {
    it("advances daily task to tomorrow and resets subtasks & checkboxes", async () => {
      const now = new Date("2026-09-30T10:00:00.000Z");

      const parentTask: Task = {
        id: "parent-rec-1",
        user_id: "user-1",
        title: "Daily Standup Routine",
        priority: "high",
        completed: true,
        status: "done",
        recurrence: "daily",
        due_date: "2026-09-30",
        description: "- [x] Prepare notes\n- [x] Check blocker",
      };

      const subtask1: Task = {
        id: "sub-1",
        user_id: "user-1",
        title: "Subtask 1",
        priority: "medium",
        completed: true,
        status: "done",
        parent_id: "parent-rec-1",
        due_date: "2026-09-30",
      };

      mockGetCachedTasks.mockResolvedValue([parentTask, subtask1]);

      const res = await advanceRecurringTask("user-1", parentTask, { now });

      expect(res.success).toBe(true);
      expect(res.updatedSubtaskCount).toBe(1);

      // Verify parent task patch
      expect(res.patch?.completed).toBe(false);
      expect(res.patch?.status).toBe("todo");
      expect(res.patch?.due_date).toBe("2026-10-01");
      expect(res.patch?.description).toBe("- [ ] Prepare notes\n- [ ] Check blocker");

      // Verify subtask was reset
      expect(mockPersistTask).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          id: "sub-1",
          completed: false,
          status: "todo",
          due_date: "2026-10-01",
        })
      );

      // Verify parent was persisted
      expect(mockPersistTask).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          id: "parent-rec-1",
          completed: false,
          status: "todo",
          due_date: "2026-10-01",
        })
      );
    });

    it("resets checklist step lists when advancing", async () => {
      const now = new Date("2026-09-30T10:00:00.000Z");

      const task: Task = {
        id: "task-steps-1",
        user_id: "user-1",
        title: "Checklist Task",
        priority: "medium",
        completed: false,
        status: "todo",
        recurrence: "daily",
        due_date: "2026-09-30",
      };

      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "task_step_lists") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "list-1" }, { id: "list-2" }],
              }),
            }),
          };
        }
        if (table === "task_steps") {
          return {
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [] }),
        };
      });

      const res = await advanceRecurringTask("user-1", task, { now });
      expect(res.success).toBe(true);

      // Check task_steps were updated with completed: false
      expect(mockUpdate).toHaveBeenCalledWith({ completed: false });
    });
  });
});
