import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("renders and saves generated cards when source text is provided", async () => {
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
    await waitFor(() => {
      expect(screen.getByDisplayValue("مکانیسم داروی سرترالین چیست؟")).toBeInTheDocument();
      expect(screen.getByDisplayValue("مهارکننده انتخابی بازجذب سروتونین (SSRI)")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /افزودن \(2\) کارت به لایتنر و نقشه ذهنی/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createLeitnerCard).toHaveBeenCalledTimes(2);
      expect(createLeitnerCard).toHaveBeenCalledWith("user-test-1", {
        front: "مکانیسم داروی سرترالین چیست؟",
        back: "مهارکننده انتخابی بازجذب سروتونین (SSRI)",
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
    fireEvent.click(screen.getByRole("button", { name: /افزودن کارت به لایتنر و نقشه ذهنی/i }));

    await waitFor(() => {
      expect(createLeitnerCard).toHaveBeenCalledWith("user-test-1", {
        front: "دوز شروع سرترالین؟",
        back: "۲۵ تا ۵۰ میلی‌گرم روزانه",
        clue: "",
        document_id: "doc-test-2",
        folder_id: null,
        box: 1,
      });
      expect(onCardsSaved).toHaveBeenCalledWith(1);
    });
  });

  it("auto-generates only once for the same source when the modal rerenders", async () => {
    mocks.isEn = true;
    mocks.generateQuestionsFromText.mockResolvedValue(englishCandidates);
    const { rerender, props } = renderModal();

    await waitFor(() => expect(mocks.generateQuestionsFromText).toHaveBeenCalledTimes(1));
    rerender(<AiQuestionGeneratorModal {...props} />);

    expect(mocks.generateQuestionsFromText).toHaveBeenCalledTimes(1);
    expect(await screen.findByDisplayValue("Question one?")).toBeTruthy();
  });

  it("keeps saved cards out of preview and reports a later save failure", async () => {
    mocks.isEn = true;
    mocks.generateQuestionsFromText.mockResolvedValue(englishCandidates);
    const { onCardsSaved } = renderModal();
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
