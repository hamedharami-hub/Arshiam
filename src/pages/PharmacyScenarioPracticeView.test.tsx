import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PharmacyScenarioPracticeView from "./PharmacyScenarioPracticeView";
import { PHARMACY_PRACTICE_SCENARIOS } from "@/lib/pharmacyScenarioPracticeData";

const { languageState, authState } = vi.hoisted(() => ({
  languageState: { lang: "en" as "en" | "fa" },
  authState: { user: { id: "user-a" } as { id: string } | null },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: authState.user }) }));
vi.mock("@/lib/firebase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/firebase")>()),
  getDocs: vi.fn(async () => ({ forEach: () => undefined })),
}));
vi.mock("@/lib/firestoreSync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/firestoreSync")>()),
  saveEntityToFirestoreWithOutcome: vi.fn(async () => "saved"),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    lang: languageState.lang,
    T: (fa: string, en: string) => languageState.lang === "en" ? en : fa,
  }),
}));

describe("PharmacyScenarioPracticeView", () => {
  beforeEach(() => { languageState.lang = "en"; authState.user = { id: "user-a" }; window.localStorage.clear(); });

  it("starts with the case briefing and keeps the outcome hidden", () => {
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByRole("heading", { name: "Pharmacy scenario practice" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("have not been independently reviewed");
    expect(screen.getByRole("heading", { name: "Initial presentation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Source debrief" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("gates progression until patient replies are revealed and a response is selected", async () => {
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
    fireEvent.click(screen.getByTestId("scenario-decision-supply-btn"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Source debrief" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("scenario-progress-status")).toHaveTextContent("Progress saved and synced."));
  });

  it("stars patient replies and saves referral drafts for the signed-in account", async () => {
    const scenario = PHARMACY_PRACTICE_SCENARIOS.find((item) => item.mode === "MODE_B_SLANG")!;
    render(<PharmacyScenarioPracticeView />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Reveal patient reply" })[0]);
    fireEvent.click(screen.getByTestId(`scenario-star-question-${scenario.questions[0].key}`));
    await waitFor(() => expect(screen.getByTestId("starred-phrase-item")).toHaveTextContent(scenario.questions[0].answerEn));

    for (let index = 1; index < scenario.questions.length; index += 1) {
      fireEvent.click(screen.getAllByRole("button", { name: "Reveal patient reply" })[0]);
    }
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByText("Option 1").closest("button")!);
    fireEvent.click(screen.getByTestId("scenario-decision-refer-btn"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByTestId("scenario-open-referral-letter-btn"));
    fireEvent.change(screen.getByTestId("referral-field-to"), { target: { value: "Dr Example (GP)" } });
    fireEvent.change(screen.getByTestId("referral-field-reason"), { target: { value: "Needs medical review" } });
    fireEvent.click(screen.getByTestId("referral-save-btn"));
    expect(await screen.findByTestId("referral-status-saved")).toHaveTextContent("Draft saved and synced");
    expect(window.localStorage.getItem("arshnaz:pharmacy:records:user-a")).toContain("Dr Example (GP)");
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
