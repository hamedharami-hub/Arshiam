import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLeitnerCards,
  getDueLeitnerCards,
  createLeitnerCard,
  reviewLeitnerCard,
  reviewLeitnerCardWithRating,
  computeDueCards,
  getCramCards,
  updateLeitnerCard,
  deleteLeitnerCard,
  getLeitnerBoxStats,
} from "./leitnerService";
import { clearQueue } from "./offlineQueue";

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn().mockResolvedValue(true),
  deleteEntityFromFirestore: vi.fn().mockResolvedValue(true),
}));

describe("leitnerService", () => {
  const userId = "user-leitner-test";

  beforeEach(async () => {
    localStorage.clear();
    await clearQueue();
    vi.clearAllMocks();
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
  });

  afterEach(async () => {
    localStorage.clear();
    await clearQueue();
    vi.restoreAllMocks();
  });

  it("1. creates flashcard with front and back, starting in Box 1", async () => {
    const card = await createLeitnerCard(userId, {
      front: "نیمه‌عمر فلوکستین چقدر است؟",
      back: "۲ تا ۴ روز (و متابولیت فعال نورفلوکستین تا ۱۶ روز)",
      clue: "طولانی‌ترین در بین SSRIها",
    });

    expect(card.id).toBeDefined();
    expect(card.box).toBe(1);
    expect(card.front).toContain("فلوکستین");
    expect(card.clue).toBe("طولانی‌ترین در بین SSRIها");

    const all = await getLeitnerCards(userId);
    expect(all.length).toBe(1);
  });

  it("2. advances card to Box 2 on successful review", async () => {
    const card = await createLeitnerCard(userId, {
      front: "اندیکاسیون سرترالین",
      back: "MDD, OCD, Panic Disorder",
    });

    const reviewed = await reviewLeitnerCard(userId, card.id, true);
    expect(reviewed.box).toBe(2);
    expect(reviewed.review_count).toBe(1);
    expect(reviewed.lapse_count).toBe(0);

    // Reviewing again successfully advances to Box 3
    const reviewedAgain = await reviewLeitnerCard(userId, card.id, true);
    expect(reviewedAgain.box).toBe(3);
    expect(reviewedAgain.review_count).toBe(2);
  });

  it("3. resets card to Box 1 on lapsed review", async () => {
    const card = await createLeitnerCard(userId, {
      front: "دوز شروع اس‌سیتالوپرام",
      back: "10 میلی‌گرم در روز",
      box: 4, // Starts in Box 4
    });

    const lapsed = await reviewLeitnerCard(userId, card.id, false);
    expect(lapsed.box).toBe(1);
    expect(lapsed.lapse_count).toBe(1);
    expect(lapsed.review_count).toBe(1);
  });

  it("4. calculates correct Leitner box statistics", async () => {
    await createLeitnerCard(userId, { front: "Q1", back: "A1", box: 1 });
    await createLeitnerCard(userId, { front: "Q2", back: "A2", box: 2 });
    await createLeitnerCard(userId, { front: "Q3", back: "A3", box: 5 });

    const stats = await getLeitnerBoxStats(userId);
    expect(stats.totalCards).toBe(3);
    expect(stats.box1).toBe(1);
    expect(stats.box2).toBe(1);
    expect(stats.box5).toBe(1);
    expect(stats.masteredCount).toBe(1);
  });

  it("5. deletes card cleanly", async () => {
    const card = await createLeitnerCard(userId, { front: "To Delete", back: "Deleted" });
    const success = await deleteLeitnerCard(userId, card.id);
    expect(success).toBe(true);

    const all = await getLeitnerCards(userId);
    expect(all.length).toBe(0);
  });

  it("6. applies SM-2 4-tier ratings (Again, Hard, Good, Easy) dynamically", async () => {
    const card = await createLeitnerCard(userId, {
      front: "وارفارین و INR",
      back: "هدف معمول ۲ تا ۳",
    });

    // Rating 2: Hard
    const hardCard = await reviewLeitnerCardWithRating(userId, card.id, 2);
    expect(hardCard.consecutive_correct).toBe(1);
    expect(hardCard.ease_factor).toBeLessThan(2.5); // Ease reduced

    // Rating 4: Easy
    const easyCard = await reviewLeitnerCardWithRating(userId, card.id, 4);
    expect(easyCard.consecutive_correct).toBe(2);
    expect(easyCard.ease_factor).toBeGreaterThan(hardCard.ease_factor!); // Ease boosted
    expect(easyCard.box).toBeGreaterThanOrEqual(2);

    // Rating 1: Again (Reset)
    const resetCard = await reviewLeitnerCardWithRating(userId, card.id, 1);
    expect(resetCard.box).toBe(1);
    expect(resetCard.lapse_count).toBe(1);
    expect(resetCard.consecutive_correct).toBe(0);
  });

  it("7. fixes calendar boundary bug so cards due later today are returned as due today", async () => {
    const todayEvening = new Date();
    todayEvening.setHours(20, 0, 0, 0); // 8:00 PM today

    const card = await createLeitnerCard(userId, {
      front: "Morning test card",
      back: "Scheduled for evening",
    });
    // Set next_review_at to this evening
    await updateLeitnerCard(userId, card.id, {
      next_review_at: todayEvening.toISOString(),
    });

    // At 9:00 AM today:
    const morningTime = new Date();
    morningTime.setHours(9, 0, 0, 0);

    const cards = await getLeitnerCards(userId);
    const due = computeDueCards(cards, morningTime);
    expect(due.some((c) => c.id === card.id)).toBe(true);
  });

  it("8. calculates retention rate, forecast, and streak in computeBoxStats", async () => {
    const card1 = await createLeitnerCard(userId, { front: "Q1", back: "A1" });
    await reviewLeitnerCard(userId, card1.id, true); // 1 review, 0 lapse

    const card2 = await createLeitnerCard(userId, { front: "Q2", back: "A2" });
    await reviewLeitnerCard(userId, card2.id, false); // 1 review, 1 lapse

    const stats = await getLeitnerBoxStats(userId);
    expect(stats.totalCards).toBe(2);
    expect(stats.retentionRate).toBe(50); // 1 success out of 2 reviews = 50%
    expect(stats.lapsedCardsCount).toBe(1);
    expect(stats.upcomingForecast).toBeDefined();
    expect(stats.upcomingForecast.today).toBeGreaterThanOrEqual(0);
  });

  it("9. filters cards correctly for Cram / Practice mode", async () => {
    await createLeitnerCard(userId, { front: "Card A", back: "Ans A", box: 1 });
    await createLeitnerCard(userId, { front: "Card B", back: "Ans B", box: 3 });

    const box3Only = await getCramCards(userId, { box: 3 });
    expect(box3Only.length).toBe(1);
    expect(box3Only[0].front).toBe("Card B");

    const searchRes = await getCramCards(userId, { search: "Card A" });
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].front).toBe("Card A");
  });

  it("rejects blank question or answer edits without changing the stored card", async () => {
    const card = await createLeitnerCard(userId, { front: "Original question", back: "Original answer" });

    await expect(updateLeitnerCard(userId, card.id, { front: "   " })).rejects.toThrow(
      "Front and back of card cannot be empty",
    );
    await expect(updateLeitnerCard(userId, card.id, { back: "\n\t" })).rejects.toThrow(
      "Front and back of card cannot be empty",
    );

    const [stored] = await getLeitnerCards(userId);
    expect(stored.front).toBe("Original question");
    expect(stored.back).toBe("Original answer");
  });
});
