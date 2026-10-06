import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { migrateLegacyToFsrs, previewFsrsReviews, scheduleFsrsReview, createEmptyFsrsCard } from "./fsrsScheduler";
import { clampRetention, getDesiredRetention, setDesiredRetention } from "./reviewSettings";

describe("FSRS migration from Leitner boxes", () => {
  const now = new Date(2026, 5, 10, 12);
  it("keeps brand-new box-1 cards as New", () => {
    expect(migrateLegacyToFsrs({ box: 1, review_count: 0 }, now).state).toBe(State.New);
  });
  it("seeds stability from the box number and keeps history", () => {
    const c = migrateLegacyToFsrs({ box: 4, review_count: 6, lapse_count: 2, next_review_at: new Date(2026, 5, 12).toISOString() }, now);
    expect(c.state).toBe(State.Review);
    expect(c.stability).toBe(14);
    expect(c.reps).toBe(6);
    expect(c.lapses).toBe(2);
    expect(c.due.toISOString()).toBe(new Date(2026, 5, 12).toISOString());
  });
  it("higher boxes get longer next intervals after Good", () => {
    const at = new Date(2026, 5, 20);
    const low = scheduleFsrsReview(migrateLegacyToFsrs({ box: 2, review_count: 3, next_review_at: at.toISOString() }, at), 3, at);
    const high = scheduleFsrsReview(migrateLegacyToFsrs({ box: 5, review_count: 9, next_review_at: at.toISOString() }, at), 3, at);
    expect(high.scheduled_days).toBeGreaterThan(low.scheduled_days);
  });
});

describe("desired retention", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to 90% and clamps to 70–97%", () => {
    expect(getDesiredRetention()).toBe(0.9);
    expect(clampRetention(0.5)).toBe(0.7);
    expect(clampRetention(0.999)).toBe(0.97);
  });
  it("higher retention means shorter intervals", () => {
    const at = new Date(2026, 5, 20);
    const card = migrateLegacyToFsrs({ box: 3, review_count: 4, next_review_at: at.toISOString() }, at);
    setDesiredRetention(0.8);
    const loose = previewFsrsReviews(card, at)[3].scheduled_days;
    setDesiredRetention(0.95);
    const strict = previewFsrsReviews(card, at)[3].scheduled_days;
    expect(strict).toBeLessThan(loose);
  });
  it("Again < Hard < Good < Easy for a review card", () => {
    const at = new Date(2026, 5, 20);
    const p = previewFsrsReviews(migrateLegacyToFsrs({ box: 3, review_count: 4, next_review_at: at.toISOString() }, at), at);
    expect(p[1].due.getTime()).toBeLessThan(p[2].due.getTime());
    expect(p[2].due.getTime()).toBeLessThanOrEqual(p[3].due.getTime());
    expect(p[3].due.getTime()).toBeLessThan(p[4].due.getTime());
    expect(createEmptyFsrsCard(at).state).toBe(State.New);
  });
});
