import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MindView from "./MindView";
import { getMindDraft } from "@/lib/mindDraft";

const upsertDailyCheckin = vi.fn();
const auth = vi.hoisted(() => ({ id: "test-user-mind" }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: auth.id }, loading: false }),
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
    auth.id = "test-user-mind";
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

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

  it("does not carry private input to another account", () => {
    const view = renderHome();
    fireEvent.change(screen.getByTestId("mind-busy-input"), { target: { value: "owner one private text" } });
    auth.id = "owner-two";
    view.rerender(<MemoryRouter><MindView /></MemoryRouter>);
    expect(screen.getByTestId("mind-busy-input")).toHaveValue("");
    expect(getMindDraft("owner-two")).toBeNull();
  });

  it("does not claim device durability or allow overlapping writes while acknowledgement is pending", async () => {
    vi.useFakeTimers();
    let finish!: (ok: boolean) => void;
    upsertDailyCheckin.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
    renderHome();
    fireEvent.click(screen.getByTestId("mind-mood-save"));
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(screen.getByTestId("mind-mood-status")).toHaveTextContent("هنوز تأیید ذخیره نرسیده");
    expect(screen.getByTestId("mind-mood-save")).toBeDisabled();
    fireEvent.click(screen.getByTestId("mind-mood-save"));
    expect(upsertDailyCheckin).toHaveBeenCalledTimes(1);
    await act(async () => finish(true));
    expect(screen.getByTestId("mind-mood-status")).toHaveTextContent("ذخیره و همگام شد");
  });

  it("keeps newer mood edits unsaved when an older write finishes", async () => {
    let finish!: (ok: boolean) => void;
    upsertDailyCheckin.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
    renderHome();
    fireEvent.click(screen.getByTestId("mind-mood-save"));
    fireEvent.change(screen.getByTestId("mind-mood-slider"), { target: { value: "9" } });
    await act(async () => finish(true));
    expect(screen.getByTestId("mind-mood-slider")).toHaveValue("9");
    expect(screen.getByTestId("mind-mood-status")).not.toHaveTextContent("ذخیره و همگام شد");
  });

  it("handles a rejected mood write as a retryable failure", async () => {
    upsertDailyCheckin.mockRejectedValue(new Error("offline"));
    renderHome();
    fireEvent.click(screen.getByTestId("mind-mood-save"));
    await waitFor(() => expect(screen.getByTestId("mind-mood-status")).toHaveTextContent("ذخیره نشد"));
  });

  it("retains text and blocks navigation when the draft cannot be persisted", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    renderHome();
    fireEvent.change(screen.getByTestId("mind-busy-input"), { target: { value: "private text" } });
    fireEvent.click(screen.getByTestId("mind-path-worry"));
    expect(screen.getByTestId("mind-draft-error")).toBeInTheDocument();
    expect(screen.getByTestId("mind-busy-input")).toHaveValue("private text");
    expect(screen.queryByTestId("where")).toBeNull();
  });
});
