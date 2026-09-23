import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LeitnerDeckView } from "./LeitnerDeckView";
import type { LeitnerCard } from "@/lib/leitnerTypes";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

const mockCards: LeitnerCard[] = [
  {
    id: "card-1",
    user_id: "user-test",
    document_id: null,
    front: "عوارض جانبی رایج فلوکستین چیست؟",
    back: "بی‌خوابی، تهوع، اضطراب گذرا در روزهای نخست",
    clue: "GI & Sleep",
    box: 1,
    interval_days: 1,
    next_review_at: "2026-09-20T00:00:00.000Z", // due
    consecutive_correct: 0,
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
  },
  {
    id: "card-2",
    user_id: "user-test",
    document_id: null,
    front: "دوز شروع سرترالین چقدر است؟",
    back: "معمولاً ۲۵ تا ۵۰ میلی‌گرم روزانه",
    clue: "25-50",
    box: 2,
    interval_days: 3,
    next_review_at: "2026-09-25T00:00:00.000Z", // not due
    consecutive_correct: 1,
    created_at: "2026-09-15T00:00:00.000Z",
    updated_at: "2026-09-15T00:00:00.000Z",
  },
];

vi.mock("@/lib/leitnerService", () => ({
  getLeitnerCards: vi.fn().mockImplementation(() => Promise.resolve([...mockCards])),
  getDueLeitnerCards: vi.fn().mockImplementation(() => Promise.resolve([mockCards[0]])),
  getLeitnerBoxStats: vi.fn().mockImplementation(() =>
    Promise.resolve({
      box1: 1,
      box2: 1,
      box3: 0,
      box4: 0,
      box5: 0,
      dueToday: 1,
      totalCards: 2,
      masteredCount: 0,
    })
  ),
  createLeitnerCard: vi.fn().mockImplementation((userId, data) =>
    Promise.resolve({
      id: `card-${Date.now()}`,
      user_id: userId,
      ...data,
      box: 1,
      interval_days: 1,
      next_review_at: new Date().toISOString(),
      consecutive_correct: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  ),
  reviewLeitnerCard: vi.fn().mockResolvedValue({
    id: "card-1",
    box: 2,
  }),
  reviewLeitnerCardWithRating: vi.fn().mockResolvedValue({
    id: "card-1",
    box: 2,
  }),
  previewNextInterval: vi.fn().mockImplementation((card, rating) => {
    return { days: 3, textFa: "۳ روز", textEn: "3 days" };
  }),
  updateLeitnerCard: vi.fn().mockImplementation((userId, cardId, patch) =>
    Promise.resolve({ id: cardId, ...patch })
  ),
  getCramCards: vi.fn().mockImplementation(() => Promise.resolve([...mockCards])),
  deleteLeitnerCard: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/knowledgeService", () => ({
  getKnowledgeDocuments: vi.fn().mockResolvedValue([]),
}));

describe("LeitnerDeckView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 5 Leitner boxes and due count banner", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    await waitFor(() => {
      expect(screen.getByText("جعبه ۱ (۱ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۲ (۳ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۳ (۷ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۴ (۱۴ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۵ (تسلط کامل)")).toBeDefined();
    });
  });

  it("enters study session when clicking start review button", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    await screen.findByText("شروع مرور (1 آماده)");
    const startBtn = screen.getByRole("button", { name: /شروع مرور/ });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("flip-card")).toBeDefined();
    });
  });

  it("flips card to reveal answer and ratings", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    await screen.findByText("شروع مرور (1 آماده)");
    const startBtn = screen.getByRole("button", { name: /شروع مرور/ });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("flip-card")).toBeDefined();
    });

    // Click to flip
    fireEvent.click(screen.getByTestId("flip-card"));

    await waitFor(() => {
      expect(screen.getAllByText("بی‌خوابی، تهوع، اضطراب گذرا در روزهای نخست").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("فراموش کردم (جعبه ۱)")).toBeDefined();
      expect(screen.getByText("بلدم (انتقال به جعبه بعدی)")).toBeDefined();
    });
  });
});
