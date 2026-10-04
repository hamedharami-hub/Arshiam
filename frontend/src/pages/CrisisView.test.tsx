import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CrisisView from "./CrisisView";
import { CRISIS_REGION_STORAGE_KEY } from "@/lib/crisisResources";

// Mock useBilingual for test switching between English and Persian
let mockIsEn = true;
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    T: (fa: string, en: string) => (mockIsEn ? en : fa),
    isEn: mockIsEn,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CrisisView (/app/crisis) Route & Component Verification", () => {
  beforeEach(() => {
    mockIsEn = true;
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("1. English Language & Australia Default Configuration", () => {
    it("renders the crisis page without 404/NotFound", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <Routes>
            <Route path="/app/crisis" element={<CrisisView />} />
            <Route path="/app/today" element={<div data-testid="today-page">Today Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("crisis-page")).toBeInTheDocument();
      expect(screen.getByText("Crisis Support & Emergency Services (SOS)")).toBeInTheDocument();
    });

    it("defaults to Australia resources for English users and avoids US-only numbers by default", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      // Australia Emergency Services: Triple Zero (000)
      expect(screen.getByText("Emergency Services (Triple Zero)")).toBeInTheDocument();
      const tripleZeroCall = screen.getByTestId("call-btn-au-triple-zero");
      expect(tripleZeroCall).toHaveAttribute("href", "tel:000");

      // Australia 24/7 Lifeline: 13 11 14
      expect(screen.getByText("Lifeline (Crisis Support & Suicide Prevention)")).toBeInTheDocument();
      const lifelineCall = screen.getByTestId("call-btn-au-lifeline");
      expect(lifelineCall).toHaveAttribute("href", "tel:131114");

      // Beyond Blue & Suicide Call Back Service
      expect(screen.getByText("Beyond Blue")).toBeInTheDocument();
      expect(screen.getByText("Suicide Call Back Service")).toBeInTheDocument();

      // US-only numbers are NOT rendered in the Australia default view
      expect(screen.queryByText("988 Suicide & Crisis Lifeline")).not.toBeInTheDocument();
      expect(screen.queryByTestId("call-btn-us-lifeline-988")).not.toBeInTheDocument();
    });

    it("displays the explicit non-emergency and non-diagnosis clinical disclaimer", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      const disclaimerCard = screen.getByTestId("clinical-disclaimer-card");
      expect(disclaimerCard).toBeInTheDocument();
      expect(disclaimerCard).toHaveTextContent(/ARSHNAZ is not an emergency service/i);
      expect(disclaimerCard).toHaveTextContent(/does NOT provide clinical diagnosis/i);
      expect(disclaimerCard).toHaveTextContent(/No AI system is involved/i);
    });

    it("provides a high-visibility Quick Exit button that navigates directly to /app/today", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <Routes>
            <Route path="/app/crisis" element={<CrisisView />} />
            <Route path="/app/today" element={<div data-testid="today-page">Safe Today View</div>} />
          </Routes>
        </MemoryRouter>
      );

      const quickExitBtn = screen.getByTestId("quick-exit-button");
      expect(quickExitBtn).toBeInTheDocument();
      expect(quickExitBtn).toHaveTextContent("Quick Exit to Safety");

      fireEvent.click(quickExitBtn);
      expect(screen.getByTestId("today-page")).toBeInTheDocument();
    });

    it("verifies all tel: links in English view use valid dialable digits without spaces or words", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      const links = screen.getAllByRole("link");
      const telLinks = links.filter((l) => l.getAttribute("href")?.startsWith("tel:"));
      expect(telLinks.length).toBeGreaterThan(0);

      for (const link of telLinks) {
        const href = link.getAttribute("href") || "";
        const telValue = href.replace("tel:", "");
        expect(telValue).toMatch(/^\+?[0-9]+$/);
        expect(telValue).not.toMatch(/\s/);
        expect(telValue).not.toMatch(/[a-zA-Z]/);
      }
    });
  });

  describe("2. Persian Language & Iran Default Configuration", () => {
    beforeEach(() => {
      mockIsEn = false;
    });

    it("defaults to Iran resources for Persian users", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      // Iran Social Emergency 123
      expect(screen.getByText("اورژانس اجتماعی (سازمان بهزیستی)")).toBeInTheDocument();
      const socialCall = screen.getByTestId("call-btn-ir-social");
      expect(socialCall).toHaveAttribute("href", "tel:123");

      // Iran EMS 115
      expect(screen.getByText("اورژانس پیش‌بیمارستانی (فوریت‌های پزشکی)")).toBeInTheDocument();
      const emsCall = screen.getByTestId("call-btn-ir-ems");
      expect(emsCall).toHaveAttribute("href", "tel:115");

      // Welfare Counseling 1480
      expect(screen.getByText("صدای مشاور بهزیستی (مشاوره تلفنی روان‌شناختی)")).toBeInTheDocument();
      const welfareCall = screen.getByTestId("call-btn-ir-welfare");
      expect(welfareCall).toHaveAttribute("href", "tel:1480");
    });

    it("displays the Persian safety notice stating ARSHNAZ is not an emergency service and does not diagnose", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      const disclaimerCard = screen.getByTestId("clinical-disclaimer-card");
      expect(disclaimerCard).toHaveTextContent("ARSHNAZ اورژانس نیست و تشخیص ارائه نمی‌دهد");
      expect(disclaimerCard).toHaveTextContent("جایگزین خدمات اورژانسی، مراقبت‌های روان‌پزشکی یا تشخیص بالینی نیست");
      expect(disclaimerCard).toHaveTextContent("هیچ سیستم هوش مصنوعی در تصمیم‌گیری یا ارائه خدمات بحران دخالت ندارد");
    });

    it("renders the Persian Quick Exit button", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      const quickExitBtn = screen.getByTestId("quick-exit-button");
      expect(quickExitBtn).toHaveTextContent("خروج سریع به فضای امن");
    });
  });

  describe("3. Manual Region Selection & Reactivity", () => {
    it("switches regions dynamically and updates displayed resources without reload", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      // Initially Australia in English
      expect(screen.getByText("Emergency Services (Triple Zero)")).toBeInTheDocument();

      // Switch to Iran manually
      const iranBtn = screen.getByTestId("region-btn-ir");
      fireEvent.click(iranBtn);

      expect(localStorage.getItem(CRISIS_REGION_STORAGE_KEY)).toBe("ir");
      expect(screen.getByTestId("call-btn-ir-social")).toBeInTheDocument();
      expect(screen.queryByTestId("call-btn-au-triple-zero")).not.toBeInTheDocument();

      // Switch to United States manually
      const usBtn = screen.getByTestId("region-btn-us");
      fireEvent.click(usBtn);

      expect(localStorage.getItem(CRISIS_REGION_STORAGE_KEY)).toBe("us");
      expect(screen.getByText("988 Suicide & Crisis Lifeline")).toBeInTheDocument();
      expect(screen.getByTestId("call-btn-us-lifeline-988")).toHaveAttribute("href", "tel:988");

      // Switch back to Australia manually
      const auBtn = screen.getByTestId("region-btn-au");
      fireEvent.click(auBtn);

      expect(localStorage.getItem(CRISIS_REGION_STORAGE_KEY)).toBe("au");
      expect(screen.getByText("Lifeline (Crisis Support & Suicide Prevention)")).toBeInTheDocument();
    });

    it("loads previously saved manual region from localStorage on initial render", () => {
      localStorage.setItem(CRISIS_REGION_STORAGE_KEY, "us");

      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      // Should respect saved "us" choice over English default "au"
      expect(screen.getByText("988 Suicide & Crisis Lifeline")).toBeInTheDocument();
    });
  });

  describe("4. Pure Static & Grounding Exercises Verification", () => {
    it("renders static 5-4-3-2-1 grounding guide and link to 3D breathing without AI dependency", () => {
      render(
        <MemoryRouter initialEntries={["/app/crisis"]}>
          <CrisisView />
        </MemoryRouter>
      );

      expect(screen.getByText(/5-4-3-2-1 Sensory Grounding/i)).toBeInTheDocument();
      expect(screen.getByText(/Box Breathing/i)).toBeInTheDocument();
      expect(screen.getByText("Open 3D Breathing")).toBeInTheDocument();
    });
  });
});
