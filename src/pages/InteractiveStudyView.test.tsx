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
  mockGetLeitnerCards,
  mockCreateLeitnerCard,
} = vi.hoisted(() => ({
  mockGetKnowledgeDocuments: vi.fn(),
  mockGetKnowledgeFolders: vi.fn(),
  mockCreateStudyDraft: vi.fn(),
  mockLoadStudyDraft: vi.fn(),
  mockPersistStudySession: vi.fn(),
  mockGetLeitnerCards: vi.fn(),
  mockCreateLeitnerCard: vi.fn(),
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
vi.mock("@/lib/leitnerService", () => ({
  getLeitnerCards: mockGetLeitnerCards,
  createLeitnerCard: mockCreateLeitnerCard,
}));
vi.mock("@/components/knowledge/InteractiveLearningModal", async () => {
  const ReactModule = await import("react");
  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsertContent: (html: string, mode: "append" | "replace") => void;
    onWorkflowStepChange: (step: 2 | 3) => void;
  };
  const sessionHtml = '<div class="interactive-learning-block"><div class="interactive-flip-card"><div class="flip-card-front"><p class="flip-text">Question one</p></div><div class="flip-card-back"><p class="flip-text">Answer one</p></div></div><div class="interactive-flip-card"><div class="flip-card-front"><p class="flip-text">Question two</p></div><div class="flip-card-back"><p class="flip-text">Answer two</p></div></div></div>';
  const bilingualQuizHtml = '<div class="interactive-learning-block"><div class="interactive-quiz-card"><h4 class="quiz-question">پرسش: Study plan — مرور روزانه؟</h4><p class="quiz-explanation is-visible">پاسخ: Review one topic at a time.</p></div></div>';
  return {
    InteractiveLearningModal: ({ open, onOpenChange, onInsertContent, onWorkflowStepChange }: Props) => open
      ? ReactModule.createElement(
          "div",
          { role: "dialog", "aria-label": "Study session builder" },
          ReactModule.createElement("button", { type: "button", onClick: () => onWorkflowStepChange(3) }, "Preview formats"),
          ReactModule.createElement("button", { type: "button", onClick: () => onWorkflowStepChange(2) }, "Edit formats"),
          ReactModule.createElement("button", {
            type: "button",
            onClick: () => {
              onInsertContent(`${sessionHtml}${bilingualQuizHtml}`, "replace");
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
    mockGetLeitnerCards.mockReset();
    mockCreateLeitnerCard.mockReset();
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
    mockGetLeitnerCards.mockResolvedValue([]);
    mockCreateLeitnerCard.mockImplementation(async (userId, data) => ({ id: `leitner-${userId}`, user_id: userId, ...data }));
  });

  it("requires an explicit lesson choice, persists a practice session, and saves interactions", async () => {
    const { container } = renderStudio();

    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    expect(mockGetKnowledgeDocuments).toHaveBeenCalledWith("study-user");
    expect(mockGetKnowledgeFolders).toHaveBeenCalledWith("study-user");
    const lessonGrid = container.querySelector("main > div.grid");
    expect(lessonGrid).toHaveClass("min-w-0", "grid-cols-1");
    expect(lessonGrid).toHaveClass("min-[900px]:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]");
    expect(Array.from(lessonGrid?.querySelectorAll("section") || []).every((section) => section.classList.contains("min-w-0"))).toBe(true);
    expect(screen.getByText("برای شروع یک درس انتخاب کن")).toBeInTheDocument();
    expect(screen.getByText(/مطالعهٔ تعاملی، یک درس از کتابخانهٔ دانش را به جلسه‌ای جداگانه/)).toBeInTheDocument();
    expect(screen.getByText("روش کار")).toBeInTheDocument();
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "رفتن به فهرست درس‌ها" })));
    expect(screen.getByPlaceholderText("جست‌وجوی درس یا برچسب…")).toHaveFocus();
    expect(screen.queryByText("بازبینی منبع تأیید نشده")).not.toBeInTheDocument();

    await actEvent(() => fireEvent.click(sampleLesson));
    await screen.findByRole("button", { name: /ساخت تمرین از این درس/i });
    expect(screen.getByText("درس انتخاب‌شده")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sample guide" })).toHaveAttribute("dir", "auto");
    const workflow = screen.getByRole("list", { name: "مسیر مطالعه" });
    expect(workflow).toBeInTheDocument();
    expect(workflow.querySelector('[aria-current="step"]')).toHaveTextContent("انتخاب قالب‌ها");
    expect(screen.getByText("اینجا چه تمرین‌هایی می‌توانم بسازم؟")).toBeInTheDocument();
    expect(screen.getByText(/فلش‌کارت، آزمون، بازی تطبیق/)).toBeInTheDocument();
    expect(screen.getByText(/کارت لایتنر یا تسک مرور نمی‌سازد/)).toBeInTheDocument();
    expect(screen.getByText("بازبینی منبع تأیید نشده")).toBeInTheDocument();
    const sourcePreview = screen.getByText("متن درسی را که مبنای تمرین است ببین");
    fireEvent.click(sourcePreview);
    expect(screen.getByText("English source text")).toBeInTheDocument();
    await waitFor(() => expect(mockLoadStudyDraft).toHaveBeenCalledWith("study-user", "doc-1", "en"));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /ساخت تمرین از این درس/i })));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "Build test session" })));

    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).not.toBeNull());
    expect(container.querySelector(".interactive-quiz-card .quiz-question")).toHaveTextContent("پرسش: Study plan — مرور روزانه؟");
    expect(container.querySelector(".interactive-quiz-card .quiz-explanation")).toHaveTextContent("پاسخ: Review one topic at a time.");
    expect(workflow.querySelector('[aria-current="step"]')).toHaveTextContent("ادامهٔ جلسه");
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

  it("shows the preview step and only imports flashcards into Leitner after explicit choice", async () => {
    const { container } = renderStudio();
    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    await actEvent(() => fireEvent.click(sampleLesson));
    const workflow = screen.getByRole("list", { name: "مسیر مطالعه" });
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /ساخت تمرین از این درس/i })));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "Preview formats" })));
    expect(workflow.querySelector('[aria-current="step"]')).toHaveTextContent("پیش‌نمایش");
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "Build test session" })));
    await waitFor(() => expect(container.querySelectorAll(".interactive-flip-card")).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "افزودن کارت‌ها" })).toBeEnabled());
    expect(mockCreateLeitnerCard).not.toHaveBeenCalled();

    mockGetLeitnerCards.mockResolvedValueOnce([{
      id: "existing-card",
      user_id: "study-user",
      document_id: "doc-1",
      front: "Question one",
      back: "Answer one",
    }]);
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "افزودن کارت‌ها" })));
    await waitFor(() => expect(mockCreateLeitnerCard).toHaveBeenCalledTimes(1));
    expect(mockCreateLeitnerCard).toHaveBeenCalledWith("study-user", expect.objectContaining({
      front: "Question two",
      back: "Answer two",
      front_en: "Question two",
      back_en: "Answer two",
      document_id: "doc-1",
      folder_id: "folder-root",
    }));
    expect(await screen.findByText(/1 فلش‌کارت به لایتنر اضافه شد؛ 1 مورد تکراری رد شد/)).toBeInTheDocument();
  });

  it("clears the visible session when the selected source lesson changes", async () => {
    const { container } = renderStudio();
    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    await actEvent(() => fireEvent.click(sampleLesson));
    const lessonPicker = screen.getByTestId("interactive-study-lesson-picker");
    expect(lessonPicker).toHaveClass("hidden", "min-[900px]:flex");
    await screen.findByRole("button", { name: /ساخت تمرین از این درس/i });
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /ساخت تمرین از این درس/i })));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "Build test session" })));
    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).not.toBeNull());
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "تغییر درس" })));
    expect(lessonPicker).not.toHaveClass("hidden");
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: /Second guide/i })));
    await waitFor(() => expect(container.querySelector(".interactive-flip-card")).toBeNull());
    expect(screen.getAllByText("Second guide").length).toBeGreaterThan(0);
  });

  it("filters by folder including nested lessons and clears a hidden selection", async () => {
    renderStudio();
    const otherLesson = await screen.findByRole("button", { name: /Other lesson/i });
    await actEvent(() => fireEvent.click(otherLesson));
    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "تغییر درس" })));

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

  it("shows saved-session check details and retries the check without changing session data", async () => {
    const savedDraft = {
      id: "saved-session-after-retry",
      user_id: "study-user",
      document_id: "doc-1",
      document_title: "Sample guide",
      language: "en",
      content_html: '<div class="interactive-learning-block"><div class="interactive-flip-card">Recovered card</div></div>',
      status: "in_progress",
      created_at: "2026-09-24T12:00:00.000Z",
      updated_at: "2026-09-25T00:00:00.000Z",
    };
    mockLoadStudyDraft
      .mockResolvedValueOnce({ ok: false, error: "FirebaseError: RESOURCE_EXHAUSTED" })
      .mockResolvedValueOnce({ ok: true, session: savedDraft, source: "remote" });

    const { container } = renderStudio();
    const sampleLesson = await screen.findByRole("button", { name: /Sample guide/i });
    await actEvent(() => fireEvent.click(sampleLesson));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("جلسه‌های قبلی بررسی نشدند");
    expect(mockPersistStudySession).not.toHaveBeenCalled();

    await actEvent(() => fireEvent.click(screen.getByText("جزئیات فنی")));
    expect(screen.getByText("FirebaseError: RESOURCE_EXHAUSTED")).toBeVisible();

    await actEvent(() => fireEvent.click(screen.getByRole("button", { name: "بررسی دوباره" })));
    await waitFor(() => expect(mockLoadStudyDraft).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("جلسهٔ ذخیره‌شده را ادامه بده.")).toBeInTheDocument();
    expect(container.querySelector(".interactive-flip-card")).toHaveTextContent("Recovered card");
    expect(mockPersistStudySession).not.toHaveBeenCalled();
  });
});
