import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReviewView from "./ReviewView";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "synthetic-user" } }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

vi.mock("@/components/review/LeitnerDeckView", () => ({
  LeitnerDeckView: ({ initialStudyDocumentId }: { initialStudyDocumentId?: string }) => (
    <div data-testid="leitner-deck" data-study-document-id={initialStudyDocumentId || ""} />
  ),
}));

vi.mock("@/components/review/KnowledgeMindMapView", () => ({
  KnowledgeMindMapView: () => <div data-testid="knowledge-mind-map" />,
}));

describe("ReviewView scoped Leitner task navigation", () => {
  it("keeps a studyDocId task in Leitner and passes its document target through", () => {
    render(
      <MemoryRouter initialEntries={["/app/review?tab=leitner&studyDocId=doc-7"]}>
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-document-id", "doc-7");
    expect(screen.getByTestId("knowledge-mind-map").parentElement).toHaveClass("hidden");
  });
});
