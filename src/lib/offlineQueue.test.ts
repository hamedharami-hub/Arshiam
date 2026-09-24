import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canReplayForOwner, clearQueue, enqueueOp, flushQueue, getQueue, type QueuedOp } from "./offlineQueue";
import * as offlineDb from "./offlineDb";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: "account-a" } } }));
vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn().mockResolvedValue(true),
  deleteEntityFromFirestore: vi.fn().mockResolvedValue(true),
}));

describe("offline outbox ownership", () => {
  const item: Pick<QueuedOp, "ownerId"> = { ownerId: "account-a" };

  it("replays a change only for the account that created it", () => {
    expect(canReplayForOwner(item, "account-a")).toBe(true);
    expect(canReplayForOwner(item, "account-b")).toBe(false);
  });

  it("fails closed for a missing session or a legacy unowned change", () => {
    expect(canReplayForOwner(item, undefined)).toBe(false);
    expect(canReplayForOwner({}, "account-a")).toBe(false);
  });
});

describe("offline outbox persistence", () => {
  let onlineValue: boolean;
  let getDbSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    onlineValue = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    getDbSpy = vi.spyOn(offlineDb, "getDB").mockResolvedValue(null);
    localStorage.clear();
    await clearQueue();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: onlineValue });
    localStorage.clear();
  });

  it("confirms a verified localStorage fallback and binds it to the owner", async () => {
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "knowledge_documents",
      op: "insert",
      payload: { id: "doc-1", user_id: "account-a" },
    });

    expect(accepted).toBe(true);
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ ownerId: "account-a", table: "knowledge_documents", op: "insert" }),
    ]));
    expect(getDbSpy).toHaveBeenCalled();
  });

  it("returns false instead of reporting success when no durable queue can be written", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage quota exceeded");
    });

    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "knowledge_documents",
      op: "insert",
      payload: { id: "doc-2", user_id: "account-a" },
    });

    expect(accepted).toBe(false);
    expect(await getQueue()).toHaveLength(0);
  });

  it("still flushes localStorage fallback entries when IndexedDB is available", async () => {
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "knowledge_documents",
      op: "insert",
      payload: { id: "doc-fallback", user_id: "account-a" },
    });
    expect(accepted).toBe(true);

    const indexedDb = {
      getAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    };
    getDbSpy.mockResolvedValue(indexedDb as any);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await getQueue()).toHaveLength(1);
    expect(await flushQueue()).toEqual({ ok: 1, failed: 0 });
    expect(await getQueue()).toHaveLength(0);
    expect(indexedDb.delete).not.toHaveBeenCalled();
  });
});
