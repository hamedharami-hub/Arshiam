import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiQuestionGeneratorModal } from "./AiQuestionGeneratorModal";

const mocks = vi.hoisted(() => ({
  isEn: false,
  generateQuestionsFromText: vi.fn(),
  createLeitnerCard: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: mocks.isEn }),
}));
vi.mock("@/lib/knowledgeQuestionGenerator", () => ({
  generateQuestionsFromText: mocks.generateQuestionsFromText,
}));
vi.mock("@/lib/leitnerService", () => ({
  createLeitnerCard: mocks.createLeitnerCard,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const persianCandidates = [
  {
    id: "card-cand-1",
    front: "مکانیسم داروی سرترالین چیست؟",
    back: "مهارکننده انتخابی بازجذب سروتونین (SSRI)",
    front_fa: "مکانیسم داروی سرترالین چیست؟",
    back_fa: "مهارکننده انتخابی بازجذب سروتونین (SSRI)",
    front_en: "What is sertraline's mechanism of action?",
    back_en: "Selective serotonin reuptake inhibitor (SSRI).",
    clue: "SSRI",
    type: "clinical_pearl",
    selected: true,
  },
  {
    id: "card-cand-2",
    front: "مهم‌ترین عارضه گوارشی سرترالین چیست؟",
    back: "تهوع و اسهال در شروع درمان",
    clue: "GI symptoms",
    type: "warning",
    selected: true,
  },
];

const englishCandidates = [
  { id: "candidate-1", front: "Question one?", back: "Answer one", selected: true },
  { id: "candidate-2", front: "Question two?", back: "Answer two", selected: true },
];

function renderModal(onCardsSaved = vi.fn()) {
  const props = {
    open: true,
    onClose: vi.fn(),
    initialText: "A sufficiently long clinical study excerpt for generating cards.",
    documentId: "doc-1",
    documentTitle: "Clinical topic",
    folderId: "folder-1",
    userId: "user-1",
    onCardsSaved,
  };
  return { ...render(<AiQuestionGeneratorModal {...props} />), props, onCardsSaved };
}

describe("AiQuestionGeneratorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEn = false;
    mocks.generateQuestionsFromText.mockResolvedValue(persianCandidates);
    mocks.createLeitnerCard.mockImplementation((userId, data) =>
      Promise.resolve({ id: "card-mock-1", user_id: userId, ...data, box: 1 })
    );
  });

  it("does not render when open is false", () => {
    render(
      <AiQuestionGeneratorModal
        open={false}
        onClose={() => {}}
        initialText="Sertraline 50mg"
        userId="user-test-1"
      />
    );
    expect(screen.queryByText(/تولید هوشمند سوالات لایتنر/i)).not.toBeInTheDocument();
  });

  it("does not send the source to AI until requested, then renders and saves reviewed cards", async () => {
    const onCardsSaved = vi.fn();
    const { createLeitnerCard } = await import("@/lib/leitnerService");

    render(
      <AiQuestionGeneratorModal
        open={true}
        onClose={() => {}}
        initialText="سرترالین یک داروی ضد افسردگی از دسته SSRI است."
        documentId="doc-test-1"
        documentTitle="راهنمای سرترالین"
        folderId="folder-test-1"
        userId="user-test-1"
        onCardsSaved={onCardsSaved}
      />
    );

    expect(screen.getByText(/تولید هوشمند سوالات لایتنر و نقشه ذهنی/i)).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/با فشردن «تولید»، عنوان درس، متن انتخابی/i);
    expect(screen.getByRole("note")).toHaveTextContent(/در صورت فعال‌بودن شخصی‌سازی/i);
    expect(mocks.generateQuestionsFromText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /تولید سوالات با هوش مصنوعی/i }));

    await waitFor(() => {
      expect(screen.getAllByLabelText("پرسش — فارسی")[0]).toHaveValue("مکانیسم داروی سرترالین چیست؟");
      expect(screen.getAllByLabelText("پاسخ — فارسی")[0]).toHaveValue("مهارکننده انتخابی بازجذب سروتونین (SSRI)");
    });

    fireEvent.click(screen.getAllByText("نسخه‌های فارسی و انگلیسی — پیش از ذخیره بررسی کنید")[0]);
    fireEvent.change(screen.getAllByLabelText("پاسخ — English")[0], {
      target: { value: "Reviewed: selective serotonin reuptake inhibitor (SSRI)." },
    });

    const saveButton = screen.getByRole("button", { name: /افزودن \(2\) کارت به لایتنر و نقشه ذهنی/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createLeitnerCard).toHaveBeenCalledTimes(2);
      expect(createLeitnerCard).toHaveBeenCalledWith("user-test-1", {
        front: "مکانیسم داروی سرترالین چیست؟",
        back: "مهارکننده انتخابی بازجذب سروتونین (SSRI)",
        front_fa: "مکانیسم داروی سرترالین چیست؟",
        back_fa: "مهارکننده انتخابی بازجذب سروتونین (SSRI)",
        front_en: "What is sertraline's mechanism of action?",
        back_en: "Reviewed: selective serotonin reuptake inhibitor (SSRI).",
        clue: "SSRI",
        document_id: "doc-test-1",
        folder_id: "folder-test-1",
        box: 1,
      });
      expect(onCardsSaved).toHaveBeenCalledWith(2);
    });
  });

  it("switches to manual mode and saves a custom card", async () => {
    const onCardsSaved = vi.fn();
    const { createLeitnerCard } = await import("@/lib/leitnerService");

    render(
      <AiQuestionGeneratorModal
        open={true}
        onClose={() => {}}
        initialText=""
        documentId="doc-test-2"
        userId="user-test-1"
        onCardsSaved={onCardsSaved}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /افزودن دستی کارت/i }));
    fireEvent.change(screen.getByPlaceholderText(/مکانیسم اثر فلوکستین چیست؟/i), {
      target: { value: "دوز شروع سرترالین؟" },
    });
    fireEvent.change(screen.getByPlaceholderText(/مهارکننده انتخابی بازجذب سروتونین/i), {
      target: { value: "۲۵ تا ۵۰ میلی‌گرم روزانه" },
    });
    fireEvent.click(screen.getByText("افزودن نسخه‌های فارسی و انگلیسی (اختیاری)"));
    fireEvent.change(screen.getByLabelText("پرسش — English"), {
      target: { value: "What is the starting dose of sertraline?" },
    });
    fireEvent.change(screen.getByLabelText("پاسخ — English"), {
      target: { value: "25 to 50 mg daily." },
    });
    fireEvent.click(screen.getByRole("button", { name: /افزودن کارت به لایتنر و نقشه ذهنی/i }));

    await waitFor(() => {
      expect(createLeitnerCard).toHaveBeenCalledWith("user-test-1", {
        front: "دوز شروع سرترالین؟",
        back: "۲۵ تا ۵۰ میلی‌گرم روزانه",
        front_en: "What is the starting dose of sertraline?",
        back_en: "25 to 50 mg daily.",
        clue: "",
        document_id: "doc-test-2",
        folder_id: null,
        box: 1,
      });
      expect(onCardsSaved).toHaveBeenCalledWith(1);
    });
  });

  it("does not generate on open or rerender, and generates once after the explicit action", async () => {
    mocks.isEn = true;
    mocks.generateQuestionsFromText.mockResolvedValue(englishCandidates);
    const { rerender, props } = renderModal();

    expect(screen.getByRole("note")).toHaveTextContent(/Nothing is sent just by opening this window/i);
    expect(mocks.generateQuestionsFromText).not.toHaveBeenCalled();
    rerender(<AiQuestionGeneratorModal {...props} />);
    expect(mocks.generateQuestionsFromText).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Generate Questions with AI" }));
    await waitFor(() => expect(mocks.generateQuestionsFromText).toHaveBeenCalledTimes(1));

    expect(mocks.generateQuestionsFromText).toHaveBeenCalledTimes(1);
    expect(await screen.findByDisplayValue("Question one?")).toBeTruthy();
  });

  it("aborts and ignores a late result after the selected lesson changes", async () => {
    mocks.isEn = true;
    const staleCards = [{ id: "stale", front: "Old lesson question?", back: "Old lesson answer", selected: true }];
    const currentCards = [{ id: "current", front: "New lesson question?", back: "New lesson answer", selected: true }];
    let resolveStale!: (cards: typeof staleCards) => void;
    const staleResponse = new Promise<typeof staleCards>((resolve) => {
      resolveStale = resolve;
    });
    mocks.generateQuestionsFromText
      .mockReturnValueOnce(staleResponse)
      .mockResolvedValueOnce(currentCards);

    const { rerender, props } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Generate Questions with AI" }));
    await waitFor(() => expect(mocks.generateQuestionsFromText).toHaveBeenCalledTimes(1));

    rerender(
      <AiQuestionGeneratorModal
        {...props}
        initialText="A different source excerpt for another lesson."
        documentTitle="New lesson"
        documentId="doc-2"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate Questions with AI" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Questions with AI" }));
    expect(await screen.findByDisplayValue("New lesson question?")).toBeInTheDocument();

    await act(async () => {
      resolveStale(staleCards);
    });

    expect(screen.queryByDisplayValue("Old lesson question?")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("New lesson question?")).toBeInTheDocument();
  });

  it("keeps saved cards out of preview and reports a later save failure", async () => {
    mocks.isEn = true;
    mocks.generateQuestionsFromText.mockResolvedValue(englishCandidates);
    const { onCardsSaved } = renderModal();
    expect(mocks.generateQuestionsFromText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Generate Questions with AI" }));
    await screen.findByDisplayValue("Question one?");
    mocks.createLeitnerCard
      .mockResolvedValueOnce({ id: "saved-card-1" })
      .mockRejectedValueOnce(new Error("sync queue storage is unavailable"));

    fireEvent.click(screen.getByRole("button", { name: "Add (2) Cards to Leitner & Mind Map" }));

    await waitFor(() => expect(onCardsSaved).toHaveBeenCalledWith(1));
    expect(screen.queryByDisplayValue("Question one?")).toBeNull();
    expect(screen.getByDisplayValue("Question two?")).toBeTruthy();
    expect(await screen.findByText(/The remaining cards were not saved/)).toBeTruthy();
  });
});
