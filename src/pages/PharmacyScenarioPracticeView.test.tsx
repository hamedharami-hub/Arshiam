import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PharmacyScenarioPracticeView from "./PharmacyScenarioPracticeView";
import { PHARMACY_PRACTICE_SCENARIOS } from "@/lib/pharmacyScenarioPracticeData";

const { languageState } = vi.hoisted(() => ({ languageState: { lang: "en" as "en" | "fa" } }));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    lang: languageState.lang,
    T: (fa: string, en: string) => languageState.lang === "en" ? en : fa,
  }),
}));

describe("PharmacyScenarioPracticeView", () => {
  beforeEach(() => { languageState.lang = "en"; });

  it("starts with the case briefing and keeps the outcome hidden", () => {
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByRole("heading", { name: "Pharmacy scenario practice" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("have not been independently reviewed");
    expect(screen.getByRole("heading", { name: "Initial presentation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Source debrief" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("gates progression until patient replies are revealed and a response is selected", () => {
    const scenario = PHARMACY_PRACTICE_SCENARIOS.find((item) => item.mode === "MODE_B_SLANG")!;
    render(<PharmacyScenarioPracticeView />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Assessment questions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(scenario.questions.length).toBeGreaterThan(0);
    for (const _question of scenario.questions) {
      fireEvent.click(screen.getAllByRole("button", { name: "Reveal patient reply" })[0]);
    }
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Choose your response" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    const optionButton = screen.getByText("Option 1").closest("button");
    expect(optionButton).not.toBeNull();
    fireEvent.click(optionButton!);
    expect(screen.getByText("Patient reply in source")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Source debrief" })).toBeInTheDocument();
  });

  it("supports Persian RTL labels and a no-results search", () => {
    languageState.lang = "fa";
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "تمرین تعاملی سناریوهای Pharmacy" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "جست‌وجوی پرونده" }), { target: { value: "هیچ پرونده‌ای با این عنوان نیست" } });
    expect(screen.getByRole("heading", { name: "پرونده‌ای پیدا نشد" })).toBeInTheDocument();
  });
});
