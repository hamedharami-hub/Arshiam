import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTaskCacheEnvelope, extractTasksFromCache } from "@/features/tasks/taskCache";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => {
  const cache = new Map<string, unknown>();
  return {
    cache,
    cacheGet: vi.fn(async (key: string) => cache.get(key)),
    cacheSet: vi.fn(async (key: string, value: unknown) => { cache.set(key, value); }),
    enqueueOp: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn((...segments: string[]) => segments.join("/")),
    onSnapshot: vi.fn(),
    db: {},
  };
});

vi.mock("./firebase", () => ({
  db: mocks.db,
  collection: vi.fn(),
  doc: mocks.doc,
  setDoc: mocks.setDoc,
  deleteDoc: mocks.deleteDoc,
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: mocks.onSnapshot,
}));

vi.mock("./offlineQueue", () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
  enqueueOp: mocks.enqueueOp,
}));

import { deleteTask, persistTask, subscribeTasks, upsertNote } from "./firestoreDataService";

const cacheKey = "tasks:all:user-1";
const baseTask = {
  id: "task-1",
  user_id: "user-1",
  title: "Original title",
  priority: "medium" as const,
  completed: false,
  status: "todo" as const,
  updated_at: "2026-09-26T00:00:00.000Z",
};

describe("firestoreDataService task cache rollback", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.cacheGet.mockImplementation(async (key: string) => mocks.cache.get(key));
    mocks.cacheSet.mockImplementation(async (key: string, value: unknown) => { mocks.cache.set(key, value); });
    mocks.enqueueOp.mockReset().mockResolvedValue(false);
    mocks.setDoc.mockReset().mockResolvedValue(undefined);
    mocks.deleteDoc.mockReset().mockResolvedValue(undefined);
    mocks.doc.mockClear();
    mocks.onSnapshot.mockReset();
  });

  it("removes an optimistic new task when both Firestore and the outbox fail", async () => {
    mocks.setDoc.mockRejectedValueOnce(new Error("network down"));

    const status = await persistTask("user-1", {
      id: "task-new",
      title: "New task",
      priority: "high",
      completed: false,
      status: "todo",
    });

    expect(status).toBe("failed");
    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([]);
  });

  it("binds queued task writes and deletes to their originating account explicitly", async () => {
    mocks.setDoc.mockRejectedValueOnce(new Error("network down"));
    mocks.enqueueOp.mockResolvedValueOnce(true);

    await expect(persistTask("user-1", { id: "task-queued", title: "Queued" })).resolves.toBe("queued");
    expect(mocks.enqueueOp).toHaveBeenLastCalledWith(expect.objectContaining({
      ownerId: "user-1",
      table: "tasks",
      op: "upsert",
    }));

    mocks.deleteDoc.mockRejectedValueOnce(new Error("network down"));
    mocks.enqueueOp.mockResolvedValueOnce(true);
    await expect(deleteTask("user-1", "task-delete-queued")).resolves.toBe(true);
    expect(mocks.enqueueOp).toHaveBeenLastCalledWith({
      ownerId: "user-1",
      table: "tasks",
      op: "delete",
      match: { id: "task-delete-queued" },
    });
  });

  it("reapplies a queued task write if a realtime snapshot replaced its optimistic cache entry", async () => {
    mocks.setDoc.mockImplementationOnce(async () => {
      mocks.cache.set(cacheKey, createTaskCacheEnvelope([]));
      throw new Error("network down");
    });
    mocks.enqueueOp.mockResolvedValueOnce(true);

    await expect(persistTask("user-1", { id: "task-queued", title: "Queued title" }))
      .resolves.toBe("queued");

    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([
      expect.objectContaining({ id: "task-queued", title: "Queued title", user_id: "user-1" }),
    ]);
  });

  it("does not emit a delayed cache read after a newer realtime task snapshot", async () => {
    let resolveCache!: (value: unknown) => void;
    const delayedCache = new Promise<unknown>((resolve) => { resolveCache = resolve; });
    mocks.cacheGet.mockImplementationOnce(() => delayedCache);
    let emitSnapshot!: (snapshot: { forEach: (callback: () => void) => void }) => void;
    mocks.onSnapshot.mockImplementationOnce((_collection: unknown, next: typeof emitSnapshot) => {
      emitSnapshot = next;
      return vi.fn();
    });
    const updates: Task[][] = [];

    subscribeTasks("user-1", (tasks) => updates.push(tasks));
    emitSnapshot({ forEach: () => {} });
    expect(updates).toEqual([[]]);

    resolveCache(createTaskCacheEnvelope([baseTask]));
    await Promise.resolve();
    expect(updates).toEqual([[]]);
  });

  it("restores the previous fields after an existing task update is not saved or queued", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    mocks.setDoc.mockRejectedValueOnce(new Error("permission denied"));

    const status = await persistTask("user-1", { id: "task-1", title: "Changed title" });

    expect(status).toBe("failed");
    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([baseTask]);
  });

  it("does not overwrite a newer concurrent cache edit while rolling back a failed update", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    mocks.setDoc.mockImplementationOnce(async () => {
      const concurrent = { ...baseTask, title: "Concurrent edit" };
      mocks.cache.set(cacheKey, createTaskCacheEnvelope([concurrent]));
      throw new Error("network down");
    });

    const status = await persistTask("user-1", { id: "task-1", title: "Failed edit" });

    expect(status).toBe("failed");
    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([{
      ...baseTask,
      title: "Concurrent edit",
    }]);
  });

  it("restores a deleted task when the delete cannot be saved or queued", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    mocks.deleteDoc.mockRejectedValueOnce(new Error("network down"));

    await expect(deleteTask("user-1", "task-1")).resolves.toBe(false);

    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([baseTask]);
  });

  it("treats a thrown outbox write as failure and removes its optimistic task", async () => {
    mocks.setDoc.mockRejectedValueOnce(new Error("network down"));
    mocks.enqueueOp.mockRejectedValueOnce(new Error("device storage unavailable"));

    const status = await persistTask("user-1", {
      id: "task-new",
      title: "New task",
      priority: "high",
      completed: false,
      status: "todo",
    });

    expect(status).toBe("failed");
    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([]);
  });

  it("restores the prior notes cache when both Firestore and the outbox reject an edit", async () => {
    const notesKey = "notes:all:user-1";
    const originalNote = {
      id: "note-1", user_id: "user-1", title: "Original", content: "Saved text",
      pinned: false, updated_at: "2026-01-01T00:00:00.000Z",
    };
    mocks.cache.set(notesKey, [originalNote]);
    mocks.setDoc.mockRejectedValueOnce(new Error("network unavailable"));
    mocks.enqueueOp.mockResolvedValueOnce(false);

    await expect(upsertNote("user-1", { ...originalNote, title: "Unsaved title" })).resolves.toBe(false);

    expect(mocks.cache.get(notesKey)).toEqual([originalNote]);
  });

  it("preserves unrelated concurrent note edits while rolling back a failed field", async () => {
    const notesKey = "notes:all:user-1";
    const originalNote = {
      id: "note-1", user_id: "user-1", title: "Original", content: "Saved text",
      pinned: false, updated_at: "2026-01-01T00:00:00.000Z",
    };
    mocks.cache.set(notesKey, [originalNote]);
    mocks.setDoc.mockImplementationOnce(async () => {
      mocks.cache.set(notesKey, [{
        ...originalNote,
        title: "Unsaved title",
        content: "Concurrent content",
      }]);
      throw new Error("network unavailable");
    });
    mocks.enqueueOp.mockResolvedValueOnce(false);

    await expect(upsertNote("user-1", { ...originalNote, title: "Unsaved title" })).resolves.toBe(false);

    expect(mocks.cache.get(notesKey)).toEqual([{
      ...originalNote,
      content: "Concurrent content",
    }]);
  });

  it("reports an offline note save only when its owner-bound outbox write succeeds", async () => {
    mocks.setDoc.mockRejectedValueOnce(new Error("network unavailable"));
    mocks.enqueueOp.mockResolvedValueOnce(true);

    await expect(upsertNote("user-1", {
      id: "note-queued", title: "Queued note", content: "Body", pinned: false,
      updated_at: "2026-01-01T00:00:00.000Z",
    })).resolves.toBe(true);

    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1", table: "notes", op: "upsert",
      payload: expect.objectContaining({ id: "note-queued", user_id: "user-1" }),
    }));
  });
});
