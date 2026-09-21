import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SharedWithMeView from "./SharedWithMeView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
  }),
}));

describe("SharedWithMeView (/app/shared) Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders honest disabled-capability view with explanation", () => {
    render(
      <MemoryRouter initialEntries={["/app/shared"]}>
        <Routes>
          <Route path="/app/shared" element={<SharedWithMeView />} />
          <Route path="/app/today" element={<div data-testid="today-page">Today</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("shared-with-me-view")).toBeInTheDocument();
    expect(screen.getByText("Shared with me")).toBeInTheDocument();
    expect(screen.getByText("Cross-User Sharing")).toBeInTheDocument();
    expect(
      screen.getByText(/Cross-user resource sharing is disabled until secure server-side authorization/i)
    ).toBeInTheDocument();
  });

  it("provides a navigation button back to safety/dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/app/shared"]}>
        <Routes>
          <Route path="/app/shared" element={<SharedWithMeView />} />
          <Route path="/app/today" element={<div data-testid="today-page">Today</div>} />
        </Routes>
      </MemoryRouter>
    );

    const returnBtn = screen.getByRole("button", { name: "Return to Dashboard" });
    fireEvent.click(returnBtn);
    expect(screen.getByTestId("today-page")).toBeInTheDocument();
  });
});
