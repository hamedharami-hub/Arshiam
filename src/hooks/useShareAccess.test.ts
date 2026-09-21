import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useShareAccess } from "./useShareAccess";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "user@example.com" },
  }),
}));

describe("useShareAccess Hook", () => {
  it("grants owner permissions when resource owner matches current user", () => {
    const { result } = renderHook(() =>
      useShareAccess("task", "task-1", "user-123")
    );

    expect(result.current.isOwner).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canView).toBe(true);
    expect(result.current.canComment).toBe(true);
    expect(result.current.permission).toBe("owner");
    expect(result.current.shares).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("defaults to owner if resourceOwnerId is undefined (e.g. creating new items)", () => {
    const { result } = renderHook(() =>
      useShareAccess("note", "note-new")
    );

    expect(result.current.isOwner).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  it("denies ownership and editing when resource owner is a different user in client-only mode", () => {
    const { result } = renderHook(() =>
      useShareAccess("task", "task-foreign", "user-other")
    );

    expect(result.current.isOwner).toBe(false);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canView).toBe(false);
    expect(result.current.canComment).toBe(false);
    expect(result.current.permission).toBe(null);
  });
});
