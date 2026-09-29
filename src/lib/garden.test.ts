import { describe, expect, it, beforeEach, vi } from "vitest";
import { awardDailyCheckinDrops, awardTaskWatering, awardWaterDrops, getGardenState, saveGardenState, waterActivePlant } from "./garden";

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

  it("does not spend drops on invalid watering or a fully bloomed plant", () => {
    const before = getGardenState();
    expect(waterActivePlant(-15).success).toBe(false);
    expect(waterActivePlant(0).success).toBe(false);
    expect(getGardenState().waterDrops).toBe(before.waterDrops);

    saveGardenState({ ...before, activePlant: { ...before.activePlant!, stage: 5, currentPoints: 100 } });
    expect(waterActivePlant(15).success).toBe(false);
    expect(getGardenState().waterDrops).toBe(before.waterDrops);
  });

  it("awards water drops and directly waters active plant when completing a task or subtask", () => {
    const before = getGardenState();
    const initialDrops = before.waterDrops;
    const initialPoints = before.activePlant?.currentPoints || 0;

    // Normal task
    const taskRes = awardTaskWatering("طراحی رابط کاربری", false);
    expect(taskRes.dropsAwarded).toBe(10);
    expect(taskRes.pointsAdded).toBe(10);

    const afterTask = getGardenState();
    expect(afterTask.waterDrops).toBe(initialDrops + 10);
    expect(afterTask.activePlant?.currentPoints).toBe(initialPoints + 10);

    // Subtask
    const subRes = awardTaskWatering("آیکون‌های هدر", true);
    expect(subRes.dropsAwarded).toBe(5);
    expect(subRes.pointsAdded).toBe(5);

    const afterSub = getGardenState();
    expect(afterSub.waterDrops).toBe(initialDrops + 15);
    expect(afterSub.activePlant?.currentPoints).toBe(initialPoints + 15);
  });
});
