import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiQuestionGeneratorModal } from "./AiQuestionGeneratorModal";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

vi.mock("@/lib/leitnerService", () => ({
  createLeitnerCard: vi.fn().mockImplementation((userId, data) =>
    Promise.resolve({
      id: "card-mock-1",
      user_id: userId,
      ...data,
      box: 1,
    })
  ),
}));

vi.mock("@/lib/knowledgeQuestionGenerator", () => ({
  generateQuestionsFromText: vi.fn().mockResolvedValue([
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
  ]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AiQuestionGeneratorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. does not render when open is false", () => {
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

  it("2. renders modal and auto-generates cards when text is provided", async () => {
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

    // Modal title should be displayed
    expect(screen.getByText(/تولید هوشمند سوالات لایتنر و نقشه ذهنی/i)).toBeInTheDocument();

    // Candidate questions should appear in inputs
    await waitFor(() => {
      expect(screen.getByDisplayValue("مکانیسم داروی سرترالین چیست؟")).toBeInTheDocument();
      expect(screen.getByDisplayValue("مهارکننده انتخابی بازجذب سروتونین (SSRI)")).toBeInTheDocument();
    });

    // Save button should show count of selected cards
    const saveBtn = screen.getByRole("button", { name: /افزودن \(2\) کارت به لایتنر و نقشه ذهنی/i });
    expect(saveBtn).toBeInTheDocument();

    // Click save
    fireEvent.click(saveBtn);

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

  it("3. switches to manual tab and adds a custom card", async () => {
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

    const manualTabBtn = screen.getByRole("button", { name: /افزودن دستی کارت/i });
    fireEvent.click(manualTabBtn);

    // Fill manual inputs
    const frontInput = screen.getByPlaceholderText(/مکانیسم اثر فلوکستین چیست؟/i);
    const backInput = screen.getByPlaceholderText(/مهارکننده انتخابی بازجذب سروتونین/i);

    fireEvent.change(frontInput, { target: { value: "دوز شروع سرترالین؟" } });
    fireEvent.change(backInput, { target: { value: "۲۵ تا ۵۰ میلی‌گرم روزانه" } });

    const submitBtn = screen.getByRole("button", { name: /افزودن کارت به لایتنر و نقشه ذهنی/i });
    fireEvent.click(submitBtn);

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
});
