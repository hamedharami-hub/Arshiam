import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDocMock, setDocMock, runTransactionMock, docMock, activeUid } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
  runTransactionMock: vi.fn(),
  docMock: vi.fn((...args: unknown[]) => ({ path: args.join("/") })),
  activeUid: { value: "user-sync-test" },
}));

vi.mock("./firebase", () => ({
  auth: { get currentUser() { return { uid: activeUid.value }; } },
  db: {},
  collection: vi.fn(),
  doc: docMock,
  getDoc: getDocMock,
  getDocs: vi.fn(),
  setDoc: setDocMock,
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

// The conflict check prefers the device copy (persistent cache); when neither the
// live listener nor the cache has the document it re-reads the revision from the server.
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  getDocFromCache: getDocMock,
  runTransaction: runTransactionMock,
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
  extractTasksFromCache: vi.fn((value: unknown) => Array.isArray(value) ? value : []),
  createTaskCacheEnvelope: vi.fn((tasks) => tasks),
}));

import {
  backupAllToFirestore,
  getFirestoreConflictSnapshot,
  saveEntityToFirestore,
  saveEntityToFirestoreWithOutcome,
  replayQueuedEntityWithOutcome,
  saveNoteTaskLinkWithOutcome,
  replayQueuedNoteTaskLinkWithOutcome,
} from "./firestoreSync";
import { firebaseStore } from "./firebaseStore";
import { cacheGet } from "./offlineDb";
import { makeNoteTaskLinkId } from "./noteTaskLinkTypes";

describe("Firestore stale-write protection", () => {
  afterEach(() => vi.clearAllMocks());

  it("reads the current cloud copy for a same-account conflict without writing", async () => {
    getDocMock.mockResolvedValueOnce({
      id: "doc-stale",
      exists: () => true,
      data: () => ({ title: "Cloud version", updated_at: "2026-09-26T10:00:00.000Z" }),
    });

    await expect(getFirestoreConflictSnapshot("user-sync-test", "knowledge_documents", "doc-stale"))
      .resolves.toEqual({
        exists: true,
        data: { id: "doc-stale", title: "Cloud version", updated_at: "2026-09-26T10:00:00.000Z" },
      });
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("fails closed for another account or unsupported conflict collections", async () => {
    await expect(getFirestoreConflictSnapshot("account-b", "tasks", "task-1"))
      .rejects.toThrow("same account");
    await expect(getFirestoreConflictSnapshot("user-sync-test", "arbitrary", "doc-1"))
      .rejects.toThrow("does not support");
    expect(getDocMock).not.toHaveBeenCalled();
  });

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

  it("distinguishes a known stale revision from a transient verification failure", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ updated_at: "2026-09-24T12:00:00.000Z" }),
    });
    await expect(saveEntityToFirestoreWithOutcome(
      "user-sync-test",
      "knowledge_documents",
      "doc-stale",
      { id: "doc-stale", updated_at: "2026-09-23T12:00:00.000Z" },
    )).resolves.toBe("stale");

    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("re-bases on the server revision when the local cache has no copy", async () => {
    // The cache read fails (document not cached); the server confirms it does not exist,
    // so this is a genuine first write and must still go through.
    getDocMock
      .mockRejectedValueOnce(new Error("not in cache"))
      .mockResolvedValueOnce({ exists: () => false, data: () => undefined });
    setDocMock.mockResolvedValue(undefined);

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-uncached",
      { id: "doc-uncached", updated_at: "2026-09-25T12:00:00.000Z" },
    );

    expect(saved).toBe(true);
    expect(getDocMock).toHaveBeenCalledTimes(2);
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an older write against the server copy when nothing is cached", async () => {
    getDocMock
      .mockRejectedValueOnce(new Error("not in cache"))
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ updated_at: "2026-09-24T12:00:00.000Z" }),
      });

    await expect(saveEntityToFirestoreWithOutcome(
      "user-sync-test",
      "knowledge_documents",
      "doc-uncached",
      { id: "doc-uncached", updated_at: "2026-09-23T12:00:00.000Z" },
    )).resolves.toBe("stale");

    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("fails closed when neither the cache nor the server can confirm the revision", async () => {
    // No live listener, no cached copy and an unreadable server revision: refusing the
    // write keeps the durable outbox free to retry it against a known revision later.
    getDocMock.mockRejectedValue(new Error("client is offline"));
    setDocMock.mockResolvedValue(undefined);

    await expect(saveEntityToFirestoreWithOutcome(
      "user-sync-test",
      "knowledge_documents",
      "doc-unverifiable",
      { id: "doc-unverifiable", updated_at: "2026-09-25T12:00:00.000Z" },
    )).resolves.toBe("failed");

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

describe("queued Firestore revisions", () => {
  afterEach(() => vi.clearAllMocks());

  it("rejects an older queued task using the server revision inside a transaction", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "2026-09-25T12:00:00.000Z" }) }),
      set, delete: vi.fn(),
    }));
    const result = await replayQueuedEntityWithOutcome("user-sync-test", "tasks", "task-1", {
      op: "upsert", payload: { id: "task-1", updated_at: "2030-09-25T11:00:00.000Z" }, createdAt: Date.parse("2030-09-25T11:00:00.000Z"), expectedRevision: "2026-09-25T10:00:00.000Z",
    });
    expect(result).toBe("stale");
    expect(set).not.toHaveBeenCalled();
  });

  it("does not delete a task whose observed revision changed, even with skewed device clocks", async () => {
    const remove = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "2026-09-25T12:00:00.000Z" }) }),
      set: vi.fn(), delete: remove,
    }));
    const result = await replayQueuedEntityWithOutcome("user-sync-test", "tasks", "task-1", {
      op: "delete", createdAt: Date.parse("2030-09-25T11:00:00.000Z"), expectedRevision: "2026-09-25T10:00:00.000Z",
    });
    expect(result).toBe("stale");
    expect(remove).not.toHaveBeenCalled();
  });

  it("retains a legacy queued delete without a recorded base revision", async () => {
    const remove = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "2026-09-25T10:00:00.000Z" }) }),
      set: vi.fn(), delete: remove,
    }));
    expect(await replayQueuedEntityWithOutcome("user-sync-test", "notes", "note-1", {
      op: "delete", createdAt: Date.parse("2030-09-25T11:00:00.000Z"),
    })).toBe("stale");
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes only when the cloud revision exactly matches the recorded base", async () => {
    const remove = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "2026-09-25T10:00:00.000Z" }) }),
      set: vi.fn(), delete: remove,
    }));
    expect(await replayQueuedEntityWithOutcome("user-sync-test", "tasks", "task-1", {
      op: "delete", createdAt: Date.parse("2020-09-25T11:00:00.000Z"), expectedRevision: "2026-09-25T10:00:00.000Z",
    })).toBe("saved");
    expect(remove).toHaveBeenCalledOnce();
  });

  it("does not recreate an existing record deleted remotely while its edit was offline", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => false }), set, delete: vi.fn(),
    }));
    expect(await replayQueuedEntityWithOutcome("user-sync-test", "notes", "deleted", {
      op: "upsert", payload: { id: "deleted", content: "Local" }, createdAt: 1, expectedRevision: "known-base",
    })).toBe("stale");
    expect(set).not.toHaveBeenCalled();
  });

  it("recognizes an already committed queued mutation after outbox acknowledgement failed", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "new-revision", _lastQueuedMutationId: "receipt-1" }) }),
      set, delete: vi.fn(),
    }));
    expect(await replayQueuedEntityWithOutcome("user-sync-test", "notes", "saved", {
      op: "upsert", payload: { id: "saved" }, createdAt: 1, expectedRevision: "old-revision", mutationId: "receipt-1",
    })).toBe("saved");
    expect(set).not.toHaveBeenCalled();
  });

  it("commits a current queued edit and keeps the same-account owner", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "2026-09-25T10:00:00.000Z" }) }),
      set, delete: vi.fn(),
    }));
    const result = await replayQueuedEntityWithOutcome("user-sync-test", "tasks", "task-1", {
      op: "upsert", payload: { id: "task-1", user_id: "user-sync-test", updated_at: "2020-09-25T11:00:00.000Z" }, createdAt: Date.parse("2020-09-25T11:00:00.000Z"), expectedRevision: "2026-09-25T10:00:00.000Z",
    });
    expect(result).toBe("saved");
    expect(set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: "user-sync-test" }), { merge: true });
  });

  it("does not replay an offline task into a folder that is being deleted", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async (ref: { path: string }) => {
        if (ref.path.endsWith("/folders/folder-locked")) return { exists: () => true, data: () => ({ _deleting: true }) };
        return { exists: () => false, data: () => undefined };
      },
      set, delete: vi.fn(),
    }));
    await expect(replayQueuedEntityWithOutcome("user-sync-test", "tasks", "queued-task", {
      op: "upsert", payload: { id: "queued-task", folder_id: "folder-locked" }, createdAt: 1,
    })).resolves.toBe("stale");
    expect(set).not.toHaveBeenCalled();
  });

  it("keeps a legacy queued edit without a base revision for review", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ updated_at: "2026-09-25T10:00:00.000Z" }) }),
      set, delete: vi.fn(),
    }));
    expect(await replayQueuedEntityWithOutcome("user-sync-test", "tasks", "task-1", {
      op: "upsert", payload: { id: "task-1", updated_at: "2030-09-25T11:00:00.000Z" }, createdAt: 1,
    })).toBe("stale");
    expect(set).not.toHaveBeenCalled();
  });
});

describe("owner-scoped note-task relationship transactions", () => {
  const linkId = makeNoteTaskLinkId("note-1", "task-1");
  const link = {
    id: linkId,
    user_id: "user-sync-test",
    note_id: "note-1",
    task_id: "task-1",
    created_at: "2026-10-07T10:00:00.000Z",
  };

  it("creates one deterministic relation only when both owner-scoped endpoints exist", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async (ref: { path: string }) => ({
        exists: () => !ref.path.endsWith(`/note_task_links/${linkId}`),
        data: () => undefined,
      }),
      set,
      delete: vi.fn(),
    }));

    await expect(saveNoteTaskLinkWithOutcome("user-sync-test", link)).resolves.toBe("saved");
    expect(set).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining(`users/user-sync-test/note_task_links/${linkId}`) }),
      expect.objectContaining({ id: linkId, user_id: "user-sync-test", note_id: "note-1", task_id: "task-1" }),
    );
  });

  it("treats a missing endpoint on outbox replay as a consumed orphan, without writing", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async (ref: { path: string }) => ({
        exists: () => !ref.path.endsWith("/notes/note-1"),
        data: () => undefined,
      }),
      set,
      delete: vi.fn(),
    }));

    await expect(replayQueuedNoteTaskLinkWithOutcome("user-sync-test", link.id, link)).resolves.toBe("saved");
    expect(set).not.toHaveBeenCalled();
  });

  it("recognizes the same existing pair as idempotent and rejects a foreign account", async () => {
    const set = vi.fn();
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: async (ref: { path: string }) => ({
        exists: () => ref.path.endsWith("/notes/note-1") || ref.path.endsWith("/tasks/task-1") ||
          ref.path.endsWith(`/note_task_links/${linkId}`),
        data: () => ({ user_id: "user-sync-test", note_id: "note-1", task_id: "task-1" }),
      }),
      set,
      delete: vi.fn(),
    }));

    await expect(saveNoteTaskLinkWithOutcome("user-sync-test", link)).resolves.toBe("saved");
    const callsBeforeForeignOwner = runTransactionMock.mock.calls.length;
    await expect(saveNoteTaskLinkWithOutcome("another-account", { ...link, user_id: "another-account" })).resolves.toBe("failed");
    expect(set).not.toHaveBeenCalled();
    expect(runTransactionMock).toHaveBeenCalledTimes(callsBeforeForeignOwner);
  });

  it("rejects alternate relationship IDs before opening a transaction", async () => {
    runTransactionMock.mockClear();
    await expect(saveNoteTaskLinkWithOutcome("user-sync-test", { ...link, id: "alternate-id" })).resolves.toBe("failed");
    expect(runTransactionMock).not.toHaveBeenCalled();
  });
});

describe("Firestore backup accuracy", () => {
  beforeEach(() => {
    activeUid.value = "user-sync-test";
    vi.mocked(cacheGet).mockReset();
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined });
    setDocMock.mockResolvedValue(undefined);
    runTransactionMock.mockReset().mockImplementation(async (_db, callback) => {
      const pendingWrites: Promise<unknown>[] = [];
      const outcome = await callback({
        get: async () => ({ exists: () => false, data: () => undefined }),
        set: (reference: unknown, value: unknown, options?: unknown) => {
          pendingWrites.push(setDocMock(reference, value, options));
        },
        delete: vi.fn(),
      });
      await Promise.all(pendingWrites);
      return outcome;
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("preserves backup fields, ownership, and source revision timestamps", async () => {
    activeUid.value = "current-account";
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

  it("does not import another account's unscoped legacy task or note caches", async () => {
    vi.mocked(cacheGet).mockImplementation(async (key) => {
      if (key === "tasks" || key === "offline_tasks") return [{ id: "task-a", user_id: "account-a", title: "Private A" }];
      if (key === "notes" || key === "offline_notes") return [{ id: "note-a", user_id: "account-a", title: "Private A" }];
      return undefined;
    });
    localStorage.setItem("arshnaz_notes", JSON.stringify([{ id: "legacy-note-a", user_id: "account-a" }]));

    try {
      const result = await backupAllToFirestore({ id: "account-b" }, [], []);
      expect(result.success).toBe(true);
      expect(result.stats).toMatchObject({ tasksCount: 0, notesCount: 0 });
      expect(vi.mocked(cacheGet).mock.calls.map(([key]) => key)).not.toEqual(expect.arrayContaining(["tasks", "offline_tasks", "notes", "offline_notes"]));
      expect(setDocMock).toHaveBeenCalledTimes(1); // Sync receipt only.
    } finally {
      localStorage.removeItem("arshnaz_notes");
    }
  });
});
