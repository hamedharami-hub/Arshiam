import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uid: "user-1" as string | null,
  valuesListeners: new Map<string, (values: Record<string, unknown>, meta: { source: "cache" | "server"; error?: boolean }) => void>(),
  goalsListeners: new Map<string, (goals: unknown[], meta: { source: "cache" | "server"; error?: boolean }) => void>(),
  valuesUnsubscribed: vi.fn(),
  goalsUnsubscribed: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.uid ? { id: mocks.uid } : null }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/firestoreDataService", () => ({
  subscribeMindValues: (uid: string, update: Parameters<typeof mocks.valuesListeners.set>[1]) => {
    mocks.valuesListeners.set(uid, update);
    return () => mocks.valuesUnsubscribed(uid);
  },
  saveMindValues: vi.fn(),
  subscribeMindGoals: (uid: string, update: Parameters<typeof mocks.goalsListeners.set>[1]) => {
    mocks.goalsListeners.set(uid, update);
    return () => mocks.goalsUnsubscribed(uid);
  },
  upsertMindGoal: vi.fn(),
  deleteMindGoal: vi.fn(),
}));
vi.mock("@/lib/taskFromMind", () => ({ createTaskFromMind: vi.fn() }));

import ValuesGoalsView from "./ValuesGoalsView";

const renderPage = () => render(<MemoryRouter><ValuesGoalsView /></MemoryRouter>);

describe("ValuesGoalsView account-scoped empty states", () => {
  beforeEach(() => {
    mocks.uid = "user-1";
    mocks.valuesListeners.clear();
    mocks.goalsListeners.clear();
    mocks.valuesUnsubscribed.mockReset();
    mocks.goalsUnsubscribed.mockReset();
    localStorage.clear();
  });

  it("lets an empty server result replace cached values and goals", async () => {
    localStorage.setItem("mind_values_user-1", JSON.stringify({ family: { value: "Cached value", importance: 5, consistency: 5 } }));
    localStorage.setItem("mind_goals_user-1", JSON.stringify([{ id: "g1", domain: "family", text: "Cached goal", horizon: "year", created_at: "2026-01-01" }]));
    renderPage();

    await screen.findByText(/Cached value/);
    await screen.findByText("Cached goal");
    act(() => {
      mocks.valuesListeners.get("user-1")?.({}, { source: "server" });
      mocks.goalsListeners.get("user-1")?.([], { source: "server" });
    });

    expect(await screen.findByTestId("values-empty")).toBeInTheDocument();
    expect(await screen.findByTestId("values-goals-empty")).toBeInTheDocument();
    expect(screen.queryByText("Cached value")).not.toBeInTheDocument();
    expect(screen.queryByText("Cached goal")).not.toBeInTheDocument();
    expect(localStorage.getItem("mind_values_user-1")).toBe("{}");
    expect(localStorage.getItem("mind_goals_user-1")).toBe("[]");
  });

  it("hides a previous account during a switch and ignores its late callback", async () => {
    const { rerender } = renderPage();
    act(() => mocks.valuesListeners.get("user-1")?.({ family: { value: "Private account one" } }, { source: "server" }));
    await screen.findByText(/Private account one/);
    const lateOldUpdate = mocks.valuesListeners.get("user-1");

    mocks.uid = "user-2";
    rerender(<MemoryRouter><ValuesGoalsView /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText("Private account one")).not.toBeInTheDocument());
    expect(screen.getByTestId("values-loading")).toBeInTheDocument();
    expect(mocks.valuesUnsubscribed).toHaveBeenCalledWith("user-1");

    act(() => lateOldUpdate?.({ family: { value: "Late account one" } }, { source: "server" }));
    expect(screen.queryByText("Late account one")).not.toBeInTheDocument();
  });
});
