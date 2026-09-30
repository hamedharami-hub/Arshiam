import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "u1" } as { uid: string } | null },
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({ path: parts.join("/") })),
  snapshot: vi.fn(), transaction: vi.fn(), set: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth, db: {}, doc: mocks.doc, onSnapshot: mocks.snapshot }));
vi.mock("firebase/firestore", () => ({ runTransaction: mocks.transaction }));

describe("mind map study progress", () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); localStorage.clear(); mocks.auth.currentUser = { uid: "u1" };
    mocks.transaction.mockImplementation(async (_db, callback) => callback({
      get: async () => ({ exists: () => false, data: () => ({}) }), set: mocks.set,
    }));
  });
  it("stores planning states and counts unfinished documents", async () => {
    const service = await import("./mindMapProgress");
    service.saveMindMapStudyStatus("u1", "d1", "studying");
    service.saveMindMapStudyStatus("u1", "d2", "done");
    await service.syncMindMapStudyProgressToCloud("u1");
    const progress = service.loadMindMapStudyProgress("u1");
    expect(progress).toEqual({ d1: "studying", d2: "done" });
    expect(service.mindMapProgressCounts(["d1", "d2", "d3"], progress)).toEqual({ later: 1, studying: 1, done: 1 });
  });
  it("syncs versioned progress through a transaction under the authenticated user's private path", async () => {
    const service = await import("./mindMapProgress");
    expect(await service.syncMindMapStudyProgressToCloud("u1", { d1: "studying" })).toBe(true);
    expect(mocks.doc).toHaveBeenCalledWith({}, "users", "u1", "mind_settings", "mind_map_progress");
    expect(mocks.set).toHaveBeenCalledWith({ path: "users/u1/mind_settings/mind_map_progress" }, expect.objectContaining({
      progress: { d1: "studying" }, user_id: "u1", schema_version: 2,
      entries: { d1: expect.objectContaining({ status: "studying", pending: false }) },
    }), { merge: true });
  });
  it("merges snapshots without letting an older remote value erase a local edit", async () => {
    const service = await import("./mindMapProgress");
    mocks.transaction.mockRejectedValue(new Error("offline"));
    await service.syncMindMapStudyProgressToCloud("u1", { d1: "studying", d2: "done" });
    let receive!: (snapshot: unknown) => void;
    const dispose = vi.fn();
    mocks.snapshot.mockImplementation((_ref, _options, callback) => { receive = callback; return dispose; });
    const onUpdate = vi.fn();
    const unsubscribe = service.subscribeMindMapStudyProgress("u1", onUpdate);
    receive({ exists: () => true, data: () => ({ progress: { d1: "later", d3: "done" } }), metadata: { fromCache: true, hasPendingWrites: false } });
    expect(onUpdate).toHaveBeenLastCalledWith({ d1: "studying", d2: "done", d3: "done" });
    unsubscribe(); expect(dispose).toHaveBeenCalled();
  });
  it("retains local edits and reports cloud errors for retry", async () => {
    const service = await import("./mindMapProgress");
    mocks.transaction.mockRejectedValueOnce(new Error("network failure"));
    expect(await service.syncMindMapStudyProgressToCloud("u1", { d1: "studying" })).toBe(false);
    expect(service.loadMindMapStudyProgress("u1")).toEqual({ d1: "studying" });
    expect(service.getMindMapSyncState("u1")).toMatchObject({ status: "error", pendingCount: 1 });
    expect(await service.retryMindMapStudyProgressSync("u1")).toBe(true);
    expect(service.getMindMapSyncState("u1")).toMatchObject({ status: "synced", pendingCount: 0 });
  });
  it("never sends another account's local progress to Firestore", async () => {
    const service = await import("./mindMapProgress"); mocks.auth.currentUser = { uid: "u2" };
    expect(await service.syncMindMapStudyProgressToCloud("u1", { d1: "done" })).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(service.loadMindMapStudyProgress("u1")).toEqual({ d1: "done" });
  });
  it("does not acknowledge a commit after an account switch", async () => {
    const service = await import("./mindMapProgress");
    mocks.transaction.mockImplementation(async (_db, callback) => {
      const result = await callback({ get: async () => ({ exists: () => false }), set: mocks.set });
      mocks.auth.currentUser = { uid: "u2" }; return result;
    });
    expect(await service.syncMindMapStudyProgressToCloud("u1", { d1: "done" })).toBe(false);
    expect(service.getMindMapSyncState("u1").pendingCount).toBe(1);
  });
});
