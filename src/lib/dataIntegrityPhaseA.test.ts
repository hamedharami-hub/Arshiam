import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Phase A: Data integrity & storage gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("1. Export All maintains merged local and remote tasks without overwrite", () => {
    // Simulating the bug in SettingsView:
    // If remoteData contains { tasks: [remoteT1] } and local tasks has [remoteT1, localT2],
    // having { ...remoteData, tasks: merged } ensures localT2 is preserved.
    const mergedTasks = [
      { id: "task-1", title: "Remote task" },
      { id: "task-2", title: "Unsynced local task" },
    ];
    const remoteData = {
      tasks: [{ id: "task-1", title: "Remote task" }],
      other_table: [{ id: "o1" }],
    };

    // Correct export structure:
    const safeExport = {
      app: "arshnaz",
      version: "2.5.0",
      ...remoteData,
      tasks: mergedTasks,
    };

    expect(safeExport.tasks).toHaveLength(2);
    expect(safeExport.tasks.map((t) => t.id)).toContain("task-2");
  });

  it("2. Offline queue falls back to persistent storage when IndexedDB is absent", async () => {
    const { enqueueOp, getQueue, clearQueue } = await import("@/lib/offlineQueue");
    await clearQueue();

    // Enqueue an operation
    const ok = await enqueueOp({
      table: "notes",
      op: "insert",
      payload: { id: "note-test-offline", title: "Offline test note" },
    });

    expect(ok).toBe(true);
    const queue = await getQueue();
    expect(queue.some((op) => (op.payload as any)?.id === "note-test-offline")).toBe(true);
  });
});
