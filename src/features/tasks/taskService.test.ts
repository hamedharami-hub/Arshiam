import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => ({
  enqueueOps: vi.fn(),
  cacheSet: vi.fn(),
  writeBatch: vi.fn(),
  doc: vi.fn((...args: unknown[]) => args),
  syncAndroidWidget: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  doc: mocks.doc,
  writeBatch: mocks.writeBatch,
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: vi.fn(() => ({
      delete: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    })),
  },
}));
vi.mock("@/lib/offlineQueue", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn((...args: unknown[]) => mocks.cacheSet(...args)),
  enqueueOps: mocks.enqueueOps,
  getPendingOps: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/firestoreDataService", () => ({
  subscribeTasks: vi.fn(),
  upsertTask: vi.fn(),
}));
vi.mock("@/lib/androidWidget", () => ({ syncAndroidWidget: mocks.syncAndroidWidget }));

import { deleteTaskCascade, taskMemoryCache } from "./taskService";

const task = (id: string, parent_id: string | null = null): Task => ({
  id,
  user_id: "task-owner",
  title: id,
  parent_id,
  completed: false,
  status: "todo",
  description: null,
  priority: "none",
  due_date: null,
  folder_id: null,
  reminder_at: null,
  recurrence: "none",
  recurrence_rule: null,
  pinned: false,
  start_at: null,
  end_at: null,
  estimated_minutes: null,
  position: 0,
});

describe("taskService cascade deletion persistence", () => {
  const originalTasks = [task("root"), task("child", "root"), task("other")];

  beforeEach(() => {
    vi.clearAllMocks();
    taskMemoryCache.clear();
    taskMemoryCache.set("task-owner", originalTasks);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    mocks.enqueueOps.mockResolvedValue(true);
    mocks.cacheSet.mockResolvedValue(undefined);
    mocks.syncAndroidWidget.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    taskMemoryCache.clear();
    vi.restoreAllMocks();
  });

  it("does not hide tasks or claim success when the offline cascade cannot be queued", async () => {
    mocks.enqueueOps.mockResolvedValue(false);

    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result).toEqual({ success: false, deletedIds: [] });
    expect(mocks.enqueueOps).toHaveBeenCalledWith([
      { ownerId: "task-owner", table: "tasks", op: "delete", match: { id: "root" } },
      { ownerId: "task-owner", table: "task_tags", op: "delete", match: { task_id: "root" } },
      { ownerId: "task-owner", table: "tasks", op: "delete", match: { id: "child" } },
      { ownerId: "task-owner", table: "task_tags", op: "delete", match: { task_id: "child" } },
    ]);
    expect(taskMemoryCache.get("task-owner")).toEqual(originalTasks);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it("queues the full cascade before removing it from the offline task cache", async () => {
    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result).toEqual({ success: true, deletedIds: ["root", "child"] });
    expect(taskMemoryCache.get("task-owner")).toEqual([task("other")]);
    expect(mocks.cacheSet).toHaveBeenCalledTimes(1);
  });

  it("uses an atomic Firestore batch for the online task portion", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mocks.writeBatch.mockReturnValue(batch);

    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result.success).toBe(true);
    expect(batch.delete).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledOnce();
    expect(mocks.enqueueOps).not.toHaveBeenCalled();
  });

  it("does not claim an online cascade succeeded when Firestore and the durable queue both fail", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const batch = { delete: vi.fn(), commit: vi.fn().mockRejectedValue(new Error("permission denied")) };
    mocks.writeBatch.mockReturnValue(batch);
    mocks.enqueueOps.mockResolvedValue(false);

    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result).toEqual({ success: false, deletedIds: [] });
    expect(taskMemoryCache.get("task-owner")).toEqual(originalTasks);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });
});
