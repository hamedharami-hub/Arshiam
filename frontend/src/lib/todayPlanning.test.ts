import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string } },
  bindingOptions: null as null | {
    read: () => { updatedAt: number; data: unknown } | null;
    apply: (data: unknown, updatedAt: number, local: { updatedAt: number; data: unknown } | null) => void;
    reconcilePending: (remote: { updatedAt: number; data: unknown }, local: { updatedAt: number; data: unknown }) => { updatedAt: number; data: unknown } | null;
    onCloudInitialized: (remote: { updatedAt: number; data: unknown }) => void;
  },
}));

vi.mock("./firebase", () => ({ auth: mocks.auth }));
vi.mock("./cloudStateSync", () => ({
  bindCloudState: vi.fn((_uid: string, _name: string, options: typeof mocks.bindingOptions) => {
    mocks.bindingOptions = options;
    return { push: vi.fn(), stop: vi.fn() };
  }),
}));

import {
  clearNextTaskIf,
  countActiveWip,
  DEFAULT_TODAY_PLANNING,
  getNextTaskIdForDay,
  isTaskEligibleForNext,
  isTaskImportantForDay,
  isTaskScheduledInFuture,
  readTodayPlanningSnapshot,
  setNextTaskForDay,
  shouldClearInvalidNextTask,
  shouldWarnWipStart,
  subscribeTodayPlanning,
  toggleImportantTaskForDay,
  updateTodayPlanning,
} from "./todayPlanning";

const makeTask = (id: string, status: string = "todo", extra: Partial<Task> = {}): Task => ({
  id, title: id, priority: "none", completed: false, status: status as Task["status"], ...extra,
});

describe("today planning preferences", () => {
  beforeEach(() => {
    mocks.auth.currentUser = null;
    mocks.bindingOptions = null;
  });

  it("starts with no selected task, WIP off and the suggested limit of three", () => {
    expect(DEFAULT_TODAY_PLANNING).toMatchObject({ nextTaskId: null, nextTaskDate: null, wipEnabled: false, wipLimit: 3 });
    expect(getNextTaskIdForDay(DEFAULT_TODAY_PLANNING, "2026-10-05")).toBeNull();
  });

  it("keeps two accounts with identical task ids isolated and supports replace and clear", () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const firstUid = `planning-a-${suffix}`;
    const secondUid = `planning-b-${suffix}`;
    updateTodayPlanning(firstUid, current => setNextTaskForDay(current, "same-task-id", "2026-10-05"));
    updateTodayPlanning(firstUid, current => setNextTaskForDay(current, "replacement", "2026-10-05"));
    updateTodayPlanning(secondUid, current => setNextTaskForDay(current, "same-task-id", "2026-10-05"));

    expect(readTodayPlanningSnapshot(firstUid)?.data.nextTaskId).toBe("replacement");
    expect(readTodayPlanningSnapshot(secondUid)?.data.nextTaskId).toBe("same-task-id");
    expect(getNextTaskIdForDay(readTodayPlanningSnapshot(firstUid)!.data, "2026-10-06")).toBeNull();

    updateTodayPlanning(firstUid, current => setNextTaskForDay(current, null, "2026-10-05"));
    expect(readTodayPlanningSnapshot(firstUid)?.data.nextTaskId).toBeNull();
  });

  it("does not let an invalidation for the old selection clear a newer replacement", () => {
    const uid = `planning-cas-${Date.now()}-${Math.random()}`;
    updateTodayPlanning(uid, current => setNextTaskForDay(current, "task-a", "2026-10-05"));
    updateTodayPlanning(uid, current => setNextTaskForDay(current, "task-b", "2026-10-05"));
    clearNextTaskIf(uid, "task-a", "2026-10-05");
    expect(readTodayPlanningSnapshot(uid)?.data.nextTaskId).toBe("task-b");
  });

  it("replays a pre-hydration WIP edit over cloud state so unrelated cloud selections survive", () => {
    const uid = `planning-hydration-${Date.now()}-${Math.random()}`;
    mocks.auth.currentUser = { uid };
    const unsubscribe = subscribeTodayPlanning(uid, () => {});
    updateTodayPlanning(uid, current => ({ ...current, wipEnabled: true }));

    const binding = mocks.bindingOptions;
    expect(binding).not.toBeNull();
    const local = binding!.read()!;
    const remote = {
      updatedAt: 99,
      data: {
        nextTaskId: "cloud-next",
        nextTaskDate: "2026-10-05",
        importantByDay: { "2026-10-05": ["cloud-important"] },
        wipEnabled: false,
        wipLimit: 4,
      },
    };
    const rebased = binding!.reconcilePending(remote, local);
    expect(rebased).not.toBeNull();
    binding!.apply(rebased!.data, rebased!.updatedAt, local);
    binding!.onCloudInitialized(remote);

    expect(rebased!.data).toMatchObject({
      nextTaskId: "cloud-next",
      nextTaskDate: "2026-10-05",
      importantByDay: { "2026-10-05": ["cloud-important"] },
      wipEnabled: true,
      wipLimit: 4,
    });
    expect(readTodayPlanningSnapshot(uid)?.data).toMatchObject(rebased!.data as object);
    unsubscribe();
  });

  it("preserves a newer cloud choice when rebasing a conditional invalidation", () => {
    const uid = `planning-clear-cas-${Date.now()}-${Math.random()}`;
    const today = "2026-10-05";
    const localData = setNextTaskForDay(DEFAULT_TODAY_PLANNING, "task-a", today);
    localStorage.setItem(`arshnaz:today-planning:v1:${uid}`, JSON.stringify({ updatedAt: 5, data: localData }));
    mocks.auth.currentUser = { uid };
    const unsubscribe = subscribeTodayPlanning(uid, () => {});
    clearNextTaskIf(uid, "task-a", today);

    const binding = mocks.bindingOptions!;
    const local = binding.read()!;
    const remote = { updatedAt: 99, data: setNextTaskForDay(DEFAULT_TODAY_PLANNING, "task-b", today) };
    const rebased = binding.reconcilePending(remote, local);

    expect(rebased?.data).toMatchObject({ nextTaskId: "task-b", nextTaskDate: today });
    unsubscribe();
  });

  it("allows multiple important tasks per calendar day without carrying marks into another day", () => {
    let data = toggleImportantTaskForDay(DEFAULT_TODAY_PLANNING, "a", "2026-10-05");
    data = toggleImportantTaskForDay(data, "b", "2026-10-05");
    expect(data.importantByDay["2026-10-05"]).toEqual(["a", "b"]);
    expect(isTaskImportantForDay(data, "a", "2026-10-05")).toBe(true);
    expect(isTaskImportantForDay(data, "a", "2026-10-06")).toBe(false);
    data = toggleImportantTaskForDay(data, "a", "2026-10-05");
    expect(data.importantByDay["2026-10-05"]).toEqual(["b"]);
  });

  it("rejects completed, wont-do and waiting tasks as next task candidates", () => {
    expect(isTaskEligibleForNext(makeTask("todo"))).toBe(true);
    expect(isTaskEligibleForNext(makeTask("doing", "in_progress"))).toBe(true);
    expect(isTaskEligibleForNext(makeTask("done", "done", { completed: true }))).toBe(false);
    expect(isTaskEligibleForNext(makeTask("wont", "wont_do"))).toBe(false);
    expect(isTaskEligibleForNext(makeTask("waiting", "waiting"))).toBe(false);
  });

  it("keeps missing selections while task data is offline or cache-only, then clears only with authoritative invalid data", () => {
    expect(shouldClearInvalidNextTask("task-a", [], false)).toBe(false);
    expect(shouldClearInvalidNextTask("task-a", [], true)).toBe(true);
    expect(shouldClearInvalidNextTask("task-a", [makeTask("task-a")], true)).toBe(false);
    expect(shouldClearInvalidNextTask("task-a", [makeTask("task-a", "waiting")], true)).toBe(true);
  });

  it("requires a future-date decision without changing the task schedule", () => {
    const future = makeTask("future", "todo", { schedule_v: 2, work_date: "2026-10-08" });
    expect(isTaskScheduledInFuture(future, "2026-10-05")).toBe(true);
    expect(future.work_date).toBe("2026-10-08");
    expect(isTaskScheduledInFuture(makeTask("today", "todo", { schedule_v: 2, work_date: "2026-10-05" }), "2026-10-05")).toBe(false);
    const futureTimeToday = makeTask("future-time", "todo", { schedule_v: 2, work_date: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
    expect(isTaskScheduledInFuture(futureTimeToday, new Date().toISOString().slice(0, 10))).toBe(true);
  });

  it("counts all open executable in-progress tasks and only raises a soft threshold warning", () => {
    const tasks = [
      makeTask("parent", "in_progress"),
      makeTask("child", "in_progress", { parent_id: "parent" }),
      makeTask("other-day", "in_progress", { work_date: "2026-10-08" }),
      makeTask("done", "done", { completed: true }),
      makeTask("waiting", "waiting"),
    ];
    const current = countActiveWip(tasks);
    expect(current).toBe(2);
    expect(shouldWarnWipStart(true, current, 2, makeTask("new"))).toBe(true);
    expect(shouldWarnWipStart(false, current, 2, makeTask("new"))).toBe(false);
    expect(shouldWarnWipStart(true, current, 3, makeTask("new"))).toBe(false);
  });
});
