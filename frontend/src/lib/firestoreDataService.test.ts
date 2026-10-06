import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTaskCacheEnvelope, extractTasksFromCache } from "@/features/tasks/taskCache";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => {
  const cache = new Map<string, unknown>();
  const remote = new Map<string, Record<string, unknown>>();
  return {
    cache,
    remote,
    cacheGet: vi.fn(async (key: string) => cache.get(key)),
    cacheSet: vi.fn(async (key: string, value: unknown) => { cache.set(key, value); }),
    enqueueOp: vi.fn(),
    getPendingOps: vi.fn().mockResolvedValue([]),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn((_db: unknown, ...segments: string[]) => segments.join("/")),
    runTransaction: vi.fn(async (_db: unknown, update: (transaction: any) => Promise<unknown>) => {
      const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
      const deletes: string[] = [];
      const result = await update({
        get: async (path: string) => ({ exists: () => remote.has(path), data: () => remote.get(path) }),
        set: (path: string, data: Record<string, unknown>) => { writes.push({ path, data }); },
        delete: (path: string) => { deletes.push(path); },
      });
      for (const { path, data } of writes) {
        await mocks.setDoc(path, data, { merge: true });
        remote.set(path, { ...(remote.get(path) || {}), ...data });
      }
      for (const path of deletes) { await mocks.deleteDoc(path); remote.delete(path); }
      return result;
    }),
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
  runTransaction: mocks.runTransaction,
}));

vi.mock("./offlineQueue", async (importOriginal) => ({
  ...await importOriginal<typeof import("./offlineQueue")>(),
  getPendingOps: mocks.getPendingOps,
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
  enqueueOp: mocks.enqueueOp,
}));

import { deleteTask, deleteNote, persistTask, subscribeTasks, subscribeNotes, upsertNote, persistNote, subscribeFolders, subscribeTags, subscribeMindValues, subscribeHabits, subscribeDailyCheckins, subscribeThoughtRecords, subscribeAbcRecords, subscribeAssessmentResults } from "./firestoreDataService";

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

describe("subscribeNotes pending updates", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.remote.clear();
    mocks.cacheGet.mockReset().mockImplementation(async (key: string) => mocks.cache.get(key));
    mocks.cacheSet.mockReset().mockImplementation(async (key: string, value: unknown) => { mocks.cache.set(key, value); });
    mocks.getPendingOps.mockReset().mockResolvedValue([]);
    mocks.onSnapshot.mockReset();
  });

  it("ignores an old cache answer after server data and after unsubscribe", async () => {
    let resolveCache!: (value: unknown) => void;
    mocks.cacheGet.mockImplementationOnce(() => new Promise((resolve) => { resolveCache = resolve; }));
    let receive!: (snapshot: any) => void;
    const stop = vi.fn();
    mocks.onSnapshot.mockImplementationOnce((_ref, next) => { receive = next; return stop; });
    const update = vi.fn();
    const unsubscribe = subscribeNotes("user-1", update);
    receive({ forEach: (visit: (doc: any) => void) => visit({ id: "server", data: () => ({ title: "Server", updated_at: "2026-01-01" }) }) });
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith([expect.objectContaining({ id: "server" })]));
    unsubscribe();
    resolveCache([{ id: "stale", title: "Stale" }]);
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledOnce();
  });

  it("keeps a pending offline note visible over an empty server snapshot", async () => {
    const pendingNote = { id: "pending", title: "Draft", content: "Saved offline", pinned: false, updated_at: "2026-01-01", user_id: "user-1" };
    mocks.cache.set("notes:all:user-1", [pendingNote]);
    mocks.getPendingOps.mockResolvedValueOnce([{ table: "notes", op: "upsert", payload: pendingNote, ownerId: "user-1", createdAt: 1, attempts: 0 }]);
    let receive!: (snapshot: any) => void;
    mocks.onSnapshot.mockImplementationOnce((_ref, next) => { receive = next; return vi.fn(); });
    const update = vi.fn();
    subscribeNotes("user-1", update);
    receive({ forEach: () => {} });
    await vi.waitFor(() => expect(update).toHaveBeenLastCalledWith([expect.objectContaining({ id: "pending" })]));
  });
});

describe("firestoreDataService task cache rollback", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.remote.clear();
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

    mocks.runTransaction.mockRejectedValueOnce(new Error("network down"));
    mocks.enqueueOp.mockResolvedValueOnce(true);
    await expect(deleteTask("user-1", "task-delete-queued")).resolves.toBe(true);
    expect(mocks.enqueueOp).toHaveBeenLastCalledWith({
      ownerId: "user-1",
      table: "tasks",
      op: "delete",
      match: { id: "task-delete-queued" },
      expectedRevision: undefined,
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

  it("keeps cached tasks during incomplete local snapshots but accepts server deletions", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    let receive!: (snapshot: any) => void;
    const stop = vi.fn();
    mocks.onSnapshot.mockImplementationOnce((_ref, options, callback) => {
      expect(options).toEqual({ includeMetadataChanges: true });
      receive = callback;
      return stop;
    });
    const updates: Task[][] = [];
    const unsubscribe = subscribeTasks("user-1", tasks => updates.push(tasks));
    await Promise.resolve();
    receive({ metadata: { fromCache: true }, forEach: () => {} });
    expect(updates.at(-1)).toEqual([baseTask]);
    receive({ metadata: { fromCache: false }, forEach: () => {} });
    expect(updates.at(-1)).toEqual([]);
    unsubscribe();
    receive({ metadata: { fromCache: false }, forEach: () => {} });
    expect(updates).toHaveLength(3);
    expect(stop).toHaveBeenCalled();
  });

  it("does not emit a delayed cache read after a newer realtime task snapshot", async () => {
    let resolveCache!: (value: unknown) => void;
    const delayedCache = new Promise<unknown>((resolve) => { resolveCache = resolve; });
    mocks.cacheGet.mockImplementationOnce(() => delayedCache);
    let emitSnapshot!: (snapshot: { forEach: (callback: () => void) => void }) => void;
    mocks.onSnapshot.mockImplementationOnce((_collection: unknown, _options: unknown, next: typeof emitSnapshot) => {
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
    mocks.remote.set("users/user-1/tasks/task-1", baseTask);
    mocks.setDoc.mockRejectedValueOnce(new Error("permission denied"));

    const status = await persistTask("user-1", { id: "task-1", title: "Changed title" });

    expect(status).toBe("failed");
    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([baseTask]);
  });

  it("protects a remotely edited task from an online stale delete and restores the local row", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    mocks.remote.set("users/user-1/tasks/task-1", { ...baseTask, title: "New cloud", updated_at: "2026-09-27" });
    await expect(deleteTask("user-1", "task-1")).resolves.toBe(false);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
    expect(extractTasksFromCache(mocks.cache.get(cacheKey))).toEqual([baseTask]);
  });

  it("protects a remotely edited note from an online stale delete", async () => {
    const note = { id: "note-1", updated_at: "2026-09-26", title: "Local" };
    mocks.cache.set("notes:all:user-1", [note]);
    mocks.remote.set("users/user-1/notes/note-1", { ...note, updated_at: "2026-09-27", title: "Cloud" });
    await expect(deleteNote("user-1", "note-1")).resolves.toBe(false);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
    expect(mocks.cache.get("notes:all:user-1")).toEqual([note]);
  });

  it("rejects a stale task edit without queuing an overwrite of a newer cloud revision", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    mocks.remote.set("users/user-1/tasks/task-1", { ...baseTask, title: "Other device", updated_at: "2026-09-27T00:00:00.000Z" });
    await expect(persistTask("user-1", { id: "task-1", title: "Stale edit" })).resolves.toBe("failed");
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
    expect(mocks.remote.get("users/user-1/tasks/task-1")?.title).toBe("Other device");
  });

  it("rejects a stale note edit without queuing an overwrite of a newer cloud revision", async () => {
    const original = { id: "note-1", user_id: "user-1", title: "Old", content: "", pinned: false, updated_at: "2026-01-01T00:00:00.000Z" };
    mocks.cache.set("notes:all:user-1", [original]);
    mocks.remote.set("users/user-1/notes/note-1", { ...original, title: "Other device", updated_at: "2026-01-02T00:00:00.000Z" });
    await expect(persistNote("user-1", { ...original, title: "Stale edit" })).resolves.toBe("failed");
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
    expect(mocks.remote.get("users/user-1/notes/note-1")?.title).toBe("Other device");
  });

  it("does not overwrite a newer concurrent cache edit while rolling back a failed update", async () => {
    mocks.cache.set(cacheKey, createTaskCacheEnvelope([baseTask]));
    mocks.remote.set("users/user-1/tasks/task-1", baseTask);
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
    mocks.remote.set("users/user-1/tasks/task-1", baseTask);
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
    mocks.remote.set("users/user-1/notes/note-1", originalNote);
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
    mocks.remote.set("users/user-1/notes/note-1", originalNote);
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

  it("distinguishes cloud, durable queue, and rejected note writes", async () => {
    const note = { id: "note-outcome", title: "My text" };
    await expect(persistNote("user-1", note)).resolves.toBe("synced");
    mocks.setDoc.mockRejectedValueOnce(new Error("offline"));
    mocks.enqueueOp.mockResolvedValueOnce(true);
    await expect(persistNote("user-1", note)).resolves.toBe("queued");
    mocks.setDoc.mockRejectedValueOnce(new Error("offline"));
    mocks.enqueueOp.mockResolvedValueOnce(false);
    await expect(persistNote("user-1", note)).resolves.toBe("failed");
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


describe("pending taxonomy subscriptions", () => {
  it.each(["folders", "tags"] as const)("keeps offline %s visible until replay, excluding another account", async table => {
    mocks.cache.clear();
    const cached = { id: "pending", user_id: "user-1", name: "Local" };
    mocks.cache.set(`${table}:all:user-1`, [cached]);
    mocks.getPendingOps.mockResolvedValue([
      { table, op: "insert", ownerId: "user-1", payload: cached, createdAt: 1 },
      { table, op: "insert", ownerId: "user-2", payload: { id: "foreign", name: "Other" }, createdAt: 2 },
    ]);
    let receive!: (snapshot: unknown) => void;
    mocks.onSnapshot.mockImplementation((_ref, callback) => { receive = callback; return vi.fn(); });
    const update = vi.fn();
    const unsubscribe = table === "folders" ? subscribeFolders("user-1", update) : subscribeTags("user-1", update);
    receive({ forEach: () => {} });
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith([cached]));
    unsubscribe();
  });
});

describe("mind values cache and subscription", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.remote.clear();
    mocks.cacheGet.mockImplementation(async (key: string) => mocks.cache.get(key));
    mocks.cacheSet.mockImplementation(async (key: string, value: unknown) => { mocks.cache.set(key, value); });
    mocks.onSnapshot.mockReset();
    mocks.doc.mockClear();
  });

  it("treats a missing server document as an empty values record and clears stale cache", async () => {
    const valuesKey = "mindValues:all:user-1";
    mocks.cache.set(valuesKey, { stale: { value: "old account state" } });
    let receive!: (snapshot: any) => void;
    mocks.onSnapshot.mockImplementationOnce((_ref, next) => { receive = next; return vi.fn(); });
    const updates: Array<{ values: Record<string, unknown>; source: string }> = [];

    subscribeMindValues("user-1", (values, meta) => updates.push({ values, source: meta.source }));
    receive({ exists: () => false, data: () => undefined, metadata: { fromCache: false } });
    await Promise.resolve();

    expect(updates).toEqual([{ values: {}, source: "server" }]);
    expect(mocks.cache.get(valuesKey)).toEqual({});
  });

  it("does not let a delayed cache read overwrite a server answer", async () => {
    let resolveCache!: (value: unknown) => void;
    mocks.cacheGet.mockImplementationOnce(() => new Promise((resolve) => { resolveCache = resolve; }));
    let receive!: (snapshot: any) => void;
    mocks.onSnapshot.mockImplementationOnce((_ref, next) => { receive = next; return vi.fn(); });
    const updates: Record<string, unknown>[] = [];

    subscribeMindValues("user-1", (values) => updates.push(values));
    receive({ exists: () => true, data: () => ({ values: { fresh: { value: "server" } } }), metadata: { fromCache: false } });
    resolveCache({ stale: { value: "cache" } });
    await Promise.resolve();

    expect(updates).toEqual([{ fresh: { value: "server" } }]);
  });

  it("ignores queued cache and snapshot callbacks after unsubscribe", async () => {
    let resolveCache!: (value: unknown) => void;
    mocks.cacheGet.mockImplementationOnce(() => new Promise((resolve) => { resolveCache = resolve; }));
    let receive!: (snapshot: any) => void;
    const stop = vi.fn();
    mocks.onSnapshot.mockImplementationOnce((_ref, next) => { receive = next; return stop; });
    const update = vi.fn();

    const unsubscribe = subscribeMindValues("user-1", update);
    unsubscribe();
    resolveCache({ stale: true });
    receive({ exists: () => true, data: () => ({ values: { tooLate: true } }), metadata: { fromCache: false } });
    await Promise.resolve();

    expect(update).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });
});


describe("account collection subscription lifetimes", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.onSnapshot.mockReset();
    mocks.cacheGet.mockReset();
    mocks.cacheSet.mockReset().mockImplementation(async (key: string, value: unknown) => { mocks.cache.set(key, value); });
  });

  it.each([
    ["habits", subscribeHabits],
    ["daily checkins", subscribeDailyCheckins],
    ["thought records", subscribeThoughtRecords],
    ["ABC records", subscribeAbcRecords],
    ["assessments", (uid: string, update: (items: any[]) => void) => subscribeAssessmentResults(uid, undefined, update)],
  ] as const)("ignores stale cached %s after a snapshot or account cleanup", async (_name, subscribe) => {
    let resolveCache!: (value: any[]) => void;
    mocks.cacheGet.mockImplementationOnce(() => new Promise(resolve => { resolveCache = resolve; }));
    let receive!: (snapshot: any) => void;
    const stop = vi.fn();
    mocks.onSnapshot.mockImplementationOnce((_ref, next) => { receive = next; return stop; });
    const update = vi.fn();
    const cleanup = subscribe("user-1", update);
    receive({ forEach: (visit: (doc: any) => void) => visit({ id: "fresh", data: () => ({ title: "Fresh" }) }) });
    resolveCache([{ id: "stale" }]);
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith([expect.objectContaining({ id: "fresh" })]);
    cleanup();
    receive({ forEach: () => {} });
    expect(update).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledOnce();
  });
});
