import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canReplayForOwner, retireOwnedModuleData, discardQueuedOp, clearQueue, clearUserLocalData, enqueueOp, enqueueOps, flushQueue, getQueue, type QueuedOp } from "./offlineQueue";
import * as offlineDb from "./offlineDb";
import { firebaseStore } from "./firebaseStore";

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: "account-a" } } }));
vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn().mockResolvedValue(true),
  saveEntityToFirestoreWithOutcome: vi.fn().mockResolvedValue("saved"),
  deleteEntityFromFirestore: vi.fn().mockResolvedValue(true),
  replayQueuedEntityWithOutcome: vi.fn().mockResolvedValue("saved"),
  replayQueuedNoteTaskLinkWithOutcome: vi.fn().mockResolvedValue("saved"),
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

  it("safely attributes legacy operations only when their explicit owner fields agree", () => {
    expect(canReplayForOwner({ payload: { user_id: "account-a" } }, "account-a")).toBe(true);
    expect(canReplayForOwner({ payload: { userId: "account-a" } }, "account-a")).toBe(true);
    expect(canReplayForOwner({ match: { user_id: "account-a" } }, "account-a")).toBe(true);
    expect(canReplayForOwner({ ownerId: "account-a", payload: { user_id: "account-b" } }, "account-a")).toBe(false);
    expect(canReplayForOwner({ payload: { user_id: "account-a" }, ownershipConflict: true }, "account-a")).toBe(false);
    expect(canReplayForOwner({ payload: { user_id: "account-b" } }, "account-a")).toBe(false);
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

  it("clears only the deleted account's queued operations and scoped cache keys", async () => {
    await enqueueOp({ ownerId: "account-a", table: "tasks", op: "upsert", payload: { id: "a", user_id: "account-a" } });
    await enqueueOp({ ownerId: "account-b", table: "tasks", op: "upsert", payload: { id: "b", user_id: "account-b" } });
    await offlineDb.cacheSet("tasks:all:account-a", [{ id: "a" }]);
    await offlineDb.cacheSet("tasks:all:account-b", [{ id: "b" }]);
    await offlineDb.cacheSet("note_task_links_account-a", [{ id: "link-a", user_id: "account-a" }]);
    await offlineDb.cacheSet("note_task_links_account-b", [{ id: "link-b", user_id: "account-b" }]);
    localStorage.setItem("pomodoro_today_count_v2:account-a", "1");
    localStorage.setItem("pomodoro_today_count_v2:account-b", "2");

    await expect(clearUserLocalData("account-a")).resolves.toBe(true);

    expect(await getQueue()).toEqual(expect.arrayContaining([expect.objectContaining({ ownerId: "account-b" })]));
    expect(await getQueue()).not.toEqual(expect.arrayContaining([expect.objectContaining({ ownerId: "account-a" })]));
    await expect(offlineDb.cacheGet("tasks:all:account-a")).resolves.toBeUndefined();
    await expect(offlineDb.cacheGet("tasks:all:account-b")).resolves.toEqual([{ id: "b" }]);
    await expect(offlineDb.cacheGet("note_task_links_account-a")).resolves.toBeUndefined();
    await expect(offlineDb.cacheGet("note_task_links_account-b")).resolves.toEqual([{ id: "link-b", user_id: "account-b" }]);
    expect(localStorage.getItem("pomodoro_today_count_v2:account-a")).toBeNull();
    expect(localStorage.getItem("pomodoro_today_count_v2:account-b")).toBe("2");
  });

  it("reports incomplete local cleanup when a legacy queue item has no safe account owner", async () => {
    localStorage.setItem("arshnaz_offline_outbox_fallback", JSON.stringify([
      { id: 900, table: "tasks", op: "upsert", payload: { id: "unowned" }, createdAt: 1, attempts: 0 },
    ]));

    await expect(clearUserLocalData("account-a")).resolves.toBe(false);
    expect(await getQueue()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 900 })]));
  });

  it("does not assign the signed-in owner to a queue write with conflicting explicit identities", async () => {
    const accepted = await enqueueOp({
      ownerId: "account-b",
      table: "tasks",
      op: "upsert",
      payload: { id: "task-conflict", user_id: "account-a" },
    });

    expect(accepted).toBe(true);
    const queued = (await getQueue()).find((item) => item.table === "tasks");
    expect(queued?.ownerId).toBeUndefined();
    expect(queued?.ownershipConflict).toBe(true);
    expect(canReplayForOwner(queued || {}, "account-a")).toBe(false);
  });

  it("persists a related batch together in the localStorage fallback", async () => {
    const accepted = await enqueueOps([
      { ownerId: "account-a", table: "tasks", op: "delete", match: { id: "root" } },
      { ownerId: "account-a", table: "tasks", op: "delete", match: { id: "child" } },
    ]);

    expect(accepted).toBe(true);
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "tasks", match: { id: "root" }, ownerId: "account-a" }),
      expect.objectContaining({ table: "tasks", match: { id: "child" }, ownerId: "account-a" }),
    ]));
  });

  it("preserves a different account whose UID starts with the deleted UID", async () => {
    await offlineDb.cacheSet("tasks:all:account-a", [{ id: "private-a" }]);
    localStorage.setItem("pomodoro_today_count_v2:account-a", "3");
    await offlineDb.cacheSet("task_notes_account_other_task", [{ id: "private", user_id: "account_other" }]);
    await clearUserLocalData("account");
    expect(await offlineDb.cacheGet("tasks:all:account-a")).toEqual([{ id: "private-a" }]);
    expect(localStorage.getItem("pomodoro_today_count_v2:account-a")).toBe("3");
    expect(await offlineDb.cacheGet("task_notes_account_other_task")).toEqual([{ id: "private", user_id: "account_other" }]);
  });

  it("retains ambiguous dynamic underscore keys instead of deleting another owner's preferences", async () => {
    localStorage.setItem("arshnaz_folder_prefs_v1_folder_account_other", JSON.stringify({ view: "list" }));
    await expect(clearUserLocalData("other")).resolves.toBe(false);
    expect(localStorage.getItem("arshnaz_folder_prefs_v1_folder_account_other")).not.toBeNull();
  });

  it("does not discard unowned or another account's changes through the recovery API", async () => {
    const unknown = { id: 900, table: "tasks", op: "upsert" as const, payload: { id: "unowned" }, createdAt: 1, attempts: 0 };
    localStorage.setItem("arshnaz_offline_outbox_fallback", JSON.stringify([unknown]));
    await expect(discardQueuedOp(unknown)).rejects.toThrow("active account");
    expect(await getQueue()).toContainEqual(unknown);
    expect(canReplayForOwner({ ownerId: "account-a", payload: [{ user_id: "account-b" }] }, "account-a")).toBe(false);
  });

  it("retires only the current owner's old module queue while retaining shared and unidentified data", async () => {
    await enqueueOp({ ownerId: "account-a", table: "pharmacy_practice", op: "upsert", payload: { id: "old-a" } });
    await enqueueOp({ ownerId: "account-b", table: "leitner_reviews", op: "upsert", payload: { id: "old-b" } });
    await enqueueOp({ ownerId: "account-a", table: "leitner_cards", op: "upsert", payload: { id: "shared" } });
    const held = JSON.parse(localStorage.getItem("arshnaz_offline_outbox_fallback") || "[]");
    held.push({ id: 999, table: "pharmacy_practice", op: "upsert", payload: { id: "unknown" }, createdAt: 1, attempts: 0 });
    localStorage.setItem("arshnaz_offline_outbox_fallback", JSON.stringify(held));
    expect(await retireOwnedModuleData("account-a")).toEqual({ removed: 1, incomplete: true });
    const remaining = await getQueue();
    expect(remaining).toHaveLength(3);
    expect(remaining.map(item => (item.payload as any).id)).toEqual(expect.arrayContaining(["old-b", "shared", "unknown"]));
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

  it("replays interactive study sessions through the owner-scoped Firestore adapter", async () => {
    const { replayQueuedEntityWithOutcome } = await import("./firestoreSync");
    vi.mocked(replayQueuedEntityWithOutcome).mockResolvedValue("saved");
    const session = { id: "session-1", user_id: "account-a", document_id: "doc-1" };
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "interactive_study_sessions",
      op: "upsert",
      payload: session,
      match: { id: session.id },
    });
    expect(accepted).toBe(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 1, failed: 0 });
    expect(replayQueuedEntityWithOutcome).toHaveBeenCalledWith(
      "account-a", "interactive_study_sessions", "session-1", expect.objectContaining({ op: "upsert", payload: session }),
    );
    expect(firebaseStore.from).not.toHaveBeenCalled();
  });

  it("replays queued Socratic sessions through their private Firestore collection", async () => {
    const { replayQueuedEntityWithOutcome } = await import("./firestoreSync");
    vi.mocked(replayQueuedEntityWithOutcome).mockClear().mockResolvedValue("saved");
    const session = { id: "current", user_id: "account-a", messages: [] };
    await enqueueOp({
      ownerId: "account-a",
      table: "socratic_sessions",
      op: "upsert",
      payload: session,
      match: { id: session.id },
    });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 1, failed: 0 });
    expect(replayQueuedEntityWithOutcome).toHaveBeenCalledWith(
      "account-a", "socratic_sessions", "current", expect.objectContaining({ op: "upsert", payload: session }),
    );
    expect(firebaseStore.from).not.toHaveBeenCalled();
  });

  it("replays Pharmacy import provenance only through the owning account", async () => {
    const { saveEntityToFirestoreWithOutcome } = await import("./firestoreSync");
    vi.mocked(saveEntityToFirestoreWithOutcome).mockResolvedValue("saved");
    const manifest = {
      id: "pharmacy-source-snapshot-with-cards",
      user_id: "account-a",
      schema_version: 1,
      source_commit_sha: "a".repeat(40),
    };
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "knowledge_import_manifests",
      op: "upsert",
      payload: manifest,
      match: { id: manifest.id },
    });
    expect(accepted).toBe(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 1, failed: 0 });
    expect(saveEntityToFirestoreWithOutcome).toHaveBeenCalledWith(
      "account-a", "knowledge_import_manifests", manifest.id, manifest, true,
    );
    expect(await getQueue()).toHaveLength(0);
  });

  it("replays a queued task-knowledge cleanup by owner and task ID", async () => {
    const deleteQuery = {
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    const deleteBuilder = { eq: vi.fn(() => deleteQuery) };
    vi.mocked(firebaseStore.from).mockReturnValue({ delete: () => deleteBuilder } as any);
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "task_knowledge_links",
      op: "delete",
      match: { task_id: "task-removed" },
    });
    expect(accepted).toBe(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 1, failed: 0 });
    expect(firebaseStore.from).toHaveBeenCalledWith("task_knowledge_links", "account-a");
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", "account-a");
    expect(deleteQuery.eq).toHaveBeenCalledWith("task_id", "task-removed");
    expect(await getQueue()).toHaveLength(0);
  });

  it("replays a queued note-task link through the endpoint-validating transaction", async () => {
    const { replayQueuedNoteTaskLinkWithOutcome } = await import("./firestoreSync");
    vi.mocked(replayQueuedNoteTaskLinkWithOutcome).mockClear().mockResolvedValue("saved");
    const link = {
      id: "stable-link",
      user_id: "account-a",
      note_id: "note-a",
      task_id: "task-a",
      created_at: "2026-10-07T10:00:00.000Z",
    };
    await enqueueOp({ ownerId: "account-a", table: "note_task_links", op: "upsert", payload: link, match: { id: link.id } });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 1, failed: 0 });
    expect(replayQueuedNoteTaskLinkWithOutcome).toHaveBeenCalledWith("account-a", "stable-link", link);
    expect(await getQueue()).toHaveLength(0);
  });

  it("keeps another account's queued note-task link untouched after an account switch", async () => {
    const { replayQueuedNoteTaskLinkWithOutcome } = await import("./firestoreSync");
    vi.mocked(replayQueuedNoteTaskLinkWithOutcome).mockClear();
    await enqueueOp({
      ownerId: "account-b",
      table: "note_task_links",
      op: "upsert",
      payload: { id: "foreign-link", user_id: "account-b", note_id: "foreign-note", task_id: "foreign-task", created_at: "now" },
    });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 0, failed: 0 });
    expect(replayQueuedNoteTaskLinkWithOutcome).not.toHaveBeenCalled();
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ ownerId: "account-b", table: "note_task_links", payload: expect.objectContaining({ user_id: "account-b" }) }),
    ]));
  });

  it("replays note and task relationship sweeps only under the owning account", async () => {
    const deleteQuery = {
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    const deleteBuilder = { eq: vi.fn(() => deleteQuery) };
    vi.mocked(firebaseStore.from).mockReturnValue({ delete: () => deleteBuilder } as any);
    await enqueueOp({ ownerId: "account-a", table: "note_task_links", op: "delete", match: { user_id: "account-a", note_id: "note-a" } });
    await enqueueOp({ ownerId: "account-a", table: "note_task_links", op: "delete", match: { user_id: "account-a", task_id: "task-a" } });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 2, failed: 0 });
    expect(firebaseStore.from).toHaveBeenCalledWith("note_task_links", "account-a");
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", "account-a");
    expect(deleteQuery.eq).toHaveBeenCalledWith("note_id", "note-a");
    expect(deleteQuery.eq).toHaveBeenCalledWith("task_id", "task-a");
    expect(await getQueue()).toHaveLength(0);
  });

  it("pauses stale Firestore mutations and retries them only after an explicit Sync", async () => {
    const { saveEntityToFirestoreWithOutcome } = await import("./firestoreSync");
    vi.mocked(saveEntityToFirestoreWithOutcome).mockClear().mockResolvedValue("stale");
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "knowledge_documents",
      op: "update",
      payload: { id: "doc-conflict", user_id: "account-a", updated_at: "2026-01-01T00:00:00.000Z" },
      match: { id: "doc-conflict" },
    });
    expect(accepted).toBe(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.mocked(firebaseStore.from).mockClear();

    expect(await flushQueue()).toEqual({ ok: 0, failed: 1 });
    expect(saveEntityToFirestoreWithOutcome).toHaveBeenCalledOnce();
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "knowledge_documents", match: { id: "doc-conflict" }, conflictReason: "remote-newer" }),
    ]));
    expect(await flushQueue()).toEqual({ ok: 0, failed: 0 });
    expect(saveEntityToFirestoreWithOutcome).toHaveBeenCalledOnce();

    expect(await flushQueue({ retryConflicts: true })).toEqual({ ok: 0, failed: 1 });
    expect(saveEntityToFirestoreWithOutcome).toHaveBeenCalledTimes(2);
    expect(firebaseStore.from).not.toHaveBeenCalled();
  });

  it("retains a queued task delete when the transaction sees a newer cloud revision", async () => {
    const { replayQueuedEntityWithOutcome } = await import("./firestoreSync");
    vi.mocked(replayQueuedEntityWithOutcome).mockResolvedValueOnce("stale");
    await enqueueOp({ ownerId: "account-a", table: "tasks", op: "delete", match: { id: "task-newer" }, expectedRevision: "2026-09-25T10:00:00.000Z" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 0, failed: 1 });
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "tasks", match: { id: "task-newer" }, expectedRevision: "2026-09-25T10:00:00.000Z", conflictReason: "remote-newer" }),
    ]));
    expect(await flushQueue()).toEqual({ ok: 0, failed: 0 });
  });

  it("preserves the Firestore quota error and allows an explicit retry before the backoff expires", async () => {
    const { replayQueuedEntityWithOutcome } = await import("./firestoreSync");
    vi.mocked(replayQueuedEntityWithOutcome).mockReset().mockRejectedValueOnce(new Error("RESOURCE_EXHAUSTED: Free daily read units per project"))
      .mockResolvedValueOnce("saved");
    await enqueueOp({
      ownerId: "account-a", table: "tasks", op: "update",
      payload: { id: "quota-task", user_id: "account-a" }, match: { id: "quota-task" },
    });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 0, failed: 1 });
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ lastError: expect.stringContaining("RESOURCE_EXHAUSTED"), attempts: 1 }),
    ]));
    expect(await flushQueue()).toEqual({ ok: 0, failed: 0 });
    expect(await flushQueue({ forceRetry: true })).toEqual({ ok: 1, failed: 0 });
    expect(await getQueue()).toHaveLength(0);
  });

  it("does not clear a legacy update when the server confirms zero rows changed", async () => {
    vi.mocked(firebaseStore.from).mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    } as any);
    const accepted = await enqueueOp({
      ownerId: "account-a",
      table: "settings",
      op: "update",
      payload: { theme: "dark" },
      match: { user_id: "account-a" },
    });
    expect(accepted).toBe(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    expect(await flushQueue()).toEqual({ ok: 0, failed: 1 });
    expect(await getQueue()).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "settings", match: { user_id: "account-a" } }),
    ]));
  });
});
