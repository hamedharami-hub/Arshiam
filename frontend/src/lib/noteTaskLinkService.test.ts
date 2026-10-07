import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "owner-a" } as { uid: string } | null },
  cache: new Map<string, unknown>(),
  pending: [] as Array<Record<string, any>>,
  remoteLinks: [] as Array<Record<string, any>>,
  save: vi.fn(),
  deleteEntity: vi.fn(),
  enqueue: vi.fn(),
  firebaseFrom: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.firebaseFrom } }));
vi.mock("@/lib/firestoreSync", () => ({
  saveNoteTaskLinkWithOutcome: mocks.save,
  deleteEntityFromFirestore: mocks.deleteEntity,
}));
vi.mock("@/lib/offlineQueue", () => ({
  cacheGet: vi.fn(async (key: string) => mocks.cache.get(key)),
  cacheSet: vi.fn(async (key: string, value: unknown) => { mocks.cache.set(key, value); }),
  canReplayForOwner: (op: { ownerId?: string; payload?: unknown; match?: Record<string, unknown> }, userId: string) => {
    if (op.ownerId && op.ownerId !== userId) return false;
    const payload = op.payload && typeof op.payload === "object" ? op.payload as Record<string, unknown> : {};
    return [op.ownerId, payload.user_id, op.match?.user_id].filter(Boolean).every((owner) => owner === userId);
  },
  enqueueOp: mocks.enqueue,
  getPendingOps: vi.fn(async (table?: string) => mocks.pending.filter((item) => !table || item.table === table)),
}));

import {
  deleteNoteTaskLinksFor,
  getNoteTaskLinks,
  getNoteTaskLinksCacheKey,
  linkNoteToTask,
  makeNoteTaskLinkId,
} from "./noteTaskLinkService";

describe("note-task relationship persistence", () => {
  let online: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cache.clear();
    mocks.pending = [];
    mocks.remoteLinks = [];
    mocks.auth.currentUser = { uid: "owner-a" };
    mocks.save.mockResolvedValue("saved");
    mocks.deleteEntity.mockResolvedValue(true);
    mocks.enqueue.mockImplementation(async (operation: Record<string, any>) => {
      mocks.pending.push({ ...operation, ownerId: operation.ownerId, createdAt: Date.now() });
      return true;
    });
    mocks.firebaseFrom.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mocks.remoteLinks, error: null }).then(resolve),
      };
      return builder;
    });
    online = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: online });
  });

  it("uses one stable relationship for a duplicate pair and supports multiple tasks per note", async () => {
    const first = await linkNoteToTask("owner-a", "note-1", "task-1");
    const duplicate = await linkNoteToTask("owner-a", "note-1", "task-1");
    const secondTask = await linkNoteToTask("owner-a", "note-1", "task-2");

    expect(first).toBe("saved");
    expect(duplicate).toBe("saved");
    expect(secondTask).toBe("saved");
    expect(mocks.save).toHaveBeenCalledTimes(3);
    const links = mocks.cache.get(getNoteTaskLinksCacheKey("owner-a")) as Array<{ id: string; note_id: string; task_id: string }>;
    expect(links).toHaveLength(2);
    expect(new Set(links.map((link) => link.id)).size).toBe(2);
    expect(makeNoteTaskLinkId("note-1", "task-1")).toBe(links[0].id);
  });

  it("deduplicates an offline retry in the owner-bound outbox", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    expect(await linkNoteToTask("owner-a", "note-1", "task-1")).toBe("queued");
    expect(await linkNoteToTask("owner-a", "note-1", "task-1")).toBe("queued");

    expect(mocks.enqueue).toHaveBeenCalledOnce();
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "owner-a",
      table: "note_task_links",
      op: "upsert",
      payload: expect.objectContaining({
        id: makeNoteTaskLinkId("note-1", "task-1"),
        user_id: "owner-a",
        note_id: "note-1",
        task_id: "task-1",
      }),
    }));
  });

  it("does not queue or retain a relationship when the account changes mid-write", async () => {
    mocks.save.mockImplementationOnce(async () => {
      mocks.auth.currentUser = { uid: "owner-b" };
      return "saved";
    });

    await expect(linkNoteToTask("owner-a", "note-1", "task-1")).rejects.toThrow("active account");
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.cache.get(getNoteTaskLinksCacheKey("owner-a"))).toEqual([]);
  });

  it("does not queue a link after an online transaction confirms a missing endpoint", async () => {
    mocks.save.mockResolvedValue("missing-endpoint");

    await expect(linkNoteToTask("owner-a", "deleted-note", "task-1")).rejects.toThrow("no longer exists");

    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.cache.get(getNoteTaskLinksCacheKey("owner-a"))).toEqual([]);
  });

  it("queues owner-scoped note and task deletion sweeps and removes only that owner's cached links", async () => {
    const links = [
      { id: "a-note-task-1", user_id: "owner-a", note_id: "note-1", task_id: "task-1", created_at: "now" },
      { id: "a-note-task-2", user_id: "owner-a", note_id: "note-1", task_id: "task-2", created_at: "now" },
    ];
    await mocks.cache.set(getNoteTaskLinksCacheKey("owner-a"), links);
    await mocks.cache.set(getNoteTaskLinksCacheKey("owner-b"), [{ id: "foreign", note_id: "note-1", task_id: "task-1" }]);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    expect(await deleteNoteTaskLinksFor("owner-a", "note_id", "note-1")).toBe(true);
    expect(await deleteNoteTaskLinksFor("owner-a", "task_id", "task-1")).toBe(true);

    expect(mocks.enqueue).toHaveBeenNthCalledWith(1, expect.objectContaining({
      ownerId: "owner-a", table: "note_task_links", op: "delete",
      match: { user_id: "owner-a", note_id: "note-1" },
    }));
    expect(mocks.enqueue).toHaveBeenNthCalledWith(2, expect.objectContaining({
      ownerId: "owner-a", table: "note_task_links", op: "delete",
      match: { user_id: "owner-a", task_id: "task-1" },
    }));
    expect(mocks.cache.get(getNoteTaskLinksCacheKey("owner-a"))).toEqual([]);
    await expect(getNoteTaskLinks("owner-b")).resolves.toEqual([]);
  });

  it("deletes remote relationships by note and by task when online", async () => {
    const noteLink = { id: "note-link", user_id: "owner-a", note_id: "note-1", task_id: "task-1", created_at: "now" };
    const taskLink = { id: "task-link", user_id: "owner-a", note_id: "note-2", task_id: "task-1", created_at: "now" };
    mocks.remoteLinks = [noteLink];
    await mocks.cache.set(getNoteTaskLinksCacheKey("owner-a"), [noteLink, taskLink]);

    expect(await deleteNoteTaskLinksFor("owner-a", "note_id", "note-1")).toBe(true);
    mocks.remoteLinks = [taskLink];
    expect(await deleteNoteTaskLinksFor("owner-a", "task_id", "task-1")).toBe(true);

    expect(mocks.deleteEntity).toHaveBeenNthCalledWith(1, "owner-a", "note_task_links", "note-link");
    expect(mocks.deleteEntity).toHaveBeenNthCalledWith(2, "owner-a", "note_task_links", "task-link");
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.cache.get(getNoteTaskLinksCacheKey("owner-a"))).toEqual([]);
  });
});
