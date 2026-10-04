import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueOp } from "@/lib/offlineQueue";
import { persistTaskTagChange } from "./taskTagService";

const mockState = vi.hoisted(() => ({ remoteError: null as unknown }));

vi.mock("@/lib/offlineQueue", () => ({ enqueueOp: vi.fn(() => Promise.resolve(true)) }));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      insert: () => Promise.resolve({ error: mockState.remoteError }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: mockState.remoteError }),
        }),
      }),
    }),
  },
}));

describe("persistTaskTagChange", () => {
  beforeEach(() => {
    mockState.remoteError = null;
    vi.mocked(enqueueOp).mockReset().mockResolvedValue(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("persists online inserts directly without also queueing them", async () => {
    await expect(persistTaskTagChange("owner-1", "task-1", "tag-1", "add")).resolves.toBe("saved");
    expect(enqueueOp).not.toHaveBeenCalled();
  });

  it("queues offline deletes with an explicit owner and scoped match", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    await expect(persistTaskTagChange("owner-1", "task-1", "tag-1", "remove")).resolves.toBe("queued");
    expect(enqueueOp).toHaveBeenCalledWith({
      ownerId: "owner-1",
      table: "task_tags",
      op: "delete",
      match: { user_id: "owner-1", task_id: "task-1", tag_id: "tag-1" },
    });
  });

  it("reports failure when neither remote storage nor the durable queue accepts a change", async () => {
    mockState.remoteError = new Error("network unavailable");
    vi.mocked(enqueueOp).mockResolvedValueOnce(false);

    await expect(persistTaskTagChange("owner-1", "task-1", "tag-1", "add")).resolves.toBe("failed");
  });
});
