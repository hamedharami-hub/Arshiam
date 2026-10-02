import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/taskTypes";
import { applyVisualTaskPatches } from "./visualTaskPatches";

describe("task list visual patches", () => {
  it("keeps the latest priority and time visible across a stale list refresh", () => {
    const task = { id: "one", priority: "none", due_date: "2026-09-29T10:00:00.000Z" } as Task;
    const staleList = [task];
    const patches = { one: { priority: "high" as const, due_date: "2026-09-29T14:00:00.000Z" } };

    expect(applyVisualTaskPatches(staleList, patches)).toEqual([
      { ...task, priority: "high", due_date: "2026-09-29T14:00:00.000Z" },
    ]);
    expect(staleList[0]).toBe(task);
  });
});
