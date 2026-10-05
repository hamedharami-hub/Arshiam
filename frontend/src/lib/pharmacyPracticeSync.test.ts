import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  online: true,
  saveOutcome: "saved" as "saved" | "stale" | "failed",
  remoteDocs: [] as Array<Record<string, unknown>>,
  docsGate: null as Promise<void> | null,
  enqueueOp: vi.fn(async () => true),
  save: vi.fn(),
}));

vi.mock("./firebase", () => ({
  db: {},
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(async () => { await mocks.docsGate; return { forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) => mocks.remoteDocs.forEach((item) => cb({ id: String(item.id), data: () => item })) }; }),
}));
vi.mock("./firestoreSync", () => ({ saveEntityToFirestoreWithOutcome: (...args: unknown[]) => { mocks.save(...args); return Promise.resolve(mocks.saveOutcome); } }));
vi.mock("./knowledgeService", () => ({ isOnline: () => mocks.online }));
vi.mock("./offlineQueue", () => ({ enqueueOp: mocks.enqueueOp }));

import { formatReferralLetter, getStarredPhraseId } from "./pharmacyPracticeStore";
import {
  getPracticeRecordId,
  mergePracticeRecords,
  pullPracticeRecords,
  readPracticeRecords,
  savePracticeRecord,
  selectScenarioProgress,
  selectStarredPhrases,
} from "./pharmacyPracticeSync";

const phrase = (text: string) => ({ id: getStarredPhraseId("s1", text, ""), scenarioId: "s1", textEn: text, textFa: "", createdAt: "2026-01-01T00:00:00.000Z" });

describe("pharmacy practice sync", () => {
  beforeEach(() => {
    mocks.online = true;
    mocks.saveOutcome = "saved";
    mocks.remoteDocs = [];
    mocks.docsGate = null;
    mocks.enqueueOp.mockClear().mockResolvedValue(true);
    mocks.save.mockClear();
  });
  afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

  it("uses Firestore-safe deterministic IDs", () => {
    const id = getPracticeRecordId("starred_phrase", "s1::a/b c");
    expect(id).toMatch(/^starred_phrase-[0-9a-f]{16}$/);
    expect(getPracticeRecordId("starred_phrase", "s1::a/b c")).toBe(id);
  });

  it("reports saved when Firestore accepts the record and keeps accounts separate", async () => {
    expect(await savePracticeRecord("a", "starred_phrase", "k", phrase("Bunged up"))).toEqual({ status: "saved" });
    expect(mocks.save).toHaveBeenCalledWith("a", "pharmacy_practice", getPracticeRecordId("starred_phrase", "k"), expect.objectContaining({ kind: "starred_phrase", deleted: false }));
    expect(selectStarredPhrases(readPracticeRecords("a"))).toHaveLength(1);
    expect(selectStarredPhrases(readPracticeRecords("b"))).toHaveLength(0);
  });

  it("queues in the durable outbox when offline or the write fails, and never claims saved", async () => {
    mocks.online = false;
    expect(await savePracticeRecord("a", "scenario_progress", "s1", { completedAt: "x", decision: "refer", matchesSourceLabel: true, redFlagsScreened: 1, redFlagsTotal: 2 })).toEqual({ status: "queued" });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "a", table: "pharmacy_practice", op: "upsert" }));

    mocks.online = true;
    mocks.saveOutcome = "failed";
    mocks.enqueueOp.mockResolvedValueOnce(false);
    expect(await savePracticeRecord("a", "scenario_progress", "s2", null)).toEqual({ status: "failed", reason: "queue-unavailable" });
  });

  it("fails honestly when signed out or storage is unavailable", async () => {
    expect(await savePracticeRecord(null, "starred_phrase", "k", null)).toEqual({ status: "failed", reason: "signed-out" });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(await savePracticeRecord("a", "starred_phrase", "k", null)).toEqual({ status: "failed", reason: "storage-unavailable" });
  });

  it("writes tombstones so an unstar propagates, with strictly increasing revisions", async () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    await savePracticeRecord("a", "starred_phrase", "k", phrase("x"), now);
    await savePracticeRecord("a", "starred_phrase", "k", null, now);
    const record = readPracticeRecords("a")[getPracticeRecordId("starred_phrase", "k")];
    expect(record.deleted).toBe(true);
    expect(record.updated_at).toBe("2026-02-01T00:00:00.001Z");
    expect(selectStarredPhrases(readPracticeRecords("a"))).toHaveLength(0);
  });

  it("merges remote records last-writer-wins and pulls another device's changes", async () => {
    await savePracticeRecord("a", "scenario_progress", "s1", { completedAt: "old", decision: "supply", matchesSourceLabel: null, redFlagsScreened: 0, redFlagsTotal: 0 }, new Date("2026-01-01T00:00:00Z"));
    const id = getPracticeRecordId("scenario_progress", "s1");
    mocks.remoteDocs = [
      { id, kind: "scenario_progress", key: "s1", deleted: false, updated_at: "2026-03-01T00:00:00.000Z", user_id: "a", data: { completedAt: "new", decision: "refer", matchesSourceLabel: true, redFlagsScreened: 2, redFlagsTotal: 2 }, updatedAt: "ignored" },
      { id: "junk" },
    ];
    const records = await pullPracticeRecords("a");
    expect(selectScenarioProgress(records).s1.decision).toBe("refer");

    const older = { ...records[id], updated_at: "2025-01-01T00:00:00.000Z" };
    expect(mergePracticeRecords(records, [older]).changed).toBe(false);
  });

  it("keeps a local edit saved while a slow cloud pull is in flight", async () => {
    let release!: () => void;
    mocks.docsGate = new Promise<void>((resolve) => { release = resolve; });
    const pulling = pullPracticeRecords("a");
    await savePracticeRecord("a", "starred_phrase", "new", phrase("New phrase"));
    release();
    await pulling;
    expect(selectStarredPhrases(readPracticeRecords("a")).map((item) => item.textEn)).toEqual(["New phrase"]);
  });

  it("reports remote-newer when Firestore rejects a stale write", async () => {
    mocks.saveOutcome = "stale";
    expect((await savePracticeRecord("a", "referral_letter", "s1", { to: "GP", reason: "", symptomSummary: "", currentMeds: "", suggestedAction: "", notes: "", updatedAt: "x" })).status).toBe("remote-newer");
  });

  it("migrates legacy device-only data once", () => {
    window.localStorage.setItem("arshnaz:pharmacy:starred-phrases:a", JSON.stringify([phrase("legacy")]));
    expect(selectStarredPhrases(readPracticeRecords("a"))[0].textEn).toBe("legacy");
  });

  it("formats a referral letter without empty optional notes", () => {
    const text = formatReferralLetter({ patientName: "Jo", patientAge: 40, titleEn: "Case" }, { to: "GP", reason: "R", symptomSummary: "S", currentMeds: "M", suggestedAction: "A", notes: "" });
    expect(text).toContain("Re: Jo, 40y");
    expect(text).not.toContain("Pharmacist notes");
  });
});
