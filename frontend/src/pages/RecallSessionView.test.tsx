import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import RecallSessionView from "./RecallSessionView";

const cards = vi.hoisted(() => ({ list: [] as LeitnerCard[], review: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/leitnerService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/leitnerService")>("@/lib/leitnerService");
  return {
    ...actual,
    getLeitnerCards: () => Promise.resolve(cards.list),
    reviewLeitnerCardWithRating: cards.review,
    previewNextInterval: () => ({ days: 1, textFa: "۱ روز", textEn: "1 day" }),
  };
});

function card(id: string, front: string): LeitnerCard {
  return {
    id,
    user_id: "user-1",
    front,
    back: `${front} answer`,
    box: 1,
    next_review_at: "2020-01-01T00:00:00.000Z",
    review_count: 0,
    lapse_count: 0,
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
  };
}

describe("Recall session", () => {
  beforeEach(() => {
    cards.list = [card("a", "What is due?")];
    cards.review.mockReset();
    cards.review.mockImplementation(async () => cards.list[0]);
  });

  it("hides the answer until the single primary action reveals it", async () => {
    render(<MemoryRouter><RecallSessionView /></MemoryRouter>);
    expect(await screen.findByTestId("recall-front")).toHaveTextContent("What is due?");
    expect(screen.queryByTestId("recall-back")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("recall-show"));
    expect(screen.getByTestId("recall-back")).toHaveTextContent("What is due? answer");
    expect(screen.getByTestId("recall-grade-3")).toHaveTextContent("Good");
  });

  it("keeps an Again card in the session and drops a Good card", async () => {
    cards.list = [card("a", "First"), card("b", "Second")];
    render(<MemoryRouter><RecallSessionView /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId("recall-show"));
    fireEvent.click(screen.getByTestId("recall-grade-1"));
    await waitFor(() => expect(screen.getByTestId("recall-front")).toHaveTextContent("Second"));
    expect(cards.review).toHaveBeenCalledWith("user-1", "a", 1);
    fireEvent.click(screen.getByTestId("recall-show"));
    fireEvent.click(screen.getByTestId("recall-grade-3"));
    await waitFor(() => expect(screen.getByTestId("recall-front")).toHaveTextContent("First"));
    fireEvent.click(screen.getByTestId("recall-show"));
    fireEvent.click(screen.getByTestId("recall-grade-3"));
    expect(await screen.findByTestId("recall-empty")).toHaveTextContent("finished");
  });
});
