import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { saveEntityMock, enqueueOpMock } = vi.hoisted(() => ({
  saveEntityMock: vi.fn(),
  enqueueOpMock: vi.fn(),
}));

vi.mock("./firestoreSync", () => ({ saveEntityToFirestore: saveEntityMock }));
vi.mock("./offlineQueue", () => ({ enqueueOp: enqueueOpMock }));

import { restoreBackupRows } from "./backupRestoreService";

describe("backup restore persistence", () => {
  let originalOnline: boolean;

  beforeEach(() => {
    originalOnline = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    saveEntityMock.mockResolvedValue(true);
    enqueueOpMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: originalOnline });
  });

  it("uses only the revision-checked Firestore writer and preserves imported identity and timestamps", async () => {
    const source = {
      id: "task-1",
      user_id: "backup-owner",
      title: "Review",
      updated_at: "2026-09-20T10:00:00.000Z",
      recurrence_rule: { frequency: "weekly" },
      _graceUntil: Date.now() + 1000,
    };

    const result = await restoreBackupRows("active-owner", "tasks", [source]);

    expect(result).toMatchObject({ saved: [expect.objectContaining({ id: "task-1" })], queued: [], failedIds: [], skipped: 0 });
    expect(saveEntityMock).toHaveBeenCalledWith("active-owner", "tasks", "task-1", expect.objectContaining({
      id: "task-1",
      user_id: "active-owner",
      updated_at: source.updated_at,
      recurrence_rule: source.recurrence_rule,
    }));
    expect(saveEntityMock.mock.calls[0][3]).not.toHaveProperty("_graceUntil");
    expect(enqueueOpMock).not.toHaveBeenCalled();
  });

  it("reports revision conflicts as failures and never retries them through another writer", async () => {
    saveEntityMock.mockResolvedValueOnce(false);

    const result = await restoreBackupRows("active-owner", "notes", [{ id: "note-stale", content: "older" }]);

    expect(result.failedIds).toEqual(["note-stale"]);
    expect(result.saved).toHaveLength(0);
    expect(enqueueOpMock).not.toHaveBeenCalled();
  });

  it("queues offline records durably and reports them separately from cloud writes", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    const result = await restoreBackupRows("active-owner", "notes", [{ id: "note-offline", content: "draft" }]);

    expect(result.saved).toHaveLength(0);
    expect(result.queued).toEqual([expect.objectContaining({ id: "note-offline", user_id: "active-owner" })]);
    expect(enqueueOpMock).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "active-owner",
      table: "notes",
      op: "upsert",
      match: { id: "note-offline" },
    }));
    expect(saveEntityMock).not.toHaveBeenCalled();
  });

  it("does not count malformed rows as restored", async () => {
    const result = await restoreBackupRows("active-owner", "tasks", [null, { title: "missing id" }, { id: "ok" }]);

    expect(result.skipped).toBe(2);
    expect(result.saved).toHaveLength(1);
    expect(saveEntityMock).toHaveBeenCalledOnce();
  });
});
