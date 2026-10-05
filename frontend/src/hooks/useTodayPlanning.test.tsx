import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));
vi.mock("@/lib/cloudStateSync", () => ({ bindCloudState: vi.fn(() => ({ push: vi.fn(), stop: vi.fn() })) }));

import { useTodayPlanning } from "./useTodayPlanning";

describe("useTodayPlanning account isolation", () => {
  it("returns safe defaults before a user id is available", () => {
    const { result } = renderHook(() => useTodayPlanning(undefined, "2026-10-05"));

    expect(result.current.data).toEqual({
      nextTaskId: null,
      nextTaskDate: null,
      importantByDay: {},
      wipEnabled: false,
      wipLimit: 3,
    });
    expect(result.current.nextTaskId).toBeNull();
  });

  it("does not show the previous account's selection for even one render after uid changes", () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const { result, rerender } = renderHook(({ uid }) => useTodayPlanning(uid, "2026-10-05"), {
      initialProps: { uid: `hook-a-${suffix}` },
    });

    act(() => {
      result.current.setNextTask("task-a");
      result.current.setWipEnabled(true);
    });
    expect(result.current.nextTaskId).toBe("task-a");
    expect(result.current.data.wipEnabled).toBe(true);

    rerender({ uid: `hook-b-${suffix}` });
    expect(result.current.nextTaskId).toBeNull();
    expect(result.current.data.wipEnabled).toBe(false);
    act(() => result.current.setNextTask("task-b"));
    expect(result.current.nextTaskId).toBe("task-b");
  });
});
