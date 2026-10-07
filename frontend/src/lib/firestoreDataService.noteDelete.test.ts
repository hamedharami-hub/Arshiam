import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  cacheGet: vi.fn(async (key: string) => mocks.cache.get(key)),
  cacheSet: vi.fn(async (key: string, value: unknown) => { mocks.cache.set(key, value); }),
  runTransaction: vi.fn(),
  enqueueOps: vi.fn(),
  deleteNoteTaskLinksFor: vi.fn(),
  removeNoteTaskLinksFromCache: vi.fn(),
  doc: vi.fn((...args: unknown[]) => ({ path: args.join("/") })),
}));

vi.mock("./mascot", () => ({ showMascotMoment: vi.fn() }));
vi.mock("./offlineReconcile", () => ({ reconcileRemoteRowsWithPending: vi.fn() }));
vi.mock("./firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "owner-a" } },
  collection: vi.fn(),
  doc: mocks.doc,
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: mocks.runTransaction,
}));
vi.mock("./offlineQueue", () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
  enqueueOp: vi.fn(),
  enqueueOps: mocks.enqueueOps,
  getPendingOps: vi.fn(async () => []),
}));
vi.mock("@/features/tasks/taskCache", () => ({
  extractTasksFromCache: vi.fn((value: unknown) => Array.isArray(value) ? value : []),
  createTaskCacheEnvelope: vi.fn((tasks) => tasks),
  withTaskCacheMutationLock: vi.fn((_owner: string, operation: () => unknown) => operation()),
}));
vi.mock("@/lib/taskDate", () => ({ taskWorkDate: vi.fn() }));
vi.mock("@/lib/taskSchedule", () => ({ normalizeTaskWrite: vi.fn((task) => task) }));
vi.mock("./noteTaskLinkService", () => ({
  deleteNoteTaskLinksFor: mocks.deleteNoteTaskLinksFor,
  removeNoteTaskLinksFromCache: mocks.removeNoteTaskLinksFromCache,
}));

import { deleteNote } from "./firestoreDataService";

describe("note deletion with separate task relationships", () => {
  const note = { id: "note-1", user_id: "owner-a", title: "Note", content: "Body", pinned: false, updated_at: "revision-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cache.clear();
    mocks.cache.set("notes:all:owner-a", [note]);
    mocks.runTransaction.mockImplementation(async (_db: unknown, operation: (transaction: unknown) => unknown) => operation({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "revision-1" }) }),
      delete: vi.fn(),
      set: vi.fn(),
    }));
    mocks.enqueueOps.mockResolvedValue(true);
    mocks.deleteNoteTaskLinksFor.mockResolvedValue(true);
  });

  it("sweeps note relationships only after the note delete commits", async () => {
    await expect(deleteNote("owner-a", "note-1")).resolves.toBe(true);

    expect(mocks.deleteNoteTaskLinksFor).toHaveBeenCalledWith("owner-a", "note_id", "note-1");
    expect(mocks.cache.get("notes:all:owner-a")).toEqual([]);
  });

  it("queues note deletion and relationship cleanup together when offline", async () => {
    mocks.runTransaction.mockRejectedValueOnce(new Error("offline"));

    await expect(deleteNote("owner-a", "note-1")).resolves.toBe(true);

    expect(mocks.enqueueOps).toHaveBeenCalledWith([
      expect.objectContaining({ ownerId: "owner-a", table: "notes", op: "delete", match: { id: "note-1" } }),
      expect.objectContaining({ ownerId: "owner-a", table: "note_task_links", op: "delete", match: { user_id: "owner-a", note_id: "note-1" } }),
    ]);
    expect(mocks.removeNoteTaskLinksFromCache).toHaveBeenCalledWith("owner-a", "note_id", ["note-1"]);
    expect(mocks.cache.get("notes:all:owner-a")).toEqual([]);
  });
});
