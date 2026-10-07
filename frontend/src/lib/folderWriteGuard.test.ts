import { describe, expect, it, vi } from "vitest";

const refs = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock("@/lib/firebase", () => ({
  db: {},
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
}));

import { folderScopedWriteAllowed } from "./folderWriteGuard";

function snapshot(value: Record<string, unknown>) {
  return { exists: () => true, data: () => value } as any;
}

function transaction() {
  return {
    get: vi.fn(async (path: string) => {
      const value = refs.get(path);
      return { exists: () => Boolean(value), data: () => value };
    }),
  } as any;
}

describe("folder-scoped write guard", () => {
  it.each([
    {
      collection: "tasks" as const,
      field: "folder_id" as const,
      current: { id: "task-a", folder_id: "closing", parent_id: null, title: "Keep title", updated_at: "old" },
    },
    {
      collection: "notes" as const,
      field: "folder_id" as const,
      current: { id: "note-a", folder_id: "closing", title: "Keep note", updated_at: "old" },
    },
    {
      collection: "folders" as const,
      field: "parent_id" as const,
      current: { id: "child-a", parent_id: "closing", name: "Keep child", updated_at: "old" },
    },
  ])("allows a location-only transfer out of a closing folder for $collection", async ({ collection, field, current }) => {
    refs.clear();
    refs.set("users/owner-a/folders/closing", { id: "closing", _deleting: true });
    const tx = transaction();
    const patch = { ...current, [field]: null, updated_at: "new" };

    await expect(folderScopedWriteAllowed(tx, "owner-a", collection, patch, snapshot(current))).resolves.toBe(true);
  });

  it("blocks unrelated edits bundled with a transfer out of a closing folder", async () => {
    refs.clear();
    refs.set("users/owner-a/folders/closing", { id: "closing", _deleting: true });
    const current = { id: "task-a", folder_id: "closing", parent_id: null, title: "Original", updated_at: "old" };
    const tx = transaction();

    await expect(folderScopedWriteAllowed(tx, "owner-a", "tasks", {
      ...current, folder_id: null, title: "Changed", updated_at: "new",
    }, snapshot(current))).resolves.toBe(false);
  });

  it("blocks moving content into a folder that is closing", async () => {
    refs.clear();
    refs.set("users/owner-a/folders/closing", { id: "closing", _deleting: true });
    const current = { id: "task-a", folder_id: null, parent_id: null, title: "Task" };

    await expect(folderScopedWriteAllowed(transaction(), "owner-a", "tasks", {
      ...current, folder_id: "closing",
    }, snapshot(current))).resolves.toBe(false);
  });
});
