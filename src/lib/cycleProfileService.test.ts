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
});
