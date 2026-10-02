import { beforeEach, describe, expect, it } from "vitest";
import {
  archiveLegacyProgress, emptyRecord, flushOutbox, isDuplicateAttempt, legacyKey, loadOutbox, mergeProgress, parseRecord,
  purgeForeignOutboxes, pushRecord, type FredProgressRecord, type FredRemote,
} from "./fredProgress";

const rec = (over: Partial<FredProgressRecord>): FredProgressRecord => ({ ...emptyRecord("reading"), ...over });

class MemoryCloud implements FredRemote {
  docs = new Map<string, FredProgressRecord>(); writes = 0; offline = false; denied = false;
  async merge(uid: string, local: FredProgressRecord) {
    if (this.offline) throw Object.assign(new Error("network down"), { code: "unavailable" });
    if (this.denied) throw Object.assign(new Error("denied"), { code: "permission-denied" });
    const key = `${uid}/${local.lessonId}`; const remote = this.docs.get(key) ?? null;
    if (isDuplicateAttempt(remote, local)) return remote!;
    const merged = remote ? mergeProgress(remote, local) : local;
    this.docs.set(key, merged); this.writes++; return merged;
  }
  async list(uid: string) { return [...this.docs].filter(([k]) => k.startsWith(`${uid}/`)).map(([, v]) => v); }
}
beforeEach(() => localStorage.clear());

describe("conflict resolution", () => {
  it("keeps the highest achievement and takes stepIndex from the newest write", () => {
    const device1 = rec({ status: "practised", stepIndex: 3, attemptId: "a1", updatedAt: 100 });
    const device2 = rec({ status: "learning", stepIndex: 1, attemptId: null, updatedAt: 200 });
    const merged = mergeProgress(device1, device2);
    expect(merged).toMatchObject({ status: "practised", stepIndex: 1, attemptId: "a1", updatedAt: 200 });
    expect(mergeProgress(device2, device1)).toEqual(merged);
  });
  it("never downgrades status and rejects malformed documents", () => {
    expect(mergeProgress(rec({ status: "learning", updatedAt: 5 }), rec({ status: "not_started", updatedAt: 9 })).status).toBe("learning");
    expect(parseRecord("x", { status: "mastered" })).toBeNull();
    expect(parseRecord("x", { status: "learning", stepIndex: -4 })?.stepIndex).toBe(0);
  });
});

describe("two simulated clients (not a real two-device test)", () => {
  it("converge on the same record regardless of write order", async () => {
    const cloud = new MemoryCloud();
    await pushRecord("u1", rec({ status: "learning", stepIndex: 2, updatedAt: 10 }), cloud);
    await pushRecord("u1", rec({ status: "practised", stepIndex: 5, attemptId: "att-A", updatedAt: 20 }), cloud);
    const late = await pushRecord("u1", rec({ status: "learning", stepIndex: 1, updatedAt: 15 }), cloud);
    expect(late.merged).toMatchObject({ status: "practised", attemptId: "att-A", stepIndex: 5 });
    expect(cloud.docs.get("u1/reading")).toMatchObject({ status: "practised", stepIndex: 5 });
  });
  it("a retry with a duplicate attemptId records nothing again", async () => {
    const cloud = new MemoryCloud();
    const done = rec({ status: "practised", stepIndex: 5, attemptId: "att-1", updatedAt: 50 });
    await pushRecord("u1", done, cloud);
    expect(cloud.writes).toBe(1);
    const retry = await pushRecord("u1", { ...done, updatedAt: 60 }, cloud);
    expect(retry.state).toBe("saved");
    expect(cloud.writes).toBe(1);
  });
});

describe("outbox and save states", () => {
  it("reports saved, queued (offline) and failed (permission) precisely", async () => {
    const cloud = new MemoryCloud();
    expect((await pushRecord("u1", rec({ status: "learning", updatedAt: 1 }), cloud)).state).toBe("saved");
    cloud.offline = true;
    expect((await pushRecord("u1", rec({ status: "practised", attemptId: "z", updatedAt: 2 }), cloud)).state).toBe("queued");
    expect(loadOutbox("u1").reading.failed).toBe(false);
    cloud.offline = false; cloud.denied = true;
    expect((await pushRecord("u1", rec({ status: "practised", attemptId: "z", updatedAt: 3 }), cloud)).state).toBe("failed");
    expect(loadOutbox("u1").reading.failed).toBe(true);
  });
  it("flushes a queued record once the connection returns and empties the outbox", async () => {
    const cloud = new MemoryCloud(); cloud.offline = true;
    await pushRecord("u1", rec({ status: "practised", attemptId: "q1", updatedAt: 7 }), cloud);
    cloud.offline = false;
    const results = await flushOutbox("u1", cloud);
    expect(results.reading.state).toBe("saved");
    expect(loadOutbox("u1")).toEqual({});
    expect(cloud.docs.get("u1/reading")?.status).toBe("practised");
  });
  it("keeps one outbox per uid and wipes other accounts' outboxes on switch", async () => {
    const cloud = new MemoryCloud(); cloud.offline = true;
    await pushRecord("alice", rec({ status: "learning", updatedAt: 1 }), cloud);
    await pushRecord("bob", rec({ status: "learning", updatedAt: 1 }), cloud);
    expect(Object.keys(loadOutbox("alice"))).toEqual(["reading"]);
    purgeForeignOutboxes("bob");
    expect(loadOutbox("alice")).toEqual({});
    expect(Object.keys(loadOutbox("bob"))).toEqual(["reading"]);
  });
});

describe("legacy progress", () => {
  it("is archived under a new key and removed from the old one, never migrated", () => {
    localStorage.setItem(legacyKey("u1"), '["dispense","labeling"]');
    expect(archiveLegacyProgress("u1")).toEqual(["dispense", "labeling"]);
    expect(localStorage.getItem(legacyKey("u1"))).toBeNull();
    expect(localStorage.getItem("arshnaz:fred-progress-legacy:v1:u1")).toBe('["dispense","labeling"]');
    expect(archiveLegacyProgress("u1")).toBeNull();
  });
});
