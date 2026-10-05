import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EducationRedirect from "./EducationRedirect";
import { Capacitor } from "@capacitor/core";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "fa" },
  }),
}));

describe("EducationRedirect", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    // Mock window.location.replace
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        replace: vi.fn(),
        href: "http://localhost:3000/app/education",
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it("renders redirect notice and manual link with target blank", () => {
    render(
      <MemoryRouter initialEntries={["/app/education"]}>
        <Routes>
          <Route path="/app/education" element={<EducationRedirect />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("در حال انتقال به آکادمی آموزش ارشناز...")).toBeInTheDocument();
    const link = screen.getByTestId("education-open-now");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("href", expect.stringContaining("https://arshnaz-learning.vercel.app"));
  });

  it("preserves search parameters and replaces window location on web", () => {
    render(
      <MemoryRouter initialEntries={["/app/education?lesson=hypertension-101&card=c-5"]}>
        <Routes>
          <Route path="/app/education" element={<EducationRedirect />} />
        </Routes>
      </MemoryRouter>
    );

    const link = screen.getByTestId("education-open-now");
    expect(link).toHaveAttribute(
      "href",
      "https://arshnaz-learning.vercel.app?lesson=hypertension-101&card=c-5"
    );

    // Fast-forward timeout to trigger redirect
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(window.location.replace).toHaveBeenCalledWith(
      "https://arshnaz-learning.vercel.app?lesson=hypertension-101&card=c-5"
    );
  });

  it("opens system browser and stays inside app when on native Capacitor platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <MemoryRouter initialEntries={["/app/education?lesson=asthma"]}>
        <Routes>
          <Route path="/app/education" element={<EducationRedirect />} />
          <Route path="/app/knowledge" element={<div data-testid="knowledge-page">Knowledge</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://arshnaz-learning.vercel.app?lesson=asthma",
      "_system",
      "noopener"
    );
    expect(window.location.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("knowledge-page")).toBeInTheDocument();
  });
});
