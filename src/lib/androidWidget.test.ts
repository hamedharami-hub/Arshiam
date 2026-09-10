import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./taskTypes";
const mocks = vi.hoisted(() => ({
  platform: vi.fn(() => "android"), setSession: vi.fn(async (_options: { userId: string }) => {}), sync: vi.fn(async () => {}),
  auth: { currentUser: null as any }, listener: null as any,
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: mocks.platform },
  registerPlugin: () => ({ setSession: mocks.setSession, prepareSession: async () => {}, syncWidgetData: mocks.sync }) }));
vi.mock("firebase/auth", () => ({ onIdTokenChanged: (_: unknown, callback: any) => {
  mocks.listener = callback; return () => {};
} }));
vi.mock("./firebase", () => ({ auth: mocks.auth }));
vi.mock("./offlineQueue", () => ({ getPendingOps: async () => [] }));
import { startWidgetSessionSync, syncAndroidWidget, widgetPayload } from "./androidWidget";
const task = (id: string, due: string, extra = {}) => ({ id, title: id, due_date: due, ...extra } as Task);
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe("widget data and session boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.currentUser = null; mocks.platform.mockReturnValue("android"); });
  it("counts today's active tasks and returns three titles in stable order", () => {
    const date = new Date(2026, 8, 10, 12);
    const result = widgetPayload([
      task("d", "2026-09-10"), task("c", "2026-09-10"), task("b", "2026-09-10"), task("a", "2026-09-10"),
      task("done", "2026-09-10", { status: "done" }), task("bad", "invalid"), task("other", "2026-09-11"),
    ], date);
    expect(result).toEqual({ activeCount: 4, nextTaskId: "a", nextTaskTitle: "• a\n• b\n• c" });
  });
  it("uses the local day for a timestamp stored as UTC", () => {
    const today = new Date(2026, 8, 10, 12);
    const due = new Date(2026, 8, 10, 0, 30).toISOString();
    expect(widgetPayload([task("a", due)], today).activeCount).toBe(1);
  });
  it("does not send tasks belonging to a different user", async () => {
    mocks.auth.currentUser = { uid: "B" };
    await syncAndroidWidget([task("private-A", "2026-09-10")], "A");
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("clears the native session on logout and ignores a late token result", async () => {
    let finish!: (token: unknown) => void;
    const token = new Promise(resolve => { finish = resolve; });
    const user = { uid: "A", refreshToken: "test-refresh", getIdTokenResult: () => token };
    const stop = startWidgetSessionSync();
    mocks.auth.currentUser = user;
    mocks.listener(user);
    mocks.auth.currentUser = null;
    mocks.listener(null);
    finish({ token: "test-token", expirationTime: "2026-09-10T12:00:00Z" });
    await flush();
    expect(mocks.setSession).toHaveBeenLastCalledWith({ userId: "" });
    expect(mocks.setSession.mock.calls.every(([value]) => (value as any).userId === "")).toBe(true);
    stop();
  });
  it("replays task data received before the native session is ready", async () => {
    let finish!: (token: unknown) => void;
    const token = new Promise(resolve => { finish = resolve; });
    const user = { uid: "A", refreshToken: "test-refresh", getIdTokenResult: () => token };
    const stop = startWidgetSessionSync();
    mocks.auth.currentUser = user;
    mocks.listener(user);
    const now = new Date();
    const due = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    await syncAndroidWidget([task("early-task", due)], "A");
    expect(mocks.sync).not.toHaveBeenCalled();
    finish({ token: "test-token", expirationTime: "2026-09-10T12:00:00Z" });
    await vi.waitFor(() => expect(mocks.sync).toHaveBeenCalledWith(expect.objectContaining({ userId: "A", nextTaskId: "early-task" })));
    stop();
  });
});
