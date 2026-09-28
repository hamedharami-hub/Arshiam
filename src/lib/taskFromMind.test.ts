import { describe, expect, it, vi } from "vitest";
import { createTaskFromMind } from "./taskFromMind";

vi.mock("@/lib/firestoreDataService", () => ({
  upsertTask: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    }),
  },
}));

describe("createTaskFromMind", () => {
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
  });
});
