import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ContinueLearningView from "./ContinueLearningView";
import { recordLastStudy } from "@/lib/lastStudy";

const { cards, docs } = vi.hoisted(() => ({ cards: { fn: vi.fn() }, docs: { fn: vi.fn() } }));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeDocument: (...a: unknown[]) => docs.fn(...a) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true, lang: "en" }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/leitnerService", async () => ({ ...(await vi.importActual<object>("@/lib/leitnerService")), getLeitnerCards: (...a: unknown[]) => cards.fn(...a) }));
const renderPage = () => render(<MemoryRouter><ContinueLearningView /></MemoryRouter>);
beforeEach(() => { localStorage.clear(); cards.fn.mockReset(); docs.fn.mockReset(); docs.fn.mockResolvedValue({ id: "doc-1" }); });

describe("Continue learning (K01)", () => {
  it("shows an honest empty state with no decorative stats", async () => {
    cards.fn.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByTestId("continue-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("continue-due")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pharmacy/ })).toBeInTheDocument();
  });
  it("lists the last study, an in-progress FRED lesson and due reviews", async () => {
    recordLastStudy("guest", { docId: "doc-1", title: "Doc", titleEn: "Warfarin notes" });
    localStorage.setItem("arshnaz:fred-progress:v2:guest", JSON.stringify({ label: { status: "learning", stepIndex: 2, attemptId: null, updatedAt: 5 } }));
    cards.fn.mockResolvedValue([{ id: "c1", user_id: "guest", front: "q", back: "a", box: 1, next_review_at: "2000-01-01T00:00:00.000Z", review_count: 0, lapse_count: 0, created_at: "", updated_at: "" }]);
    renderPage();
    expect(await screen.findByText("Warfarin notes")).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("continue-fred")).toHaveTextContent("Label: directions and CAL");
    await waitFor(() => expect(screen.getByTestId("continue-due-count")).toHaveTextContent("1 cards ready to review"));
  });
  it("shows a clear message instead of a dead link when the last page was deleted", async () => {
    recordLastStudy("guest", { docId: "gone", title: "Gone" });
    docs.fn.mockResolvedValue(null);
    cards.fn.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByTestId("continue-last-missing", undefined, { timeout: 4000 })).toHaveTextContent("no longer exists");
    expect(screen.queryByRole("link", { name: "Gone" })).not.toBeInTheDocument();
  });
  it("shows a loading state before data arrives", async () => {
    cards.fn.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByTestId("continue-loading")).toBeInTheDocument();
  });
  it("shows an error with a retry that really reloads", async () => {
    cards.fn.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce([]);
    renderPage();
    fireEvent.click(await screen.findByTestId("continue-retry"));
    await waitFor(() => expect(screen.queryByTestId("continue-error")).not.toBeInTheDocument());
    expect(cards.fn).toHaveBeenCalledTimes(2);
  });
});
