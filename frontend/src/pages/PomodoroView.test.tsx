import { describe, expect, it } from "vitest";
import { sessionMinutesForCompletionDay } from "./PomodoroView";

describe("Pomodoro completion-day statistics", () => {
  it("counts a focus session that crosses midnight on the day it ends", () => {
    const endedAt = new Date(2026, 9, 6, 0, 10);
    const sessions = [{ duration_minutes: 25, ended_at: endedAt.toISOString() }];
    expect(sessionMinutesForCompletionDay(sessions, new Date(2026, 9, 5))).toBe(0);
    expect(sessionMinutesForCompletionDay(sessions, new Date(2026, 9, 6))).toBe(25);
  });
});
