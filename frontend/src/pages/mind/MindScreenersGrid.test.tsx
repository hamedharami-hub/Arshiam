import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { MindScreenersGrid } from "./MindScreenersGrid";

afterEach(cleanup);
function show(latestScreeners: Record<string, any>, isEn = true) {
  return render(<MemoryRouter><MindScreenersGrid latestScreeners={latestScreeners} isEn={isEn} T={(fa, en) => isEn ? en : fa} /></MemoryRouter>);
}
describe("Mind screener recorded-result cards", () => {
  it("shows completed date, named raw range and separate inline last result vs real retake route", () => {
    show({ phq9: { completed_at: "2025-02-03T12:00:00Z", scores: { raw: 9, language: "en", instrument_version: "1.0" }, analysis: { severityLabel_en: "Mild", recommendation_en: "Stored recommendation" } } });
    expect(screen.getByTestId("screener-date-phq9")).toHaveTextContent("2025");
    expect(screen.getByText("Current scale range: 0–27")).toBeInTheDocument();
    expect(screen.getByText("Raw score: 9")).toBeInTheDocument();
    const details = screen.getByTestId("screener-last-phq9");
    expect(details.tagName).toBe("DETAILS");
    fireEvent.click(details.querySelector("summary")!);
    expect(details).toHaveTextContent("Stored recommendation");
    expect(screen.getByRole("link", { name: "Retake / continue draft" })).toHaveAttribute("href", "/app/screener/phq9");
    expect(screen.queryByRole("link", { name: "View last recorded result" })).not.toBeInTheDocument();
    expect(screen.getByText(/validation of these in-app translations is not confirmed/)).toBeInTheDocument();
  });

  it("does not invent completion dates or language/version for legacy rows", () => {
    show({ who5: { created_at: "2026-10-15", scores: { raw: 0 } }, gad7: { completed_at: "bad-date", scores: { raw: 1 } } });
    expect(screen.getByTestId("screener-date-who5")).toHaveTextContent("Completion date unknown");
    expect(screen.getByTestId("screener-date-gad7")).toHaveTextContent("Completion date unknown");
    expect(screen.getByTestId("screener-last-who5")).toHaveTextContent("Recorded version / language: Unknown / Unknown");
    expect(screen.getByText("Raw score: 0")).toBeInTheDocument();
    expect(screen.getByText("Current scale range: 0–25")).toBeInTheDocument();
  });

  it("uses personal responses, not an unvalidated stored severity label", () => {
    show({ burnout: { scores: { raw: 24, answers: { 1: 4 } }, analysis: { severity: "severe", severityLabel_en: "Severe burnout" } } });
    expect(screen.queryByText("Severe burnout")).not.toBeInTheDocument();
    expect(screen.getByTestId("screener-last-burnout")).toHaveTextContent("I feel worn out and chronically exhausted — Always");
    expect(screen.getByTestId("screener-last-burnout")).toHaveTextContent("Answer unknown");
    expect(screen.getByText("Current scale range: 0–24")).toBeInTheDocument();
  });

  it("keeps empty-state actions honest and renders bilingual provenance", () => {
    show({}, false);
    expect(screen.getAllByRole("link", { name: "شروع پرسشنامه" })).toHaveLength(4);
    expect(screen.getAllByText("نسخهٔ اصلی استاندارد")).toHaveLength(3);
    expect(screen.queryByText("مشاهدهٔ آخرین نتیجهٔ ثبت‌شده")).not.toBeInTheDocument();
  });
});
