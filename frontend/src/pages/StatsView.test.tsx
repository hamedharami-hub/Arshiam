import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StatsView from "./StatsView";

const state = vi.hoisted(() => ({ user: { id: "a" } as { id: string } | null, requests: [] as Array<{ table: string; owner: string; filters: Record<string, unknown>; resolve: (result: any) => void; reject: (error: Error) => void }> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/focusSession", () => ({ getFocusState: () => ({ completedVersion: 0 }), subscribeFocus: () => () => {} }));
vi.mock("recharts", () => ({ Bar: () => null, Line: () => null, ResponsiveContainer: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, CartesianGrid: () => null, ComposedChart: () => null }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: (table: string) => {
  const filters: Record<string, unknown> = {};
  const query: any = {
    select: () => query, order: () => query,
    eq: (key: string, value: unknown) => { filters[key] = value; return query; },
    gte: (key: string, value: unknown) => { filters[`gte:${key}`] = value; return query; },
    lte: (key: string, value: unknown) => { filters[`lte:${key}`] = value; return query; },
    then: (resolve: any, reject: any) => new Promise((finish, fail) => state.requests.push({ table, owner: filters.user_id as string, filters, resolve: finish, reject: fail })).then(resolve, reject),
  };
  return query;
} } }));

const finish = (offset: number, title: string, minutes = 4.5) => {
  const timestamp = new Date(Date.now() - 60_000).toISOString();
  state.requests.slice(offset, offset + 3).forEach((request) => request.resolve({ data: request.table === "tasks" ? [{ id: title, title, completed: true, completed_at: timestamp }] : request.table === "pomodoro_sessions" ? [{ duration_minutes: minutes, completed: false, ended_at: timestamp }] : [], error: null }));
};

describe("statistics data lifecycle", () => {
  beforeEach(() => { state.user = { id: "a" }; state.requests.length = 0; localStorage.clear(); });
  afterEach(() => vi.useRealTimers());
  it("shows loading, counts stopped minutes, and reads verified end timestamps without a completed filter", async () => {
    render(<StatsView />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading statistics");
    await waitFor(() => expect(state.requests).toHaveLength(3));
    const sessionQuery = state.requests.find((request) => request.table === "pomodoro_sessions")!;
    expect(sessionQuery.filters.completed).toBeUndefined();
    expect(sessionQuery.filters["gte:ended_at"]).toBeDefined();
    act(() => finish(0, "Finished task"));
    await waitFor(() => expect(screen.getByText("Finished task")).toBeInTheDocument());
    expect(screen.getByText("Focus Minutes").parentElement).toHaveTextContent("4.5");
  });
  it("hides old owners and ignores late owner responses", async () => {
    const view = render(<StatsView />);
    await waitFor(() => expect(state.requests).toHaveLength(3));
    act(() => finish(0, "Account A"));
    await waitFor(() => expect(screen.getByText("Account A")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(state.requests).toHaveLength(6));
    state.user = { id: "b" };
    view.rerender(<StatsView />);
    expect(screen.queryByText("Account A")).toBeNull();
    await waitFor(() => expect(state.requests).toHaveLength(9));
    act(() => finish(6, "Account B"));
    await waitFor(() => expect(screen.getByText("Account B")).toBeInTheDocument());
    act(() => finish(3, "Late A"));
    expect(screen.queryByText("Late A")).toBeNull();
  });
  it("handles query errors with Retry and refreshes on activity events", async () => {
    render(<StatsView />);
    await waitFor(() => expect(state.requests).toHaveLength(3));
    act(() => state.requests[0].resolve({ data: null, error: new Error("offline") }));
    act(() => state.requests[1].resolve({ data: [] }));
    act(() => state.requests[2].resolve({ data: [] }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not load"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(state.requests).toHaveLength(6));
    act(() => finish(3, "Recovered"));
    await waitFor(() => expect(screen.getByText("Recovered")).toBeInTheDocument());
    act(() => window.dispatchEvent(new Event("habit-logs-changed")));
    await waitFor(() => expect(state.requests).toHaveLength(9));
  });
  it("updates its day window after midnight without remounting", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 23, 59, 50));
    render(<StatsView />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(state.requests).toHaveLength(3);
    await act(async () => { finish(0, "Yesterday"); });
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(state.requests).toHaveLength(6);
    expect(state.requests[4].filters["gte:ended_at"]).not.toEqual(state.requests[1].filters["gte:ended_at"]);
  });
});
