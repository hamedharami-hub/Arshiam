import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTasksData } from "./useTasksData";
import type { Task } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => ({
  cached: vi.fn(), fetch: vi.fn(), receive: undefined as undefined | ((tasks: Task[]) => void),
}));
vi.mock("@/features/tasks/taskService", () => ({
  getCachedTasks: mocks.cached,
  fetchTasks: mocks.fetch,
  applyPendingTaskOperations: async (tasks: Task[]) => tasks,
  isTaskCacheFreshForUser: () => true,
  taskMemoryCache: new Map(),
  subscribeToTasks: (_owner: string, receive: (tasks: Task[]) => void) => { mocks.receive = receive; return () => {}; },
}));
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: { from: () => ({ select: () => ({
    then: (callback: (result: {data: unknown[]}) => void) => Promise.resolve(callback({ data: [] })),
    in: () => Promise.resolve({ data: [] }),
  }) }) },
}));
const task = (id: string) => ({ id, title: id, completed: false, status: "todo", priority: "none" } as Task);

describe("useTasksData snapshot races", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.receive = undefined; });
  it("does not replace a newer realtime list with a delayed cache read or fetch", async () => {
    let resolveCache!: (tasks: Task[]) => void;
    let resolveFetch!: (tasks: Task[]) => void;
    mocks.cached.mockReturnValue(new Promise<Task[]>(resolve => { resolveCache = resolve; }));
    mocks.fetch.mockReturnValue(new Promise<Task[]>(resolve => { resolveFetch = resolve; }));
    const { result } = renderHook(() => useTasksData({ user: { id: "owner" }, scope: "inbox" }));
    act(() => mocks.receive?.([task("live")]));
    await act(async () => resolveCache([]));
    expect(result.current.allTasks.map(task => task.id)).toEqual(["live"]);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
    act(() => mocks.receive?.([task("live"), task("new")]));
    await act(async () => resolveFetch([task("old")]));
    expect(result.current.allTasks.map(task => task.id)).toEqual(["live", "new"]);
  });
});
