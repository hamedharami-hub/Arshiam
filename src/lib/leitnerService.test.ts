import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLeitnerCards,
  getDueLeitnerCards,
  createLeitnerCard,
  reviewLeitnerCard,
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
  });

  afterEach(async () => {
    localStorage.clear();
    await clearQueue();
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
});
