import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSettings, type UserSettings } from "./reminders";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "owner-a" } as { uid: string } | null },
  cache: new Map<string, unknown>(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  enqueueOp: vi.fn(),
  upsert: vi.fn(),
  configure: vi.fn(),
  isAndroid: vi.fn(),
}));

vi.mock("./firebase", () => ({ auth: mocks.auth, db: {} }));
vi.mock("./firebaseStore", () => ({ firebaseStore: { from: () => ({ upsert: mocks.upsert }) } }));
vi.mock("./offlineQueue", () => ({ cacheGet: mocks.cacheGet, cacheSet: mocks.cacheSet, enqueueOp: mocks.enqueueOp }));
vi.mock("./nativeExperience", () => ({ isAndroid: mocks.isAndroid, nativeExperience: { configure: mocks.configure } }));
vi.mock("./notify", () => ({
  ensureNotificationPermission: vi.fn(),
  hasNotificationPermission: vi.fn(),
  fireNotification: vi.fn(),
  cancelNotification: vi.fn(),
  scheduleNotificationAt: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("saveSettings persistence and account safety", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.currentUser = { uid: "owner-a" };
    mocks.cache.clear();
    mocks.cache.set("settings:owner-a", { user_id: "owner-a", theme: "paper-light", notifications_enabled: false });
    mocks.cacheGet.mockImplementation(async (key: string) => mocks.cache.get(key));
    mocks.cacheSet.mockImplementation(async (key: string, value: unknown) => { mocks.cache.set(key, value); });
    mocks.enqueueOp.mockResolvedValue(true);
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.configure.mockResolvedValue({});
    mocks.isAndroid.mockReturnValue(true);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  });

  it("rejects an unsuccessful durable enqueue without publishing cached/native preferences", async () => {
    mocks.enqueueOp.mockResolvedValue(false);

    await expect(saveSettings("owner-a", { theme: "paper-dark", notifications_enabled: true })).rejects.toThrow("durably queue");

    expect(mocks.cache.get("settings:owner-a")).toEqual({ user_id: "owner-a", theme: "paper-light", notifications_enabled: false });
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not publish preferences before a successful durable enqueue", async () => {
    const queued = deferred<boolean>();
    mocks.enqueueOp.mockReturnValue(queued.promise);
    const write = saveSettings("owner-a", { theme: "paper-dark", notifications_enabled: true, user_id: "owner-b" });
    await vi.waitFor(() => expect(mocks.enqueueOp).toHaveBeenCalledOnce());
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();

    queued.resolve(true);
    await expect(write).resolves.toBeUndefined();
    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "owner-a", payload: { user_id: "owner-a", theme: "paper-dark", notifications_enabled: true } }));
    expect(mocks.cache.get("settings:owner-a")).toMatchObject({ user_id: "owner-a", theme: "paper-dark", notifications_enabled: true });
    expect(mocks.configure).toHaveBeenCalledWith({ remindersEnabled: true });
  });

  it("rejects signed-out or mismatched owners before any persistence", async () => {
    mocks.auth.currentUser = { uid: "owner-b" };
    await expect(saveSettings("owner-a", { theme: "paper-dark" })).rejects.toThrow("account changed");
    mocks.auth.currentUser = null;
    await expect(saveSettings("owner-a", { theme: "paper-dark" })).rejects.toThrow("account changed");
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.cacheSet).not.toHaveBeenCalled();
  });

  it("stops a late enqueue completion from updating the next account's cache or native settings", async () => {
    const queued = deferred<boolean>();
    mocks.enqueueOp.mockReturnValue(queued.promise);
    const write = saveSettings("owner-a", { notifications_enabled: true });
    const rejected = expect(write).rejects.toThrow("account changed");
    await vi.waitFor(() => expect(mocks.enqueueOp).toHaveBeenCalledOnce());
    mocks.auth.currentUser = { uid: "owner-b" };
    mocks.cache.set("settings:owner-b", { user_id: "owner-b", notifications_enabled: false });
    queued.resolve(true);
    await rejected;

    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();
    expect(mocks.cache.get("settings:owner-b")).toEqual({ user_id: "owner-b", notifications_enabled: false });
  });

  it("rechecks ownership after reading the confirmed-write cache", async () => {
    const cached = deferred<UserSettings | undefined>();
    mocks.cacheGet.mockReturnValue(cached.promise);
    const write = saveSettings("owner-a", { notifications_enabled: true });
    const rejected = expect(write).rejects.toThrow("account changed");
    await vi.waitFor(() => expect(mocks.cacheGet).toHaveBeenCalledOnce());
    mocks.auth.currentUser = { uid: "owner-b" };
    cached.resolve(undefined);
    await rejected;
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();
  });

  it("serializes concurrent callers and does not let a failed save poison newer preferences", async () => {
    const queued = deferred<boolean>();
    mocks.enqueueOp.mockReturnValueOnce(queued.promise).mockResolvedValueOnce(true);
    const first = saveSettings("owner-a", { theme: "paper-dark" });
    const rejected = expect(first).rejects.toThrow("durably queue");
    const second = saveSettings("owner-a", { theme: "oled" });
    await vi.waitFor(() => expect(mocks.enqueueOp).toHaveBeenCalledOnce());
    queued.resolve(false);
    await rejected;
    await second;

    expect(mocks.enqueueOp).toHaveBeenCalledTimes(2);
    expect(mocks.cacheSet).toHaveBeenCalledOnce();
    expect(mocks.cache.get("settings:owner-a")).toMatchObject({ theme: "oled" });
  });

  it("rejects a waiting old-account save before enqueue while allowing the new account to save", async () => {
    const queued = deferred<boolean>();
    mocks.enqueueOp.mockReturnValueOnce(queued.promise).mockResolvedValue(true);
    const first = saveSettings("owner-a", { theme: "paper-dark" });
    const firstRejected = expect(first).rejects.toThrow("account changed");
    const waiting = saveSettings("owner-a", { font_size: "large" });
    const waitingRejected = expect(waiting).rejects.toThrow("account changed");
    await vi.waitFor(() => expect(mocks.enqueueOp).toHaveBeenCalledOnce());
    mocks.auth.currentUser = { uid: "owner-b" };
    await saveSettings("owner-b", { theme: "oled" });
    queued.resolve(true);
    await Promise.all([firstRejected, waitingRejected]);

    expect(mocks.enqueueOp).toHaveBeenCalledTimes(2);
    expect(mocks.enqueueOp.mock.calls[1][0]).toMatchObject({ ownerId: "owner-b", payload: { user_id: "owner-b", theme: "oled" } });
    expect(mocks.cache.get("settings:owner-b")).toMatchObject({ user_id: "owner-b", theme: "oled" });
    expect(mocks.cache.get("settings:owner-a")).toMatchObject({ theme: "paper-light" });
  });

  it("does not configure native reminders if ownership changes during the account-scoped cache write", async () => {
    const cacheWrite = deferred<void>();
    mocks.cacheSet.mockReturnValue(cacheWrite.promise);
    const write = saveSettings("owner-a", { notifications_enabled: true });
    const rejected = expect(write).rejects.toThrow("account changed");
    await vi.waitFor(() => expect(mocks.cacheSet).toHaveBeenCalledOnce());
    expect(mocks.cacheSet.mock.calls[0][0]).toBe("settings:owner-a");
    mocks.auth.currentUser = { uid: "owner-b" };
    cacheWrite.resolve();
    await rejected;
    expect(mocks.configure).not.toHaveBeenCalled();
  });

  it("merges successful concurrent patches without losing either preference", async () => {
    await Promise.all([
      saveSettings("owner-a", { theme: "paper-dark" }),
      saveSettings("owner-a", { font_size: "large" }),
    ]);
    expect(mocks.cache.get("settings:owner-a")).toMatchObject({ theme: "paper-dark", font_size: "large" });
  });

  it("rejects online server errors without leaving failed cached/native preferences", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    const error = new Error("server write failed");
    mocks.upsert.mockResolvedValue({ error });
    await expect(saveSettings("owner-a", { notifications_enabled: true })).rejects.toBe(error);
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it("publishes a successful online write with the captured account forced into its payload", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await saveSettings("owner-a", { theme: "paper-dark", user_id: "owner-b" });
    expect(mocks.upsert).toHaveBeenCalledWith({ theme: "paper-dark", user_id: "owner-a" }, { onConflict: "user_id" });
    expect(mocks.cache.get("settings:owner-a")).toMatchObject({ theme: "paper-dark", user_id: "owner-a" });
  });
});
