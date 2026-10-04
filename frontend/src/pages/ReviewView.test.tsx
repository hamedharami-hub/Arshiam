import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ReviewView, { REVIEW_FOLDERS } from "./ReviewView";
import ReviewRedirect from "./ReviewRedirect";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "synthetic-user" } }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

vi.mock("@/components/review/LeitnerDeckView", () => ({
  LeitnerDeckView: ({ initialStudyDocumentId, initialStudyFolderId, initialStudyTaskId, cardLanguage, scopeRootFolderId }: { initialStudyDocumentId?: string; initialStudyFolderId?: string; initialStudyTaskId?: string; cardLanguage?: string; scopeRootFolderId?: string }) => (
    <div data-testid="leitner-deck" data-study-document-id={initialStudyDocumentId || ""} data-study-folder-id={initialStudyFolderId || ""} data-study-task-id={initialStudyTaskId || ""} data-card-language={cardLanguage || ""} data-scope-root={scopeRootFolderId || ""} />
  ),
}));

vi.mock("@/components/review/KnowledgeMindMapView", () => ({
  KnowledgeMindMapView: ({ cardLanguage, onStartReview }: { cardLanguage?: string; onStartReview?: (scope: { kind: "all" } | { kind: "folder" | "document"; id: string }) => void }) => (
    <div data-testid="knowledge-mind-map" data-card-language={cardLanguage || ""}>
      <button type="button" onClick={() => onStartReview?.({ kind: "folder", id: "folder-7" })}>Review folder in Leitner</button>
    </div>
  ),
}));

describe("ReviewView scoped Leitner task navigation", () => {
  it("offers Pharmacy as the initial review folder", () => {
    render(
      <MemoryRouter initialEntries={["/app/review/pharmacy"]}>
        <Routes>
          <Route path="/app/review/:folder" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(REVIEW_FOLDERS[0].id).toBe("pharmacy");
    expect(screen.getByTestId("review-folder-pharmacy")).toHaveTextContent("فارماسی");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-scope-root", "folder-pharmacy-root");
  });

  it("keeps the legacy review route general and compatible with deep links", () => {
    render(
      <MemoryRouter initialEntries={["/app/review?tab=leitner&studyDocId=general-doc"]}>
        <Routes><Route path="/app/review" element={<ReviewView />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("review-folder-all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-scope-root", "");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-document-id", "general-doc");
  });

  it("keeps a scoped study task in Leitner and passes both target and task IDs through", () => {
    render(
      <MemoryRouter initialEntries={["/app/review?tab=leitner&studyDocId=doc-7&studyTaskId=task-4"]}>
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
          <Route path="/app/review/:folder" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-document-id", "doc-7");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-task-id", "task-4");
    expect(screen.queryByTestId("knowledge-mind-map")).not.toBeInTheDocument();
  });

  it("opens the selected mind-map folder in Leitner without losing its scope", () => {
    const LocationProbe = () => <output data-testid="review-search">{useLocation().search}</output>;
    render(
      <MemoryRouter initialEntries={["/app/review?tab=mindmap"]}>
        <LocationProbe />
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
          <Route path="/app/review/:folder" element={<ReviewView />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Review folder in Leitner" }));

    expect(screen.getByTestId("review-search")).toHaveTextContent("tab=leitner");
    expect(screen.getByTestId("review-search")).toHaveTextContent("studyFolderId=folder-7");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-folder-id", "folder-7");
    expect(screen.getByTestId("leitner-deck").parentElement).not.toHaveClass("hidden");
  });

  it("passes the selected bilingual language to the mind map when it is first opened", () => {
    localStorage.removeItem("arshnaz.study-content-language.v1");
    render(
      <MemoryRouter initialEntries={["/app/review"]}>
        <Routes>
          <Route path="/app/review" element={<ReviewView />} />
          <Route path="/app/review/:folder" element={<ReviewView />} />
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
          <Route path="/app/review/:folder" element={<ReviewView />} />
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
          <Route path="/app/review/:folder" element={<ReviewView />} />
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

describe("ReviewView single module with ?domain=&topic=", () => {
  const renderAt = (url: string) => render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/app/review" element={<ReviewView />} />
        <Route path="/app/review/:folder" element={<ReviewRedirect />} />
      </Routes>
    </MemoryRouter>
  );
  it("passes one domain scope to Leitner, insights and the map views", () => {
    renderAt("/app/review?domain=pharmacy");
    expect(screen.getByTestId("review-folder-pharmacy")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-scope-root", "folder-pharmacy-root");
  });
  it("scopes to a topic folder inside the domain", () => {
    renderAt("/app/review?domain=pharmacy&topic=folder-cardio");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-scope-root", "folder-cardio");
  });
  it("ignores an unknown domain and shows everything", () => {
    renderAt("/app/review?domain=nope");
    expect(screen.getByTestId("review-folder-all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-scope-root", "");
  });
  it("redirects an old /app/review/pharmacy deep link and keeps its other params", () => {
    renderAt("/app/review/pharmacy?studyDocId=doc-9&tab=leitner");
    expect(screen.getByTestId("review-folder-pharmacy")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("leitner-deck")).toHaveAttribute("data-study-document-id", "doc-9");
  });
});
