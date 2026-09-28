import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { migrateLegacyToFsrs, previewFsrsReviews, scheduleFsrsReview, createEmptyFsrsCard } from "./fsrsScheduler";
import { clampRetention, detectSwipe, getDesiredRetention, setDesiredRetention, getGestureSettings, setGestureSettings, DEFAULT_GESTURES } from "./reviewSettings";
import { forecastReviews, reviewStreak, reviewedTodayCount } from "./reviewStats";

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

describe("gestures", () => {
  beforeEach(() => localStorage.clear());
  it("default mapping: right=Good, left=Again, up=Easy, down=Hard", () => {
    expect(getGestureSettings().swipe).toEqual({ right: 3, left: 1, up: 4, down: 2 });
  });
  it("can be remapped and disabled", () => {
    setGestureSettings({ ...DEFAULT_GESTURES, enabled: false, swipe: { ...DEFAULT_GESTURES.swipe, up: null } });
    expect(getGestureSettings().enabled).toBe(false);
    expect(getGestureSettings().swipe.up).toBeNull();
  });
  it("detects direction by distance or fling velocity", () => {
    expect(detectSwipe(120, 10)).toBe("right");
    expect(detectSwipe(-120, 30)).toBe("left");
    expect(detectSwipe(5, -140)).toBe("up");
    expect(detectSwipe(0, 130)).toBe("down");
    expect(detectSwipe(30, 20)).toBeNull();
    expect(detectSwipe(30, 0, 900, 0)).toBe("right");
  });
});

describe("forecast, streak and daily goal (DST-safe, Sydney)", () => {
  const prevTZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = "Australia/Sydney"; });
  afterAll(() => { process.env.TZ = prevTZ; });

  it("buckets due cards per local day, overdue counted today", () => {
    const now = new Date(2026, 9, 3, 20); // day before DST starts
    const f = forecastReviews([
      { next_review_at: new Date(2026, 9, 1).toISOString() },
      { next_review_at: new Date(2026, 9, 3, 23).toISOString() },
      { next_review_at: new Date(2026, 9, 4, 23, 30).toISOString() },
      { next_review_at: new Date(2026, 9, 5, 0, 30).toISOString() },
    ], 7, now);
    expect(f.map((d) => d.count).slice(0, 3)).toEqual([2, 1, 1]);
    expect(f[1].date).toBe("2026-10-04");
  });
  it("streak counts consecutive days including yesterday when nothing today", () => {
    const now = new Date(2026, 9, 5, 9);
    const days = [new Date(2026, 9, 2, 10), new Date(2026, 9, 3, 10), new Date(2026, 9, 4, 23)].map((d) => d.toISOString());
    expect(reviewStreak(days, now)).toBe(3);
    expect(reviewStreak([new Date(2026, 9, 1).toISOString()], now)).toBe(0);
  });
  it("reviewed today count", () => {
    const now = new Date(2026, 9, 4, 22);
    expect(reviewedTodayCount([{ last_reviewed_at: new Date(2026, 9, 4, 1).toISOString() }, { last_reviewed_at: new Date(2026, 9, 3, 23).toISOString() }], now)).toBe(1);
  });
});
