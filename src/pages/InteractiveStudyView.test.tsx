import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import InteractiveStudyView from "./InteractiveStudyView";

const { mockGetKnowledgeDocuments } = vi.hoisted(() => ({
  mockGetKnowledgeDocuments: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "study-user" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: false }) }));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeDocuments: mockGetKnowledgeDocuments }));
vi.mock("@/components/knowledge/InteractiveLearningModal", async () => {
  const ReactModule = await import("react");
  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsertContent: (html: string, mode: "append" | "replace") => void;
  };
  return {
    InteractiveLearningModal: ({ open, onOpenChange, onInsertContent }: Props) => open
      ? ReactModule.createElement(
          "div",
          { role: "dialog", "aria-label": "Study session builder" },
          ReactModule.createElement("button", {
            type: "button",
            onClick: () => {
              onInsertContent(
                '<div class="interactive-learning-block"><div class="interactive-flip-card">Session test card</div></div>',
                "replace",
              );
              onOpenChange(false);
            },
          }, "Build test session"),
        )
      : null,
  };
});

const studyDocuments = [
  {
    id: "doc-1",
    user_id: "study-user",
    folder_id: null,
    title: "راهنمای نمونه",
    title_en: "Sample guide",
    content_html: "<p>متن منبع فارسی</p>",
    content_en: "<p>English source text</p>",
    tags: ["study"],
    content_review_status: "unreviewed" as const,
    created_at: "2026-09-25T00:00:00.000Z",
    updated_at: "2026-09-25T00:00:00.000Z",
  },
  {
    id: "doc-2",
    user_id: "study-user",
    folder_id: null,
    title: "راهنمای دوم",
    title_en: "Second guide",
    content_html: "<p>متن دوم</p>",
    content_en: "<p>Second source text</p>",
    tags: ["review"],
    content_review_status: "reviewed" as const,
    created_at: "2026-09-24T00:00:00.000Z",
    updated_at: "2026-09-24T00:00:00.000Z",
  },
];

describe("InteractiveStudyView", () => {
  beforeEach(() => {
    mockGetKnowledgeDocuments.mockReset();
    mockGetKnowledgeDocuments.mockResolvedValue(studyDocuments);
  });

  it("loads the user's lessons read-only and runs a temporary interactive session", async () => {
    const { container } = render(
      <MemoryRouter>
        <InteractiveStudyView />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("Sample guide")).length).toBeGreaterThan(0);
    expect(mockGetKnowledgeDocuments).toHaveBeenCalledWith("study-user");
    const lessonGrid = container.querySelector("main > div.grid");
    expect(lessonGrid).toHaveClass("min-w-0", "grid-cols-1");
    expect(Array.from(lessonGrid?.querySelectorAll("section") || []).every((section) => section.classList.contains("min-w-0"))).toBe(true);
    expect(screen.getByText("بازبینی منبع تأیید نشده")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ساخت جلسهٔ تعاملی/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Build test session" }));

    const widget = await waitFor(() => container.querySelector(".interactive-flip-card"));
    expect(widget).not.toBeNull();
    expect(screen.getAllByRole("note")).toHaveLength(2);
    expect(screen.getByText("این جلسه فقط در همین صفحه می‌ماند تا آن را ببندی یا از صفحه خارج شوی.")).toBeInTheDocument();

    fireEvent.click(widget!);
    expect(widget).toHaveClass("is-flipped");
  });

  it("clears the temporary session when the selected source lesson changes", async () => {
    const { container } = render(
      <MemoryRouter>
        <InteractiveStudyView />
      </MemoryRouter>,
    );
    await screen.findAllByText("Sample guide");

    fireEvent.click(screen.getByRole("button", { name: /ساخت جلسهٔ تعاملی/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Build test session" }));
    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Second guide/i }));
    expect(container.querySelector(".interactive-flip-card")).toBeNull();
    expect(screen.getAllByText("Second guide").length).toBeGreaterThan(0);
  });

  it("defaults to English and exposes an accessible language toggle", async () => {
    render(
      <MemoryRouter>
        <InteractiveStudyView />
      </MemoryRouter>,
    );
    await screen.findAllByText("Sample guide");

    const englishButton = screen.getByRole("button", { name: "English" });
    expect(englishButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "فارسی" }));

    expect(englishButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("راهنمای نمونه").length).toBeGreaterThan(0);
  });
});
