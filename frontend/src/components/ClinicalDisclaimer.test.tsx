import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRISIS_REGION_STORAGE_KEY } from "@/lib/crisisResources";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { clinical_consent: false } }) }) }) }) } }));
import ClinicalDisclaimer from "./ClinicalDisclaimer";
describe("ClinicalDisclaimer regional urgent help", () => {
  beforeEach(() => localStorage.clear());
  it("uses the chosen region and keeps SOS independent of consent", async () => {
    localStorage.setItem(CRISIS_REGION_STORAGE_KEY, "us");
    render(<MemoryRouter initialEntries={["/app/mind"]}><ClinicalDisclaimer /></MemoryRouter>);
    await screen.findByRole("dialog");
    expect(screen.getByRole("link", { name: /Emergency Services \(911\)/ })).toHaveAttribute("href", "tel:911");
    expect(screen.getByRole("link", { name: /Crisis Text Line/ })).toHaveAttribute("href", "sms:741741");
    expect(document.querySelector('a[href="tel:115"]')).toBeNull();
    expect(screen.getByTestId("disclaimer-crisis-link")).toHaveAttribute("href", "/app/crisis");
    expect(screen.getByRole("button", { name: "Acknowledge & Continue" })).toBeDisabled();
  });
  it("does not gate the crisis route", () => {
    render(<MemoryRouter initialEntries={["/app/crisis"]}><ClinicalDisclaimer /></MemoryRouter>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
