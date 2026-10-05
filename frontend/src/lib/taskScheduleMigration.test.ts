import { beforeEach, describe, expect, it, vi } from "vitest";

const persistTask = vi.fn();
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: (...args: unknown[]) => persistTask(...args) }));

import { migrateTaskSchedules, pendingScheduleMigrations, resetScheduleMigrationState } from "./taskScheduleMigration";
import { readSchedule, SCHEDULE_VERSION } from "./taskSchedule";
import type { Task } from "./taskTypes";

const legacy = (over: Partial<Task>): Task => ({ id: "t1", title: "Legacy", ...over } as Task);

describe("automatic schedule migration", () => {
  beforeEach(() => {
    resetScheduleMigrationState();
    persistTask.mockReset();
    persistTask.mockResolvedValue("saved");
  });

  it("converts a legacy due_date task once and keeps the old values as a backup", async () => {
    const task = legacy({ due_date: "2026-03-10", start_at: "2026-03-10T09:00:00.000Z", end_at: "2026-03-10T10:00:00.000Z" } as Partial<Task>);
    const saved = await migrateTaskSchedules("u1", [task]);
    expect(saved).toBe(1);
    const [, patch] = persistTask.mock.calls[0];
    expect(patch.schedule_v).toBe(SCHEDULE_VERSION);
    expect(patch.work_date).toBe("2026-03-10");
    expect(patch.due_date).toBeNull();
    expect(patch.start_at).toBeNull();
    expect(patch.schedule_legacy.fields.due_date).toBe("2026-03-10");
    expect(patch.schedule_legacy.fields.start_at).toBe("2026-03-10T09:00:00.000Z");

    // Second snapshot: no duplicate write.
    expect(await migrateTaskSchedules("u1", [task])).toBe(0);
    expect(persistTask).toHaveBeenCalledTimes(1);
  });

  it("never touches tasks already on v2 (a cleared schedule cannot come back)", async () => {
    const cleared = legacy({ schedule_v: SCHEDULE_VERSION, work_date: null, due_date: "2026-01-01" } as Partial<Task>);
    expect(pendingScheduleMigrations([cleared])).toHaveLength(0);
    expect(readSchedule(cleared).kind).toBe("none");
    expect(await migrateTaskSchedules("u1", [cleared])).toBe(0);
    expect(persistTask).not.toHaveBeenCalled();
  });

  it("retries a task whose write failed on the next snapshot", async () => {
    persistTask.mockResolvedValueOnce("failed");
    const task = legacy({ due_date: "2026-03-10" } as Partial<Task>);
    expect(await migrateTaskSchedules("u1", [task])).toBe(0);
    expect(await migrateTaskSchedules("u1", [task])).toBe(1);
    expect(persistTask).toHaveBeenCalledTimes(2);
  });

  it("migrates a legacy plan bucket into a period schedule", async () => {
    const task = legacy({ planning_horizon: "month", planning_start: "2026-03-01", planning_end: "2026-03-31" } as Partial<Task>);
    await migrateTaskSchedules("u1", [task]);
    const [, patch] = persistTask.mock.calls[0];
    expect(patch.work_date).toBeNull();
    expect(patch.planning_horizon).toBe("month");
    expect(patch.planning_start).toBe("2026-03-01");
    expect(patch.planning_end).toBe("2026-03-31");
  });
});
