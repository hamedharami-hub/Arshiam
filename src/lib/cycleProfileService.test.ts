import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: vi.fn() } }));

import { firebaseStore } from "@/lib/firebaseStore";
import { deleteCycleProfileAndLogs, persistActiveCycleProfile } from "./cycleProfileService";

const fromMock = vi.mocked(firebaseStore.from);

describe("cycle profile persistence", () => {
  beforeEach(() => fromMock.mockReset());

  it("upserts the selected profile by user id so selection survives a reload", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: [], error: null });
    fromMock.mockReturnValue({ upsert } as never);

    await persistActiveCycleProfile("user-1", "profile-2");

    expect(fromMock).toHaveBeenCalledWith("user_settings");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", active_cycle_profile_id: "profile-2" },
      { onConflict: "user_id" },
    );
  });

  it("deletes associated logs before deleting the profile", async () => {
    const events: string[] = [];
    const logEq = vi.fn().mockImplementation(async () => { events.push("logs"); return { error: null }; });
    const profileEq = vi.fn().mockImplementation(async () => { events.push("profile"); return { error: null }; });
    fromMock.mockImplementation(((table: string) => ({
      delete: () => ({ eq: table === "cycle_logs" ? logEq : profileEq }),
      select: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    })) as never);

    await expect(deleteCycleProfileAndLogs("profile-1")).resolves.toEqual({ error: null });
    expect(events).toEqual(["logs", "profile", "logs"]);
    expect(fromMock).toHaveBeenNthCalledWith(1, "cycle_logs");
    expect(fromMock).toHaveBeenNthCalledWith(2, "cycle_profiles");
  });

  it("reports incomplete deletion when a concurrent log remains", async () => {
    fromMock.mockImplementation(((table: string) => ({
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: () => ({ eq: vi.fn().mockResolvedValue({ data: table === "cycle_logs" ? [{ id: "late-log" }] : [], error: null }) }),
    })) as never);

    const result = await deleteCycleProfileAndLogs("profile-1");
    expect(result.error?.message).toContain("incomplete");
  });

  it("keeps the profile when deleting its logs fails", async () => {
    const logError = new Error("could not delete logs");
    const logEq = vi.fn().mockResolvedValue({ error: logError });
    fromMock.mockReturnValue({ delete: () => ({ eq: logEq }) } as never);

    await expect(deleteCycleProfileAndLogs("profile-1")).resolves.toEqual({ error: logError });
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(logEq).toHaveBeenCalledWith("profile_id", "profile-1");
  });


  it("BASELINE BUG: no fence against concurrent log creation between second delete and verification", async () => {
    // BUG: cycleProfileService.ts lines 15-36
    // The function does: delete logs -> delete profile -> delete logs again -> verify
    // But there's no fence preventing a new log from being created AFTER the second delete
    // and BEFORE the verification query runs
    // Expected: Should use a transaction or lock to prevent concurrent writes
    // Actual: A stale device could create a log between line 23 and line 26
    // Impact: Verification could pass even though a log exists, or fail incorrectly

    const events: string[] = [];
    let allowLateLog = false;

    fromMock.mockImplementation(((table: string) => ({
      delete: () => ({
        eq: vi.fn().mockImplementation(async () => {
          events.push(`delete-${table}`);
          // Simulate a concurrent log creation after second delete
          if (table === "cycle_logs" && events.filter(e => e === "delete-cycle_logs").length === 2) {
            allowLateLog = true;
          }
          return { error: null };
        }),
      }),
      select: () => ({
        eq: vi.fn().mockResolvedValue({
          data: allowLateLog && table === "cycle_logs" ? [{ id: "concurrent-log" }] : [],
          error: null,
        }),
      }),
    })) as never);

    const result = await deleteCycleProfileAndLogs("profile-1");
    
    // The function correctly detects the concurrent log in verification
    // But the bug is that there's no prevention mechanism - it relies on detection only
    expect(result.error?.message).toContain("incomplete");
    expect(events).toEqual(["delete-cycle_logs", "delete-cycle_profiles", "delete-cycle_logs"]);
  });

});
