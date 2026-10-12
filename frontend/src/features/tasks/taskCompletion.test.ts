import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task, TaskOutcome } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), outcomes: vi.fn(), watering: vi.fn(), recurring: vi.fn(), advance: vi.fn() }));
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: mocks.persist }));
vi.mock("@/lib/taskOutcomes", () => ({ listTaskOutcomes: mocks.outcomes }));
vi.mock("@/lib/recurringTaskService", () => ({ isRecurringTask: mocks.recurring, advanceRecurringTask: mocks.advance }));
vi.mock("@/lib/taskStudyService", () => ({ isLeitnerStudyTask: () => false }));
vi.mock("@/lib/taskActivity", () => ({ logTaskActivity: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/garden", () => ({ awardTaskWatering: mocks.watering }));

import { setTaskCompletion } from "./taskCompletion";
const task = { id: "task", title: "Task", completed: false } as Task;
const outcome = { id: "outcome", task_id: "task", actions: [] } as unknown as TaskOutcome;

describe("completion outcome safety", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.persist.mockResolvedValue("saved"); mocks.recurring.mockReturnValue(false); });
  it("keeps the task open when outcome fetching throws", async () => {
    mocks.outcomes.mockRejectedValueOnce(new Error("offline"));
    expect(await setTaskCompletion("owner", task, true)).toEqual({ kind: "failed" });
    expect(mocks.persist).not.toHaveBeenCalled();
    expect(mocks.watering).not.toHaveBeenCalled();
  });
  it("pauses instead of silently completing a task with outcomes", async () => {
    mocks.outcomes.mockResolvedValueOnce([outcome]);
    expect(await setTaskCompletion("owner", task, true)).toEqual({ kind: "outcomes", outcomes: [outcome] });
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("completes only after explicit picker confirmation", async () => {
    expect((await setTaskCompletion("owner", task, true, { outcomeConfirmed: true })).kind).toBe("saved");
    expect(mocks.outcomes).not.toHaveBeenCalled();
  });
  it("does not need outcome lookup to reopen", async () => {
    expect((await setTaskCompletion("owner", task, false)).kind).toBe("saved");
    expect(mocks.outcomes).not.toHaveBeenCalled();
    expect(mocks.watering).not.toHaveBeenCalled();
  });
  it.each(["failed", undefined, false])("never rewards an unsuccessful persistence receipt %s", async (status) => {
    mocks.persist.mockResolvedValueOnce(status);
    expect(await setTaskCompletion("owner", task, true, { outcomeConfirmed: true })).toEqual({ kind: "failed" });
    expect(mocks.watering).not.toHaveBeenCalled();
  });
  it("never rewards a thrown persistence error", async () => {
    mocks.persist.mockRejectedValueOnce(new Error("denied"));
    expect(await setTaskCompletion("owner", task, true, { outcomeConfirmed: true })).toEqual({ kind: "failed" });
    expect(mocks.watering).not.toHaveBeenCalled();
  });
  it.each(["saved", "queued"])("rewards only after a confirmed %s receipt", async (status) => {
    let resolve!: (value: string) => void;
    mocks.persist.mockImplementationOnce(() => new Promise<string>(accept => { resolve = accept; }));
    const completion = setTaskCompletion("owner", task, true, { outcomeConfirmed: true });
    expect(mocks.watering).not.toHaveBeenCalled();
    resolve(status);
    expect((await completion).kind).toBe(status);
    expect(mocks.watering).toHaveBeenCalledOnce();
  });
  it("does not reward an already completed row", async () => {
    await setTaskCompletion("owner", { ...task, completed: true }, true, { outcomeConfirmed: true });
    expect(mocks.watering).not.toHaveBeenCalled();
  });
  it.each([{ success: false }, { success: true }])("does not reward recurrence without a successful patch receipt %j", async (receipt) => {
    mocks.recurring.mockReturnValue(true);
    mocks.advance.mockResolvedValueOnce(receipt);
    expect(await setTaskCompletion("owner", task, true)).toEqual({ kind: "failed" });
    expect(mocks.watering).not.toHaveBeenCalled();
  });
  it("rewards a recurring occurrence only once after success, with the next occurrence independently eligible", async () => {
    mocks.recurring.mockReturnValue(true);
    const recurring = { ...task, id: "reward-recurrence", work_date: "2026-10-13" };
    let resolve!: (receipt: unknown) => void;
    mocks.advance.mockImplementationOnce(() => new Promise(accept => { resolve = accept; }));
    const completion = setTaskCompletion("owner", recurring, true);
    expect(mocks.watering).not.toHaveBeenCalled();
    const receipt = { success: true, patch: { id: recurring.id, work_date: "2026-10-14" } };
    resolve(receipt);
    expect((await completion).kind).toBe("advanced");
    mocks.advance.mockResolvedValue(receipt);
    await setTaskCompletion("owner", recurring, true);
    expect(mocks.watering).toHaveBeenCalledOnce();
    await setTaskCompletion("owner", { ...recurring, work_date: "2026-10-14" }, true);
    expect(mocks.watering).toHaveBeenCalledTimes(2);
  });
  it("never rewards when recurring advancement throws", async () => {
    mocks.recurring.mockReturnValue(true);
    mocks.advance.mockRejectedValueOnce(new Error("transaction failed"));
    expect(await setTaskCompletion("owner", task, true)).toEqual({ kind: "failed" });
    expect(mocks.watering).not.toHaveBeenCalled();
  });
});
