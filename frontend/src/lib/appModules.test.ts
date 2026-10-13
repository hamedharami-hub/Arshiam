import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
const syncMocks = vi.hoisted(() => {
  vi.resetModules(); // setup.ts imports the store before this file's auth mocks.
  const events: string[] = [];
  return {
    events,
    auth: { currentUser: null as null | { uid: string; getIdToken: () => Promise<string> } },
    retire: vi.fn(async (uid: string) => { events.push(`retire:${uid}`); return { removed: 0, incomplete: false }; }),
    fetch: vi.fn(async (_path: string, _init?: RequestInit, _authed?: boolean) => { events.push("fetch"); return { unlocked: ["study"], installed: ["study"] }; }),
  };
});
vi.mock("@/lib/offlineQueue", () => ({ retireOwnedModuleData: syncMocks.retire }));
vi.mock("@/lib/arshApi", () => ({ arshFetch: syncMocks.fetch }));
vi.mock("@/lib/firebase", () => ({ auth: syncMocks.auth }));
vi.mock("@/lib/retiredModuleCloudPurge", () => ({ purgeRetiredModuleCloudData: vi.fn(async () => ({ incomplete: false })) }));
import { APP_MODULES, MODULE_IDS, getModulesState, isPathAllowed, redeemModuleCode, setModuleInstalled, setModulesState, StaleModulesSessionError, syncModulesForUser } from "@/lib/appModules";
import { getStudyTaskNavigation } from "@/lib/taskStudyService";

beforeEach(() => {
  localStorage.clear(); syncMocks.events.length = 0; syncMocks.retire.mockClear(); syncMocks.fetch.mockReset();
  syncMocks.fetch.mockImplementation(async () => { syncMocks.events.push("fetch"); return { unlocked: ["study"], installed: ["study"] }; });
  syncMocks.auth.currentUser = { uid: "owner-a", getIdToken: vi.fn(async () => "token:owner-a") };
});
afterEach(async () => { await syncModulesForUser(null); setModulesState({ unlocked: MODULE_IDS, installed: MODULE_IDS }); vi.restoreAllMocks(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function switchAccount(uid: string) {
  syncMocks.auth.currentUser = { uid, getIdToken: vi.fn(async () => `token:${uid}`) };
  await syncModulesForUser(uid);
}

describe("app modules gating", () => {
  it("hides every route of a module that is not installed", () => {
    setModulesState({ unlocked: [], installed: [] });
    for (const path of ["/app/pharmacy", "/app/pharmacy-cyp", "/app/knowledge-mindmap", "/app/knowledge", "/app/mind", "/app/checkin?x=1", "/app/screener/phq9"]) {
      expect(isPathAllowed(path)).toBe(false);
    }
    for (const path of ["/app/today", "/app/crisis", "/app/settings", "/app/self", "/app/pharmacyx"]) {
      expect(isPathAllowed(path)).toBe(true);
    }
  });

  it("enables Knowledge only for its installed module and rejects retired routes", () => {
    setModulesState({ unlocked: ["study"], installed: ["study"] });
    expect(isPathAllowed("/app/knowledge-mindmap")).toBe(true);
    expect(isPathAllowed("/app/pharmacy")).toBe(false);
    expect(isPathAllowed("/app/review")).toBe(false);
    expect(isPathAllowed("/app/mind")).toBe(false);
  });

  it("turns study tasks of a hidden module into plain tasks", () => {
    const task = { source_type: "mindmap_all" } as never;
    expect(getStudyTaskNavigation(task).isStudyTask).toBe(true);
    setModulesState({ unlocked: [], installed: [] });
    expect(getStudyTaskNavigation(task).isStudyTask).toBe(false);
  });

  it("retires only the signed-in account's old module queue before loading modules", async () => {
    await syncModulesForUser("owner-a");
    expect(syncMocks.retire).toHaveBeenCalledWith("owner-a");
    expect(syncMocks.events).toEqual(["retire:owner-a", "fetch"]);
  });
});

describe("module account sessions", () => {
  const privileged = { unlocked: ["mind"], installed: ["mind"], is_admin: true, is_owner: true, newly_unlocked: ["mind"] };

  it.each(["redeem", "install", "uninstall"])("rejects a late %s response without changing B permissions or cache", async (operation) => {
    await switchAccount("owner-a");
    const pending = deferred<typeof privileged>();
    syncMocks.fetch.mockReturnValueOnce(pending.promise);
    const prefetch = vi.spyOn(APP_MODULES.mind, "prefetch").mockResolvedValue(undefined);
    const request = operation === "redeem" ? redeemModuleCode("CODE") : setModuleInstalled("mind", operation === "install");
    const rejected = expect(request).rejects.toBeInstanceOf(StaleModulesSessionError);
    await waitFor(() => expect(syncMocks.fetch).toHaveBeenCalledTimes(2));
    expect(syncMocks.fetch.mock.calls[1]).toEqual([
      operation === "redeem" ? "/api/arsh/modules/redeem" : `/api/arsh/modules/mind/${operation}`,
      expect.objectContaining({ headers: { Authorization: "Bearer token:owner-a" } }), false,
    ]);
    await switchAccount("owner-b");
    const bState = getModulesState();
    const bCache = localStorage.getItem("arshnaz:modules:owner-b");
    const aCache = localStorage.getItem("arshnaz:modules:owner-a");
    pending.resolve(privileged);
    await rejected;
    expect(getModulesState()).toBe(bState);
    expect(getModulesState()).toMatchObject({ isAdmin: false, isOwner: false, installed: ["study"] });
    expect(localStorage.getItem("arshnaz:modules:owner-b")).toBe(bCache);
    expect(localStorage.getItem("arshnaz:modules:owner-a")).toBe(aCache);
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("invalidates a mutation after A → B → A", async () => {
    await switchAccount("owner-a");
    const pending = deferred<typeof privileged>();
    syncMocks.fetch.mockReturnValueOnce(pending.promise);
    const request = redeemModuleCode("CODE");
    const rejected = expect(request).rejects.toBeInstanceOf(StaleModulesSessionError);
    await waitFor(() => expect(syncMocks.fetch).toHaveBeenCalledTimes(2));
    await switchAccount("owner-b");
    await switchAccount("owner-a");
    const cache = localStorage.getItem("arshnaz:modules:owner-a");
    pending.resolve(privileged);
    await rejected;
    expect(localStorage.getItem("arshnaz:modules:owner-a")).toBe(cache);
    expect(getModulesState().isAdmin).toBe(false);
  });

  it("does not dispatch a mutation if the account changes during token refresh", async () => {
    await switchAccount("owner-a");
    const token = deferred<string>();
    const getIdToken = vi.fn(() => token.promise);
    syncMocks.auth.currentUser!.getIdToken = getIdToken;
    const request = setModuleInstalled("mind", true);
    const rejected = expect(request).rejects.toBeInstanceOf(StaleModulesSessionError);
    await waitFor(() => expect(getIdToken).toHaveBeenCalledOnce());
    await switchAccount("owner-b");
    token.resolve("old-token");
    await rejected;
    expect(syncMocks.fetch).toHaveBeenCalledTimes(2); // Only the two account loads.
  });

  it("does not dispatch as B when switching before lazy imports complete", async () => {
    await switchAccount("owner-a");
    const request = redeemModuleCode("CODE");
    const rejected = expect(request).rejects.toBeInstanceOf(StaleModulesSessionError);
    await switchAccount("owner-b");
    await rejected;
    expect(syncMocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects a late mutation after sign-out without recreating permissions or cache", async () => {
    await switchAccount("owner-a");
    const pending = deferred<typeof privileged>();
    syncMocks.fetch.mockReturnValueOnce(pending.promise);
    const request = setModuleInstalled("mind", true);
    const rejected = expect(request).rejects.toBeInstanceOf(StaleModulesSessionError);
    await waitFor(() => expect(syncMocks.fetch).toHaveBeenCalledTimes(2));
    syncMocks.auth.currentUser = null;
    await syncModulesForUser(null);
    const aCache = localStorage.getItem("arshnaz:modules:owner-a");
    pending.resolve(privileged);
    await rejected;
    expect(getModulesState()).toEqual({ ready: false, unlocked: [], installed: [], isAdmin: false, isOwner: false });
    expect(localStorage.getItem("arshnaz:modules:owner-a")).toBe(aCache);
  });

  it("does not mark B ready when A's load fails while B is still loading", async () => {
    const a = deferred<typeof privileged>();
    syncMocks.fetch.mockReturnValueOnce(a.promise);
    const oldLoad = switchAccount("owner-a");
    await waitFor(() => expect(syncMocks.fetch).toHaveBeenCalledTimes(1));
    const b = deferred<typeof privileged>();
    syncMocks.fetch.mockReturnValueOnce(b.promise);
    const newLoad = switchAccount("owner-b");
    await waitFor(() => expect(syncMocks.fetch).toHaveBeenCalledTimes(2));
    const current = getModulesState();
    a.reject(new Error("offline"));
    await oldLoad;
    expect(getModulesState()).toBe(current);
    expect(getModulesState().ready).toBe(false);
    expect(localStorage.getItem("arshnaz:modules:owner-b")).toBeNull();
    b.resolve({ ...privileged, is_admin: false, is_owner: false });
    await newLoad;
  });

  it.each(["resolve", "reject"])("ignores a stale load %s after returning to A", async (outcome) => {
    const pending = deferred<typeof privileged>();
    syncMocks.fetch.mockReturnValueOnce(pending.promise);
    const oldLoad = switchAccount("owner-a");
    await waitFor(() => expect(syncMocks.fetch).toHaveBeenCalledTimes(1));
    await switchAccount("owner-b");
    await switchAccount("owner-a");
    const current = getModulesState();
    const cache = localStorage.getItem("arshnaz:modules:owner-a");
    if (outcome === "resolve") pending.resolve(privileged);
    else pending.reject(new Error("offline"));
    await oldLoad;
    expect(getModulesState()).toBe(current);
    expect(localStorage.getItem("arshnaz:modules:owner-a")).toBe(cache);
  });

  it("keeps current-account redemption, installation and uninstallation working", async () => {
    await switchAccount("owner-a");
    const prefetch = vi.spyOn(APP_MODULES.mind, "prefetch").mockResolvedValue(undefined);
    syncMocks.fetch.mockResolvedValueOnce(privileged);
    await expect(redeemModuleCode("CODE")).resolves.toEqual(["mind"]);
    expect(getModulesState()).toMatchObject({ installed: ["mind"], isAdmin: true, isOwner: true });
    syncMocks.fetch.mockResolvedValueOnce(privileged);
    await setModuleInstalled("mind", true);
    syncMocks.fetch.mockResolvedValueOnce({ ...privileged, installed: [] });
    await setModuleInstalled("mind", false);
    expect(getModulesState().installed).toEqual([]);
    expect(prefetch).toHaveBeenCalledTimes(2);
  });
});
