import { beforeEach, describe, expect, it, vi } from "vitest";

const { docMock, setDocMock, onSnapshotMock } = vi.hoisted(() => ({
  docMock: vi.fn((...args: unknown[]) => ({ path: args.join("/") })),
  setDocMock: vi.fn().mockResolvedValue(undefined),
  onSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
  doc: docMock,
  setDoc: setDocMock,
  onSnapshot: onSnapshotMock,
}));

import {
  loadMindMapStudyProgress,
  mindMapProgressCounts,
  saveMindMapStudyStatus,
  subscribeMindMapStudyProgress,
  syncMindMapStudyProgressToCloud,
} from "./mindMapProgress";

describe("mind map study progress", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("stores per-document planning states and counts unfinished work", () => {
    saveMindMapStudyStatus("u1", "d1", "studying");
    saveMindMapStudyStatus("u1", "d2", "done");
    const progress = loadMindMapStudyProgress("u1");
    expect(progress).toEqual({ d1: "studying", d2: "done" });
    expect(mindMapProgressCounts(["d1", "d2", "d3"], progress)).toEqual({ later: 1, studying: 1, done: 1 });
  });

  it("triggers cloud sync on status update and targets user's private mind settings", async () => {
    saveMindMapStudyStatus("u1", "d1", "studying");
    expect(docMock).toHaveBeenCalledWith({}, "users", "u1", "mind_settings", "mind_map_progress");
    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: "[object Object]/users/u1/mind_settings/mind_map_progress" }),
      expect.objectContaining({
        progress: { d1: "studying" },
        user_id: "u1",
      }),
      { merge: true }
    );
  });

  it("subscribes to cloud snapshot and merges remote progress with local data", () => {
    saveMindMapStudyStatus("u1", "d1", "studying");

    let snapshotListener!: (snap: any) => void;
    onSnapshotMock.mockImplementation((_docRef, callback) => {
      snapshotListener = callback;
      return () => {};
    });

    const received: any[] = [];
    const unsubscribe = subscribeMindMapStudyProgress("u1", (progress) => {
      received.push(progress);
    });

    // 1. Initial callback with local progress
    expect(received[0]).toEqual({ d1: "studying" });

    // 2. Incoming cloud snapshot with new remote item
    snapshotListener({
      exists: () => true,
      data: () => ({
        progress: { d2: "done", d3: "later" },
      }),
    });

    // 3. Merged state contains both local d1 and remote d2, d3
    const latest = received[received.length - 1];
    expect(latest).toEqual({ d1: "studying", d2: "done", d3: "later" });
    expect(loadMindMapStudyProgress("u1")).toEqual({ d1: "studying", d2: "done", d3: "later" });

    unsubscribe();
  });

  it("syncs local progress back to cloud when cloud snapshot is empty", async () => {
    saveMindMapStudyStatus("u1", "d1", "done");
    setDocMock.mockClear();

    let snapshotListener!: (snap: any) => void;
    onSnapshotMock.mockImplementation((_docRef, callback) => {
      snapshotListener = callback;
      return () => {};
    });

    subscribeMindMapStudyProgress("u1", () => {});

    // Empty cloud snapshot
    snapshotListener({
      exists: () => false,
      data: () => null,
    });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        progress: { d1: "done" },
        user_id: "u1",
      }),
      { merge: true }
    );
  });

  it("handles cloud sync failure gracefully without throwing or losing local changes", async () => {
    setDocMock.mockRejectedValueOnce(new Error("network failure"));
    const result = await syncMindMapStudyProgressToCloud("u1", { d1: "studying" });
    expect(result).toBe(false);
  });

  it("BASELINE BUG: remote snapshot overwrites local changes for same document ID", () => {
    // User makes offline change to d1
    saveMindMapStudyStatus("u1", "d1", "studying");
    saveMindMapStudyStatus("u1", "d2", "done");
    expect(loadMindMapStudyProgress("u1")).toEqual({ d1: "studying", d2: "done" });

    let snapshotListener!: (snap: any) => void;
    onSnapshotMock.mockImplementation((_docRef, callback) => {
      snapshotListener = callback;
      return () => {};
    });

    const received: any[] = [];
    subscribeMindMapStudyProgress("u1", (progress) => {
      received.push(progress);
    });

    // Remote snapshot arrives with older data for d1 (was "later" before user changed to "studying")
    snapshotListener({
      exists: () => true,
      data: () => ({
        progress: { d1: "later", d3: "done" },
      }),
    });

    // BUG: Local d1:"studying" is overwritten by remote d1:"later"
    // Expected: { d1: "studying", d2: "done", d3: "done" } (local wins for conflicts)
    // Actual: { d1: "later", d2: "done", d3: "done" } (remote overwrites local)
    const latest = received[received.length - 1];
    expect(latest.d1).toBe("later"); // BUG: should be "studying"
    expect(latest.d2).toBe("done");
    expect(latest.d3).toBe("done");
  });
});
