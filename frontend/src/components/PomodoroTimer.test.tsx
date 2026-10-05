import { afterEach, describe, expect, it } from "vitest";
import { loadCount, loadSession } from "./PomodoroTimer";

describe("Pomodoro account-scoped recovery", () => {
  afterEach(() => localStorage.clear());

  it("restores only the active account's session after a route change or reload", () => {
    const session = { userId: "a", mode: "work", endAt: Date.now() + 60000, remaining: 60, startedAt: Date.now(), taskId: "task-a" };
    localStorage.setItem("pomodoro_session_v1:a", JSON.stringify(session));
    expect(loadSession("a")).toEqual(session);
    expect(loadSession("b")).toBeNull();
    localStorage.setItem("pomodoro_session_v1:b", JSON.stringify(session));
    expect(loadSession("b")).toBeNull();
  });

  it("isolates daily session counts between accounts", () => {
    localStorage.setItem("pomodoro_today_count_v2:a", JSON.stringify({ date: new Date().toLocaleDateString("sv-SE"), count: 3 }));
    expect(loadCount("b")).toBe(0);
  });
});
