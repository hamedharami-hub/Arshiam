import { beforeEach, describe, expect, it, vi } from "vitest";

const persistTask = vi.hoisted(() => vi.fn());
vi.mock("@/lib/firestoreDataService", () => ({ persistTask }));

import { persistNoteActionItem } from "./noteActionItemService";

describe("note action item persistence", () => {
  beforeEach(() => persistTask.mockReset());

  it("keeps an accepted draft owner-scoped and uses the same task ID on retry", async () => {
    persistTask.mockResolvedValue("saved");
    const draft = {
      id: "stable-task-id",
      ownerId: "note-owner",
      createdAt: "2026-10-07T10:00:00.000Z",
      title: "  Send the proposal  ",
      description: " Include the revised budget ",
    };

    await persistNoteActionItem(draft);
    await persistNoteActionItem(draft);

    expect(persistTask).toHaveBeenCalledTimes(2);
    expect(persistTask).toHaveBeenNthCalledWith(1, "note-owner", expect.objectContaining({
      id: "stable-task-id",
      user_id: "note-owner",
      title: "Send the proposal",
      description: "Include the revised budget",
      due_date: null,
      status: "todo",
    }), { quietCompanion: true });
    expect(persistTask.mock.calls[0][1].id).toBe(persistTask.mock.calls[1][1].id);
    expect(persistTask.mock.calls[0][1]).not.toHaveProperty("source_id");
  });

  it("does not write an empty task title", async () => {
    expect(await persistNoteActionItem({ id: "draft", ownerId: "owner", createdAt: "now", title: "  ", description: "" })).toBe("failed");
    expect(persistTask).not.toHaveBeenCalled();
  });
});
