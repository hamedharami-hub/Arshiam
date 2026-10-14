import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ uid: "owner-1", execute: vi.fn(), reads: [] as ((value: unknown) => void)[] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.uid } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("./mind/MindScreenersGrid", () => ({ MindScreenersGrid: () => null }));
vi.mock("./mind/MindTrendCharts", async (importOriginal) => ({ ...await importOriginal<object>(), MindTrendCharts: () => null }));
vi.mock("@/lib/reminders", () => ({ loadSettings: async () => ({}) }));
vi.mock("@/lib/firestoreDataService", () => ({ subscribeSocraticSession: () => () => {} }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => {
  const pending = new Promise((resolve) => mocks.reads.push(resolve));
  const query: Record<string, unknown> = { then: pending.then.bind(pending) };
  for (const method of ["select", "eq", "gte", "lte", "order", "in", "limit"]) query[method] = () => query;
  return query;
} } }));
vi.mock("@/lib/mindAI", async (importOriginal) => ({ ...await importOriginal<object>(), executeMindAI: mocks.execute }));

import MindTrendsView from "./MindTrendsView";
import { formatContextForPrompt } from "@/lib/mindAI";
import { localDateKey, shiftLocalDay, MIND_ACTION_SOURCES } from "@/lib/mind/dateRanges";

const result = { data: { logged_days_summary: "Summary", cautious_observation: "Observation", suggested_reflection_question: "Question" } };
const Location = () => <output data-testid="test-url">{useLocation().search}</output>;
const page = (url = "/app/mind/trends") => <MemoryRouter initialEntries={[url]}><MindTrendsView /><Location /></MemoryRouter>;
const finishReads = async (overrides: Record<number, unknown> = {}) => act(async () => {
  mocks.reads.splice(0).forEach((resolve, index) => resolve(overrides[index] || (index === 0 ? { data: [{ checkin_date: localDateKey(new Date()), mood: 8 }], error: null, fromCache: false } : { data: [], error: null, fromCache: false })));
});

describe("Weekly insight consent snapshot", () => {
  beforeEach(() => { localStorage.clear(); mocks.uid = "owner-1"; mocks.reads = []; mocks.execute.mockReset().mockResolvedValue(result); });

  it("does not offer AI on unloaded statistics and sends the exact approved snapshot after loading", async () => {
    render(page());
    expect(screen.queryByTestId("mind-ai-weekly")).toBeNull();
    expect(screen.getByTestId("mind-load-status")).toHaveTextContent("Loading");
    await finishReads();
    fireEvent.click(screen.getByTestId("mind-ai-weekly"));
    const preview = screen.getByRole("dialog").querySelector("pre")!.textContent;
    expect(screen.getByTestId("mind-weekly-days")).toHaveTextContent("1/7");
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Analyze" }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));
    expect(formatContextForPrompt(mocks.execute.mock.calls[0][0])).toBe(preview);
    expect(mocks.execute.mock.calls[0][1]).toEqual(expect.objectContaining({ cacheScope: "owner-1" }));
  });

  it("invalidates approval and ignores late analysis after an account switch", async () => {
    let finish!: (value: typeof result) => void;
    mocks.execute.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const rendered = render(page());
    await finishReads();
    fireEvent.click(screen.getByTestId("mind-ai-weekly"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Analyze" }));
    mocks.uid = "owner-2";
    rendered.rerender(page());
    await act(async () => finish(result));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Summary/)).toBeNull();
    expect(mocks.execute.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("distinguishes failed reads from empty and permits an explicit retry", async () => {
    render(page());
    await finishReads({ 0: { data: null, error: new Error("offline") } });
    expect(screen.getByTestId("mind-load-status")).toHaveTextContent("could not be loaded");
    expect(screen.queryByTestId("mind-weekly-days")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await finishReads();
    expect(screen.getByTestId("mind-weekly-days")).toHaveTextContent("1/7");
  });

  it("labels cached statistics and disables sending them to AI", async () => {
    render(page());
    await finishReads({ 0: { data: [{ checkin_date: localDateKey(new Date()), mood: 8 }], error: null, fromCache: true } });
    expect(screen.getByTestId("mind-load-status")).toHaveTextContent("cached");
    expect(screen.getByTestId("mind-ai-weekly")).toBeDisabled();
  });

  it("canceling ignores a late provider result and allows a new request", async () => {
    let finish!: (value: typeof result) => void;
    mocks.execute.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    render(page());
    await finishReads();
    fireEvent.click(screen.getByTestId("mind-ai-weekly"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Analyze" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel waiting" }));
    expect(mocks.execute.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => finish(result));
    expect(screen.queryByText(/Summary/)).toBeNull();
    fireEvent.click(screen.getByTestId("mind-ai-weekly"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Analyze" }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(2));
  });

  it("does not adopt old reads after account A→B→A", async () => {
    const rendered = render(page());
    const oldReads = mocks.reads.splice(0);
    mocks.uid = "owner-2"; rendered.rerender(page());
    mocks.uid = "owner-1"; rendered.rerender(page());
    await act(async () => oldReads.forEach((resolve) => resolve({ data: [], error: null })));
    expect(screen.getByTestId("mind-load-status")).toHaveTextContent("Loading");
    expect(screen.queryByTestId("mind-weekly-days")).toBeNull();
  });

  it("never shows eight of seven days, counts all source types once, and excludes future/undated actions", async () => {
    render(page());
    const now = new Date();
    const checkins = Array.from({ length: 8 }, (_, index) => ({ checkin_date: localDateKey(shiftLocalDay(now, -index)), mood: 8 }));
    checkins.push(checkins[0], { checkin_date: localDateKey(shiftLocalDay(now, 1)), mood: 9 });
    const tasks = MIND_ACTION_SOURCES.map((source_type, index) => ({ id: String(index), source_type, completed_at: new Date(now.getTime() - 60000).toISOString(), feedback: "helpful" }));
    await finishReads({
      0: { data: checkins, error: null, fromCache: false },
      4: { data: [...tasks, tasks[0], { id: "undated", source_type: "mind_need" }, { id: "future", source_type: "values_goal", completed_at: shiftLocalDay(now, 1).toISOString() }], error: null, fromCache: false },
    });
    expect(screen.getByTestId("mind-weekly-days")).toHaveTextContent("7/7");
    expect(screen.getByTestId("mind-weekly-actions")).toHaveTextContent(": 5");
    expect(screen.getByTestId("mind-undated-note")).toHaveTextContent("1 older action");
    const chooser = screen.getByRole("combobox", { name: "Choose a chart day" }) as HTMLSelectElement;
    fireEvent.change(chooser, { target: { value: chooser.options[1].value } });
    expect(chooser.value).toBe(chooser.options[1].value);
  });

  it("reads and writes only nonsensitive metric/range filters", async () => {
    render(page("/app/mind/trends?range=7&metric=stress"));
    await finishReads();
    expect(screen.getByRole("heading", { name: "Last 7 days" })).toBeInTheDocument();
    expect(screen.getByTestId("mind-metric-stress")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "90 days" }));
    fireEvent.click(screen.getByTestId("mind-metric-energy"));
    expect(screen.getByTestId("test-url")).toHaveTextContent("?range=90&metric=energy");
  });

  it("persists streak display per account on the device without a save-success message", async () => {
    localStorage.setItem("mind:show-streak:owner-1", "0");
    render(page());
    await finishReads();
    const checkbox = screen.getByRole("checkbox", { hidden: true });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(localStorage.getItem("mind:show-streak:owner-1")).toBe("1");
    expect(localStorage.getItem("mind:show-streak:owner-2")).toBeNull();
    expect(screen.queryByText(/saved successfully/i)).toBeNull();
  });

  it("refuses to display precise totals from a truncated result", async () => {
    render(page());
    await finishReads({ 4: { data: Array.from({ length: 1001 }, (_, index) => ({ id: String(index), source_type: "mind_need" })), error: null, fromCache: false } });
    expect(screen.getByTestId("mind-load-status")).toHaveTextContent("read limit");
    expect(screen.queryByTestId("mind-weekly-days")).toBeNull();
  });

  it("requires refresh when live data lacks freshness metadata", async () => {
    render(page());
    await finishReads({ 0: { data: [{ checkin_date: localDateKey(new Date()), mood: 8 }], error: null } });
    expect(screen.getByTestId("mind-load-status")).toHaveTextContent("freshness is unverified");
    expect(screen.getByTestId("mind-ai-weekly")).toBeDisabled();
  });
});
