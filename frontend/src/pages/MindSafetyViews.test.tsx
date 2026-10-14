import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CheckinView from "./CheckinView";
import BreathingView from "./BreathingView";
import MindCalmView from "./MindCalmView";
import { readMindFeedback } from "@/lib/mind/feedback";
import { workspaceDraftKey } from "@/lib/mind/workspaceDraft";
import { getLocalDateString } from "@/lib/taskDate";

const mocks = vi.hoisted(() => ({
  owner: "A", updates: [] as Array<(items: any[]) => void>,
  save: vi.fn(), award: vi.fn(), stop: vi.fn(), start: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.owner } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/ProfileMicroPrompt", () => ({ default: () => null }));
vi.mock("@/lib/firestoreDataService", () => ({
  subscribeDailyCheckins: (_owner: string, update: (items: any[]) => void) => { mocks.updates.push(update); return vi.fn(); },
  upsertDailyCheckin: mocks.save,
}));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: async () => [] }));
vi.mock("@/lib/cognitiveLoad", () => ({ computeCognitiveLoad: () => ({ load: 0 }) }));
vi.mock("@/lib/garden", () => ({ awardDailyCheckinDrops: mocks.award, awardWaterDrops: mocks.award }));
vi.mock("@/lib/pomodoroSynth", () => ({ startSynth: mocks.start, stopSynth: mocks.stop, setSynthVolume: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("recharts", () => ({ LineChart: () => null, Line: () => null, XAxis: () => null, YAxis: () => null, ResponsiveContainer: () => null, Tooltip: () => null }));

let now = 0;
let frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const show = (view: React.ReactNode) => render(<MemoryRouter>{view}</MemoryRouter>);
const record = (overrides = {}) => ({ id: getLocalDateString(), user_id: mocks.owner, checkin_date: getLocalDateString(),
  mood: 5, energy: 6, focus: 7, sleep_quality: 8, stress: 3, sleep_hours: 7.5, notes: "account note", ...overrides });
async function update(items: any[], index = mocks.updates.length - 1) {
  await act(async () => { mocks.updates[index](items); });
}
function frame(milliseconds = 500) {
  act(() => { now += milliseconds; const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(now)); });
}
beforeEach(() => {
  localStorage.clear(); mocks.owner = "A"; mocks.updates = []; vi.clearAllMocks(); mocks.save.mockResolvedValue(true);
  now = 0; frames = new Map(); frameId = 0; window.history.replaceState({}, "", "/");
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { const id = ++frameId; frames.set(id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Check-in safety", () => {
  it("remounts for the new local day without erasing yesterday's draft", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 15, 23, 59, 59));
    show(<CheckinView />); await update([]);
    const oldDay = getLocalDateString();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "yesterday's unfinished note" } });
    await act(async () => vi.advanceTimersByTime(1100)); await update([]);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(getLocalDateString()).not.toBe(oldDay);
    expect(JSON.parse(localStorage.getItem(workspaceDraftKey("A", `checkin:${oldDay}`))!).value.form.notes).toBe("yesterday's unfinished note");
  });
  it("shows unavailable/retry instead of claiming a missing snapshot is empty", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }); show(<CheckinView />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Save Check-in" })).toBeDisabled();
    expect(screen.getByText(/Previous entries could not be confirmed/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.updates).toHaveLength(2);
  });
  it("preserves deliberate clearing of advanced fields when switching to quick", async () => {
    show(<CheckinView />); await update([record()]);
    fireEvent.click(screen.getByRole("button", { name: "Clear Focus & Clarity" }));
    fireEvent.change(screen.getByLabelText("Sleep Duration (Recent Main Sleep)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Quick (10s)" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][1]).toMatchObject({ focus: null, sleep_hours: null, stress: 3 });
  });
  it("reports quota failure and guards exit instead of claiming device retention", async () => {
    show(<CheckinView />); await update([]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "memory only" } });
    expect(screen.getByText(/Draft not retained on this device/)).toBeTruthy();
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("textbox")).toHaveValue("memory only");
  });
  it("does not let subscription overwrite a visible draft after a second-tab conflict", async () => {
    show(<CheckinView />); await update([record()]);
    const key = workspaceDraftKey("A", `checkin:${getLocalDateString()}`);
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.value.form.notes = "second tab"; envelope.updatedAt += 1;
    act(() => { localStorage.setItem(key, JSON.stringify(envelope)); window.dispatchEvent(new StorageEvent("storage", { key })); });
    await update([record({ notes: "account changed" })]);
    expect(screen.getByRole("textbox")).toHaveValue("account note");
    expect(screen.getByRole("button", { name: "Save Check-in" })).toBeDisabled();
  });
  it("starts unanswered and preserves full fields when saving quick mode", async () => {
    show(<CheckinView />); await update([]);
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][1]).toMatchObject({ mood: null, energy: null });
    await update([record()]);
    fireEvent.click(screen.getByRole("button", { name: "Quick (10s)" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save.mock.calls[1][1]).toMatchObject({ focus: 7, sleep_quality: 8, stress: 3, sleep_hours: 7.5 });
  });
  it("retains all edited fields and mode across remount", async () => {
    const view = show(<CheckinView />); await update([]);
    fireEvent.click(screen.getByRole("button", { name: "Full Check-in" }));
    fireEvent.click(screen.getByRole("button", { name: "Focus & Clarity: 9 / 10" }));
    fireEvent.change(screen.getByLabelText("Sleep Duration (Recent Main Sleep)"), { target: { value: "8.5" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my private draft" } });
    view.unmount(); show(<CheckinView />); await update([]);
    expect(screen.getByRole("textbox")).toHaveValue("my private draft");
    expect(screen.getByLabelText("Sleep Duration (Recent Main Sleep)")).toHaveValue(8.5);
    expect(screen.getByRole("button", { name: "Focus & Clarity: 9 / 10" })).toHaveAttribute("aria-pressed", "true");
  });
  it("preserves dirty edits on subscription and requires explicit conflict choice", async () => {
    show(<CheckinView />); await update([record()]);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my draft" } });
    await update([record({ notes: "other device" })]);
    expect(screen.getByRole("textbox")).toHaveValue("my draft");
    expect(screen.getByRole("button", { name: "Save Check-in" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Keep my edits to save" }));
    expect(screen.getByRole("button", { name: "Save Check-in" })).not.toBeDisabled();
  });
  it("locks save and keeps newer edits through an own subscription echo", async () => {
    let finish!: (ok: boolean) => void;
    mocks.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    show(<CheckinView />); await update([record()]);
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "new edit while saving" } });
    await update([record()]);
    expect(screen.getByRole("textbox")).toHaveValue("new edit while saving");
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => finish(true));
    expect(screen.getByRole("textbox")).toHaveValue("new edit while saving");
    expect(mocks.success).toHaveBeenCalledWith(expect.stringMatching(/newer edits are still pending/));
    expect(JSON.parse(localStorage.getItem(workspaceDraftKey("A", `checkin:${getLocalDateString()}`))!).value.dirty).toBe(true);
  });
  it("keeps the actual remote version when a conflict arrives during pending save", async () => {
    let finish!: (ok: boolean) => void;
    mocks.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    show(<CheckinView />); await update([record()]);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my submitted version" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    await update([record({ notes: "new remote version" })]);
    await act(async () => finish(true));
    expect(screen.getByRole("textbox")).toHaveValue("my submitted version");
    fireEvent.click(screen.getByRole("button", { name: "Use account entry" }));
    expect(screen.getByRole("textbox")).toHaveValue("new remote version");
  });
  it("isolates A-B-A and ignores late save and subscription continuations", async () => {
    let finish!: (ok: boolean) => void;
    mocks.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = show(<CheckinView />); await update([]);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    mocks.owner = "B"; view.rerender(<MemoryRouter><CheckinView /></MemoryRouter>); await update([]);
    await update([record({ notes: "late A" })], 0); await act(async () => finish(true));
    expect(screen.getByRole("textbox")).toHaveValue(""); expect(mocks.award).not.toHaveBeenCalled();
    mocks.owner = "A"; view.rerender(<MemoryRouter><CheckinView /></MemoryRouter>); await update([]);
    expect(screen.getByRole("textbox")).toHaveValue("A draft");
  });
  it("keeps draft and reports failed save without awarding", async () => {
    mocks.save.mockResolvedValue(false); show(<CheckinView />); await update([]);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "keep this" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByRole("textbox")).toHaveValue("keep this"); expect(mocks.award).not.toHaveBeenCalled();
  });
});

describe("Breathing safety", () => {
  it("account change stops the old session/audio and clears feedback selection", () => {
    const view = show(<BreathingView />);
    fireEvent.click(screen.getByRole("button", { name: "Ambient sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" })); frame();
    mocks.owner = "B"; view.rerender(<MemoryRouter><BreathingView /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enough for now" })).toBeNull();
    expect(mocks.stop).toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
  it("does not claim feedback was saved after quota failure and permits retry", () => {
    show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Enough for now" }));
    fireEvent.click(screen.getByRole("button", { name: /Not sure/ }));
    const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: "Save feedback" }));
    expect(readMindFeedback("A")).toHaveLength(0); expect(mocks.error).toHaveBeenCalled();
    storage.mockRestore(); fireEvent.click(screen.getByRole("button", { name: "Save feedback" }));
    expect(readMindFeedback("A")[0].response).toBe("unsure");
  });
  it("quick start also survives StrictMode effect replay", () => {
    window.history.replaceState({}, "", "/app/breathing?start=1"); show(<StrictMode><BreathingView /></StrictMode>);
    frame(); expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
  it("quick start survives reset setup and defaults to silent no-hold 5-5", () => {
    window.history.replaceState({}, "", "/app/breathing?start=1"); show(<BreathingView />);
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Coherent/ })).toHaveAttribute("aria-pressed", "true");
    expect(mocks.start).not.toHaveBeenCalled();
    frame(); expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
  it("pauses hidden time, resumes explicitly, and does not award unattended completion", () => {
    show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Start" })); frame();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    frame(200000); expect(mocks.award).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Resume" })); frame();
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
  it("rejects long foreground clock gaps instead of fabricating completed sessions", () => {
    show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Start" })); frame(200000);
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy(); expect(mocks.award).not.toHaveBeenCalled();
  });
  it("reset and pattern change stop audio and return to a fresh start", () => {
    const view = show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Ambient sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" })); frame();
    expect(mocks.start).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reset exercise" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: /Box/ }));
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    view.unmount(); expect(frames.size).toBe(0); expect(mocks.stop).toHaveBeenCalled();
  });
  it("records optional per-owner feedback only on Save, including discomfort", () => {
    show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Enough for now" }));
    fireEvent.click(screen.getByRole("button", { name: /Worse or uncomfortable/ }));
    expect(readMindFeedback("A")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Save feedback" }));
    expect(readMindFeedback("A")).toHaveLength(1);
    expect(readMindFeedback("A")[0]).toMatchObject({ response: "uncomfortable", toolVersion: "2:coherent" });
    expect(readMindFeedback("B")).toHaveLength(0); expect(mocks.award).not.toHaveBeenCalled();
  });
  it("supports reduced motion and labels reset and sound volume", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Start" })); frame();
    expect(screen.getByRole("img").querySelector('[style*="rotateY"]')).toHaveStyle({ transform: "scale(1) rotateX(15deg) rotateY(0deg)" });
    fireEvent.click(screen.getByRole("button", { name: "Ambient sound" }));
    expect(screen.getByRole("slider", { name: "Ambient sound volume" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset exercise" })).toBeTruthy();
  });
  it("does not infer helpfulness from a foreground timer ending", () => {
    show(<BreathingView />); fireEvent.click(screen.getByRole("button", { name: "Start" }));
    for (let i = 0; i < 240; i++) frame();
    expect(screen.getByRole("button", { name: "Save feedback" })).toBeDisabled();
    expect(readMindFeedback("A")).toHaveLength(0);
  });
});

it("Calm shows safety before quick start and the existing non-breathing library steps", () => {
  show(<MindCalmView />);
  expect(screen.getByText(/Before quick start/)).toBeTruthy();
  expect(screen.getByTestId("calm-breathing-quick")).toHaveAttribute("href", "/app/breathing?start=1");
  expect(screen.getByTestId("calm-grounding").querySelectorAll("li").length).toBeGreaterThan(0);
});
