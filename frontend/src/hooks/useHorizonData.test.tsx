import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";
import type { FolderItem } from "@/lib/firestoreDataService";

const mocks = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockResolvedValue({ data: [] });
  return {
    query,
    from: vi.fn(() => query),
    persistTask: vi.fn(),
    subscribeToTasks: vi.fn(),
    subscribeFolders: vi.fn((_uid: string, _update: (folders: FolderItem[]) => void) => vi.fn()),
    subscribeTags: vi.fn(() => vi.fn()),
    outcomes: vi.fn(),
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
vi.mock("@/lib/taskOutcomes", () => ({ listTaskOutcomes: mocks.outcomes }));

import { useHorizonData } from "./useHorizonData";

const original = { id: "task-1", user_id: "user-1", title: "Before", priority: "none", completed: false, status: "todo" } as Task;
const other = { ...original, id: "task-2", title: "Other account" };
const settings = { calendar: "gregorian" as const, weekStart: "mon" as const, seasonsEnabled: false };

describe("useHorizonData saveTask status and rollback", () => {
  beforeEach(() => {
    mocks.persistTask.mockReset();
    mocks.query.eq.mockReset().mockResolvedValue({ data: [] });
    mocks.outcomes.mockReset();
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

  it("ignores old subscription callbacks and late tag metadata after switching accounts", async () => {
    const taskCallbacks = new Map<string, (tasks: Task[]) => void>();
    const folderCallbacks = new Map<string, (folders: FolderItem[]) => void>();
    mocks.subscribeToTasks.mockImplementation((uid, update) => { taskCallbacks.set(uid, update); return vi.fn(); });
    mocks.subscribeFolders.mockImplementation((uid, update) => { folderCallbacks.set(uid, update); return vi.fn(); });
    let resolveTags!: (value: { data: unknown[] }) => void;
    mocks.query.eq.mockImplementationOnce(() => new Promise(resolve => { resolveTags = resolve; })).mockResolvedValue({ data: [] });
    const { result, rerender } = renderHook(({ uid }) => useHorizonData(uid, settings), { initialProps: { uid: "user-1" } });
    const folder = { id: "private-folder", name: "Private" } as FolderItem;
    act(() => { taskCallbacks.get("user-1")!([original]); folderCallbacks.get("user-1")!([folder]); });
    rerender({ uid: "user-2" });
    act(() => taskCallbacks.get("user-2")!([other]));
    await act(async () => {
      taskCallbacks.get("user-1")!([original]);
      folderCallbacks.get("user-1")!([folder]);
      resolveTags({ data: [{ task_id: "task-1", tag_id: "private-tag" }] });
    });
    expect(result.current.tasks).toEqual([other]);
    expect(result.current.folders).toEqual([]);
    expect(result.current.taskTags.size).toBe(0);
  });

  it("hands configured outcomes off to the Tasks picker without completing in Horizon", async () => {
    mocks.outcomes.mockResolvedValue([{ id: "outcome", task_id: original.id, actions: [] }]);
    const { result } = renderHook(() => useHorizonData("user-1", settings));
    let outcome: unknown;
    await act(async () => { outcome = await result.current.toggleDone(original); });
    expect(outcome).toEqual({ kind: "study", navUrl: "/app/tasks?completeTaskId=task-1" });
    expect(mocks.persistTask).not.toHaveBeenCalled();
    expect(result.current.tasks[0].completed).toBe(false);
  });

  it("keeps Horizon tasks open when outcome lookup fails", async () => {
    mocks.outcomes.mockRejectedValue(new Error("read denied"));
    const { result } = renderHook(() => useHorizonData("user-1", settings));
    let outcome: unknown;
    await act(async () => { outcome = await result.current.toggleDone(original); });
    expect(outcome).toEqual({ kind: "failed" });
    expect(mocks.persistTask).not.toHaveBeenCalled();
    expect(result.current.tasks[0].completed).toBe(false);
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
