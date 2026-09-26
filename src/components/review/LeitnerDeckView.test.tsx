import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, act, within } from "@testing-library/react";
import { LeitnerDeckView } from "./LeitnerDeckView";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { createLeitnerCard, getDueLeitnerCards, getLeitnerBoxStats, getLeitnerCards, reviewLeitnerCardWithRating } from "@/lib/leitnerService";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import { getNextLeitnerReviewAt, rescheduleLeitnerStudyTaskAfterSession } from "@/lib/taskStudyService";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

const mockCards: LeitnerCard[] = [
  {
    id: "card-1",
    user_id: "user-test",
    document_id: null,
    front: "عوارض جانبی رایج فلوکستین چیست؟",
    back: "بی‌خوابی، تهوع، اضطراب گذرا در روزهای نخست",
    clue: "GI & Sleep",
    box: 1,
    interval_days: 1,
    next_review_at: "2026-09-20T00:00:00.000Z", // due
    consecutive_correct: 0,
    review_count: 0,
    lapse_count: 0,
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
  },
  {
    id: "card-2",
    user_id: "user-test",
    document_id: null,
    front: "دوز شروع سرترالین چقدر است؟",
    back: "معمولاً ۲۵ تا ۵۰ میلی‌گرم روزانه",
    clue: "25-50",
    box: 2,
    interval_days: 3,
    next_review_at: "2026-09-25T00:00:00.000Z", // not due
    consecutive_correct: 1,
    review_count: 1,
    lapse_count: 0,
    created_at: "2026-09-15T00:00:00.000Z",
    updated_at: "2026-09-15T00:00:00.000Z",
  },
];

vi.mock("@/lib/leitnerService", () => ({
  getLeitnerCards: vi.fn().mockImplementation(() => Promise.resolve([...mockCards])),
  getDueLeitnerCards: vi.fn().mockImplementation(() => Promise.resolve([mockCards[0]])),
  getLeitnerBoxStats: vi.fn().mockImplementation(() =>
    Promise.resolve({
      box1: 1,
      box2: 1,
      box3: 0,
      box4: 0,
      box5: 0,
      dueToday: 1,
      totalCards: 2,
      masteredCount: 0,
    })
  ),
  createLeitnerCard: vi.fn().mockImplementation((userId, data) =>
    Promise.resolve({
      id: `card-${Date.now()}`,
      user_id: userId,
      ...data,
      box: 1,
      interval_days: 1,
      next_review_at: new Date().toISOString(),
      consecutive_correct: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  ),
  reviewLeitnerCard: vi.fn().mockResolvedValue({
    id: "card-1",
    box: 2,
  }),
  reviewLeitnerCardWithRating: vi.fn().mockResolvedValue({
    id: "card-1",
    box: 2,
  }),
  previewNextInterval: vi.fn().mockImplementation((card, rating) => {
    return { days: 3, textFa: "۳ روز", textEn: "3 days" };
  }),
  updateLeitnerCard: vi.fn().mockImplementation((userId, cardId, patch) =>
    Promise.resolve({ id: cardId, ...patch })
  ),
  getCramCards: vi.fn().mockImplementation(() => Promise.resolve([...mockCards])),
  deleteLeitnerCard: vi.fn().mockResolvedValue(true),
  getLeitnerSchedulingAlgorithm: vi.fn((card: LeitnerCard) => card?.scheduling_algorithm ?? "sm2"),
}));

vi.mock("@/lib/knowledgeService", () => ({
  getKnowledgeDocuments: vi.fn().mockResolvedValue([]),
  getKnowledgeFolders: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/taskStudyService", () => ({
  createStudyTask: vi.fn().mockResolvedValue({ ok: true }),
  getNextLeitnerReviewAt: vi.fn(),
  rescheduleLeitnerStudyTaskAfterSession: vi.fn(),
}));

describe("LeitnerDeckView", { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 5 Leitner boxes and due count banner", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    await waitFor(() => {
      expect(screen.getByText("جعبه ۱ (۱ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۲ (۳ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۳ (۷ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۴ (۱۴ روز)")).toBeDefined();
      expect(screen.getByText("جعبه ۵ (تسلط کامل)")).toBeDefined();
    });
    expect(getLeitnerCards).toHaveBeenCalledTimes(1);
    const [, dueSnapshot, dueEvaluatedAt] = vi.mocked(getDueLeitnerCards).mock.calls[0];
    const [, statsSnapshot, statsEvaluatedAt] = vi.mocked(getLeitnerBoxStats).mock.calls[0];
    expect(dueSnapshot).toEqual(expect.arrayContaining([mockCards[0]]));
    expect(dueSnapshot).toBe(statsSnapshot);
    expect(dueEvaluatedAt).toBe(statsEvaluatedAt);
  });

  it("enters study session when clicking start review button", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    await screen.findByText("شروع مرور (1 آماده)");
    const startBtn = screen.getByRole("button", { name: /شروع مرور/ });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("flip-card")).toBeDefined();
    });
  });

  it("shows the front and back in Persian and English when bilingual mode is selected", async () => {
    const bilingualCard = {
      ...mockCards[0],
      front_fa: "پرسش فارسی",
      front_en: "English question",
      back_fa: "پاسخ فارسی",
      back_en: "English answer",
    };
    vi.mocked(getLeitnerCards).mockResolvedValueOnce([bilingualCard]);
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([bilingualCard]);

    render(<LeitnerDeckView userId="user-test" cardLanguage="bilingual" />);
    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));

    const flipCard = await screen.findByTestId("flip-card");
    expect(within(flipCard).getByText("پرسش فارسی")).toBeInTheDocument();
    expect(within(flipCard).getByText("English question")).toBeInTheDocument();

    fireEvent.click(flipCard);
    expect(within(flipCard).getByText("پاسخ فارسی")).toBeInTheDocument();
    expect(within(flipCard).getByText("English answer")).toBeInTheDocument();
  });

  it("opens focus mode with Z, switches its reading theme, and exits with Escape", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    fireEvent.keyDown(document, { key: "z" });

    const dialog = await screen.findByRole("dialog", { name: "مطالعهٔ متمرکز لایتنر" });
    expect(dialog).toHaveAttribute("data-study-theme", "oled");

    const paperTheme = within(dialog).getByRole("button", { name: "تم کاغذی گرم" });
    fireEvent.click(paperTheme);
    expect(paperTheme).toHaveAttribute("aria-pressed", "true");
    expect(dialog).toHaveAttribute("data-study-theme", "paper");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("flip-card")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "z" });
    expect(await screen.findByRole("dialog", { name: "مطالعهٔ متمرکز لایتنر" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("limits a scheduled review session to due cards from its selected lesson", async () => {
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([
      { ...mockCards[0], id: "card-a", document_id: "doc-a", front: "سؤال درس الف" },
      { ...mockCards[0], id: "card-b", document_id: "doc-b", front: "سؤال درس ب" },
    ]);

    render(<LeitnerDeckView userId="user-test" initialStudyDocumentId="doc-b" />);

    const startButton = await screen.findByRole("button", { name: "شروع مرور (1 آماده)" });
    expect(screen.getByText(/این تسک فقط کارت‌های موعددارِ درس زیر را مرور می‌کند/)).toBeInTheDocument();
    fireEvent.click(startButton);

    await screen.findByTestId("flip-card");
    expect(screen.getByText("سؤال درس ب")).toBeInTheDocument();
    expect(screen.queryByText("سؤال درس الف")).not.toBeInTheDocument();
  });

  it("limits a scheduled review session to due cards in a selected folder and nested folders", async () => {
    const nestedCard = { ...mockCards[0], id: "card-nested", document_id: "doc-nested", front: "Nested lesson question" };
    const outsideCard = { ...mockCards[0], id: "card-outside", document_id: "doc-outside", front: "Outside lesson question" };
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([nestedCard, outsideCard]);
    vi.mocked(getKnowledgeDocuments).mockResolvedValueOnce([
      { id: "doc-nested", user_id: "user-test", folder_id: "folder-child", title: "Nested lesson", content_html: "", created_at: "", updated_at: "" },
      { id: "doc-outside", user_id: "user-test", folder_id: "folder-other", title: "Other lesson", content_html: "", created_at: "", updated_at: "" },
    ]);
    vi.mocked(getKnowledgeFolders).mockResolvedValueOnce([
      { id: "folder-root", user_id: "user-test", parent_id: null, name: "Pharmacology", created_at: "", updated_at: "" },
      { id: "folder-child", user_id: "user-test", parent_id: "folder-root", name: "Cardiology", created_at: "", updated_at: "" },
      { id: "folder-other", user_id: "user-test", parent_id: null, name: "Mathematics", created_at: "", updated_at: "" },
    ]);

    render(<LeitnerDeckView userId="user-test" initialStudyFolderId="folder-root" />);

    const startButton = await screen.findByRole("button", { name: "شروع مرور (1 آماده)" });
    expect(screen.getByText(/این تسک کارت‌های موعددارِ این پوشه و زیرپوشه‌هایش را مرور می‌کند/)).toBeInTheDocument();
    fireEvent.click(startButton);

    const activeCard = await screen.findByTestId("flip-card");
    expect(within(activeCard).getByText("Nested lesson question")).toBeInTheDocument();
    expect(within(activeCard).queryByText("Outside lesson question")).not.toBeInTheDocument();
  });

  it("shows cards in a folder-to-lesson outline and filters due cards by service IDs", async () => {
    const dueCard = {
      ...mockCards[0],
      id: "outline-due-card",
      document_id: "outline-doc",
      folder_id: "outline-root",
      front: "Due outline question",
    };
    const upcomingCard = {
      ...mockCards[1],
      id: "outline-upcoming-card",
      document_id: "outline-doc",
      folder_id: "outline-root",
      front: "Upcoming outline question",
    };
    vi.mocked(getLeitnerCards).mockResolvedValueOnce([dueCard, upcomingCard]);
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([dueCard]);
    vi.mocked(getKnowledgeDocuments).mockResolvedValueOnce([{
      id: "outline-doc",
      user_id: "user-test",
      folder_id: "outline-child",
      title: "Cardiology lesson",
      content_html: "",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    }]);
    vi.mocked(getKnowledgeFolders).mockResolvedValueOnce([
      {
        id: "outline-root",
        user_id: "user-test",
        parent_id: null,
        name: "Pharmacology",
        position: 1,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "outline-child",
        user_id: "user-test",
        parent_id: "outline-root",
        name: "Cardiology",
        position: 1,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    ]);

    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: "نمای درختی" }));
    expect(await screen.findByTestId("leitner-outline-card-outline-due-card")).toBeInTheDocument();
    expect(screen.getByTestId("leitner-outline-card-outline-upcoming-card")).toBeInTheDocument();
    const rootFolder = screen.getByRole("button", { name: "Pharmacology 2" });
    expect(screen.getByRole("button", { name: "Cardiology 2" })).toHaveAttribute("aria-expanded", "true");
    expect(rootFolder).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "بستن همه" }));
    expect(rootFolder).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("leitner-outline-card-outline-due-card")).not.toBeInTheDocument();
    fireEvent.click(rootFolder);
    expect(screen.getByRole("button", { name: "Cardiology 2" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "بازکردن همه" }));
    expect(rootFolder).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Cardiology 2" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("leitner-outline-card-outline-due-card")).toBeInTheDocument();
    fireEvent.click(rootFolder);
    expect(rootFolder).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("leitner-outline-card-outline-due-card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بازکردن همه" }));
    expect(rootFolder).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("leitner-outline-card-outline-due-card")).toBeInTheDocument();
    fireEvent.click(rootFolder);
    expect(rootFolder).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(rootFolder);
    expect(screen.getByTestId("leitner-outline-card-outline-due-card")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "موعد مرور" }));
    expect(screen.getByTestId("leitner-outline-card-outline-due-card")).toBeInTheDocument();
    expect(screen.queryByTestId("leitner-outline-card-outline-upcoming-card")).not.toBeInTheDocument();
  });

  it("combines selected due cards across lessons into one unique review session", async () => {
    const firstDueCard = {
      ...mockCards[0],
      id: "multi-due-a",
      document_id: "multi-doc-a",
      folder_id: "multi-folder",
      front: "Selected lesson A question",
    };
    const secondDueCard = {
      ...mockCards[0],
      id: "multi-due-b",
      document_id: "multi-doc-b",
      folder_id: "multi-folder",
      front: "Selected lesson B question",
    };
    const upcomingCard = {
      ...mockCards[1],
      id: "multi-upcoming",
      document_id: "multi-doc-a",
      folder_id: "multi-folder",
      front: "Upcoming lesson question",
    };
    vi.mocked(getLeitnerCards).mockResolvedValueOnce([firstDueCard, secondDueCard, upcomingCard]);
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([firstDueCard, secondDueCard]);
    vi.mocked(getKnowledgeFolders).mockResolvedValueOnce([{
      id: "multi-folder",
      user_id: "user-test",
      parent_id: null,
      name: "Study folder",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    }]);
    vi.mocked(getKnowledgeDocuments).mockResolvedValueOnce([
      {
        id: "multi-doc-a",
        user_id: "user-test",
        folder_id: "multi-folder",
        title: "Lesson A",
        content_html: "",
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "multi-doc-b",
        user_id: "user-test",
        folder_id: "multi-folder",
        title: "Lesson B",
        content_html: "",
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    ]);

    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: "نمای درختی" }));
    expect(await screen.findByTestId("leitner-outline-card-multi-due-a")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "انتخاب کارت موعددار Upcoming lesson question" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "انتخاب 1 کارت موعددار از Lesson A" }));
    fireEvent.click(screen.getByRole("button", { name: "انتخاب 1 کارت موعددار از Lesson B" }));

    expect(screen.getByText("2 کارت موعددار انتخاب شده")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "مرور انتخاب‌شده‌ها" }));
    let activeCard = await screen.findByTestId("flip-card");
    expect(within(activeCard).getByText("Selected lesson A question")).toBeInTheDocument();
    fireEvent.click(activeCard);
    fireEvent.click(await screen.findByRole("button", { name: /بلدم/ }));

    activeCard = await screen.findByTestId("flip-card");
    expect(within(activeCard).getByText("Selected lesson B question")).toBeInTheDocument();
    expect(within(activeCard).queryByText("Upcoming lesson question")).not.toBeInTheDocument();
  });

  it("starts a task-safe review from a folder branch and does not advance the linked task", async () => {
    const taskCard = {
      ...mockCards[0],
      id: "branch-task-card",
      document_id: "task-doc",
      front: "Task lesson question",
    };
    const otherDueCard = {
      ...mockCards[0],
      id: "branch-other-card",
      document_id: "other-doc",
      front: "Other lesson question",
    };
    const documents = [
      {
        id: "task-doc",
        user_id: "user-test",
        folder_id: "branch-folder",
        title: "Task lesson",
        content_html: "",
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "other-doc",
        user_id: "user-test",
        folder_id: "branch-folder",
        title: "Other lesson",
        content_html: "",
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    ];
    vi.mocked(getLeitnerCards).mockResolvedValue([taskCard, otherDueCard]);
    vi.mocked(getDueLeitnerCards).mockResolvedValue([taskCard, otherDueCard]);
    vi.mocked(getKnowledgeDocuments).mockResolvedValue(documents);
    vi.mocked(getKnowledgeFolders).mockResolvedValue([{
      id: "branch-folder",
      user_id: "user-test",
      parent_id: null,
      name: "Study folder",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    }]);

    render(
      <LeitnerDeckView
        userId="user-test"
        initialStudyDocumentId="task-doc"
        initialStudyTaskId="task-review-7"
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "نمای درختی" }));
    fireEvent.click(await screen.findByRole("button", { name: /مرور 1 کارت موعددار در Study folder/ }));

    const activeFlipCard = await screen.findByTestId("flip-card");
    expect(within(activeFlipCard).getByText("Task lesson question")).toBeInTheDocument();
    expect(within(activeFlipCard).queryByText("Other lesson question")).not.toBeInTheDocument();
    fireEvent.click(activeFlipCard);
    fireEvent.click(screen.getByRole("button", { name: /بلدم/ }));

    await waitFor(() => {
      expect(getNextLeitnerReviewAt).not.toHaveBeenCalled();
      expect(rescheduleLeitnerStudyTaskAfterSession).not.toHaveBeenCalled();
    });
    expect(getKnowledgeDocuments).toHaveBeenCalledTimes(1);
    expect(getKnowledgeFolders).toHaveBeenCalledTimes(1);
  });

  it("moves the linked study task to the next scheduled date after a due session", async () => {
    const nextReviewAt = "2026-10-02T09:30:00.000Z";
    const dueCard = { ...mockCards[0], id: "card-doc-7", document_id: "doc-7" };
    vi.mocked(getLeitnerCards).mockResolvedValue([dueCard]);
    vi.mocked(getDueLeitnerCards).mockResolvedValue([dueCard]);
    vi.mocked(getNextLeitnerReviewAt).mockReturnValue(nextReviewAt);
    vi.mocked(rescheduleLeitnerStudyTaskAfterSession).mockResolvedValue({
      ok: true,
      status: "saved",
      dueDate: nextReviewAt,
    });

    render(
      <LeitnerDeckView
        userId="user-test"
        initialStudyDocumentId="doc-7"
        initialStudyTaskId="task-review-7"
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    fireEvent.click(await screen.findByTestId("flip-card"));
    fireEvent.click(await screen.findByRole("button", { name: /بلدم/ }));

    await waitFor(() => {
      expect(getNextLeitnerReviewAt).toHaveBeenCalledWith([dueCard], "doc-7");
      expect(rescheduleLeitnerStudyTaskAfterSession).toHaveBeenCalledWith({
        userId: "user-test",
        taskId: "task-review-7",
        targetType: "leitner",
        targetId: "doc-7",
        nextReviewAt,
      });
    });
  });

  it("reschedules a folder review task using only cards still in that folder branch", async () => {
    const nextReviewAt = "2026-10-04T09:30:00.000Z";
    const dueCard = { ...mockCards[0], id: "card-folder-child", document_id: "doc-folder-child", front: "Folder review question" };
    const staleFolderCard = { ...mockCards[1], id: "card-stale-folder", document_id: "doc-outside", folder_id: "folder-root" };
    const otherCard = { ...mockCards[1], id: "card-other", document_id: "doc-outside", folder_id: "folder-other" };
    vi.mocked(getLeitnerCards).mockResolvedValueOnce([dueCard, staleFolderCard, otherCard]);
    vi.mocked(getLeitnerCards).mockResolvedValueOnce([dueCard, staleFolderCard, otherCard]);
    vi.mocked(getDueLeitnerCards).mockResolvedValueOnce([dueCard]);
    vi.mocked(getKnowledgeDocuments).mockResolvedValueOnce([
      { id: "doc-folder-child", user_id: "user-test", folder_id: "folder-child", title: "Child", content_html: "", created_at: "", updated_at: "" },
      { id: "doc-outside", user_id: "user-test", folder_id: "folder-other", title: "Outside", content_html: "", created_at: "", updated_at: "" },
    ]);
    vi.mocked(getKnowledgeFolders).mockResolvedValueOnce([
      { id: "folder-root", user_id: "user-test", parent_id: null, name: "Root", created_at: "", updated_at: "" },
      { id: "folder-child", user_id: "user-test", parent_id: "folder-root", name: "Child", created_at: "", updated_at: "" },
      { id: "folder-other", user_id: "user-test", parent_id: null, name: "Other", created_at: "", updated_at: "" },
    ]);
    vi.mocked(getNextLeitnerReviewAt).mockReturnValue(nextReviewAt);
    vi.mocked(rescheduleLeitnerStudyTaskAfterSession).mockResolvedValue({
      ok: true,
      status: "saved",
      dueDate: nextReviewAt,
    });

    render(<LeitnerDeckView userId="user-test" initialStudyFolderId="folder-root" initialStudyTaskId="folder-review-task" />);
    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    fireEvent.click(await screen.findByTestId("flip-card"));
    fireEvent.click(await screen.findByRole("button", { name: /بلدم/ }));

    await waitFor(() => {
      expect(getNextLeitnerReviewAt).toHaveBeenCalledWith([dueCard], "all");
      expect(rescheduleLeitnerStudyTaskAfterSession).toHaveBeenCalledWith({
        userId: "user-test",
        taskId: "folder-review-task",
        targetType: "leitner_folder",
        targetId: "folder-root",
        nextReviewAt,
      });
    });
  });

  it("lets a new card explicitly choose and save its scheduler", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: "کارت جدید" }));
    const schedulerSelect = await screen.findByLabelText("روش زمان‌بندی مرور");
    expect((schedulerSelect as HTMLSelectElement).value).toBe("fsrs6");
    fireEvent.change(schedulerSelect, { target: { value: "sm2" } });
    fireEvent.change(screen.getByPlaceholderText("مثلاً مکانیسم اثر فلوکستین..."), {
      target: { value: "Question" },
    });
    fireEvent.change(screen.getByPlaceholderText("مثلاً مهارکننده انتخابی بازجذب سروتونین (SSRI)..."), {
      target: { value: "Answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ایجاد کارت" }));

    await waitFor(() => {
      expect(createLeitnerCard).toHaveBeenCalledWith("user-test", expect.objectContaining({
        front: "Question",
        back: "Answer",
        scheduling_algorithm: "sm2",
      }));
    });
  });

  it("flips card to reveal answer and ratings", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    await screen.findByText("شروع مرور (1 آماده)");
    const startBtn = screen.getByRole("button", { name: /شروع مرور/ });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("flip-card")).toBeDefined();
    });

    // Click to flip
    fireEvent.click(screen.getByTestId("flip-card"));

    await waitFor(() => {
      expect(screen.getAllByText("بی‌خوابی، تهوع، اضطراب گذرا در روزهای نخست").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("فراموش کردم (جعبه ۱)")).toBeDefined();
      expect(screen.getByText("بلدم (انتقال به جعبه بعدی)")).toBeDefined();
    });
  });

  it("does not allow a card rating until the answer has been revealed", async () => {
    render(<LeitnerDeckView userId="user-test" />);

    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    await screen.findByTestId("flip-card");

    const againButton = screen.getByRole("button", { name: /فراموش کردم/ });
    expect(againButton).toBeDisabled();
    fireEvent.click(againButton);
    expect(reviewLeitnerCardWithRating).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("flip-card"));
    await waitFor(() => expect(againButton).toBeEnabled());
    fireEvent.click(againButton);
    await waitFor(() => expect(reviewLeitnerCardWithRating).toHaveBeenCalledTimes(1));
  });

  it("prevents a second rating while the first save is still pending", async () => {
    let resolveReview!: (card: LeitnerCard) => void;
    vi.mocked(reviewLeitnerCardWithRating).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReview = resolve;
      }),
    );

    render(<LeitnerDeckView userId="user-test" />);
    fireEvent.click(await screen.findByRole("button", { name: /شروع مرور/ }));
    fireEvent.click(await screen.findByTestId("flip-card"));

    const ratingButton = await screen.findByRole("button", { name: /فراموش کردم/ });
    fireEvent.click(ratingButton);
    fireEvent.click(ratingButton);

    expect(reviewLeitnerCardWithRating).toHaveBeenCalledTimes(1);
    expect((ratingButton as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveReview({ ...mockCards[0] });
    });
    expect(screen.getByRole("button", { name: /فراموش کردم/ })).toBeDisabled();
    expect(reviewLeitnerCardWithRating).toHaveBeenCalledTimes(1);
  });
});
