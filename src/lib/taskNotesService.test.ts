import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getTaskNotes,
  createTaskNote,
  updateTaskNote,
  deleteTaskNote,
  getTaskNotesCacheKey,
  getAllNotesCacheKey,
} from "./taskNotesService";
import { cacheGet, cacheSet, clearQueue, enqueueOp, getPendingOps } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import * as offlineQueue from "./offlineQueue";

const mockState = vi.hoisted(() => ({ remoteNotes: [] as Record<string, any>[], remoteError: null as unknown }));

// Mock Firestore sync and store
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => {
        const query: any = {};
        query.eq = () => query;
        query.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
          Promise.resolve({ data: mockState.remoteNotes, error: mockState.remoteError }).then(resolve, reject);
        return query;
      },
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn(async (_userId: string, table: string, id: string, data: Record<string, any>) => {
    if (table === "notes") {
      mockState.remoteNotes = [
        ...mockState.remoteNotes.filter((note) => note.id !== id),
        { ...data, id },
      ];
    }
    return true;
  }),
  deleteEntityFromFirestore: vi.fn(async (_userId: string, table: string, id: string) => {
    if (table === "notes") mockState.remoteNotes = mockState.remoteNotes.filter((note) => note.id !== id);
    return true;
  }),
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: { uid: "test-user-id" } },
  db: {},
}));

describe("taskNotesService", () => {
  const userId = "user-notes-123";
  const taskId = "task-notes-abc";

  beforeEach(async () => {
    localStorage.clear();
    await clearQueue();
    mockState.remoteNotes = [];
    mockState.remoteError = null;
    await cacheSet(getTaskNotesCacheKey(userId, taskId), []);
    await cacheSet(getAllNotesCacheKey(userId), []);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await clearQueue();
  });

  it("1. creates multiple independent notes for a single task", async () => {
    const note1 = await createTaskNote(userId, taskId, {
      title: "First Note",
      content: "Details about research",
    });
    const note2 = await createTaskNote(userId, taskId, {
      title: "Second Note",
      content: "Meeting minutes",
    });
    const note3 = await createTaskNote(userId, taskId, {
      title: "Third Note",
      content: "Action checklist",
    });

    expect(note1.id).toBeDefined();
    expect(note2.id).toBeDefined();
    expect(note3.id).toBeDefined();
    expect(note1.id).not.toBe(note2.id);
    expect(note2.id).not.toBe(note3.id);

    expect(note1.task_id).toBe(taskId);
    expect(note2.task_id).toBe(taskId);
    expect(note3.task_id).toBe(taskId);

    const notes = await getTaskNotes(taskId, userId);
    expect(notes.length).toBe(3);
    const titles = notes.map((n) => n.title);
    expect(titles).toContain("First Note");
    expect(titles).toContain("Second Note");
    expect(titles).toContain("Third Note");
  });

  it("2. supports rapid sequential and concurrent note creation without dropping notes", async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      createTaskNote(userId, taskId, {
        title: `Rapid Note ${i + 1}`,
        content: `Rapid content ${i + 1}`,
      })
    );

    const createdNotes = await Promise.all(promises);
    expect(createdNotes.length).toBe(5);

    const notes = await getTaskNotes(taskId, userId);
    expect(notes.length).toBe(5);
    for (let i = 1; i <= 5; i++) {
      expect(notes.some((n) => n.title === `Rapid Note ${i}`)).toBe(true);
    }
  });

  it("keeps concurrent notes from different tasks in the shared notes cache", async () => {
    const [first, second] = await Promise.all([
      createTaskNote(userId, "task-a", { title: "A", content: "first" }),
      createTaskNote(userId, "task-b", { title: "B", content: "second" }),
    ]);

    const allNotes = await cacheGet<any[]>(getAllNotesCacheKey(userId));
    expect(allNotes?.map((note) => note.id)).toEqual(expect.arrayContaining([first.id, second.id]));
  });

  it("3. rejects empty notes and does not write empty records", async () => {
    await expect(
      createTaskNote(userId, taskId, { title: "   ", content: "   " })
    ).rejects.toThrow("Note cannot be completely empty");

    const notes = await getTaskNotes(taskId, userId);
    expect(notes.length).toBe(0);
  });

  it("4. updates a note without altering other notes or tasks", async () => {
    const created = await createTaskNote(userId, taskId, {
      title: "Initial Title",
      content: "Initial Content",
    });

    const updated = await updateTaskNote(userId, created.id, taskId, {
      title: "Updated Title",
      content: "Updated Content",
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.content).toBe("Updated Content");
    expect(updated.task_id).toBe(taskId);

    const notes = await getTaskNotes(taskId, userId);
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe("Updated Title");
    expect(notes[0].content).toBe("Updated Content");
  });

  it("5. deletes a note and leaves the task unaffected", async () => {
    const note1 = await createTaskNote(userId, taskId, {
      title: "Keep me",
      content: "I will survive",
    });
    const note2 = await createTaskNote(userId, taskId, {
      title: "Delete me",
      content: "Goodbye",
    });

    let notes = await getTaskNotes(taskId, userId);
    expect(notes.length).toBe(2);

    await deleteTaskNote(userId, note2.id, taskId);

    notes = await getTaskNotes(taskId, userId);
    expect(notes.length).toBe(1);
    expect(notes[0].id).toBe(note1.id);
    expect(notes[0].title).toBe("Keep me");
  });

  it("6. enqueues note operations in offlineQueue when remote sync fails", async () => {
    (saveEntityToFirestore as any).mockResolvedValueOnce(false);

    const offlineNote = await createTaskNote(userId, taskId, {
      title: "Offline Note",
      content: "Created while offline",
    });

    expect(offlineNote).toBeDefined();

    // Check that operation was added to offline queue
    const pending = await getPendingOps();
    expect(pending.length).toBeGreaterThan(0);
    const noteOp = pending.find((op) => op.table === "notes" && (op.payload as any)?.id === offlineNote.id);
    expect(noteOp).toBeDefined();
    expect(noteOp?.op).toBe("insert");

    // Local getTaskNotes still returns the note seamlessly
    const notes = await getTaskNotes(taskId, userId);
    expect(notes.some((n) => n.id === offlineNote.id)).toBe(true);
  });

  it("overlays a queued edit on an older remote note instead of showing stale content", async () => {
    const remote = {
      id: "note-stale-edit",
      user_id: userId,
      task_id: taskId,
      title: "Cloud title",
      content: "Older cloud content",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    mockState.remoteNotes = [remote];
    vi.spyOn(offlineQueue, "getPendingOps").mockResolvedValueOnce([{
      id: 1,
      ownerId: userId,
      table: "notes",
      op: "update",
      payload: { ...remote, title: "Local queued title", updated_at: "2026-01-02T00:00:00.000Z" },
      match: { id: remote.id },
      createdAt: 1,
      attempts: 0,
    }]);

    const notes = await getTaskNotes(taskId, userId);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("Local queued title");
  });

  it("does not resurrect a note whose delete is waiting in the outbox", async () => {
    const remote = {
      id: "note-pending-delete",
      user_id: userId,
      task_id: taskId,
      title: "Deleted locally",
      content: "Must stay deleted",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    mockState.remoteNotes = [remote];
    vi.spyOn(offlineQueue, "getPendingOps").mockResolvedValueOnce([{
      id: 2,
      ownerId: userId,
      table: "notes",
      op: "delete",
      match: { id: remote.id },
      createdAt: 1,
      attempts: 0,
    }]);

    await expect(getTaskNotes(taskId, userId)).resolves.toEqual([]);
  });

  it("keeps cached notes when offline even if they have no pending mutation", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const cachedNote = {
      id: "note-cached-offline",
      user_id: userId,
      task_id: taskId,
      title: "Cached note",
      content: "Available offline",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    await cacheSet(getTaskNotesCacheKey(userId, taskId), [cachedNote]);

    await expect(getTaskNotes(taskId, userId)).resolves.toContainEqual(cachedNote);
  });

  it("renders a queued note even if its device cache is missing", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const queuedNote = {
      id: "note-only-in-outbox",
      user_id: userId,
      task_id: taskId,
      title: "Recovered from outbox",
      content: "Durably queued",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    await enqueueOp({
      ownerId: userId,
      table: "notes",
      op: "insert",
      payload: queuedNote,
    });

    await cacheSet(getTaskNotesCacheKey(userId, taskId), []);
    await expect(getTaskNotes(taskId, userId)).resolves.toContainEqual(queuedNote);
  });

  it("does not report a new note saved when neither Firestore nor the durable queue accepts it", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (saveEntityToFirestore as any).mockResolvedValueOnce(false);

    await expect(createTaskNote(userId, taskId, {
      title: "Not durably saved",
      content: "Must roll back",
    })).rejects.toThrow("sync queue storage is unavailable");
    expect(await getTaskNotes(taskId, userId)).toEqual([]);
  });

  it("restores an existing note when an edit cannot be synced or queued", async () => {
    const original = await createTaskNote(userId, taskId, { title: "Original", content: "Keep this" });
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (saveEntityToFirestore as any).mockResolvedValueOnce(false);

    await expect(updateTaskNote(userId, original.id, taskId, { content: "Unsaved edit" })).rejects.toThrow(
      "sync queue storage is unavailable",
    );
    expect(await getTaskNotes(taskId, userId)).toContainEqual(original);
  });

  it("restores a note when deletion cannot be synced or queued", async () => {
    const original = await createTaskNote(userId, taskId, { title: "Keep me", content: "Still needed" });
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (deleteEntityFromFirestore as any).mockResolvedValueOnce(false);

    await expect(deleteTaskNote(userId, original.id, taskId)).rejects.toThrow(
      "sync queue storage is unavailable",
    );
    expect(await getTaskNotes(taskId, userId)).toContainEqual(original);
  });
});
