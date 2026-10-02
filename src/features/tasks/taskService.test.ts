import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDocs } from "firebase/firestore";
import type { Task } from "@/lib/taskTypes";
import { extractTasksFromCache } from "./taskCache";

const mocks = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  cacheGet: vi.fn(async (key: string) => mocks.cache.get(key)),
  cacheSet: vi.fn(async (key: string, value: unknown) => { mocks.cache.set(key, value); }),
  enqueueOps: vi.fn(),
  canReplayForOwner: (operation: { ownerId?: string; payload?: unknown; match?: Record<string, unknown> }, userId?: string) => {
    if (!userId) return false;
    const payload = operation.payload && typeof operation.payload === "object"
      ? operation.payload as Record<string, unknown>
      : undefined;
    const claims = [operation.ownerId, payload?.user_id, payload?.userId, operation.match?.user_id]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    return claims.length > 0 && claims.every((claim) => claim === userId);
  },
  writeBatch: vi.fn(),
  doc: vi.fn((...args: unknown[]) => args),
  syncAndroidWidget: vi.fn(),
  taskKnowledgeLinks: [] as Array<{ id: string; user_id: string; task_id: string }>,
  taskKnowledgeLinkReadError: false,
  getPendingOps: vi.fn().mockResolvedValue([]),
  subscribeTasks: vi.fn(),
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
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({
          in: async () => ({
            data: mocks.taskKnowledgeLinkReadError ? null :
              table === "task_knowledge_links" ? mocks.taskKnowledgeLinks : [],
            error: mocks.taskKnowledgeLinkReadError ? new Error("read failed") : null,
          }),
        }),
      }),
      delete: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    })),
  },
}));
vi.mock("@/lib/offlineQueue", () => ({
  cacheGet: (...args: unknown[]) => mocks.cacheGet(...args as [string]),
  cacheSet: (...args: unknown[]) => mocks.cacheSet(...args as [string, unknown]),
  enqueueOps: mocks.enqueueOps,
  canReplayForOwner: mocks.canReplayForOwner,
  getPendingOps: mocks.getPendingOps,
}));
vi.mock("@/lib/firestoreDataService", () => ({
  subscribeTasks: mocks.subscribeTasks,
  upsertTask: vi.fn(),
}));
vi.mock("@/lib/androidWidget", () => ({ syncAndroidWidget: mocks.syncAndroidWidget }));

import {
  applyPendingTaskOperations,
  deleteTaskCascade,
  getCachedTasks,
  fetchTasks,
  subscribeToTasks,
  taskMemoryCache,
} from "./taskService";

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
    mocks.cache.clear();
    taskMemoryCache.clear();
    taskMemoryCache.set("task-owner", originalTasks);
    mocks.cache.set("tasks:all:task-owner", originalTasks);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    mocks.enqueueOps.mockResolvedValue(true);
    mocks.taskKnowledgeLinks = [];
    mocks.taskKnowledgeLinkReadError = false;
    mocks.getPendingOps.mockResolvedValue([]);
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
      { ownerId: "task-owner", table: "task_knowledge_links", op: "delete", match: { task_id: "root" } },
      { ownerId: "task-owner", table: "tasks", op: "delete", match: { id: "child" } },
      { ownerId: "task-owner", table: "task_tags", op: "delete", match: { task_id: "child" } },
      { ownerId: "task-owner", table: "task_knowledge_links", op: "delete", match: { task_id: "child" } },
    ]);
    expect(taskMemoryCache.get("task-owner")).toEqual(originalTasks);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it("reloads a recently edited task from durable cache instead of stale memory", async () => {
    const edited = { ...task("root"), priority: "high" as const, due_date: "2026-09-30T10:00:00.000Z" };
    mocks.cache.set("tasks:all:task-owner", { tasks: [edited], cachedAt: Date.now() });

    expect(await getCachedTasks("task-owner")).toEqual([edited]);
    expect(taskMemoryCache.get("task-owner")).toEqual([edited]);
  });

  it("queues the full cascade before removing it from the offline task cache", async () => {
    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result).toEqual({ success: true, deletedIds: ["root", "child"] });
    expect(taskMemoryCache.get("task-owner")).toEqual([task("other")]);
    expect(mocks.cacheSet).toHaveBeenCalledTimes(3);
  });

  it("projects only queued task changes owned by the active account", async () => {
    mocks.getPendingOps.mockResolvedValue([
      { ownerId: "task-owner", table: "tasks", op: "upsert", payload: task("local"), match: { id: "local" } },
      { ownerId: "another-owner", table: "tasks", op: "upsert", payload: task("foreign"), match: { id: "foreign" } },
    ]);

    await expect(applyPendingTaskOperations([task("remote")], "task-owner"))
      .resolves.toEqual([task("local"), task("remote")]);
  });

  it("projects a legacy queued task only when its payload identifies this account", async () => {
    mocks.getPendingOps.mockResolvedValue([
      { table: "tasks", op: "upsert", payload: task("legacy"), match: { id: "legacy" } },
      { table: "tasks", op: "upsert", payload: { ...task("foreign"), user_id: "other-owner" }, match: { id: "foreign" } },
    ]);

    await expect(applyPendingTaskOperations([task("remote")], "task-owner"))
      .resolves.toEqual([task("legacy"), task("remote")]);
  });

  it("projects only this account's pending operations into realtime snapshots and ignores post-unsubscribe callbacks", async () => {
    mocks.getPendingOps.mockResolvedValue([
      { ownerId: "task-owner", table: "tasks", op: "delete", match: { id: "child" } },
      { ownerId: "another-owner", table: "tasks", op: "upsert", payload: task("foreign"), match: { id: "foreign" } },
    ]);
    let emitSnapshot!: (tasks: Task[]) => void;
    const firestoreUnsubscribe = vi.fn();
    mocks.subscribeTasks.mockImplementationOnce((_userId: string, onUpdate: typeof emitSnapshot) => {
      emitSnapshot = onUpdate;
      return firestoreUnsubscribe;
    });
    const onUpdate = vi.fn();

    const unsubscribe = subscribeToTasks("task-owner", onUpdate);
    emitSnapshot(originalTasks);
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
    expect(onUpdate).toHaveBeenLastCalledWith([task("root"), task("other")]);

    unsubscribe();
    emitSnapshot([task("late-snapshot")]);
    await Promise.resolve();
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(firestoreUnsubscribe).toHaveBeenCalledOnce();
  });

  it("preserves a task added only to persistent cache while the cascade waits for its durable queue", async () => {
    let resolveQueue!: (accepted: boolean) => void;
    mocks.enqueueOps.mockImplementation(() => new Promise<boolean>((resolve) => {
      resolveQueue = resolve;
    }));

    const deletion = deleteTaskCascade("task-owner", "root", originalTasks);
    await vi.waitFor(() => expect(mocks.enqueueOps).toHaveBeenCalledOnce());
    mocks.cache.set("tasks:all:task-owner", [...originalTasks, task("new-arrival")]);
    resolveQueue(true);

    expect(await deletion).toEqual({ success: true, deletedIds: ["root", "child"] });
    expect(taskMemoryCache.get("task-owner")).toEqual([task("other"), task("new-arrival")]);
    expect(extractTasksFromCache(mocks.cache.get("tasks:all:task-owner")))
      .toEqual([task("other"), task("new-arrival")]);
  });

  it("uses an atomic Firestore batch for the online task portion", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    mocks.taskKnowledgeLinks = [{ id: "link-child", user_id: "task-owner", task_id: "child" }];
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mocks.writeBatch.mockReturnValue(batch);

    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result.success).toBe(true);
    expect(batch.delete).toHaveBeenCalledTimes(3);
    expect(batch.delete).toHaveBeenCalledWith([{}, "users", "task-owner", "task_knowledge_links", "link-child"]);
    expect(batch.commit).toHaveBeenCalledOnce();
    expect(mocks.enqueueOps).not.toHaveBeenCalled();
  });

  it("queues task-scoped relation cleanup when related links cannot be read online", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    mocks.taskKnowledgeLinkReadError = true;

    const result = await deleteTaskCascade("task-owner", "root", originalTasks);

    expect(result).toEqual({ success: true, deletedIds: ["root", "child"] });
    expect(mocks.enqueueOps).toHaveBeenCalledWith(expect.arrayContaining([
      { ownerId: "task-owner", table: "task_knowledge_links", op: "delete", match: { task_id: "root" } },
      { ownerId: "task-owner", table: "task_knowledge_links", op: "delete", match: { task_id: "child" } },
    ]));
    expect(mocks.writeBatch).not.toHaveBeenCalled();
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

describe("fetchTasks cache completeness", () => {
  it("preserves known tasks for an offline partial fetch and accepts an empty server list", async () => {
    const owner = "offline-fetch-owner";
    mocks.cache.set(`tasks:all:${owner}`, [task("known")]);
    mocks.getPendingOps.mockResolvedValue([]);
    vi.mocked(getDocs).mockResolvedValueOnce({ metadata: { fromCache: true }, docs: [] } as any);
    expect((await fetchTasks(owner)).map(task => task.id)).toEqual(["known"]);
    vi.mocked(getDocs).mockResolvedValueOnce({ metadata: { fromCache: false }, docs: [] } as any);
    expect(await fetchTasks(owner)).toEqual([]);
  });
});
