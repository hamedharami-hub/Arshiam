import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveEntity: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  enqueueOp: vi.fn(),
  getPendingOps: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn((...parts: string[]) => parts.join("/")),
  query: vi.fn((...parts: unknown[]) => parts),
  where: vi.fn((...parts: unknown[]) => parts),
  db: {},
}));

vi.mock("@/lib/firebase", () => ({
  db: mocks.db,
  collection: mocks.collection,
  getDocs: mocks.getDocs,
  query: mocks.query,
  where: mocks.where,
}));
vi.mock("@/lib/firestoreSync", () => ({ saveEntityToFirestore: mocks.saveEntity }));
vi.mock("@/lib/offlineQueue", () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
  enqueueOp: mocks.enqueueOp,
  getPendingOps: mocks.getPendingOps,
}));

import {
  createInteractiveStudySessionDraft,
  loadLatestInteractiveStudyDraft,
  persistInteractiveStudySession,
} from "./interactiveStudyService";

describe("interactiveStudyService", () => {
  let onlineValue: boolean;

  beforeEach(() => {
    onlineValue = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    mocks.saveEntity.mockReset().mockResolvedValue(true);
    mocks.cacheGet.mockReset().mockResolvedValue(undefined);
    mocks.cacheSet.mockReset().mockResolvedValue(undefined);
    mocks.enqueueOp.mockReset().mockResolvedValue(true);
    mocks.getPendingOps.mockReset().mockResolvedValue([]);
    mocks.getDocs.mockReset().mockResolvedValue({ docs: [] });
    mocks.collection.mockClear();
    mocks.query.mockClear();
    mocks.where.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: onlineValue });
  });

  it("creates an owner-scoped session without changing the source document identity", () => {
    const session = createInteractiveStudySessionDraft(
      "user-a", "source/doc-7", "Study lesson", "en",
      '<div class="interactive-learning-block"><p>Practice</p></div>',
    );

    expect(session).toMatchObject({
      user_id: "user-a",
      document_id: "source/doc-7",
      document_title: "Study lesson",
      language: "en",
      status: "in_progress",
    });
    expect(session.id).toBeTruthy();
    expect(session.content_html).toContain("Practice");
  });

  it("saves a sanitized session to its owner's private Firestore subcollection", async () => {
    const session = createInteractiveStudySessionDraft(
      "user-a", "doc-7", "Study lesson", "fa",
      '<div class="interactive-learning-block"><p>تمرین</p><script>alert(1)</script></div>',
    );

    const result = await persistInteractiveStudySession(session);

    expect(result.status).toBe("saved");
    expect(result.session.content_html).not.toContain("<script");
    expect(mocks.saveEntity).toHaveBeenCalledWith(
      "user-a", "interactive_study_sessions", session.id, expect.objectContaining({ user_id: "user-a" }),
    );
    expect(mocks.cacheSet).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("user-a")), result.session);
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it("durably queues offline changes under their original account owner", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const session = createInteractiveStudySessionDraft(
      "user-a", "doc-7", "Study lesson", "en",
      '<div class="interactive-learning-block"><p>Saved practice</p></div>',
    );

    const result = await persistInteractiveStudySession(session);

    expect(result.status).toBe("queued");
    expect(mocks.saveEntity).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-a",
      table: "interactive_study_sessions",
      op: "upsert",
      payload: expect.objectContaining({ id: session.id, user_id: "user-a" }),
      match: { id: session.id },
    }));
  });

  it("does not report a save if cloud and durable outbox both fail", async () => {
    mocks.saveEntity.mockResolvedValueOnce(false);
    mocks.enqueueOp.mockResolvedValueOnce(false);
    const session = createInteractiveStudySessionDraft(
      "user-a", "doc-7", "Study lesson", "en",
      '<div class="interactive-learning-block"><p>Practice</p></div>',
    );

    const result = await persistInteractiveStudySession(session);

    expect(result).toMatchObject({ status: "failed" });
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it("keeps a confirmed cloud save successful if only the optional cache write fails", async () => {
    mocks.cacheSet.mockRejectedValueOnce(new Error("cache unavailable"));
    const session = createInteractiveStudySessionDraft(
      "user-a", "doc-7", "Study lesson", "en",
      '<div class="interactive-learning-block"><p>Practice</p></div>',
    );

    const result = await persistInteractiveStudySession(session);

    expect(result.status).toBe("saved");
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it("rejects an oversized payload before attempting persistence", async () => {
    const session = createInteractiveStudySessionDraft(
      "user-a", "doc-7", "Study lesson", "en",
      `<div class="interactive-learning-block"><p>${"x".repeat(720 * 1024)}</p></div>`,
    );

    const result = await persistInteractiveStudySession(session);

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/too large/i);
    expect(mocks.saveEntity).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it("loads the newest resumable draft for the requested source and language", async () => {
    const fa = createInteractiveStudySessionDraft("user-a", "doc-7", "درس", "fa", '<p>فارسی</p>');
    const en = createInteractiveStudySessionDraft("user-a", "doc-7", "Lesson", "en", '<p>English</p>');
    mocks.getDocs.mockResolvedValueOnce({
      docs: [
        { id: "fa-draft", data: () => ({ ...fa, id: undefined, updated_at: "2026-09-24T00:00:00.000Z" }) },
        { id: "en-draft", data: () => ({ ...en, id: undefined, updated_at: "2026-09-25T00:00:00.000Z" }) },
      ],
    });

    const result = await loadLatestInteractiveStudyDraft("user-a", "doc-7", "fa");

    expect(result).toMatchObject({ ok: true, source: "remote", session: { id: "fa-draft", language: "fa" } });
    expect(mocks.collection).toHaveBeenCalledWith(mocks.db, "users", "user-a", "interactive_study_sessions");
    expect(mocks.where).toHaveBeenCalledWith("document_id", "==", "doc-7");
  });

  it("resumes the cached draft offline but does not confuse another account's cache", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const session = createInteractiveStudySessionDraft("user-a", "doc-7", "Lesson", "en", '<p>Saved locally</p>');
    mocks.cacheGet.mockResolvedValueOnce(session);

    const result = await loadLatestInteractiveStudyDraft("user-a", "doc-7", "en");
    expect(result).toMatchObject({ ok: true, source: "cache", session: { id: session.id } });
    expect(mocks.getDocs).not.toHaveBeenCalled();

    mocks.cacheGet.mockResolvedValueOnce({ ...session, user_id: "user-b" });
    const wrongOwner = await loadLatestInteractiveStudyDraft("user-a", "doc-7", "en");
    expect(wrongOwner.ok).toBe(false);
  });

  it("falls back to the account-scoped cached draft if the remote read fails", async () => {
    const session = createInteractiveStudySessionDraft("user-a", "doc-7", "Lesson", "en", '<p>Cached practice</p>');
    mocks.cacheGet.mockResolvedValueOnce(session);
    mocks.getDocs.mockRejectedValueOnce(new Error("network unavailable"));

    const result = await loadLatestInteractiveStudyDraft("user-a", "doc-7", "en");

    expect(result).toMatchObject({ ok: true, source: "cache", session: { id: session.id } });
  });
});
