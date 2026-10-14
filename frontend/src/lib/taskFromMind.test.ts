import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTaskFromMind } from "./taskFromMind";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }));

vi.mock("@/lib/mind/createTaskOnce", () => ({
  createMindTaskOnce: async (owner: string, task: Task) => {
    const result = await mocks.read();
    if (result.error) return { ok: false, error: "Read failed" };
    if (result.data) return { ok: true, task: result.data };
    const ok = await mocks.write(owner, task);
    return { ok, task };
  },
}));

describe("createTaskFromMind", () => {
  beforeEach(() => { mocks.write.mockReset().mockResolvedValue(true); mocks.read.mockReset().mockResolvedValue({ data: null, error: null }); });
  it("creates a task with due_in_days: 0 having today's ISO date", async () => {
    const res = await createTaskFromMind({
      user_id: "user-123",
      title: "آرام‌سازی با ۵ دقیقه قدم زدن",
      due_in_days: 0,
      source_type: "worry_tree",
      source_id: "worry-456",
    });

    expect(res.ok).toBe(true);
    expect(res.task).toBeDefined();
    expect(res.task?.source_type).toBe("worry_tree");
    expect(res.task?.source_id).toBe("worry-456");
    expect(res.task?.due_date).not.toBeNull();
    const taskDate = new Date(res.task!.due_date!);
    const now = new Date();
    expect(taskDate.getDate()).toBe(now.getDate());
  });

  it("creates a task with due_in_days: null having null due_date (Inbox)", async () => {
    const res = await createTaskFromMind({
      user_id: "user-123",
      title: "تمرین بازسازی شناختی",
      source_type: "cbt_thought",
      source_id: "cbt-789",
    });

    expect(res.ok).toBe(true);
    expect(res.task?.due_date).toBeNull();
    expect(res.task?.source_type).toBe("cbt_thought");
    expect(res.task?.description).toBeNull();
  });

  it("uses the same destination id after reload/retry", async () => {
    const options = { user_id: "owner", title: "A step", source_type: "worry_tree" as const, source_id: "session" };
    const first = await createTaskFromMind(options);
    const second = await createTaskFromMind(options);
    expect(first.task?.id).toBe(second.task?.id);
  });

  it("returns an existing completed task without resetting its status or schedule", async () => {
    const completed = { id: "task_existing", completed: true, status: "done", due_date: "2026-10-20", title: "Edited title" } as Task;
    mocks.read.mockResolvedValue({ data: completed, error: null });
    const result = await createTaskFromMind({ id: completed.id, user_id: "owner", title: "Old title" });
    expect(result).toEqual({ ok: true, task: completed });
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("does not write when verification fails", async () => {
    mocks.read.mockResolvedValue({ data: null, error: new Error("offline") });
    expect((await createTaskFromMind({ id: "retry", user_id: "owner", title: "Step" })).ok).toBe(false);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("serializes simultaneous conversions for the same owner and destination", async () => {
    let resolve!: (value: boolean) => void;
    mocks.write.mockImplementation(() => new Promise<boolean>(done => { resolve = done; }));
    const options = { id: "same", user_id: "owner", title: "Step" };
    const first = createTaskFromMind(options);
    const second = createTaskFromMind(options);
    expect(first).toBe(second);
    await Promise.resolve();
    resolve(true);
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });

  it("retries a failed write using the same id", async () => {
    mocks.write.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const options = { user_id: "owner", title: "Step", source_type: "cbt_thought" as const, source_id: "failed-session" };
    expect((await createTaskFromMind(options)).ok).toBe(false);
    expect((await createTaskFromMind(options)).ok).toBe(true);
    expect(mocks.write.mock.calls[0][1].id).toBe(mocks.write.mock.calls[1][1].id);
  });
});
