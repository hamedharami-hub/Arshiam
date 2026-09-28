import { describe, expect, it } from "vitest";
import { projectQueuedNotes } from "./noteQueueProjection";
import type { QueuedOp } from "@/lib/offlineQueue";

const note = { id: "note-1", user_id: "user-1", title: "Queued", content: "Body" };

function queued(op: Partial<QueuedOp> & Pick<QueuedOp, "op" | "createdAt">): QueuedOp {
  return {
    table: "notes",
    ownerId: "user-1",
    attempts: 0,
    ...op,
  } as QueuedOp;
}

describe("projectQueuedNotes", () => {
  it("keeps queue order when a note is created and then deleted offline", () => {
    const ops = [
      queued({ id: 1, op: "upsert", createdAt: 1, payload: note, match: { id: note.id } }),
      queued({ id: 2, op: "delete", createdAt: 2, match: { id: note.id, user_id: "user-1" } }),
    ];

    expect(projectQueuedNotes([note], ops, "user-1")).toEqual([]);
  });

  it("applies later queued field updates over an earlier queued upsert", () => {
    const ops = [
      queued({ id: 1, op: "upsert", createdAt: 1, payload: note, match: { id: note.id } }),
      queued({ id: 2, op: "update", createdAt: 2, payload: { content: "Updated body" }, match: { id: note.id } }),
    ];

    expect(projectQueuedNotes([], ops, "user-1")).toEqual([{ ...note, content: "Updated body" }]);
  });

  it("does not project another account's queued note into the active view", () => {
    const otherAccountOp = queued({
      id: 1, ownerId: "user-2", op: "upsert", createdAt: 1,
      payload: { ...note, user_id: "user-2" }, match: { id: note.id, user_id: "user-2" },
    });

    expect(projectQueuedNotes([], [otherAccountOp], "user-1")).toEqual([]);
  });

  it("preserves the legacy insert behavior without overwriting an existing cloud note", () => {
    const cloudNote = { ...note, title: "Cloud title" };
    const op = queued({ id: 1, op: "insert", createdAt: 1, payload: note });

    expect(projectQueuedNotes([cloudNote], [op], "user-1")).toEqual([cloudNote]);
  });
});
