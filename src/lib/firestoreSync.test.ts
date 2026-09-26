import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDocMock, setDocMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
}));

vi.mock("./firebase", () => ({
  auth: { currentUser: { uid: "user-sync-test" } },
  db: {},
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: "mock-doc" })),
  getDoc: getDocMock,
  getDocs: vi.fn(),
  setDoc: setDocMock,
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock("./firebaseStore", () => ({
  firebaseStore: {
    from: vi.fn(() => {
      const query: any = {
        select() { return this; },
        eq() { return this; },
        limit: vi.fn(async () => ({ data: [], error: null })),
      };
      return query;
    }),
  },
}));
vi.mock("./offlineDb", () => ({ cacheGet: vi.fn(), cacheSet: vi.fn() }));
vi.mock("@/features/tasks/taskCache", () => ({
  extractTasksFromCache: vi.fn(() => []),
  createTaskCacheEnvelope: vi.fn((tasks) => tasks),
}));

import { backupAllToFirestore, saveEntityToFirestore } from "./firestoreSync";
import { firebaseStore } from "./firebaseStore";

describe("Firestore stale-write protection", () => {
  afterEach(() => vi.clearAllMocks());

  it("rejects stale writes as unconfirmed so callers keep the mutation pending", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ updatedAt: "2026-09-24T12:00:00.000Z" }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-1",
      { id: "doc-1", updated_at: "2026-09-23T12:00:00.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("does not write when the current remote version cannot be read", async () => {
    getDocMock.mockRejectedValue(new Error("permission or network failure"));

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-unverified",
      { id: "doc-unverified", updated_at: "2026-09-25T12:00:00.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("uses application edit timestamps before Firestore sync receipt timestamps", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        updated_at: "2026-09-25T00:00:01.000Z",
        updatedAt: "2026-09-25T00:00:05.000Z",
      }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-2",
      {
        id: "doc-2",
        updated_at: "2026-09-25T00:00:06.000Z",
        updatedAt: "2026-09-25T00:00:02.000Z",
      },
    );

    expect(saved).toBe(true);
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it("keeps camel-case-only legacy entities on stale-write protection", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ updatedAt: "2026-09-25T00:00:02.000Z" }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "settings",
      "settings-1",
      { id: "settings-1", updatedAt: "2026-09-25T00:00:01.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("compares interactive-study drafts by their version timestamp, not later sync receipt time", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        updated_at: "2026-09-25T00:00:00.000Z",
        updatedAt: "2026-09-25T00:00:05.000Z",
      }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "interactive_study_sessions",
      "session-1",
      { id: "session-1", updated_at: "2026-09-25T00:00:01.000Z" },
    );

    expect(saved).toBe(true);
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it("still rejects an interactive-study draft older than the saved application version", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        updated_at: "2026-09-25T00:00:02.000Z",
        updatedAt: "2026-09-25T00:00:05.000Z",
      }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "interactive_study_sessions",
      "session-1",
      { id: "session-1", updated_at: "2026-09-25T00:00:01.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("Firestore backup accuracy", () => {
  beforeEach(() => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined });
    setDocMock.mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("preserves backup fields, ownership, and source revision timestamps", async () => {
    const task = {
      id: "task-1",
      user_id: "old-account",
      title: "Review lesson",
      priority: "high",
      updated_at: "2026-09-25T12:00:00.000Z",
      recurrence_rule: { freq: "weekly", byweekday: [1, 3] },
      reminder_plan: { enabled: true, trigger_at: "2026-09-27T10:00:00.000Z" },
      outcome_review: { helpful: "helpful", note: "keep this" },
      nested: { retained: true, omit: undefined },
      values: ["first", undefined, "third"],
      _graceUntil: Date.now() + 5000,
    } as any;
    const note = {
      id: "note-1",
      user_id: "old-account",
      title: "Study notes",
      content: "Preserve attachments and metadata",
      attachments: [{ id: "media-1", url: "https://example.test/image.png" }],
      updated_at: "2026-09-25T13:00:00.000Z",
    };

    const result = await backupAllToFirestore({ id: "current-account" }, [task], [note]);

    expect(result.success).toBe(true);
    expect(result.stats).toMatchObject({ tasksCount: 1, notesCount: 1, failedTasksCount: 0, failedNotesCount: 0 });
    const savedTask = setDocMock.mock.calls[0][1] as Record<string, any>;
    const savedNote = setDocMock.mock.calls[1][1] as Record<string, any>;
    expect(savedTask).toMatchObject({
      id: "task-1",
      user_id: "current-account",
      userId: "current-account",
      recurrence_rule: task.recurrence_rule,
      reminder_plan: task.reminder_plan,
      outcome_review: task.outcome_review,
      updated_at: task.updated_at,
      nested: { retained: true },
      values: ["first", null, "third"],
    });
    expect(savedTask).not.toHaveProperty("_graceUntil");
    expect(savedTask.nested).not.toHaveProperty("omit");
    expect(savedNote).toMatchObject({
      id: "note-1",
      user_id: "current-account",
      attachments: note.attachments,
      updated_at: note.updated_at,
    });
  });

  it("reports partial failures instead of claiming the whole backup succeeded", async () => {
    setDocMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("permission denied"))
      .mockResolvedValueOnce(undefined);

    const result = await backupAllToFirestore(
      { id: "user-sync-test" },
      [
        { id: "task-saved", title: "Saved" } as any,
        { id: "task-failed", title: "Failed" } as any,
      ],
      [],
    );

    expect(result.success).toBe(false);
    expect(result.stats).toMatchObject({ tasksCount: 1, notesCount: 0, failedTasksCount: 1, failedNotesCount: 0 });
    expect(result.message).toContain("همگام‌سازی کامل نشد");
    expect(result.message).toContain("1 از 2 تسک");
  });

  it("does not report success when the backup status receipt cannot be saved", async () => {
    setDocMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("metadata write failed"));

    const result = await backupAllToFirestore(
      { id: "user-sync-test" },
      [{ id: "task-1", title: "Saved" } as any],
      [],
    );

    expect(result.success).toBe(false);
    expect(result.stats.tasksCount).toBe(1);
    expect(result.message).toContain("وضعیت همگام‌سازی هم ذخیره نشد");
  });

  it("counts malformed backup rows as failures rather than silently skipping them", async () => {
    const result = await backupAllToFirestore(
      { id: "user-sync-test" },
      [{ title: "Missing stable id" } as any],
      [],
    );

    expect(result.success).toBe(false);
    expect(result.stats.failedTasksCount).toBe(1);
    expect(result.message).toContain("0 از 1 تسک");
  });

  it("does not claim an empty backup succeeded when a cloud source could not be checked", async () => {
    const failedQuery: any = {
      select() { return this; },
      eq() { return this; },
      limit: vi.fn(async () => ({ data: null, error: new Error("read denied") })),
    };
    vi.mocked(firebaseStore.from).mockReturnValueOnce(failedQuery);

    const result = await backupAllToFirestore({ id: "user-sync-test" }, [], []);

    expect(result.success).toBe(false);
    expect(result.stats.lastSyncedAt).toBeNull();
    expect(result.message).toContain("تسک‌های موجود از منبع ابری قابل بررسی نبودند");
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
