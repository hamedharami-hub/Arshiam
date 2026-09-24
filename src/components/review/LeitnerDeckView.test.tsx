import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { LeitnerDeckView } from "./LeitnerDeckView";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { createLeitnerCard, getDueLeitnerCards, reviewLeitnerCardWithRating } from "@/lib/leitnerService";

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
    review_count: 0,
    lapse_count: 0,
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
    review_count: 1,
    lapse_count: 0,
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
  getLeitnerSchedulingAlgorithm: vi.fn((card: LeitnerCard) => card?.scheduling_algorithm ?? "sm2"),
}));

vi.mock("@/lib/knowledgeService", () => ({
  getKnowledgeDocuments: vi.fn().mockResolvedValue([]),
}));

describe("LeitnerDeckView", { timeout: 15000 }, () => {
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

  it("limits a scheduled review session to due cards from its selected lesson", async () => {
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([
      { ...mockCards[0], id: "card-a", document_id: "doc-a", front: "سؤال درس الف" },
      { ...mockCards[0], id: "card-b", document_id: "doc-b", front: "سؤال درس ب" },
    ]);

    render(<LeitnerDeckView userId="user-test" initialStudyDocumentId="doc-b" />);

    const startButton = await screen.findByRole("button", { name: "شروع مرور (1 آماده)" });
    expect(screen.getByText(/این تسک فقط کارت‌های موعددارِ درس زیر را مرور می‌کند/)).toBeInTheDocument();
    fireEvent.click(startButton);

    await screen.findByTestId("flip-card");
    expect(screen.getByText("سؤال درس ب")).toBeInTheDocument();
    expect(screen.queryByText("سؤال درس الف")).not.toBeInTheDocument();
  });

  it("lets a new card explicitly choose and save its scheduler", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: "کارت جدید" }));
    const schedulerSelect = await screen.findByLabelText("روش زمان‌بندی مرور");
    expect((schedulerSelect as HTMLSelectElement).value).toBe("fsrs6");
    fireEvent.change(schedulerSelect, { target: { value: "sm2" } });
    fireEvent.change(screen.getByPlaceholderText("مثلاً مکانیسم اثر فلوکستین..."), {
      target: { value: "Question" },
    });
    fireEvent.change(screen.getByPlaceholderText("مثلاً مهارکننده انتخابی بازجذب سروتونین (SSRI)..."), {
      target: { value: "Answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ایجاد کارت" }));

    await waitFor(() => {
      expect(createLeitnerCard).toHaveBeenCalledWith("user-test", expect.objectContaining({
        front: "Question",
        back: "Answer",
        scheduling_algorithm: "sm2",
      }));
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

  it("does not allow a card rating until the answer has been revealed", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    await screen.findByTestId("flip-card");

    const againButton = screen.getByRole("button", { name: /فراموش کردم/ });
    expect(againButton).toBeDisabled();
    fireEvent.click(againButton);
    expect(reviewLeitnerCardWithRating).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("flip-card"));
    await waitFor(() => expect(againButton).toBeEnabled());
    fireEvent.click(againButton);
    await waitFor(() => expect(reviewLeitnerCardWithRating).toHaveBeenCalledTimes(1));
  });

  it("prevents a second rating while the first save is still pending", async () => {
    let resolveReview!: (card: LeitnerCard) => void;
    vi.mocked(reviewLeitnerCardWithRating).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReview = resolve;
      }),
    );

    render(<LeitnerDeckView userId="user-test" />);
    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    fireEvent.click(await screen.findByTestId("flip-card"));

    const ratingButton = await screen.findByRole("button", { name: /فراموش کردم/ });
    fireEvent.click(ratingButton);
    fireEvent.click(ratingButton);

    expect(reviewLeitnerCardWithRating).toHaveBeenCalledTimes(1);
    expect((ratingButton as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveReview({ ...mockCards[0] });
    });
    expect(screen.getByRole("button", { name: /فراموش کردم/ })).toBeDisabled();
    expect(reviewLeitnerCardWithRating).toHaveBeenCalledTimes(1);
  });
});
