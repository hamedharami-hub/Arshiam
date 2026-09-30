import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FredWorkflowPanel } from "./FredWorkflowPanel";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "@/lib/pharmacyFredPracticeData";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ lang: "en", T: (_fa: string, en: string) => en }) }));

const openTab = (testId: string) => {
  fireEvent.mouseDown(screen.getByTestId(testId));
  fireEvent.click(screen.getByTestId(testId));
};

describe("FredWorkflowPanel", () => {
  it("labels a script, then approves it only when everything matches", () => {
    const script = PHARMACY_FRED_PRACTICE_SCENARIOS[0];
    render(<FredWorkflowPanel />);
    fireEvent.change(screen.getByTestId("fred-label-directions"), { target: { value: script.directions } });
    fireEvent.change(screen.getByTestId("fred-label-quantity"), { target: { value: String(script.quantity) } });
    fireEvent.change(screen.getByTestId("fred-label-repeats"), { target: { value: String(script.repeats) } });
    fireEvent.click(screen.getByTestId("fred-cal-CAL-1"));
    expect(screen.getByTestId("fred-label-preview")).toHaveTextContent("CAL 1");
    fireEvent.click(screen.getByTestId("fred-label-check-btn"));
    expect(screen.getByTestId("fred-label-feedback")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("fred-label-next-btn"));
    fireEvent.click(screen.getByTestId("fred-decision-release"));
    expect(screen.getByTestId("fred-final-check-feedback")).toHaveAttribute("data-correct", "false");
    for (const box of screen.getByTestId("fred-final-check-list").querySelectorAll("button[role='checkbox']")) fireEvent.click(box);
    fireEvent.click(screen.getByTestId("fred-decision-release"));
    expect(screen.getByTestId("fred-final-check-feedback")).toHaveAttribute("data-correct", "true");
  });

  it("calculates the Safety Net with 2026 amounts", () => {
    render(<FredWorkflowPanel />);
    openTab("fred-step-safetynet");
    expect(screen.getByTestId("fred-sn-copayment")).toHaveTextContent("$25.00");
    expect(screen.getByTestId("fred-sn-crossed")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("fred-sn-price"), { target: { value: "-3" } });
    expect(screen.getByTestId("fred-sn-invalid")).toBeInTheDocument();
  });

  it("refuses an unsigned ODT dose and records a valid one", () => {
    render(<FredWorkflowPanel />);
    openTab("fred-step-odt");
    fireEvent.change(screen.getByTestId("fred-odt-date"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByTestId("fred-odt-add-btn"));
    expect(screen.getByTestId("fred-odt-issues")).toHaveTextContent("signature is missing");
    fireEvent.click(screen.getByTestId("fred-odt-idChecked"));
    fireEvent.click(screen.getByTestId("fred-odt-signed"));
    fireEvent.click(screen.getByTestId("fred-odt-add-btn"));
    expect(screen.getAllByTestId("fred-odt-row")).toHaveLength(1);
    expect(screen.getByTestId("fred-odt-summary")).toHaveTextContent("1 doses · 60 mg");
  });
});
