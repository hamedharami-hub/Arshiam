import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MindView from "./MindView";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-mind" }, loading: false }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));

vi.mock("@/lib/authService", () => ({
  getStoredUser: () => ({ id: "test-user-mind", email: "test@example.com" }),
}));

vi.mock("@/lib/firestoreDataService", () => ({
  subscribeCheckins: (_userId: string, onChange: (checkins: unknown[]) => void) => {
    onChange([{ id: "c1", date: new Date().toISOString().slice(0, 10), mood: 8, energy: 7 }]);
    return vi.fn();
  },
  subscribeThoughtRecords: (_userId: string, onChange: (records: unknown[]) => void) => {
    onChange([{ id: "t1", automatic_thought: "تست فکر", cognitive_distortion: "فاجعه‌سازی" }]);
    return vi.fn();
  },
  subscribeTasks: (_userId: string, onChange: (tasks: unknown[]) => void) => {
    onChange([{ id: "task1", completed: true, folder_id: "mind" }]);
    return vi.fn();
  },
}));

describe("MindView Component", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders MindView header and pinned tools section with default pins", () => {
    render(
      <MemoryRouter initialEntries={["/app/mind"]}>
        <Routes>
          <Route path="/app/mind" element={<MindView />} />
        </Routes>
      </MemoryRouter>
    );

    // Header title
    expect(screen.getByText("ذهن و بهزیستی روان")).toBeInTheDocument();

    // Pinned tools section
    expect(screen.getByText("ابزارهای پین‌شده و پرکاربرد شما")).toBeInTheDocument();

    // Default pins include checkin, thoughts, breathing, socratic
    expect(screen.getAllByText("Check-in روزانه و سنجش حال").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("تنفس ریتمیک ۳بعدی و آرامش").length).toBeGreaterThanOrEqual(1);
  });

  it("allows unpinning and pinning tools via pin action buttons", () => {
    render(
      <MemoryRouter initialEntries={["/app/mind"]}>
        <Routes>
          <Route path="/app/mind" element={<MindView />} />
        </Routes>
      </MemoryRouter>
    );

    // Look for unpin button in the pinned tools area
    const unpinButtons = screen.getAllByTitle("برداشتن پین");
    expect(unpinButtons.length).toBeGreaterThanOrEqual(1);

    // Click the first unpin button
    fireEvent.click(unpinButtons[0]);

    // Check localStorage was updated
    const saved = window.localStorage.getItem("mind_pinned_tools_v2_test-user-mind");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved || "[]");
    expect(parsed).not.toContain("checkin");
  });

  it("filters tools when category chips are clicked", () => {
    render(
      <MemoryRouter initialEntries={["/app/mind"]}>
        <Routes>
          <Route path="/app/mind" element={<MindView />} />
        </Routes>
      </MemoryRouter>
    );

    // Click on 'آرامش و ریتم بدن' filter
    const somaticChip = screen.getByRole("button", { name: /آرامش و ریتم بدن/i });
    fireEvent.click(somaticChip);

    // Somatic tool should be visible in both pinned and category list
    expect(screen.getAllByText("تنفس ریتمیک ۳بعدی و آرامش").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the 3-step structured pathway with live indicators", () => {
    render(
      <MemoryRouter initialEntries={["/app/mind"]}>
        <Routes>
          <Route path="/app/mind" element={<MindView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("حالم را ثبت کنم")).toBeInTheDocument();
    expect(screen.getByText("فکری درگیرم کرده")).toBeInTheDocument();
    expect(screen.getByText("اقدام کوچک و بررسی نتیجه")).toBeInTheDocument();
  });
});
