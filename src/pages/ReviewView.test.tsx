import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ReviewView from "./ReviewView";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "synthetic-user" } }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

vi.mock("@/components/review/LeitnerDeckView", () => ({
  LeitnerDeckView: ({ initialStudyDocumentId, initialStudyTaskId, cardLanguage }: { initialStudyDocumentId?: string; initialStudyTaskId?: string; cardLanguage?: string }) => (
    <div data-testid="leitner-deck" data-study-document-id={initialStudyDocumentId || ""} data-study-task-id={initialStudyTaskId || ""} data-card-language={cardLanguage || ""} />
  ),
}));

vi.mock("@/components/review/KnowledgeMindMapView", () => ({
  KnowledgeMindMapView: ({ cardLanguage }: { cardLanguage?: string }) => <div data-testid="knowledge-mind-map" data-card-language={cardLanguage || ""} />,
}));

describe("ReviewView scoped Leitner task navigation", () => {
  it("keeps a scoped study task in Leitner and passes both target and task IDs through", () => {
    render(
      <MemoryRouter initialEntries={["/app/review?tab=leitner&studyDocId=doc-7&studyTaskId=task-4"]}>
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-document-id", "doc-7");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-task-id", "task-4");
    expect(screen.queryByTestId("knowledge-mind-map")).not.toBeInTheDocument();
  });

  it("passes the selected bilingual language to the mind map when it is first opened", () => {
    localStorage.removeItem("arshnaz.study-content-language.v1");
    render(
      <MemoryRouter initialEntries={["/app/review"]}>
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "دوزبانه" }));

    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-card-language", "bilingual");
    expect(screen.queryByTestId("knowledge-mind-map")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "نقشه مفهومی" }));

    expect(screen.getByTestId("knowledge-mind-map")).toHaveAttribute("data-card-language", "bilingual");
    expect(localStorage.getItem("arshnaz.study-content-language.v1")).toBe("bilingual");
  });

  it("loads only the active review view at first and preserves it after it has been opened", () => {
    render(
      <MemoryRouter initialEntries={["/app/review"]}>
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("leitner-deck")).toBeInTheDocument();
    expect(screen.queryByTestId("knowledge-mind-map")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "نقشه مفهومی" }));
    const mindMap = screen.getByTestId("knowledge-mind-map");
    expect(mindMap.parentElement).not.toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "جعبه لایتنر" }));
    expect(screen.getByTestId("knowledge-mind-map")).toBeInTheDocument();
    expect(mindMap.parentElement).toHaveClass("hidden");
  });

  it("keeps the selected review tab in the URL and gives it precedence over a retained mind-map target", () => {
    const LocationProbe = () => <output data-testid="review-search">{useLocation().search}</output>;
    render(
      <MemoryRouter initialEntries={["/app/review?docId=doc-7"]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("knowledge-mind-map").parentElement).not.toHaveClass("hidden");
    fireEvent.click(screen.getByRole("button", { name: "جعبه لایتنر" }));
    expect(screen.getByTestId("review-search")).toHaveTextContent("tab=leitner");
    expect(screen.getByTestId("leitner-deck").parentElement).not.toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "نقشه مفهومی" }));
    expect(screen.getByTestId("review-search")).toHaveTextContent("tab=mindmap");
    expect(screen.getByTestId("knowledge-mind-map").parentElement).not.toHaveClass("hidden");
  });
});
