import { describe, expect, it } from "vitest";
import { deadlineCue } from "./deadlineCue";

describe("calendar deadline cue", () => {
  const localNoon = new Date(2026, 9, 7, 12, 30);

  it("shows the date-only deadline from today through seven local calendar days", () => {
    expect(deadlineCue("2026-10-07", {}, localNoon)).toEqual({ state: "approaching", daysRemaining: 0 });
    expect(deadlineCue("2026-10-14", {}, localNoon)).toEqual({ state: "approaching", daysRemaining: 7 });
    expect(deadlineCue("2026-10-15", {}, localNoon)).toBeNull();
  });

  it("marks past dates and suppresses cues for completed or invalid dates", () => {
    expect(deadlineCue("2026-10-06", {}, localNoon)).toEqual({ state: "overdue", daysRemaining: -1 });
    expect(deadlineCue("2026-10-06", { completed: true }, localNoon)).toBeNull();
    expect(deadlineCue("2026-10-06", { status: "done" }, localNoon)).toBeNull();
    expect(deadlineCue("2026-02-30", {}, localNoon)).toBeNull();
  });
});
