import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isRecurringTask,
  resolveRecurrenceRule,
  calculateNextOccurrence,
  resetDescriptionCheckboxes,
  advanceRecurringTask,
} from "./recurringTaskService";
import type { Task } from "./taskTypes";
import { nextOccurrence } from "./recurrence";
import { getLocalDateString } from "./taskDate";

const mockGetCachedTasks = vi.fn();
const mockLogTaskActivity = vi.fn();
const mockFrom = vi.fn();
const committedWrites: { path: string; patch: Record<string, unknown> }[] = [];
let failCommit = false;

vi.mock("firebase/firestore", async importOriginal => ({
  ...await importOriginal<typeof import("firebase/firestore")>(),
  runTransaction: async (_db: unknown, body: (tx: unknown) => Promise<unknown>) => {
    const staged: typeof committedWrites = [];
    const result = await body({
      get: async () => ({ exists: () => true, data: () => undefined }),
      update: (ref: { path: string }, patch: Record<string, unknown>) => staged.push({ path: ref.path, patch }),
    });
    if (failCommit) throw new Error("Injected transaction commit failure");
    committedWrites.push(...staged);
    return result;
  },
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
    committedWrites.length = 0;
    failCommit = false;
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

  it("keeps an explicitly chosen repeat hour local in Iran and across daylight saving", () => {
    const previousZone = process.env.TZ;
    try {
      for (const [zone, start] of [
        ["Asia/Tehran", [2026, 9, 2]],
        ["America/New_York", [2026, 2, 7]],
      ] as const) {
        process.env.TZ = zone;
        const after = new Date(start[0], start[1], start[2], 10, 0);
        const next = nextOccurrence({ freq: "daily", interval: 1, byhour: 9, byminute: 15 }, after);
        expect(next?.getHours()).toBe(9);
        expect(next?.getMinutes()).toBe(15);
      }
    } finally {
      if (previousZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousZone;
    }
  });

  it("rolls an overdue two-day occurrence into today without changing its cadence", () => {
    const next = calculateNextOccurrence(
      { freq: "daily", interval: 2 },
      new Date(2026, 9, 1),
      new Date(2026, 9, 3, 10),
    );
    expect(getLocalDateString(next)).toBe("2026-10-03");
  });

  it("moves a daily task from five days ago to today, then to tomorrow", () => {
    const rule = { freq: "daily" as const, interval: 1 };
    const now = new Date(2026, 9, 3, 12);
    const today = calculateNextOccurrence(rule, new Date(2026, 8, 28), now);
    expect(getLocalDateString(today)).toBe("2026-10-03");
    const tomorrow = calculateNextOccurrence(rule, today, now);
    expect(getLocalDateString(tomorrow)).toBe("2026-10-04");
  });

  describe("advanceRecurringTask", () => {
    it("converts the old 23:59 all-day marker and rolls yesterday into today", async () => {
      const now = new Date(2026, 9, 3, 12);
      const oldMarker = new Date(2026, 9, 2, 23, 59).toISOString();
      const task: Task = { id: "all-day-repeat", user_id: "user-1", title: "Read", completed: false, status: "todo", priority: "none", recurrence: "daily", due_date: oldMarker };
      const result = await advanceRecurringTask("user-1", task, { now });
      expect(result.success).toBe(true);
      expect(result.patch?.work_date).toBe("2026-10-03");
      expect(result.patch?.due_date).toBeNull();
    });

    it("advances a daily planning bucket with the next task occurrence", async () => {
      const task: Task = {
        id: "planned-repeat", user_id: "user-1", title: "Practice", completed: false,
        status: "todo", priority: "none", recurrence: "daily", due_date: "2026-10-02",
        planning_horizon: "day", planning_start: "2026-10-02", planning_end: "2026-10-02",
        horizon: "day", period_start: "2026-10-02", period_end: "2026-10-02",
        bucket_kind: "day", bucket_anchor: "2026-10-02",
      };
      const result = await advanceRecurringTask("user-1", task, { now: new Date(2026, 9, 2, 12) });
      expect(result.patch).toMatchObject({
        work_date: "2026-10-03", planning_start: "2026-10-03", planning_end: "2026-10-03",
        period_start: "2026-10-03", period_end: "2026-10-03", bucket_anchor: "2026-10-03",
      });
    });

    it("moves the date and resets the reminder for the next occurrence", async () => {
      const reminder = "2026-10-02T08:45:00.000Z";
      const task: Task = {
        id: "timed-repeat", user_id: "user-1", title: "Meeting", completed: false,
        status: "todo", priority: "none", recurrence: "daily", due_date: "2026-10-02T09:00:00.000Z",
        reminder_at: reminder,
        reminder_plan: { version: 1, enabled: true, trigger_at: reminder, mode: "once", repeat_interval_minutes: 15,
          repeat_count: 3, snooze_options: [10, 15], importance: "normal", status: "acknowledged", fire_count: 1 },
      };
      const result = await advanceRecurringTask("user-1", task, { now: new Date("2026-10-02T11:00:00.000Z") });
      expect(result.patch?.work_date).toBe("2026-10-03T09:00:00.000Z");
      expect(result.patch).not.toHaveProperty("start_at");
      expect(result.patch?.reminder_at).toBe("2026-10-03T08:45:00.000Z");
      expect(result.patch?.reminder_plan).toMatchObject({ trigger_at: "2026-10-03T08:45:00.000Z", status: "pending", fire_count: 0 });
    });
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

      const subtask2: Task = {
        id: "sub-2",
        user_id: "user-1",
        title: "Subtask 2",
        priority: "low",
        completed: true,
        status: "done",
        parent_id: "parent-rec-1",
      };

      mockGetCachedTasks.mockResolvedValue([parentTask, subtask1, subtask2]);

      const res = await advanceRecurringTask("user-1", parentTask, { now });

      expect(res.success).toBe(true);
      expect(res.updatedSubtaskCount).toBe(2);

      // Verify parent task patch
      expect(res.patch?.completed).toBe(false);
      expect(res.patch?.status).toBe("todo");
      expect(res.patch?.work_date).toBe("2026-10-01");
      expect(res.patch?.description).toBe("- [ ] Prepare notes\n- [ ] Check blocker");

      // Verify subtasks were reset (both subtasks are plain tasks without recurrence)
      expect(committedWrites.find(write => write.path.endsWith("/sub-1"))?.patch).toMatchObject({
        completed: false, status: "todo", work_date: "2026-10-01", due_date: null, schedule_v: 2,
      });
      expect(committedWrites.find(write => write.path.endsWith("/sub-2"))?.patch).toMatchObject({ completed: false, status: "todo" });
      expect(committedWrites.find(write => write.path.endsWith("/parent-rec-1"))?.patch).toMatchObject({
        completed: false, status: "todo", work_date: "2026-10-01",
      });
      for (const write of committedWrites) expect(Object.values(write.patch)).not.toContain(undefined);
    });

    it("does not reset a recurring subtask to tomorrow (nested recurrence advances itself)", async () => {
      const now = new Date("2026-09-30T10:00:00.000Z");

      const parentTask: Task = {
        id: "parent-rec-2",
        user_id: "user-1",
        title: "Weekly Review",
        completed: true,
        status: "done",
        priority: "none",
        recurrence: "weekly",
        due_date: "2026-09-30",
      };

      // A subtask that is itself recurring must not be hijacked by the parent's advance.
      const recurringSub: Task = {
        id: "sub-rec-1",
        user_id: "user-1",
        title: "DailyStretch",
        completed: true,
        status: "done",
        priority: "none",
        parent_id: "parent-rec-2",
        recurrence: "daily",
        due_date: "2026-09-30",
      };

      mockGetCachedTasks.mockResolvedValue([parentTask, recurringSub]);

      const res = await advanceRecurringTask("user-1", parentTask, { now });

      expect(res.success).toBe(true);
      // The recurring subtask is intentionally left alone: completing the parent
      // tomorrow should not duplicate or shift the subtask's own daily cadence.
      expect(res.updatedSubtaskCount).toBe(0);
      expect(committedWrites.map(write => write.path.split("/").pop())).toEqual(["parent-rec-2"]);
    });

    it("leaves parent, descendants and checklists untouched when the atomic commit fails", async () => {
      const parent = { id: "parent", user_id: "user-1", title: "Parent", recurrence: "daily", due_date: "2026-10-02" } as Task;
      const child = { id: "child", user_id: "user-1", title: "Child", parent_id: "parent", completed: true, status: "done" } as Task;
      failCommit = true;
      const result = await advanceRecurringTask("user-1", parent, { now: new Date(2026, 9, 2, 12), allKnownTasks: [parent, child] });
      expect(result.success).toBe(false);
      expect(committedWrites).toEqual([]);
      expect(mockLogTaskActivity).not.toHaveBeenCalled();
    });

    it("fails safely when checklist lookup fails before the transaction", async () => {
      const parent = { id: "parent", user_id: "user-1", title: "Parent", recurrence: "daily", due_date: "2026-10-02" } as Task;
      const child = { id: "child", user_id: "user-1", title: "Child", parent_id: "parent", completed: true, status: "done" } as Task;
      mockFrom.mockReturnValue({ select: () => ({ in: async () => ({ data: null, error: new Error("lookup failed") }) }) });
      const result = await advanceRecurringTask("user-1", parent, { now: new Date(2026, 9, 2, 12), allKnownTasks: [parent, child] });
      expect(result.success).toBe(false);
      expect(committedWrites).toEqual([]);
    });

    it("does not reset plain grandchildren owned by a recurring child", async () => {
      const parent = { id: "parent", user_id: "user-1", title: "Parent", recurrence: "daily", due_date: "2026-10-02" } as Task;
      const recurringChild = { id: "recurring-child", user_id: "user-1", title: "Recurring child", parent_id: "parent", recurrence: "weekly" } as Task;
      const grandchild = { id: "grandchild", user_id: "user-1", title: "Grandchild", parent_id: "recurring-child", completed: true, status: "done" } as Task;
      const result = await advanceRecurringTask("user-1", parent, { now: new Date(2026, 9, 2, 12), allKnownTasks: [parent, recurringChild, grandchild] });
      expect(result.success).toBe(true);
      expect(result.updatedSubtaskCount).toBe(0);
      expect(committedWrites.map(write => write.path.split("/").pop())).toEqual(["parent"]);
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
            select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ id: "step-1" }] }) }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [] }),
        };
      });

      const res = await advanceRecurringTask("user-1", task, { now });
      expect(res.success).toBe(true);

      expect(committedWrites.find(write => write.path.endsWith("/task_steps/step-1"))?.patch).toEqual({ completed: false });
    });
  });
});
