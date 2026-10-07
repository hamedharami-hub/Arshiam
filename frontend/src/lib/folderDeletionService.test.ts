import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: {
    folders: [
      { id: "root", parent_id: null },
      { id: "folder-a", parent_id: "root" },
      { id: "folder-b", parent_id: "folder-a" },
      { id: "other-folder", parent_id: null },
    ],
    tasks: [
      { id: "task-a", folder_id: "folder-a", parent_id: null },
      { id: "task-b", folder_id: "root", parent_id: "task-a" },
      { id: "task-c", folder_id: null, parent_id: "task-b" },
      { id: "other-task", folder_id: "other-folder", parent_id: null },
    ],
    notes: [
      { id: "note-a", folder_id: "folder-b" },
      { id: "other-note", folder_id: "other-folder" },
    ],
    folder_columns: [{ id: "column-a", folder_id: "folder-a" }],
  } as Record<string, Array<Record<string, unknown>>>,
  batches: [] as Array<{ paths: string[] }>,
  failCommitAt: 0,
  fromCache: false,
  selectedSources: [] as Array<unknown>,
  currentUserId: "owner-a",
  from: vi.fn(),
  pendingOps: [] as Array<Record<string, unknown>>,
  getPendingOps: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  trackWrite: vi.fn(),
}));

vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));
vi.mock("@/lib/firestoreUsage", () => ({ trackWrite: mocks.trackWrite }));
vi.mock("@/lib/offlineQueue", () => ({
  getPendingOps: mocks.getPendingOps,
  getQueuedOpOwnerId: (operation: { ownerId?: string }) => operation.ownerId,
}));
vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: { get currentUser() { return mocks.currentUserId ? { uid: mocks.currentUserId } : null; } },
  doc: vi.fn((_db, ...parts: string[]) => parts.join("/")),
  writeBatch: mocks.writeBatch,
  runTransaction: mocks.runTransaction,
}));

import { assertFolderContainerEmpty, assertFolderDeletePlanEmpty, collectFolderDeletePlan, deleteFolderContents, FolderDeleteError, sameFolderDeletePlan } from "./folderDeletionService";

describe("folder deletion planning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows.folders = [
      { id: "root", parent_id: null },
      { id: "folder-a", parent_id: "root" },
      { id: "folder-b", parent_id: "folder-a" },
      { id: "other-folder", parent_id: null },
    ];
    mocks.rows.tasks = [
      { id: "task-a", folder_id: "folder-a", parent_id: null },
      { id: "task-b", folder_id: "root", parent_id: "task-a" },
      { id: "task-c", folder_id: null, parent_id: "task-b" },
      { id: "other-task", folder_id: "other-folder", parent_id: null },
    ];
    mocks.rows.notes = [
      { id: "note-a", folder_id: "folder-b" },
      { id: "other-note", folder_id: "other-folder" },
    ];
    mocks.rows.folder_columns = [{ id: "column-a", folder_id: "folder-a" }];
    mocks.batches.length = 0;
    mocks.failCommitAt = 0;
    mocks.fromCache = false;
    mocks.selectedSources.length = 0;
    mocks.currentUserId = "owner-a";
    mocks.pendingOps = [];
    mocks.getPendingOps.mockResolvedValue([]);
    mocks.from.mockImplementation((table: string, ownerId?: string) => {
      const filters: Array<{ field: string; values: unknown[] }> = [];
      const builder: any = {
        select: (_columns: string, options?: { source?: string }) => { mocks.selectedSources.push(options?.source); return builder; },
        in: (field: string, values: unknown[]) => { filters.push({ field, values }); return builder; },
        eq: (field: string, value: unknown) => { filters.push({ field, values: [value] }); return builder; },
        then: (resolve: (value: unknown) => unknown) => {
          const source = mocks.rows[table] || [];
          const found = source.filter((row) => filters.every(({ field, values }) => values.includes(row[field])));
          return Promise.resolve({ data: found, error: null, fromCache: mocks.fromCache }).then(resolve);
        },
      };
      return builder;
    });
    mocks.writeBatch.mockImplementation(() => {
      const operations: Array<{ path: string; kind: "delete" | "update"; patch?: Record<string, unknown> }> = [];
      return {
        delete: (path: string) => { operations.push({ path, kind: "delete" }); },
        update: (path: string, patch: Record<string, unknown>) => { operations.push({ path, kind: "update", patch }); },
        commit: async () => {
          const paths = operations.map(({ path }) => path);
          mocks.batches.push({ paths });
          if (mocks.failCommitAt === mocks.batches.length) throw new Error("batch failed");
          for (const operation of operations) {
            const parts = operation.path.split("/");
            const table = parts.at(-2)!;
            const id = parts.at(-1)!;
            if (operation.kind === "delete") {
              mocks.rows[table] = (mocks.rows[table] || []).filter((row) => row.id !== id);
            } else {
              const index = (mocks.rows[table] || []).findIndex((row) => row.id === id);
              if (index < 0) throw new Error("Document does not exist");
              mocks.rows[table][index] = { ...mocks.rows[table][index], ...operation.patch };
            }
          }
        },
      };
    });
    mocks.runTransaction.mockImplementation(async (_db: unknown, callback: (tx: any) => Promise<unknown>) => {
      const updates: Array<{ path: string; patch: Record<string, unknown> }> = [];
      const tx = {
        get: async (path: string) => {
          const parts = path.split("/");
          const table = parts.at(-2)!;
          const id = parts.at(-1)!;
          const row = (mocks.rows[table] || []).find((candidate) => candidate.id === id);
          return { exists: () => Boolean(row), data: () => row };
        },
        update: (path: string, patch: Record<string, unknown>) => { updates.push({ path, patch }); },
      };
      const result = await callback(tx);
      for (const { path, patch } of updates) {
        const parts = path.split("/");
        const table = parts.at(-2)!;
        const id = parts.at(-1)!;
        const row = (mocks.rows[table] || []).find((candidate) => candidate.id === id);
        if (!row) throw new Error("Document does not exist");
        Object.assign(row, patch);
      }
      return result;
    });
  });

  it("collects nested folders, notes, columns, and every depth of subtask from the server", async () => {
    await expect(collectFolderDeletePlan("owner-a", "root")).resolves.toEqual({
      folderIds: ["root", "folder-a", "folder-b"],
      taskIds: ["task-a", "task-b", "task-c"],
      noteIds: ["note-a"],
      columnIds: ["column-a"],
    });
    expect(mocks.batches).toEqual([]);
    expect(mocks.from).toHaveBeenCalledWith("tasks", "owner-a");
    expect(mocks.from).toHaveBeenCalledWith("notes", "owner-a");
    expect(mocks.selectedSources.every((source) => source === "server")).toBe(true);
  });

  it("compares plan membership instead of treating equal-sized but changed plans as stable", () => {
    const current = { folderIds: ["root"], taskIds: ["moved-task"], noteIds: [], columnIds: [] };
    const refreshed = { folderIds: ["root"], taskIds: ["new-task"], noteIds: [], columnIds: [] };
    expect(sameFolderDeletePlan(current, refreshed)).toBe(false);
    expect(sameFolderDeletePlan(current, { ...current })).toBe(true);
  });

  it("refuses a cache-only cascade plan before any deletion starts", async () => {
    mocks.fromCache = true;
    await expect(collectFolderDeletePlan("owner-a", "root")).rejects.toThrow("دادهٔ کامل از سرور تأیید نشد");
    expect(mocks.batches).toEqual([]);
  });

  it("uses atomic bounded batches and reports only commits confirmed by Firestore", async () => {
    const taskIds = Array.from({ length: 451 }, (_, index) => `task-${index}`);
    mocks.rows.tasks = taskIds.map((id) => ({ id }));
    mocks.failCommitAt = 2;
    await expect(deleteFolderContents("owner-a", {
      folderIds: ["root"], taskIds, noteIds: ["note-a"], columnIds: [],
    })).rejects.toMatchObject({
      name: "FolderDeleteError",
      result: { deletedTaskIds: taskIds.slice(0, 450), deletedNoteIds: [], deletedColumnIds: [], deletedChildFolderIds: [] },
    } satisfies Partial<FolderDeleteError>);

    expect(mocks.batches.map((batch) => batch.paths.length)).toEqual([450, 1]);
    expect(mocks.rows.tasks).toEqual([{ id: "task-450" }]);
    expect(mocks.rows.notes).toHaveLength(2);
  });

  it("catches a task or folder created after the initial plan before the caller removes the root", async () => {
    const originalPlan = await collectFolderDeletePlan("owner-a", "root");
    await deleteFolderContents("owner-a", originalPlan);
    mocks.rows.tasks.push({ id: "late-task", folder_id: "root", parent_id: null });

    await expect(assertFolderDeletePlanEmpty("owner-a", "root")).rejects.toThrow("فولدر حذف نشد");
    expect(mocks.rows.tasks.some((row) => row.id === "late-task")).toBe(true);
  });

  it("checks only the source folder when confirming content was moved to the root", async () => {
    mocks.rows.tasks = [{ id: "nested-task", folder_id: "folder-a", parent_id: null }];
    mocks.rows.folders = [
      { id: "root", parent_id: null },
      { id: "folder-a", parent_id: null },
    ];
    mocks.rows.notes = [{ id: "nested-note", folder_id: "folder-a" }];
    mocks.rows.folder_columns = [];

    await expect(assertFolderContainerEmpty("owner-a", "root")).resolves.toBeUndefined();
  });

  it("blocks a cascade when this account has an unsynced write into the folder", async () => {
    mocks.pendingOps = [{ table: "tasks", op: "upsert", ownerId: "owner-a", payload: { id: "queued", folder_id: "root" } }];
    mocks.getPendingOps.mockResolvedValue(mocks.pendingOps);
    const plan = await collectFolderDeletePlan("owner-a", "root");

    const { assertNoPendingFolderWrites } = await import("./folderDeletionService");
    await expect(assertNoPendingFolderWrites("owner-a", plan)).rejects.toThrow("همگام نشده‌اند");
  });

  it("marks folders and content while deleting, and removes locks from surviving records after failure", async () => {
    const plan = await collectFolderDeletePlan("owner-a", "root");
    const { emptyFolderDeleteLockState, markFolderDeleteLocks, releaseFolderDeleteLocks } = await import("./folderDeletionService");
    const locked = emptyFolderDeleteLockState("operation-a");
    await markFolderDeleteLocks("owner-a", plan, locked);
    expect(locked).toEqual({ operationId: "operation-a", folderIds: plan.folderIds, taskIds: plan.taskIds, noteIds: plan.noteIds });
    expect(mocks.rows.folders.find((row) => row.id === "root")).toMatchObject({ _deleting: true, _delete_lock: "operation-a" });
    expect(mocks.rows.tasks.find((row) => row.id === "task-a")).toMatchObject({ _deleting: true, _delete_lock: "operation-a" });

    await deleteFolderContents("owner-a", { ...plan, taskIds: ["task-a"] });
    expect(await releaseFolderDeleteLocks("owner-a", locked)).toBe(true);
    expect(mocks.rows.folders.find((row) => row.id === "root")).toMatchObject({ _deleting: false, _delete_lock: "operation-a" });
    expect(mocks.rows.tasks.some((row) => row.id === "task-a")).toBe(false);
  });

  it("refuses to replace a lock held by another delete operation", async () => {
    mocks.rows.folders.find((row) => row.id === "root")!._deleting = true;
    mocks.rows.folders.find((row) => row.id === "root")!._delete_lock = "operation-current";
    const { emptyFolderDeleteLockState, markFolderDeleteLocks } = await import("./folderDeletionService");
    const attempt = emptyFolderDeleteLockState("operation-next");

    await expect(markFolderDeleteLocks("owner-a", {
      folderIds: ["root"], taskIds: [], noteIds: [], columnIds: [],
    }, attempt)).rejects.toThrow("عملیات حذف دیگری");
    expect(mocks.rows.folders.find((row) => row.id === "root")).toMatchObject({
      _deleting: true, _delete_lock: "operation-current",
    });
    expect(attempt.folderIds).toEqual([]);
  });

  it("does not release a lock that belongs to a newer delete operation", async () => {
    const plan = await collectFolderDeletePlan("owner-a", "root");
    const { emptyFolderDeleteLockState, markFolderDeleteLocks, releaseFolderDeleteLocks } = await import("./folderDeletionService");
    const locked = emptyFolderDeleteLockState("operation-old");
    await markFolderDeleteLocks("owner-a", { folderIds: ["root"], taskIds: [], noteIds: [], columnIds: [] }, locked);
    const root = mocks.rows.folders.find((row) => row.id === "root")!;
    root._delete_lock = "operation-new";

    expect(await releaseFolderDeleteLocks("owner-a", locked)).toBe(true);
    expect(root).toMatchObject({ _deleting: true, _delete_lock: "operation-new" });
    expect(plan.folderIds).toContain("root");
  });

  it("fails closed if the active account changes before a batch", async () => {
    mocks.currentUserId = "other-account";
    await expect(deleteFolderContents("owner-a", {
      folderIds: ["root"], taskIds: ["task-a"], noteIds: [], columnIds: [],
    })).rejects.toThrow("حساب کاربری هنگام حذف تغییر کرد");
    expect(mocks.batches).toEqual([]);
  });
});
