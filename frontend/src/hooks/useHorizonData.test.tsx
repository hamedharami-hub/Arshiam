import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockResolvedValue({ data: [] });
  return {
    query,
    from: vi.fn(() => query),
    persistTask: vi.fn(),
    subscribeToTasks: vi.fn(),
    subscribeFolders: vi.fn(() => vi.fn()),
    subscribeTags: vi.fn(() => vi.fn()),
  };
});

vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));
vi.mock("@/lib/firestoreDataService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/firestoreDataService")>(),
  persistTask: mocks.persistTask,
  subscribeFolders: mocks.subscribeFolders,
  subscribeTags: mocks.subscribeTags,
}));
vi.mock("@/features/tasks/taskService", () => ({ subscribeToTasks: mocks.subscribeToTasks }));

import { useHorizonData } from "./useHorizonData";

const original = { id: "task-1", user_id: "user-1", title: "Before", priority: "none", completed: false, status: "todo" } as Task;
const other = { ...original, id: "task-2", title: "Other account" };
const settings = { calendar: "gregorian" as const, weekStart: "mon" as const, seasonsEnabled: false };

describe("useHorizonData saveTask status and rollback", () => {
  beforeEach(() => {
    mocks.persistTask.mockReset();
    mocks.subscribeToTasks.mockReset().mockImplementation((uid: string, update: (tasks: Task[]) => void) => {
      update([uid === "user-1" ? original : other]);
      return vi.fn();
    });
    mocks.subscribeFolders.mockClear();
    mocks.subscribeTags.mockClear();
    mocks.from.mockClear();
  });

  it("fails closed on undefined and rolls back only that failed edit", async () => {
    mocks.persistTask.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useHorizonData("user-1", settings));
    await waitFor(() => expect(result.current.tasks[0]?.title).toBe("Before"));

    let status!: string;
    await act(async () => { status = await result.current.saveTask("task-1", { title: "Unsaved" }); });

    expect(status).toBe("failed");
    expect(result.current.tasks[0].title).toBe("Before");
  });

  it("does not let an older failed save erase a newer same-field edit", async () => {
    let failOlder!: (status: "failed") => void;
    let saveNewer!: (status: "saved") => void;
    mocks.persistTask
      .mockImplementationOnce(() => new Promise((resolve) => { failOlder = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { saveNewer = resolve; }));
    const { result } = renderHook(() => useHorizonData("user-1", settings));
    await waitFor(() => expect(result.current.tasks[0]?.title).toBe("Before"));

    let older!: Promise<unknown>;
    let newer!: Promise<unknown>;
    act(() => { older = result.current.saveTask("task-1", { title: "Older intent" }); });
    await waitFor(() => expect(result.current.tasks[0]?.title).toBe("Older intent"));
    act(() => { newer = result.current.saveTask("task-1", { title: "Newer intent" }); });
    await waitFor(() => expect(result.current.tasks[0]?.title).toBe("Newer intent"));

    await act(async () => { failOlder("failed"); await older; });
    expect(result.current.tasks[0].title).toBe("Newer intent");
    await act(async () => { saveNewer("saved"); await newer; });
    expect(result.current.tasks[0].title).toBe("Newer intent");
  });

  it("does not apply an old account's delayed save rollback to the newly selected account", async () => {
    let failOldAccount!: (status: "failed") => void;
    mocks.persistTask.mockImplementationOnce(() => new Promise((resolve) => { failOldAccount = resolve; }));
    const { result, rerender } = renderHook(({ uid }) => useHorizonData(uid, settings), { initialProps: { uid: "user-1" as string | undefined } });
    await waitFor(() => expect(result.current.tasks[0]?.id).toBe("task-1"));
    let oldSave!: Promise<unknown>;
    act(() => { oldSave = result.current.saveTask("task-1", { title: "Old edit" }); });

    rerender({ uid: "user-2" });
    await waitFor(() => expect(result.current.tasks[0]?.id).toBe("task-2"));
    await act(async () => { failOldAccount("failed"); await oldSave; });

    expect(result.current.tasks[0]).toEqual(other);
  });
});
