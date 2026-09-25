import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import InteractiveStudyView from "./InteractiveStudyView";

const {
  mockGetKnowledgeDocuments,
  mockGetKnowledgeFolders,
  mockCreateStudyDraft,
  mockLoadStudyDraft,
  mockPersistStudySession,
} = vi.hoisted(() => ({
  mockGetKnowledgeDocuments: vi.fn(),
  mockGetKnowledgeFolders: vi.fn(),
  mockCreateStudyDraft: vi.fn(),
  mockLoadStudyDraft: vi.fn(),
  mockPersistStudySession: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "study-user" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: false }) }));
vi.mock("@/lib/knowledgeService", () => ({
  getKnowledgeDocuments: mockGetKnowledgeDocuments,
  getKnowledgeFolders: mockGetKnowledgeFolders,
}));
vi.mock("@/lib/interactiveStudyService", () => ({
  createInteractiveStudySessionDraft: mockCreateStudyDraft,
  loadLatestInteractiveStudyDraft: mockLoadStudyDraft,
  persistInteractiveStudySession: mockPersistStudySession,
}));
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
    folder_id: "folder-root",
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
    folder_id: "folder-child",
    title: "راهنمای دوم",
    title_en: "Second guide",
    content_html: "<p>متن دوم</p>",
    content_en: "<p>Second source text</p>",
    tags: ["review"],
    content_review_status: "reviewed" as const,
    created_at: "2026-09-24T00:00:00.000Z",
    updated_at: "2026-09-24T00:00:00.000Z",
  },
  {
    id: "doc-3",
    user_id: "study-user",
    folder_id: "folder-other",
    title: "موضوع دیگر",
    title_en: "Other lesson",
    content_html: "<p>Other source text</p>",
    content_en: "<p>Other source text</p>",
    tags: ["other"],
    content_review_status: "reviewed" as const,
    created_at: "2026-09-23T00:00:00.000Z",
    updated_at: "2026-09-23T00:00:00.000Z",
  },
  {
    id: "doc-4",
    user_id: "study-user",
    folder_id: null,
    title: "موضوع بدون پوشه",
    title_en: "Unfiled lesson",
    content_html: "<p>Unfiled source text</p>",
    content_en: "<p>Unfiled source text</p>",
    tags: ["unfiled"],
    content_review_status: "reviewed" as const,
    created_at: "2026-09-22T00:00:00.000Z",
    updated_at: "2026-09-22T00:00:00.000Z",
  },
];

const studyFolders = [
  { id: "folder-root", user_id: "study-user", parent_id: null, name: "Core", position: 0, created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z" },
  { id: "folder-child", user_id: "study-user", parent_id: "folder-root", name: "Nested", position: 0, created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z" },
  { id: "folder-other", user_id: "study-user", parent_id: null, name: "Other", position: 1, created_at: "2026-09-20T00:00:00.000Z", updated_at: "2026-09-20T00:00:00.000Z" },
];

const renderStudio = () => render(
  <MemoryRouter>
    <InteractiveStudyView />
  </MemoryRouter>,
);

const actEvent = async (event: () => void, settleMs = 0) => {
  await act(async () => {
    event();
    await new Promise((resolve) => window.setTimeout(resolve, settleMs));
  });
};

describe("InteractiveStudyView", () => {
  beforeEach(() => {
    mockGetKnowledgeDocuments.mockReset();
    mockGetKnowledgeFolders.mockReset();
    mockCreateStudyDraft.mockReset();
    mockLoadStudyDraft.mockReset();
    mockPersistStudySession.mockReset();
    mockGetKnowledgeDocuments.mockResolvedValue(studyDocuments);
    mockGetKnowledgeFolders.mockResolvedValue(studyFolders);
    mockCreateStudyDraft.mockImplementation((userId, documentId, title, language, html) => ({
      id: `session-${documentId}-${language}`,
      user_id: userId,
      document_id: documentId,
      document_title: title,
      language,
      content_html: html,
      status: "in_progress",
      created_at: "2026-09-25T00:00:00.000Z",
      updated_at: "2026-09-25T00:00:00.000Z",
    }));
    mockLoadStudyDraft.mockResolvedValue({ ok: true, session: null, source: "none" });
    mockPersistStudySession.mockImplementation(async (session) => ({
      status: "saved",
      session: { ...session, updated_at: "2026-09-25T00:01:00.000Z" },
    }));
  });

  it("requires an explicit lesson choice, persists a practice session, and saves interactions", async () => {
    const { container } = renderStudio();

    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    expect(mockGetKnowledgeDocuments).toHaveBeenCalledWith("study-user");
    expect(mockGetKnowledgeFolders).toHaveBeenCalledWith("study-user");
    const lessonGrid = container.querySelector("main > div.grid");
    expect(lessonGrid).toHaveClass("min-w-0", "grid-cols-1");
    expect(lessonGrid).toHaveClass("min-[720px]:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]");
    expect(Array.from(lessonGrid?.querySelectorAll("section") || []).every((section) => section.classList.contains("min-w-0"))).toBe(true);
    expect(screen.getByText("برای شروع یک درس انتخاب کن")).toBeInTheDocument();
    expect(screen.queryByText("بازبینی منبع تأیید نشده")).not.toBeInTheDocument();

    await actEvent(() => fireEvent.click(sampleLesson));
    await screen.findByRole("button", { name: /انتخاب نوع تمرین/i });
    expect(screen.getByText("درس انتخاب‌شده")).toBeInTheDocument();
    expect(screen.getByText("اینجا چه تمرین‌هایی می‌توانم بسازم؟")).toBeInTheDocument();
    expect(screen.getByText(/فلش‌کارت، آزمون، بازی تطبیق/)).toBeInTheDocument();
    expect(screen.getByText(/کارت لایتنر یا تسک مرور نمی‌سازد/)).toBeInTheDocument();
    expect(screen.getByText("بازبینی منبع تأیید نشده")).toBeInTheDocument();
    await waitFor(() => expect(mockLoadStudyDraft).toHaveBeenCalledWith("study-user", "doc-1", "en"));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /انتخاب نوع تمرین/i })));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "Build test session" })));

    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).not.toBeNull());
    const widget = container.querySelector(".interactive-flip-card");
    expect(screen.getAllByRole("note")).toHaveLength(2);
    expect(screen.getByText("پیشرفت تعامل‌ها جدا از متن درس ذخیره می‌شود.")).toBeInTheDocument();
    await waitFor(() => expect(mockPersistStudySession).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "study-user",
      document_id: "doc-1",
      status: "in_progress",
    })));

    await actEvent(() => fireEvent.click(widget!), 700);
    expect(widget).toHaveClass("is-flipped");
    await waitFor(() => expect(mockPersistStudySession).toHaveBeenCalledWith(expect.objectContaining({
      content_html: expect.stringContaining("is-flipped"),
    })), { timeout: 2500 });
  });

  it("clears the visible session when the selected source lesson changes", async () => {
    const { container } = renderStudio();
    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    await actEvent(() => fireEvent.click(sampleLesson));
    await screen.findByRole("button", { name: /انتخاب نوع تمرین/i });
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /انتخاب نوع تمرین/i })));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "Build test session" })));
    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).not.toBeNull());
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /Second guide/i })));
    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).toBeNull());
    expect(screen.getAllByText("Second guide").length).toBeGreaterThan(0);
  });

  it("filters by folder including nested lessons and clears a hidden selection", async () => {
    renderStudio();
    const otherLesson = await screen.findByRole("button", { name: /Other lesson/i });
    await actEvent(() => fireEvent.click(otherLesson));

    await actEvent(() => fireEvent.change(screen.getByRole("combobox", { name: "فیلتر بر اساس پوشه" }), { target: { value: "folder-root" } }));
    expect(screen.getAllByText("Sample guide").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Second guide").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Other lesson/i })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("برای شروع یک درس انتخاب کن")).toBeInTheDocument());

    await actEvent(() => fireEvent.change(screen.getByRole("combobox", { name: "فیلتر بر اساس پوشه" }), { target: { value: "__unfiled__" } }));
    expect(screen.getAllByText("Unfiled lesson").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Sample guide/i })).not.toBeInTheDocument();
  });

  it("defaults to English study content and exposes the Persian content toggle", async () => {
    renderStudio();
    await screen.findByRole("button", { name: /Sample guide/i });

    const englishButton = screen.getByRole("button", { name: "English" });
    expect(englishButton).toHaveAttribute("aria-pressed", "true");
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "فارسی" })));

    await waitFor(() => expect(englishButton).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getAllByText("راهنمای نمونه").length).toBeGreaterThan(0);
  });

  it("restores a saved draft and marks it completed only after persistence", async () => {
    const savedDraft = {
      id: "saved-session",
      user_id: "study-user",
      document_id: "doc-1",
      document_title: "Sample guide",
      language: "en",
      content_html: '<div class="interactive-learning-block"><div class="interactive-flip-card">Restored card</div></div>',
      status: "in_progress",
      created_at: "2026-09-24T12:00:00.000Z",
      updated_at: "2026-09-25T00:00:00.000Z",
    };
    mockLoadStudyDraft.mockResolvedValueOnce({ ok: true, session: savedDraft, source: "remote" });

    const { container } = renderStudio();
    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    await actEvent(() => fireEvent.click(sampleLesson));
    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).not.toBeNull());
    expect(screen.getByText("جلسهٔ ذخیره‌شده را ادامه بده.")).toBeInTheDocument();

    await actEvent(() => fireEvent.click(container.querySelector(".interactive-flip-card")!), 700);
    await waitFor(() => expect(mockPersistStudySession).toHaveBeenCalledWith(expect.objectContaining({
      content_html: expect.stringContaining("is-flipped"),
    })), { timeout: 2500 });
    const savedInteraction = mockPersistStudySession.mock.calls.at(-1)?.[0].content_html as string;
    expect(savedInteraction).not.toMatch(/^<div>\s*<div/);

    mockPersistStudySession.mockResolvedValueOnce({
      status: "failed",
      session: { ...savedDraft, status: "completed" },
      error: "Cloud and offline queue are unavailable.",
    });
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /پایان جلسه/i })));
    await waitFor(() => expect(mockPersistStudySession).toHaveBeenCalledWith(expect.objectContaining({
      id: "saved-session",
      status: "completed",
    })));
    expect(container.querySelector(".interactive-flip-card")).not.toBeNull();
    const exitEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(exitEvent);
    expect(exitEvent.defaultPrevented).toBe(true);
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /تلاش دوباره برای ذخیره/i })));
    await waitFor(() => expect(screen.getByText("جلسه تکمیل و ذخیره شد.")).toBeInTheDocument());
    expect(container.querySelector(".interactive-flip-card")).toBeNull();
  });
});
