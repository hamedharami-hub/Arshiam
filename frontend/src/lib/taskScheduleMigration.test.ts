import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), writes: [] as string[] }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  deleteField: () => ({ __deleteField: true }),
  runTransaction: async (_db: unknown, body: (tx: unknown) => Promise<unknown>) => {
    const pending = new Map<string, Record<string, unknown>>();
    const tx = {
      get: async (ref: { path: string }) => ({ exists: () => mocks.docs.has(ref.path), data: () => mocks.docs.get(ref.path) }),
      set: (ref: { path: string }, value: Record<string, unknown>) => { pending.set(ref.path, { ...value }); },
      update: (ref: { path: string }, patch: Record<string, unknown>) => {
        const current = { ...(mocks.docs.get(ref.path) || {}), ...(pending.get(ref.path) || {}) };
        for (const [key, value] of Object.entries(patch)) {
          if ((value as { __deleteField?: boolean })?.__deleteField) delete current[key];
          else current[key] = value;
        }
        pending.set(ref.path, current);
      },
    };
    const result = await body(tx);
    for (const [path, value] of pending) { mocks.docs.set(path, value); mocks.writes.push(path); }
    return result;
  },
}));

import { applyTaskScheduleMigration, previewTaskScheduleMigration, rollbackTaskScheduleMigration, taskScheduleFingerprint } from "./taskScheduleMigration";
import { SCHEDULE_VERSION } from "./taskSchedule";
import type { Task } from "./taskTypes";

const legacyTask = (id: string, over: Partial<Task> = {}): Task => ({ id, title: "Read source", due_date: "2026-03-10", ...over } as Task);

describe("schedule migration dry run and compare-and-set", () => {
  beforeEach(() => { mocks.docs.clear(); mocks.writes.length = 0; Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });

  it("fingerprints missing, null, and timestamp/version metadata distinctly", () => {
    const missing = legacyTask("t1");
    const nulled = legacyTask("t1", { due_date: null } as Partial<Task>);
    expect(taskScheduleFingerprint("u1", "t1", missing)).not.toBe(taskScheduleFingerprint("u1", "t1", nulled));
    expect(taskScheduleFingerprint("u1", "t1", missing)).not.toBe(taskScheduleFingerprint("u2", "t1", missing));
    expect(taskScheduleFingerprint("u1", "t1", missing)).not.toBe(taskScheduleFingerprint("u1", "t1", legacyTask("t1", { updated_at: "v2" } as Partial<Task>)));
    expect(taskScheduleFingerprint("u1", "t1", missing)).not.toBe(taskScheduleFingerprint("u1", "t1", legacyTask("t1", { schedule_timezone: "America/Toronto" } as Partial<Task>)));
    expect(taskScheduleFingerprint("u1", "t1", missing)).not.toBe(taskScheduleFingerprint("u1", "t1", legacyTask("t1", { planning_calendar: "gregorian" } as Partial<Task>)));
  });

  it("dry-runs only and preserves a versioned backup on explicit apply", async () => {
    const task = legacyTask("t1", { updated_at: "v1" } as Partial<Task>);
    mocks.docs.set("users/u1/tasks/t1", task as Record<string, unknown>);
    const [plan] = previewTaskScheduleMigration("u1", [task]);
    expect(plan.state).toBe("ready");
    expect(mocks.writes).toHaveLength(0);
    expect(await applyTaskScheduleMigration(plan)).toBe("saved");
    const migrated = mocks.docs.get("users/u1/tasks/t1")!;
    expect(migrated.schedule_v).toBe(SCHEDULE_VERSION);
    expect(migrated.work_date).toBe("2026-03-10");
    const backup = mocks.docs.get(`users/u1/schedule_migration_backups/${plan.backupId}`)!;
    expect(backup).toMatchObject({ version: 1, uid: "u1", task_id: "t1", fingerprint: plan.fingerprint });
    expect((backup.fields as Record<string, { present: boolean; value?: unknown }>).due_date).toEqual({ present: true, value: "2026-03-10" });
  });

  it("does not overwrite a task edited after its dry run", async () => {
    const task = legacyTask("t1", { updated_at: "v1" } as Partial<Task>);
    mocks.docs.set("users/u1/tasks/t1", task as Record<string, unknown>);
    const [plan] = previewTaskScheduleMigration("u1", [task]);
    mocks.docs.set("users/u1/tasks/t1", { ...task, title: "New title", updated_at: "v2" } as Record<string, unknown>);
    expect(await applyTaskScheduleMigration(plan)).toBe("conflict");
    expect(mocks.docs.get("users/u1/tasks/t1")?.title).toBe("New title");
    expect(mocks.docs.has(`users/u1/schedule_migration_backups/${plan.backupId}`)).toBe(false);
  });

  it("keeps ambiguous time and out-of-period plans blocked for an explicit decision", () => {
    const edge = legacyTask("edge", { due_date: "2026-03-10T00:00:00.000Z", is_exact: false } as Partial<Task>);
    const [edgePlan] = previewTaskScheduleMigration("u1", [edge]);
    expect(edgePlan.state).toBe("conflict");
    expect(edgePlan.issues).toContain("ambiguous_legacy_time");
    expect(edgePlan.patch).toBeNull();

    const outside = legacyTask("outside", { due_date: "2026-04-10", is_exact: true, planning_horizon: "month", planning_start: "2026-03-01", planning_end: "2026-03-31" } as Partial<Task>);
    const [outsidePlan] = previewTaskScheduleMigration("u1", [outside]);
    expect(outsidePlan.state).toBe("conflict");
    expect(outsidePlan.issues).toContain("outside_period");
  });

  it("fails closed for malformed values and disagreeing active plan sources", () => {
    const malformed = legacyTask("malformed", { work_date: "not-a-date" } as Partial<Task>);
    const [malformedPlan] = previewTaskScheduleMigration("u1", [malformed]);
    expect(malformedPlan.state).toBe("conflict");
    expect(malformedPlan.issues).toContain("invalid_schedule_value");
    expect(malformedPlan.patch).toBeNull();

    const disagreeingPeriods = legacyTask("two-plans", {
      planning_horizon: "month", planning_start: "2026-03-01", planning_end: "2026-03-31",
      horizon: "week", period_start: "2026-03-09", period_end: "2026-03-15",
    } as Partial<Task>);
    const [periodPlan] = previewTaskScheduleMigration("u1", [disagreeingPeriods]);
    expect(periodPlan.state).toBe("conflict");
    expect(periodPlan.issues).toContain("conflicting_period_values");
  });

  it("isolates identical task ids across users and is idempotent for a v2 task", async () => {
    const a = legacyTask("same"), b = legacyTask("same", { title: "Other account", due_date: "2026-03-11" } as Partial<Task>);
    mocks.docs.set("users/u1/tasks/same", a as Record<string, unknown>);
    mocks.docs.set("users/u2/tasks/same", b as Record<string, unknown>);
    const [planA] = previewTaskScheduleMigration("u1", [a]);
    const [planB] = previewTaskScheduleMigration("u2", [b]);
    expect(planA.fingerprint).not.toBe(planB.fingerprint);
    expect(await applyTaskScheduleMigration(planA)).toBe("saved");
    expect(await applyTaskScheduleMigration(planB)).toBe("saved");
    const afterFirst = { ...mocks.docs.get("users/u1/tasks/same")! };
    const [rerun] = previewTaskScheduleMigration("u1", [afterFirst as Task]);
    expect(rerun.state).toBe("already_v2");
    expect(await applyTaskScheduleMigration(rerun)).toBe("already_migrated");
    expect(mocks.docs.get("users/u1/tasks/same")).toEqual(afterFirst);
    expect(mocks.docs.has(`users/u1/schedule_migration_backups/${planA.backupId}`)).toBe(true);
    expect(mocks.docs.has(`users/u2/schedule_migration_backups/${planB.backupId}`)).toBe(true);
  });

  it("refuses rollback after a newer edit and restores only unchanged migration output", async () => {
    const task = legacyTask("t1", { updated_at: "v1" } as Partial<Task>);
    mocks.docs.set("users/u1/tasks/t1", task as Record<string, unknown>);
    const [plan] = previewTaskScheduleMigration("u1", [task]);
    expect(await applyTaskScheduleMigration(plan)).toBe("saved");
    const backupPath = `users/u1/schedule_migration_backups/${plan.backupId}`;
    const migrated = mocks.docs.get("users/u1/tasks/t1")!;
    const edit = { ...migrated, updated_at: "user-edit" };
    mocks.docs.set("users/u1/tasks/t1", edit);
    expect(await rollbackTaskScheduleMigration("u1", plan.backupId)).toBe("conflict");
    expect(mocks.docs.get("users/u1/tasks/t1")?.updated_at).toBe("user-edit");

    mocks.docs.set("users/u1/tasks/t1", migrated);
    expect(await rollbackTaskScheduleMigration("u1", plan.backupId)).toBe("saved");
    expect(mocks.docs.get("users/u1/tasks/t1")?.due_date).toBe("2026-03-10");
    expect(mocks.docs.get("users/u1/tasks/t1")?.schedule_v).toBeUndefined();
    expect(mocks.docs.has(backupPath)).toBe(true);
  });

  it("does not start a migration transaction while offline", async () => {
    const task = legacyTask("t1");
    const [plan] = previewTaskScheduleMigration("u1", [task]);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    expect(await applyTaskScheduleMigration(plan)).toBe("offline");
    expect(mocks.writes).toHaveLength(0);
  });
});
