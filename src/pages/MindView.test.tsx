import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MindView from "./MindView";
import { getMindDraft } from "@/lib/mindDraft";

const upsertDailyCheckin = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-mind" }, loading: false }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));

vi.mock("@/lib/firestoreDataService", () => ({
  subscribeDailyCheckins: (_userId: string, onChange: (checkins: unknown[]) => void) => {
    onChange([]);
    return vi.fn();
  },
  upsertDailyCheckin: (...args: unknown[]) => upsertDailyCheckin(...args),
}));

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/app/mind"]}>
      <Routes>
        <Route path="/app/mind" element={<MindView />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("MindView home", () => {
  beforeEach(() => {
    window.localStorage.clear();
    upsertDailyCheckin.mockReset();
  });

  it("shows exactly the three main entries, the trends link and SOS", () => {
    renderHome();
    expect(screen.getByTestId("mind-card-mood")).toBeInTheDocument();
    expect(screen.getByTestId("mind-card-calm")).toBeInTheDocument();
    expect(screen.getByTestId("mind-card-busy")).toBeInTheDocument();
    expect(screen.getByTestId("mind-trends-link")).toBeInTheDocument();
    expect(screen.getByTestId("mind-crisis-link")).toBeInTheDocument();
    expect(screen.queryByText(/سقراط/)).toBeNull();
    expect(screen.queryByText(/ABC/)).toBeNull();
    expect(screen.queryByTestId("mind-continue-draft")).toBeNull();
  });

  it("reports saved status after the mood write succeeds", async () => {
    upsertDailyCheckin.mockResolvedValue(true);
    renderHome();
    fireEvent.click(screen.getByTestId("mind-mood-save"));
    await waitFor(() => expect(screen.getByTestId("mind-mood-status")).toHaveTextContent("ذخیره و همگام شد"));
  });

  it("reports failure honestly when the write fails", async () => {
    upsertDailyCheckin.mockResolvedValue(false);
    renderHome();
    fireEvent.click(screen.getByTestId("mind-mood-save"));
    await waitFor(() => expect(screen.getByTestId("mind-mood-status")).toHaveTextContent("ذخیره نشد"));
  });

  it("keeps the busy-mind text as a draft and carries it into the chosen path", () => {
    renderHome();
    fireEvent.change(screen.getByTestId("mind-busy-input"), { target: { value: "فردا ارائه دارم" } });
    expect(getMindDraft("test-user-mind")?.text).toBe("فردا ارائه دارم");
    fireEvent.click(screen.getByTestId("mind-path-worry"));
    expect(screen.getByTestId("where")).toHaveTextContent("/app/worry");
    expect(getMindDraft("test-user-mind")).toMatchObject({ text: "فردا ارائه دارم", path: "worry" });
  });

  it("offers to continue the last note only when a draft exists", () => {
    window.localStorage.setItem("mind_draft_v1_test-user-mind", JSON.stringify({ text: "x", path: "think", updatedAt: Date.now() }));
    renderHome();
    expect(screen.getByTestId("mind-continue-draft")).toHaveTextContent("ادامهٔ آخرین نوشته");
  });
});
