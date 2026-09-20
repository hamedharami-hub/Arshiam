import { describe, expect, it, beforeEach, vi } from "vitest";
import { awardDailyCheckinDrops, awardWaterDrops, getGardenState, saveGardenState } from "./garden";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("garden water drops rewards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("awards checkin drops once per calendar day", () => {
    const today = "2026-09-20";
    const initial = getGardenState().waterDrops; // default 30
    const res1 = awardDailyCheckinDrops(today, 20);
    expect(res1.awarded).toBe(true);
    expect(res1.drops).toBe(initial + 20);

    // Second check-in on the same day must not reward drops again
    const res2 = awardDailyCheckinDrops(today, 20);
    expect(res2.awarded).toBe(false);
    expect(res2.drops).toBe(initial + 20);

    // Checkin on next day must award
    const nextDay = "2026-09-21";
    const res3 = awardDailyCheckinDrops(nextDay, 20);
    expect(res3.awarded).toBe(true);
    expect(res3.drops).toBe(initial + 40);
  });

  it("awards water drops for breathing session", () => {
    const initial = getGardenState().waterDrops;
    const drops = awardWaterDrops(10, "Breathing session");
    expect(drops).toBe(initial + 10);
    const state = getGardenState();
    expect(state.waterDrops).toBe(initial + 10);
  });
});
