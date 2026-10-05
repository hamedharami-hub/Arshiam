import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), failNext: null as Error | null, transactions: 0 }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  onSnapshot: vi.fn(() => () => {}),
  runTransaction: async (_db: unknown, body: (tx: unknown) => Promise<unknown>) => {
    mocks.transactions++;
    if (mocks.failNext) { const err = mocks.failNext; mocks.failNext = null; throw err; }
    const pending = new Map<string, Record<string, unknown>>();
    const tx = {
      get: async (ref: { path: string }) => ({ exists: () => mocks.docs.has(ref.path), data: () => mocks.docs.get(ref.path) }),
      set: (ref: { path: string }, value: Record<string, unknown>) => { pending.set(ref.path, { ...value }); },
    };
    const result = await body(tx);
    for (const [path, value] of pending) mocks.docs.set(path, value);
    return result;
  },
}));

import { legacyLocalReviews, migrateLegacyReviews, reviewId, savePlanReview, savePlanReviewDraft } from "./planReviewService";
import type { Period } from "./timeHorizon";

const period: Period = { horizon: "week", start: "2026-09-28", end: "2026-10-04" };
const snapshot = (title: string) => ({ done: [{ id: "d1", title, status: "done" as const }], open: [], set_aside: [] });

describe("period review history and uid-scoped drafts", () => {
  beforeEach(() => {
    mocks.docs.clear(); mocks.failNext = null; mocks.transactions = 0; localStorage.clear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("keeps failed reviews out of the confirmed mirror and retains an error draft", async () => {
    mocks.failNext = Object.assign(new Error("permission denied"), { code: "permission-denied" });
    const status = await savePlanReview("u1", period, { note: "keep this", reviewed_at: "2026-10-04T20:00:00Z", snapshot: snapshot("original") }, null, "gregorian", "intent-failed");
    expect(status).toBe("failed");
    expect(JSON.parse(localStorage.getItem("arsh_plan_reviews_v3:u1") || "{}" )).toEqual({});
    const drafts = JSON.parse(localStorage.getItem("arsh_plan_review_drafts_v1:u1") || "{}");
    expect(drafts[reviewId(period, "gregorian")]).toMatchObject({ note: "keep this", status: "error", reviewed_at: "2026-10-04T20:00:00Z" });
  });

  it("keeps an offline finish pending locally and does not run a transaction", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    expect(await savePlanReview("u1", period, { note: "offline note", reviewed_at: "t1", snapshot: snapshot("frozen") }, null, "gregorian", "intent-offline")).toBe("queued");
    expect(mocks.transactions).toBe(0);
    expect(JSON.parse(localStorage.getItem("arsh_plan_reviews_v3:u1") || "{}" )).toEqual({});
    expect(JSON.parse(localStorage.getItem("arsh_plan_review_drafts_v1:u1") || "{}")[reviewId(period, "gregorian")]).toMatchObject({ status: "pending", note: "offline note", snapshot: snapshot("frozen") });
  });

  it("appends corrections as a new immutable revision with a frozen prior snapshot", async () => {
    expect(await savePlanReview("u1", period, { note: "first", reviewed_at: "t1", snapshot: snapshot("at finish") }, null, "gregorian", "intent-1")).toBe("saved");
    const pointerPath = `users/u1/plan_reviews/${reviewId(period, "gregorian")}`;
    const first = mocks.docs.get(pointerPath)!;
    const [firstRevisionPath] = [...mocks.docs.keys()].filter((key) => key.includes("/revisions/"));
    expect(first).toMatchObject({ note: "first", revision: 1, latest_revision_id: "intent-1", snapshot: snapshot("at finish") });

    expect(await savePlanReview("u1", period, { note: "corrected", reviewed_at: "t2", snapshot: snapshot("correction time") }, first as never, "gregorian", "intent-2")).toBe("saved");
    const current = mocks.docs.get(pointerPath)!;
    expect(current).toMatchObject({ note: "corrected", revision: 2, previous_revision_id: "intent-1", snapshot: snapshot("correction time") });
    expect(mocks.docs.get(firstRevisionPath)).toMatchObject({ note: "first", revision: 1, snapshot: snapshot("at finish") });
    expect(mocks.docs.get(`${pointerPath}/revisions/intent-2`)).toMatchObject({ note: "corrected", revision: 2, base_revision: 1 });
  });

  it("detects a newer period revision and keeps the user's conflicting note", async () => {
    const pointerPath = `users/u1/plan_reviews/${reviewId(period, "gregorian")}`;
    mocks.docs.set(pointerPath, { id: reviewId(period, "gregorian"), note: "remote", revision: 3, latest_revision_id: "remote-3" });
    const status = await savePlanReview("u1", period, { note: "mine", reviewed_at: "t4", snapshot: snapshot("mine") }, { id: reviewId(period, "gregorian"), horizon: "week", start: period.start, end: period.end, calendar: "gregorian", note: "older", revision: 2 }, "gregorian", "intent-mine");
    expect(status).toBe("failed");
    expect(mocks.docs.get(pointerPath)?.note).toBe("remote");
    const draft = JSON.parse(localStorage.getItem("arsh_plan_review_drafts_v1:u1") || "{}")[reviewId(period, "gregorian")];
    expect(draft).toMatchObject({ note: "mine", status: "conflict", base_revision: 2 });
  });

  it("isolates the same period for different users and calendar identities", async () => {
    const gregorianId = reviewId(period, "gregorian"), jalaliId = reviewId(period, "jalali");
    expect(gregorianId).not.toBe(jalaliId);
    await savePlanReview("u1", period, { note: "one", reviewed_at: "t1", snapshot: snapshot("one") }, null, "gregorian", "u1-intent");
    await savePlanReview("u2", period, { note: "two", reviewed_at: "t2", snapshot: snapshot("two") }, null, "gregorian", "u2-intent");
    expect(mocks.docs.get(`users/u1/plan_reviews/${gregorianId}`)?.note).toBe("one");
    expect(mocks.docs.get(`users/u2/plan_reviews/${gregorianId}`)?.note).toBe("two");
    savePlanReviewDraft("u1", period, "draft only", null, "jalali");
    expect(JSON.parse(localStorage.getItem("arsh_plan_review_drafts_v1:u1") || "{}")[jalaliId].note).toBe("draft only");
    expect(JSON.parse(localStorage.getItem("arsh_plan_review_drafts_v1:u2") || "{}")[jalaliId]).toBeUndefined();
  });

  it("reads only the matching user's legacy localStorage note and leaves the source intact", () => {
    localStorage.setItem("arsh_plan_review_v1:u1:week:2026-09-28", JSON.stringify({ at: "t1", note: "old note" }));
    localStorage.setItem("arsh_plan_review_v1:u12:week:2026-09-28", JSON.stringify({ at: "t2", note: "other user" }));
    expect(legacyLocalReviews("u1")).toEqual([expect.objectContaining({ note: "old note", calendar: "legacy", snapshot: null })]);
    expect(localStorage.getItem("arsh_plan_review_v1:u1:week:2026-09-28")).not.toBeNull();
  });

  it("migrates only the matching user's legacy note without inventing a snapshot", async () => {
    const key = "arsh_plan_review_v1:u1:week:2026-09-28";
    localStorage.setItem(key, JSON.stringify({ at: "t1", note: "old note" }));
    localStorage.setItem("arsh_plan_review_v1:u2:week:2026-09-28", JSON.stringify({ at: "t2", note: "other user" }));
    await migrateLegacyReviews("u1", {});
    const importedId = reviewId({ horizon: "week", start: "2026-09-28", end: "2026-09-28" }, "legacy");
    expect(mocks.docs.get(`users/u1/plan_reviews/${importedId}`)).toMatchObject({ note: "old note", reviewed_at: "t1", snapshot: null, calendar: "legacy" });
    expect(mocks.docs.has(`users/u2/plan_reviews/${importedId}`)).toBe(false);
    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it("leaves migration retryable when Firestore rejects the import", async () => {
    const key = "arsh_plan_review_v1:u1:week:2026-09-28";
    localStorage.setItem(key, JSON.stringify({ note: "offline legacy note" }));
    mocks.failNext = Object.assign(new Error("permission denied"), { code: "permission-denied" });
    await migrateLegacyReviews("u1", {});
    expect(localStorage.getItem("arsh_plan_review_v1_migrated:u1")).toBeNull();
    expect(JSON.parse(localStorage.getItem("arsh_plan_review_drafts_v1:u1") || "{}")[reviewId({ horizon: "week", start: "2026-09-28", end: "2026-09-28" }, "legacy")]).toMatchObject({ note: "offline legacy note", status: "error", snapshot: null });
    await migrateLegacyReviews("u1", {});
    expect(localStorage.getItem("arsh_plan_review_v1_migrated:u1")).not.toBeNull();
  });
});
