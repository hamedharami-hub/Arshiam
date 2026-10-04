import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "user-1" } as { uid: string } | null },
  from: vi.fn(), getDocs: vi.fn(), getDoc: vi.fn(), deleteDoc: vi.fn(),
  get: vi.fn(), set: vi.fn(), commit: vi.fn(), remove: vi.fn(), events: [] as string[],
}));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));
vi.mock("@/lib/firebase", () => ({
  auth: mocks.auth, db: {},
  doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  query: (ref: unknown) => ref, where: vi.fn(), limit: vi.fn(),
  getDocs: mocks.getDocs, getDoc: mocks.getDoc, deleteDoc: mocks.deleteDoc,
}));
vi.mock("firebase/firestore", () => ({
  runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
    const result = await callback({ get: mocks.get, set: mocks.set });
    mocks.events.push("fence");
    return result;
  },
  writeBatch: () => ({ delete: mocks.remove, commit: mocks.commit }),
}));
import { deleteCycleProfileAndLogs, persistActiveCycleProfile } from "./cycleProfileService";

describe("cycle profile persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.events.length = 0; mocks.auth.currentUser = { uid: "user-1" };
    mocks.get.mockResolvedValue({ exists: () => false });
    mocks.getDocs.mockResolvedValue({ empty: true, docs: [] });
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.deleteDoc.mockImplementation(async () => { mocks.events.push("profile"); });
    mocks.commit.mockImplementation(async () => { mocks.events.push("logs"); });
  });
  it("persists the selected profile under the user settings", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null }); mocks.from.mockReturnValue({ upsert });
    await persistActiveCycleProfile("user-1", "profile-2");
    expect(mocks.from).toHaveBeenCalledWith("user_settings");
    expect(upsert).toHaveBeenCalledWith({ user_id: "user-1", active_cycle_profile_id: "profile-2" }, { onConflict: "user_id" });
  });
  it("commits the deletion fence before cleaning logs and removing the profile", async () => {
    const log = { ref: { path: "users/user-1/cycle_logs/log-1" } };
    mocks.getDocs.mockResolvedValueOnce({ empty: false, docs: [log] });
    await expect(deleteCycleProfileAndLogs("profile-1")).resolves.toEqual({ error: null });
    expect(mocks.events).toEqual(["fence", "logs", "profile"]);
    expect(mocks.set).toHaveBeenCalledWith({ path: "users/user-1/cycle_profile_tombstones/profile-1" }, expect.objectContaining({ deleted: true }));
    expect(mocks.remove).toHaveBeenCalledWith(log.ref);
    expect(mocks.deleteDoc).toHaveBeenCalledWith({ path: "users/user-1/cycle_profiles/profile-1" });
  });
  it("rejects unauthenticated deletion before accessing data", async () => {
    mocks.auth.currentUser = null;
    expect((await deleteCycleProfileAndLogs("profile-1")).error?.message).toContain("Sign in");
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.getDocs).not.toHaveBeenCalled();
  });
  it("keeps the profile when log cleanup fails", async () => {
    const error = new Error("cleanup failed");
    mocks.getDocs.mockResolvedValueOnce({ empty: false, docs: [{ ref: {} }] });
    mocks.commit.mockRejectedValueOnce(error);
    await expect(deleteCycleProfileAndLogs("profile-1")).resolves.toEqual({ error });
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });
  it("reports incomplete cleanup when verification finds remaining data", async () => {
    mocks.getDocs.mockResolvedValueOnce({ empty: true, docs: [] }).mockResolvedValueOnce({ empty: false, docs: [{}] });
    expect((await deleteCycleProfileAndLogs("profile-1")).error?.message).toContain("incomplete");
  });
  it("does not publish the fence if the signed-in account changes", async () => {
    mocks.get.mockImplementation(async () => { mocks.auth.currentUser = { uid: "another-user" }; return { exists: () => false }; });
    expect((await deleteCycleProfileAndLogs("profile-1")).error?.message).toContain("Account changed");
    expect(mocks.set).not.toHaveBeenCalled(); expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });
});
