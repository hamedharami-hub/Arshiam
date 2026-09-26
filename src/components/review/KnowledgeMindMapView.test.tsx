import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeMindMapView } from "./KnowledgeMindMapView";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: true }),
}));

vi.mock("@/lib/knowledgeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/knowledgeService")>();
  return {
    ...actual,
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
  };
});

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

  it("resets a deep-linked scope when its initial scope props are cleared", async () => {
    const { rerender } = render(
      <KnowledgeMindMapView userId="user-1" cardLanguage="en" initialFolderId="folder-1" />,
    );

    expect(await screen.findByRole("button", { name: "Reset to full tree" })).toBeInTheDocument();

    rerender(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Reset to full tree" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All Knowledge Base" })).toBeInTheDocument();
    });
  }, 10000);

  it("keeps lessons and folders with broken parent links visible through safe display roots", async () => {
    const makeFolder = (id: string, parent_id: string | null, name: string): KnowledgeFolder => ({
      id, user_id: "user-1", parent_id, name, created_at: "2026-01-01", updated_at: "2026-01-01",
    });
    const malformedFolders: KnowledgeFolder[] = [
      makeFolder("cycle-b", "cycle-a", "Cycle B"),
      makeFolder("cycle-a", "cycle-b", "Cycle A"),
      makeFolder("orphan-folder", "missing-parent", "Recovered folder"),
    ];
    const makeDocument = (id: string, folder_id: string | null, title: string): KnowledgeDocument => ({
      id, user_id: "user-1", folder_id, title, content_html: `<p>${title}</p>`,
      plain_text: title, tags: [], created_at: "2026-01-01", updated_at: "2026-01-01",
    });
    const detachedDocuments: KnowledgeDocument[] = [
      makeDocument("doc-cycle", "cycle-a", "Cycle lesson"),
      makeDocument("doc-detached", "missing-folder", "Detached lesson"),
      makeDocument("doc-unfiled", null, "Unfiled lesson"),
    ];
    vi.mocked(getKnowledgeFolders).mockResolvedValueOnce(malformedFolders);
    vi.mocked(getKnowledgeDocuments).mockResolvedValueOnce(detachedDocuments);

    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Outline view" }));

    expect(await screen.findByText("Cycle lesson")).toBeInTheDocument();
    expect(screen.getByText("Detached lesson")).toBeInTheDocument();
    expect(screen.getByText("Unfiled lesson")).toBeInTheDocument();
    expect(screen.getByText("Recovered folder")).toBeInTheDocument();
    expect(screen.getAllByText(/Recovered for display; original link kept/)).toHaveLength(2);
    expect(screen.getByText("Missing folder link")).toBeInTheDocument();
  });

  it("switches between horizontal, vertical, radial, and matrix layouts without losing the visible lesson tree", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="en" />);
    const title = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    await screen.findByText(title);

    const horizontalLayout = screen.getByRole("button", { name: "Horizontal tree layout" });
    const verticalLayout = screen.getByRole("button", { name: "Vertical tree layout" });
    const radialLayout = screen.getByRole("button", { name: "Radial tree layout" });
    const matrixLayout = screen.getByRole("button", { name: "Matrix grid layout" });
    expect(horizontalLayout).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(verticalLayout);

    expect(verticalLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(title)).toBeInTheDocument();

    fireEvent.click(radialLayout);
    expect(radialLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(title)).toBeInTheDocument();

    fireEvent.click(matrixLayout);
    expect(matrixLayout).toHaveAttribute("aria-pressed", "true");
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

  it("compacts canvas metadata without hiding a card title or its translation", async () => {
    render(<KnowledgeMindMapView userId="user-1" cardLanguage="bilingual" />);

    const lessonTitle = "A deliberately long lesson title that must remain fully visible in the mind map outline";
    fireEvent.click(await screen.findByRole("button", { name: `Expand ${lessonTitle}` }));
    expect(await screen.findByText("Box 1")).toBeInTheDocument();

    const densityToggle = screen.getByRole("button", { name: "Compact node labels", hidden: true });
    expect(densityToggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(densityToggle);

    expect(densityToggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Box 1")).not.toBeInTheDocument();
    expect(screen.getByText("پرسش کارت مرور درس چیست؟")).toBeInTheDocument();
    expect(screen.getByText("What is the lesson review card?")).toBeInTheDocument();

    fireEvent.click(densityToggle);
    expect(densityToggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Box 1")).toBeInTheDocument();
  }, 15000);

});
