import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeMindMapView } from "./KnowledgeMindMapView";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: true }),
}));

vi.mock("@/lib/knowledgeService", () => ({
  getKnowledgeFolders: vi.fn().mockResolvedValue([
    { id: "folder-1", user_id: "user-1", parent_id: null, name: "Study Folder", created_at: "2026-01-01", updated_at: "2026-01-01" },
  ]),
  getKnowledgeDocuments: vi.fn().mockResolvedValue([
    {
      id: "doc-1",
      user_id: "user-1",
      folder_id: "folder-1",
      title: "A deliberately long lesson title that must remain fully visible in the mind map outline",
      content_html: "<p>Lesson content</p>",
      plain_text: "Lesson content",
      tags: [],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ]),
}));

vi.mock("@/lib/leitnerService", () => ({
  getLeitnerCards: vi.fn().mockResolvedValue([
    {
      id: "card-1",
      user_id: "user-1",
      document_id: "doc-1",
      front: "What is the lesson review card?",
      back: "A synthetic answer",
      front_fa: "پرسش کارت مرور درس چیست؟",
      back_fa: "یک پاسخ آزمایشی",
      front_en: "What is the lesson review card?",
      back_en: "A synthetic answer",
      box: 1,
      next_review_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ]),
}));

vi.mock("@/components/task-detail/TaskKnowledgeReaderDialog", () => ({
  TaskKnowledgeReaderDialog: ({ document }: { document: { title: string } }) => (
    <div data-testid="reader">{document.title}</div>
  ),
}));

vi.mock("@/components/knowledge/StudyTaskScheduleModal", () => ({
  StudyTaskScheduleModal: () => null,
}));

describe("KnowledgeMindMapView outline mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows the full wrapped hierarchy and keeps node actions in a compact menu", async () => {
    const title = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);

    const outlineToggle = screen.getByRole("button", { name: "Outline view" });
    fireEvent.click(outlineToggle);
    expect(outlineToggle).toHaveAttribute("aria-pressed", "true");

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Actions for ${title}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse Study Folder" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: `Read document ${title}` }));
    expect(await screen.findByTestId("reader")).toHaveTextContent(title);

    expect(screen.getByRole("button", { name: `Actions for ${title}` })).toBeVisible();
  });

  it("switches between horizontal, vertical, and radial canvas layouts without losing the visible lesson tree", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);
    const title = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    await screen.findByText(title);

    const horizontalLayout = screen.getByRole("button", { name: "Horizontal tree layout" });
    const verticalLayout = screen.getByRole("button", { name: "Vertical tree layout" });
    const radialLayout = screen.getByRole("button", { name: "Radial tree layout" });
    expect(horizontalLayout).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(verticalLayout);

    expect(verticalLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(title)).toBeInTheDocument();

    fireEvent.click(radialLayout);
    expect(radialLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(title)).toBeInTheDocument();

    fireEvent.click(horizontalLayout);

    expect(horizontalLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(title)).toBeInTheDocument();
  }, 10000);

  it("allows the canvas to zoom out to a true overview for large maps", () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);
    const zoomOut = screen.getByTitle("Zoom Out");
    for (let step = 0; step < 6; step += 1) fireEvent.click(zoomOut);
    expect(screen.getByText("2%")).toBeInTheDocument();
  });

  it("offers review scheduling for a flashcard through its source lesson, not all knowledge", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Outline view" }));
    const lessonTitle = "A deliberately long lesson title that must remain fully visible in the mind map outline";

    await waitFor(() => expect(screen.getByText(lessonTitle)).toBeInTheDocument());
    const expandLesson = screen.getByRole("button", { name: `Expand ${lessonTitle}` });
    fireEvent.click(expandLesson);
    await waitFor(() => expect(screen.getByRole("button", { name: `Collapse ${lessonTitle}` })).toHaveAttribute("aria-expanded", "true"));
    expect(await screen.findByText("What is the lesson review card?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions for What is the lesson review card?" })).toBeVisible();
  });

  it("keeps expand and collapse available in the compact toolbar and preserves the scope root", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Outline view" }));

    const lessonTitle = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    await screen.findByText(lessonTitle);
    const actionsButton = screen.getByRole("button", { name: "Mind map actions" });
    expect(actionsButton.parentElement).toHaveClass("sm:hidden");
    expect(screen.getByRole("button", { name: "Expand All" }).parentElement).toHaveClass("hidden", "sm:flex");

    fireEvent.click(screen.getByRole("button", { name: "Collapse All" }));
    expect(screen.getByRole("button", { name: "Collapse Knowledge Base" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Expand Study Folder" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: `Read document ${lessonTitle}` })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand All" }));
    expect(screen.getByRole("button", { name: "Collapse Study Folder" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: `Read document ${lessonTitle}` })).toBeInTheDocument();
  }, 10000);

  it("shows the selected Persian flashcard text in the mind map outline", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="fa" />);
    fireEvent.click(screen.getByRole("button", { name: "Outline view" }));

    const lessonTitle = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    fireEvent.click(await screen.findByRole("button", { name: `Expand ${lessonTitle}` }));
    expect(await screen.findByText("پرسش کارت مرور درس چیست؟")).toBeInTheDocument();
  });

  it("shows both languages for a flashcard in the mind map outline", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="bilingual" />);
    fireEvent.click(screen.getByRole("button", { name: "Outline view" }));

    const lessonTitle = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    fireEvent.click(await screen.findByRole("button", { name: `Expand ${lessonTitle}` }));

    expect(await screen.findByText("پرسش کارت مرور درس چیست؟")).toBeInTheDocument();
    expect(screen.getByText("What is the lesson review card?")).toBeInTheDocument();
    expect(screen.getByText("Box 1")).toBeInTheDocument();
  });

  it("shows both languages for a flashcard in the canvas map", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="bilingual" />);

    const lessonTitle = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    fireEvent.click(await screen.findByRole("button", { name: `Expand ${lessonTitle}` }));

    expect(await screen.findByText("پرسش کارت مرور درس چیست؟")).toBeInTheDocument();
    expect(screen.getByText("What is the lesson review card?")).toBeInTheDocument();
  });

});
