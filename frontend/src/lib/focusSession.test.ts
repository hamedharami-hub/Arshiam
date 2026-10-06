import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: { currentUser: { uid: "a" } as { uid: string } | null }, save: vi.fn(), reward: vi.fn(), bell: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => ({ upsert: mocks.save }) } }));
vi.mock("@/lib/garden", () => ({ recordPomodoroFocusSession: mocks.reward }));
vi.mock("@/lib/pomodoroSounds", () => ({ END_BELLS: [{ id: "bell" }, { id: "none" }], playEndBell: mocks.bell }));
let f: typeof import("./focusSession");
let mono = 0;
const START = new Date(2026, 9, 6, 10).getTime();
beforeEach(async () => {
  vi.resetModules(); localStorage.clear(); mocks.save.mockReset().mockResolvedValue({ error: null }); mocks.reward.mockReset(); mocks.bell.mockReset(); mocks.auth.currentUser = { uid: "a" };
  vi.useFakeTimers(); vi.setSystemTime(START); mono = 0; vi.spyOn(performance, "now").mockImplementation(() => mono);
  f = await import("./focusSession"); f.bindFocusAccount("a");
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const advance = (seconds: number) => { mono += seconds * 1000; vi.setSystemTime(Date.now() + seconds * 1000); f.tickFocus(); };
describe("persistent focus lifecycle", () => {
  it("shares one task identity while controllers change task props", () => {
    f.toggleFocus("task-a", "A"); advance(60); f.toggleFocus("task-b", "B"); f.toggleFocus("task-b", "B");
    expect(f.getFocusState().session.taskId).toBe("task-a"); expect(f.getFocusState().session.taskTitle).toBe("A");
  });
  it("excludes paused time and saves early endings without a complete round", async () => {
    f.toggleFocus("task-a"); advance(120); f.toggleFocus(); advance(600); f.toggleFocus(); advance(60); f.finishFocus(false); await f.flushFocusSessions();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ duration_minutes: 3, completed: false, task_id: "task-a" })); expect(f.getFocusState().doneToday).toBe(0);
  });
  it("uses monotonic time when the device wall clock jumps", () => {
    f.toggleFocus(); mono += 60000; vi.setSystemTime(START + 3600000); f.tickFocus();
    expect(f.getFocusState().session.remaining).toBe(1440); expect(f.getFocusState().session.endAt).toBe(Date.now() + 1440000);
  });
  it("keeps the duration snapshot if preferences change mid-session", () => {
    f.toggleFocus(); f.updateFocusPrefs({ minutes: 60 }); advance(1500); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ duration_minutes: 25 }));
  });
  it("finishes once and uses the same document id for retries", async () => {
    mocks.save.mockResolvedValue({ error: new Error("offline") }); f.toggleFocus(); const id = f.getFocusState().session.id; advance(1500); await Promise.resolve(); f.tickFocus();
    expect(f.getFocusState().doneToday).toBe(1); expect(f.getFocusState().pending).toBe(1); expect(mocks.reward).toHaveBeenCalledTimes(1);
    mocks.save.mockResolvedValue({ error: null }); await f.flushFocusSessions();
    expect(mocks.save.mock.calls.every(([row]) => row.id === id)).toBe(true); expect(f.getFocusState().pending).toBe(0);
  });
  it("restores a running session after module recreation and keeps its id", async () => {
    f.toggleFocus("task-a"); const id = f.getFocusState().session.id; vi.resetModules(); vi.setSystemTime(START + 600000);
    f = await import("./focusSession"); f.bindFocusAccount("a"); f.tickFocus(); expect(f.getFocusState().session.id).toBe(id); expect(f.getFocusState().session.remaining).toBe(900);
  });
  it("attributes sleeping completion to its deadline, not late wake-up day", async () => {
    vi.setSystemTime(new Date(2026, 9, 6, 23, 30)); f.toggleFocus(); vi.resetModules(); vi.setSystemTime(new Date(2026, 9, 7, 0, 30));
    f = await import("./focusSession"); f.bindFocusAccount("a"); f.tickFocus(); expect(new Date(mocks.save.mock.calls[0][0].ended_at).getDate()).toBe(6); expect(f.getFocusState().doneToday).toBe(0);
  });
  it("defaults to 25/5 and takes a long break after four rounds without auto-start", () => {
    expect(f.getFocusState().prefs).toMatchObject({ minutes: 25, shortBreak: 5, longEvery: 4, autoStart: false });
    for (let i = 0; i < 4; i++) { f.switchFocusMode("work"); f.toggleFocus(); advance(1500); }
    expect(f.getFocusState().session.mode).toBe("long"); expect(f.getFocusState().session.endAt).toBeNull();
  });
  it("isolates account sessions and blocks completion under another owner", () => {
    f.updateFocusPrefs({ minutes: 45 }); f.toggleFocus("a-task"); mocks.auth.currentUser = { uid: "b" }; advance(2700); expect(mocks.save).not.toHaveBeenCalled();
    f.bindFocusAccount("b"); expect(f.getFocusState().prefs.minutes).toBe(25); expect(f.getFocusState().session.taskId).toBeNull();
    mocks.auth.currentUser = { uid: "a" }; f.bindFocusAccount("a"); expect(f.getFocusState().session.taskId).toBe("a-task");
  });
  it("blocks stale manual controls after authentication changes", () => {
    f.toggleFocus("a-task"); advance(60); mocks.auth.currentUser = { uid: "b" }; f.finishFocus(false); f.resetFocus(); f.toggleFocus();
    expect(mocks.save).not.toHaveBeenCalled(); expect(f.getFocusState().session.taskId).toBe("a-task"); expect(f.getFocusState().session.endAt).not.toBeNull();
  });
  it("retains an expired session if durable outbox storage fails", () => {
    f.toggleFocus(); vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); }); advance(1500);
    expect(f.getFocusState().storageError).toBe(true); expect(f.getFocusState().session.startedAt).not.toBeNull(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("validates corrupt preferences", () => {
    expect(f.normalizePrefs({ minutes: NaN, longEvery: 0, ambient: "binaural_beta", ambientVol: 900, bellVol: -5 })).toMatchObject({ minutes: 25, longEvery: 2, ambient: "none", ambientVol: 100, bellVol: 0 });
  });
  it("does not write storage in response to another tab's update", () => {
    f.toggleFocus(); const spy = vi.spyOn(Storage.prototype, "setItem"); f.refreshFocusFromStorage("pomodoro_session_v1:a"); expect(spy).not.toHaveBeenCalled();
  });
});
