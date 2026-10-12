import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uid: "owner-1", users: { "owner-1": { id: "owner-1" }, "owner-2": { id: "owner-2" } } as Record<string, { id: string }>, subscribe: vi.fn(), checkins: vi.fn(), save: vi.fn(),
  saveCheckin: vi.fn(), success: vi.fn(), error: vi.fn(), stream: vi.fn(),
  frames: [] as FrameRequestCallback[], now: 0,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.users[mocks.uid] || null, loading: false }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/ProfileMicroPrompt", () => ({ default: () => null }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {} }));
vi.mock("@/lib/firestoreDataService", () => ({
  subscribeAssessmentResults: mocks.subscribe, upsertAssessmentResult: mocks.save,
  subscribeDailyCheckins: mocks.checkins, upsertDailyCheckin: mocks.saveCheckin,
}));
vi.mock("@/lib/garden", () => ({ awardDailyCheckinDrops: vi.fn(), awardWaterDrops: vi.fn() }));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: async () => [] }));
vi.mock("@/lib/aiStream", () => ({ streamAI: mocks.stream }));
vi.mock("@/lib/pomodoroSynth", () => ({ startSynth: vi.fn(), stopSynth: vi.fn(), setSynthVolume: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

import ScreenerView from "./ScreenerView";
import AssessmentResult from "./AssessmentResult";
import CheckinView from "./CheckinView";
import BreathingView from "./BreathingView";

const screener = () => <MemoryRouter initialEntries={["/phq9"]}><Routes><Route path="/:type" element={<ScreenerView />} /></Routes></MemoryRouter>;
const assessment = () => <MemoryRouter initialEntries={["/via"]}><Routes><Route path="/:type" element={<AssessmentResult />} /></Routes></MemoryRouter>;

describe("Clinical safety and recoverability", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); mocks.uid = "owner-1";
    mocks.subscribe.mockImplementation((_uid, _type, update) => { update([]); return vi.fn(); });
    mocks.checkins.mockImplementation((_uid, update) => { update([]); return vi.fn(); });
    mocks.save.mockResolvedValue(null); mocks.saveCheckin.mockResolvedValue(true);
  });

  it("shows support on the answer stage and preserves it after a rejected save", async () => {
    localStorage.setItem("screener_draft_owner-1_phq9", JSON.stringify({ answers: { 9: 1 } }));
    mocks.save.mockRejectedValue(new Error("offline"));
    render(screener());
    fireEvent.click(screen.getByRole("button", { name: "Continue Screener" }));
    expect(screen.getByTestId("self-harm-support-card")).toBeVisible();
    expect(screen.getByTestId("sos-button")).toHaveAttribute("href", "/app/crisis");
    fireEvent.click(screen.getByRole("button", { name: "Review Answers" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Incomplete Draft" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByTestId("self-harm-support-card")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save Incomplete Draft" })).toBeEnabled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("keeps skipped check-in values null and does not infer balance", async () => {
    render(<MemoryRouter><CheckinView /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Save Check-in" }));
    await screen.findByText("Check-in Saved — Without Judgment");
    expect(mocks.saveCheckin).toHaveBeenCalledWith("owner-1", expect.objectContaining({ mood: null, energy: null, stress: null }));
    expect(screen.queryByText("Balanced & Steady State")).not.toBeInTheDocument();
    expect(screen.getByText(/Unanswered values remain unknown/)).toBeVisible();
  });

  it("shows immediate support when selecting a flagged answer and returning to questions", async () => {
    localStorage.setItem("screener_draft_owner-1_phq9", JSON.stringify({ answers: { 9: 0 } }));
    render(screener());
    fireEvent.click(screen.getByRole("button", { name: "Continue Screener" }));
    expect(screen.queryByTestId("self-harm-support-card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review Answers" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[8]);
    fireEvent.click(screen.getByRole("button", { name: /Several days/ }));
    expect(screen.getByTestId("self-harm-support-card")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to Questions" }));
    expect(screen.getByTestId("self-harm-support-card")).toBeVisible();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("retries a silent subscription without interpreting failure as no result", async () => {
    vi.useFakeTimers();
    try {
      mocks.subscribe.mockImplementation(() => vi.fn());
      render(assessment());
      expect(screen.getByText("Loading…")).toBeVisible();
      await act(async () => vi.advanceTimersByTime(10000));
      expect(screen.getByText("Results could not be loaded")).toBeVisible();
      expect(screen.queryByText("No result found for this assessment")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mocks.subscribe).toHaveBeenCalledTimes(2);
      expect(mocks.subscribe.mock.calls.every((call) => call.length === 3)).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it("clears owner data and ignores late callbacks after an account switch", async () => {
    const callbacks: ((items: any[]) => void)[] = [];
    mocks.subscribe.mockImplementation((_uid, _type, update) => { callbacks.push(update); return vi.fn(); });
    localStorage.setItem("assessment_ai_owner-1_via_doc_en", "Private reflection");
    const view = render(assessment());
    await act(async () => callbacks[0]([{ id: "doc", scores: {}, analysis: {} }]));
    expect(screen.getByText("Private reflection")).toBeVisible();
    mocks.uid = "owner-2"; view.rerender(assessment());
    expect(screen.queryByText("Private reflection")).not.toBeInTheDocument();
    await act(async () => callbacks[0]([{ id: "doc", scores: {}, analysis: {} }]));
    expect(screen.queryByText("Private reflection")).not.toBeInTheDocument();
    await act(async () => callbacks[1]([]));
    expect(screen.getByText("No result found for this assessment")).toBeVisible();
  });

  it("offers worse, unknown and skip responses without claiming physiology improved", async () => {
    mocks.frames = []; mocks.now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => mocks.now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { mocks.frames.push(callback); return mocks.frames.length; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    try {
      render(<BreathingView />);
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      mocks.now = 128001;
      await act(async () => mocks.frames.shift()!(mocks.now));
      expect(screen.getByText(/Effects vary/)).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: /Worse or uncomfortable/ }));
      expect(screen.getByText(/Do not continue the exercise/)).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: /Not sure/ }));
      expect(screen.queryByText(/Do not continue the exercise/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));
      expect(screen.getByText(/your feeling remains unknown/)).toBeVisible();
      expect(screen.queryByText(/Your nervous system is down-regulated/)).not.toBeInTheDocument();
    } finally { vi.unstubAllGlobals(); vi.restoreAllMocks(); }
  });
});
