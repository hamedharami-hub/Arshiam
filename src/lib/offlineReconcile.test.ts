import { describe, expect, it } from "vitest";
import type { QueuedOp } from "./offlineQueue";
import { reconcileRemoteRowsWithPending } from "./offlineReconcile";

type Row = { id: string; title: string; remoteOnly?: string };

const op = (partial: Partial<QueuedOp>): QueuedOp => ({
  table: "knowledge_documents",
  op: "update",
  ownerId: "user-1",
  createdAt: 1,
  attempts: 0,
  ...partial,
});

describe("reconcileRemoteRowsWithPending", () => {
  it("does not resurrect a cache-only row after a successful remote read", () => {
    const result = reconcileRemoteRowsWithPending<Row>(
      [{ id: "remote", title: "Server" }],
      [
        { id: "remote", title: "Old server copy" },
        { id: "deleted-elsewhere", title: "Stale cache" },
      ],
      [],
      "knowledge_documents",
      "user-1",
    );

    expect(result).toEqual([{ id: "remote", title: "Server" }]);
  });

  it("replays pending inserts, updates, and deletes in queue order", () => {
    const result = reconcileRemoteRowsWithPending<Row>(
      [
        { id: "update", title: "Server", remoteOnly: "keep" },
        { id: "delete", title: "Remove" },
      ],
      [{ id: "insert", title: "Cached insert" }],
      [
        op({ op: "insert", payload: { id: "insert", title: "Local insert" }, createdAt: 1 }),
        op({ op: "update", payload: { id: "update", title: "Local update" }, createdAt: 2 }),
        op({ op: "delete", match: { id: "delete" }, createdAt: 3 }),
      ],
      "knowledge_documents",
      "user-1",
    );

    expect(result).toEqual(expect.arrayContaining([
      { id: "insert", title: "Local insert" },
      { id: "update", title: "Local update", remoteOnly: "keep" },
    ]));
    expect(result.some((row) => row.id === "delete")).toBe(false);
  });

  it("ignores pending operations from another account or collection", () => {
    const result = reconcileRemoteRowsWithPending<Row>(
      [],
      [{ id: "cached", title: "Cache" }],
      [
        op({ ownerId: "user-2", op: "insert", payload: { id: "other-user", title: "No" } }),
        op({ table: "leitner_cards", op: "insert", payload: { id: "other-table", title: "No" } }),
      ],
      "knowledge_documents",
      "user-1",
    );

    expect(result).toEqual([]);
  });
});
