import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDefaultReminderPlan,
  resolveEffectiveReminder,
  calculateNextReminderTrigger,
  calculateSnoozeTrigger,
  toLocalDatetimeInputString,
  parseLocalDateFromInput,
  syncNativeTaskReminder,
  type ReminderPlan,
} from "./reminders";
import * as notify from "./notify";

vi.mock("./notify", () => ({
  ensureNotificationPermission: vi.fn().mockResolvedValue(true),
  hasNotificationPermission: vi.fn().mockResolvedValue(true),
  fireNotification: vi.fn(),
  cancelNotification: vi.fn().mockResolvedValue(true),
  scheduleNotificationAt: vi.fn().mockResolvedValue(true),
}));

vi.mock("./nativeExperience", () => ({
  isAndroid: vi.fn().mockReturnValue(false),
  nativeExperience: {
    configure: vi.fn().mockResolvedValue({}),
    status: vi.fn().mockResolvedValue({}),
  },
}));

describe("Reminders Engine & Multi-step State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Legacy Compatibility (only reminder_at)", () => {
    it("synthesizes an effective 1-shot ReminderPlan from legacy reminder_at", () => {
      const legacyTask = {
        id: "task-1",
        title: "Legacy task",
        reminder_at: "2026-10-01T10:00:00.000Z",
      };

      const plan = resolveEffectiveReminder(legacyTask);
      expect(plan).not.toBeNull();
      expect(plan?.enabled).toBe(true);
      expect(plan?.trigger_at).toBe("2026-10-01T10:00:00.000Z");
      expect(plan?.mode).toBe("once");
      expect(plan?.version).toBe(1);
    });

    it("returns null when neither reminder_plan nor reminder_at is present", () => {
      expect(resolveEffectiveReminder({ reminder_at: null })).toBeNull();
      expect(resolveEffectiveReminder({ reminder_at: null, reminder_plan: null })).toBeNull();
    });

    it("prefers reminder_plan over reminder_at when reminder_plan is enabled", () => {
      const advancedTask = {
        id: "task-2",
        title: "Advanced task",
        reminder_at: "2026-10-01T10:00:00.000Z",
        reminder_plan: createDefaultReminderPlan("2026-10-01T12:00:00.000Z", "until_ack", 15),
      };

      const plan = resolveEffectiveReminder(advancedTask);
      expect(plan?.trigger_at).toBe("2026-10-01T12:00:00.000Z");
      expect(plan?.mode).toBe("until_ack");
    });
  });

  describe("2. One-Time Reminder (mode: 'once')", () => {
    it("schedules initial trigger and stops after 1 fire", () => {
      const baseTime = new Date("2026-10-01T08:00:00.000Z");
      const plan = createDefaultReminderPlan("2026-10-01T09:00:00.000Z", "once");

      // Before trigger
      const first = calculateNextReminderTrigger(plan, baseTime);
      expect(first.nextTriggerAt).toBe("2026-10-01T09:00:00.000Z");
      expect(first.updatedPlan.status).toBe("pending");

      // After firing once
      const firedPlan: ReminderPlan = { ...plan, fire_count: 1 };
      const second = calculateNextReminderTrigger(firedPlan, new Date("2026-10-01T09:05:00.000Z"));
      expect(second.nextTriggerAt).toBeNull();
      expect(second.updatedPlan.status).toBe("missed");
    });
  });

  describe("3. Fixed Count Repetitions (mode: 'count')", () => {
    it("repeats 3 times with 10 min interval and terminates", () => {
      const initialTrigger = new Date("2026-10-01T09:00:00.000Z");
      const plan: ReminderPlan = {
        version: 1,
        enabled: true,
        trigger_at: initialTrigger.toISOString(),
        mode: "count",
        repeat_interval_minutes: 10,
        repeat_count: 3,
        snooze_options: [10, 15, 30],
        importance: "normal",
        status: "pending",
        fire_count: 0,
      };

      // 1st trigger (fire_count = 0)
      const res1 = calculateNextReminderTrigger(plan, new Date("2026-10-01T08:30:00.000Z"));
      expect(res1.nextTriggerAt).toBe(initialTrigger.toISOString());

      // 2nd trigger (fire_count = 1)
      const fired1: ReminderPlan = { ...plan, fire_count: 1 };
      const res2 = calculateNextReminderTrigger(fired1, new Date("2026-10-01T09:01:00.000Z"));
      expect(res2.nextTriggerAt).toBe(new Date("2026-10-01T09:10:00.000Z").toISOString());
      expect(res2.updatedPlan.status).toBe("firing");

      // 3rd trigger (fire_count = 2)
      const fired2: ReminderPlan = { ...plan, fire_count: 2 };
      const res3 = calculateNextReminderTrigger(fired2, new Date("2026-10-01T09:11:00.000Z"));
      expect(res3.nextTriggerAt).toBe(new Date("2026-10-01T09:20:00.000Z").toISOString());

      // After 3rd trigger (fire_count = 3): should finish and not schedule
      const fired3: ReminderPlan = { ...plan, fire_count: 3 };
      const res4 = calculateNextReminderTrigger(fired3, new Date("2026-10-01T09:21:00.000Z"));
      expect(res4.nextTriggerAt).toBeNull();
      expect(res4.updatedPlan.status).toBe("missed");
    });
  });

  describe("4. Until Acknowledged with 24h Guard & 15m Min Interval", () => {
    it("enforces minimum 15 minute interval", () => {
      const plan = createDefaultReminderPlan("2026-10-01T09:00:00.000Z", "until_ack", 5 as any);
      expect(plan.repeat_interval_minutes).toBe(15);
    });

    it("stops after 24 hours cap and transitions to 'missed' to save battery", () => {
      const initial = new Date("2026-10-01T09:00:00.000Z");
      const plan: ReminderPlan = {
        version: 1,
        enabled: true,
        trigger_at: initial.toISOString(),
        mode: "until_ack",
        repeat_interval_minutes: 15,
        repeat_count: 3,
        snooze_options: [10, 15, 30],
        importance: "normal",
        status: "firing",
        fire_count: 50,
        max_window_hours: 24,
      };

      // After 24.5 hours
      const after24h = new Date(initial.getTime() + 24.5 * 3600 * 1000);
      const res = calculateNextReminderTrigger(plan, after24h);
      expect(res.nextTriggerAt).toBeNull();
      expect(res.updatedPlan.status).toBe("missed");
    });
  });

  describe("5. Snooze Handling", () => {
    it("calculates exact snooze trigger time for 15 minutes", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      const plan = createDefaultReminderPlan("2026-10-01T09:00:00.000Z");

      const res = calculateSnoozeTrigger(plan, 15, now);
      expect(res.snoozeUntil).toBe(new Date("2026-10-01T10:15:00.000Z").toISOString());
      expect(res.updatedPlan.status).toBe("snoozed");
      expect(res.updatedPlan.snooze_until).toBe(res.snoozeUntil);
    });

    it("calculates snooze for tomorrow at 09:00 local time", () => {
      const now = new Date("2026-10-01T14:30:00.000Z");
      const plan = createDefaultReminderPlan("2026-10-01T09:00:00.000Z");

      const res = calculateSnoozeTrigger(plan, "tomorrow", now);
      const targetDate = new Date(res.snoozeUntil);
      expect(targetDate.getHours()).toBe(9);
      expect(targetDate.getMinutes()).toBe(0);
      expect(res.updatedPlan.status).toBe("snoozed");
    });
  });

  describe("6. Task Completion & Deletion Cancellation", () => {
    it("cancels active notification and returns false when task is completed", async () => {
      const task = {
        id: "task-completed-1",
        title: "Done Task",
        reminder_at: "2026-10-01T10:00:00.000Z",
        completed: true,
      };

      const scheduled = await syncNativeTaskReminder(task);
      expect(scheduled).toBe(false);
      expect(notify.cancelNotification).toHaveBeenCalledWith("task-reminder-task-completed-1");
      expect(notify.scheduleNotificationAt).not.toHaveBeenCalled();
    });

    it("cancels active notification when reminder is disabled", async () => {
      const task = {
        id: "task-no-reminder",
        title: "No Reminder Task",
        reminder_at: null,
        reminder_plan: null,
        completed: false,
      };

      const scheduled = await syncNativeTaskReminder(task);
      expect(scheduled).toBe(false);
      expect(notify.cancelNotification).toHaveBeenCalledWith("task-reminder-task-no-reminder");
      expect(notify.scheduleNotificationAt).not.toHaveBeenCalled();
    });

    it("uses snooze_until as the scheduled trigger if task is snoozed", async () => {
      const task = {
        id: "task-snoozed-1",
        title: "Snoozed Task",
        reminder_at: "2026-10-01T09:00:00.000Z",
        completed: false,
        reminder_plan: {
          ...createDefaultReminderPlan("2026-10-01T09:00:00.000Z"),
          status: "snoozed" as const,
          snooze_until: "2026-10-01T09:45:00.000Z",
        },
      };

      await syncNativeTaskReminder(task);
      expect(notify.cancelNotification).toHaveBeenCalledWith("task-reminder-task-snoozed-1");
      expect(notify.scheduleNotificationAt).toHaveBeenCalledWith(
        "⏰ یادآور تسک",
        "Snoozed Task",
        "task-reminder-task-snoozed-1",
        new Date("2026-10-01T09:45:00.000Z")
      );
    });
  });

  describe("7. Timezone Safety & Date Parsing", () => {
    it("converts ISO date to local input string without UTC hour slicing shifts", () => {
      const localDate = new Date(2026, 8, 25, 14, 30); // 2026-09-25 14:30 Local
      const iso = localDate.toISOString();

      const inputStr = toLocalDatetimeInputString(iso);
      expect(inputStr).toBe("2026-09-25T14:30");
    });

    it("parses local input string back to valid ISO matching local time", () => {
      const inputStr = "2026-09-25T14:30";
      const iso = parseLocalDateFromInput(inputStr);
      expect(iso).not.toBeNull();

      const d = new Date(iso!);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // September (0-indexed)
      expect(d.getDate()).toBe(25);
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
    });

    it("handles null and invalid inputs gracefully", () => {
      expect(toLocalDatetimeInputString(null)).toBe("");
      expect(toLocalDatetimeInputString(undefined)).toBe("");
      expect(toLocalDatetimeInputString("invalid-date")).toBe("");

      expect(parseLocalDateFromInput(null)).toBeNull();
      expect(parseLocalDateFromInput("")).toBeNull();
      expect(parseLocalDateFromInput("bad-format")).toBeNull();
    });
  });
});
