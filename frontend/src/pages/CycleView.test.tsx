import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter, Link } from "react-router-dom";

const hoisted = vi.hoisted(() => {
  const profiles = [
    { id: "p1", user_id: "user-1", label: "Me", color: "#ec4899", is_self: true, avg_cycle_length: 28, avg_period_length: 5, luteal_length: 14, notify_period: false, notify_ovulation: false },
    { id: "p2", user_id: "user-1", label: "Partner", color: "#8b5cf6", is_self: false, avg_cycle_length: 30, avg_period_length: 4, luteal_length: 13, notify_period: false, notify_ovulation: false },
  ];
  const logs = [
    { id: "l1", user_id: "user-1", profile_id: "p1", log_date: "2026-01-05", event: "period_start", flow: 2, pain: null, mood: null, energy: null, symptoms: null, notes: null },
  ];
  return {
    user: { id: "user-1" },
    mutationError: null as { message: string } | null,
    store: { cycle_profiles: profiles, cycle_logs: logs } as Record<string, unknown[]>,
    settings: { cycle_overlay_enabled: true, active_cycle_profile_id: "p1" } as Record<string, unknown>,
    mutations: [] as Array<{ table: string; kind: "upsert" | "update"; input: Record<string, unknown>; filters: Record<string, unknown> }>,
    // Stable identity: CycleView's load effect lists `T` as a dependency.
    T: (_fa: string, en: string) => en,
  };
});

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let mutated = false;
      const builder: any = {
        select: () => builder,
        eq: (key: string, value: unknown) => { filters[key] = value; return builder; },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: table === "user_settings" ? hoisted.settings : null, error: null }),
        single: async () => ({ data: null, error: null }),
        upsert: (input: Record<string, unknown>) => { hoisted.mutations.push({ table, kind: "upsert", input, filters }); mutated = true; return builder; },
        update: (input: Record<string, unknown>) => { hoisted.mutations.push({ table, kind: "update", input, filters }); mutated = true; return builder; },
        then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => {
           if (mutated) return Promise.resolve({ data: null, error: hoisted.mutationError }).then(resolve, reject);
          const rows = (hoisted.store[table] || []) as Record<string, unknown>[];
          const data = rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: hoisted.user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: hoisted.T, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/cycleProfileService", () => ({ persistActiveCycleProfile: vi.fn().mockResolvedValue({ error: null }), deleteCycleProfileAndLogs: vi.fn() }));

import { persistActiveCycleProfile } from "@/lib/cycleProfileService";
import CycleView from "./CycleView";

const workspace = () => <BrowserRouter><Link to="/other">Leave cycle</Link><CycleView /></BrowserRouter>;
const mount = () => render(workspace());
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("CycleView check-in contracts", () => {
  beforeEach(() => {
    localStorage.clear();
    hoisted.user = { id: "user-1" };
    hoisted.mutationError = null;
    window.history.replaceState({ idx: 0 }, "", "/app/cycle");
    hoisted.mutations.length = 0;
    vi.mocked(persistActiveCycleProfile).mockReset().mockResolvedValue({ data: [], error: null });
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  });

  it("logs a period start for the date the user picked", async () => {
    mount();
    const dateInput = await screen.findByTestId("cycle-period-date");
    fireEvent.change(dateInput, { target: { value: "2026-01-10" } });
    fireEvent.click(screen.getByTestId("cycle-log-period-start"));

    await waitFor(() => expect(hoisted.mutations.some((m) => m.table === "cycle_logs" && m.input.log_date === "2026-01-10" && m.input.event === "period_start")).toBe(true));
  });

  it("guards an unsaved check-in before switching profiles", async () => {
    mount();
    fireEvent.change(await screen.findByLabelText("Notes"), { target: { value: "cramps" } });
    expect(await screen.findByTestId("cycle-checkin-dirty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Partner/ }));
    expect(await screen.findByTestId("cycle-unsaved-dialog")).toBeInTheDocument();
    expect(persistActiveCycleProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("cycle-unsaved-discard"));
    await waitFor(() => expect(persistActiveCycleProfile).toHaveBeenCalledWith("user-1", "p2"));
  });

  it("undoes a period start from a recent log without deleting the profile", async () => {
    mount();
    expect(await screen.findByTestId("cycle-log-2026-01-05")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cycle-undo-period-2026-01-05"));

    await waitFor(() => expect(hoisted.mutations.some((m) => m.table === "cycle_logs" && m.kind === "update" && m.input.event === null && m.filters.id === "l1")).toBe(true));
  });

  it("restores profile numbers and a new profile label after remount without remote writes", async () => {
    const view = mount();
    fireEvent.change(await screen.findByLabelText("Cycle length"), { target: { value: "31" } });
    fireEvent.change(screen.getByLabelText("Period length"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Add profile" }));
    fireEvent.change(screen.getByLabelText("Profile name"), { target: { value: "Unfinished label" } });
    expect(hoisted.mutations).toEqual([]);
    view.unmount();
    mount();
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(31));
    expect(screen.getByLabelText("Period length")).toHaveValue(7);
    expect(screen.getByLabelText("Profile name")).toHaveValue("Unfinished label");
    expect(hoisted.mutations).toEqual([]);
  });

  it("keeps profile drafts separate when switching and does not prompt for verified device retention", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    fireEvent.change(await screen.findByLabelText("Cycle length"), { target: { value: "32" } });
    fireEvent.click(screen.getByRole("button", { name: /Partner/ }));
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(30));
    fireEvent.change(screen.getByLabelText("Period length"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: /Me \(Me\)/ }));
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(32));
    expect(screen.getByLabelText("Period length")).toHaveValue(5);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("never exposes or applies the previous account's draft on an owner switch", async () => {
    const view = mount();
    fireEvent.change(await screen.findByLabelText("Cycle length"), { target: { value: "33" } });
    fireEvent.click(screen.getByRole("button", { name: "Add profile" }));
    fireEvent.change(screen.getByLabelText("Profile name"), { target: { value: "Private label" } });
    hoisted.user = { id: "user-2" };
    view.rerender(workspace());
    expect(screen.queryByDisplayValue("Private label")).not.toBeInTheDocument();
    await screen.findByText("Nothing to track yet");
    expect(screen.queryByLabelText("Cycle length")).not.toBeInTheDocument();
    expect(hoisted.mutations).toEqual([]);
    hoisted.user = { id: "user-1" };
    view.rerender(workspace());
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(33));
    expect(screen.getByLabelText("Profile name")).toHaveValue("Private label");
  });

  it.each(["throws", "silently fails"])("guards route exit, unload and profile switching when retention %s", async (failure) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    const input = await screen.findByLabelText("Cycle length");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      if (failure === "throws") throw new Error("quota");
    });
    fireEvent.change(input, { target: { value: "34" } });
    expect(screen.getByTestId("cycle-draft-retention-failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Partner/ }));
    expect(screen.getByLabelText("Cycle length")).toHaveValue(34);
    expect(persistActiveCycleProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Leave cycle"));
    expect(window.location.pathname).toBe("/app/cycle");
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => { window.dispatchEvent(unload); });
    expect(unload.defaultPrevented).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /Partner/ }));
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(30));
  });

  it("protects an unretained new label and clears its guard on explicit cancellation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    await screen.findByLabelText("Cycle length");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: "Add profile" }));
    fireEvent.change(screen.getByLabelText("Profile name"), { target: { value: "Unsaved name" } });
    fireEvent.click(screen.getByText("Leave cycle"));
    expect(window.location.pathname).toBe("/app/cycle");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByText("Leave cycle"));
    expect(window.location.pathname).toBe("/other");
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("keeps other uncommitted fields when one number is explicitly saved on blur", async () => {
    mount();
    fireEvent.change(await screen.findByLabelText("Cycle length"), { target: { value: "31" } });
    fireEvent.change(screen.getByLabelText("Period length"), { target: { value: "7" } });
    fireEvent.blur(screen.getByLabelText("Cycle length"));
    await waitFor(() => expect(hoisted.mutations.some(m => m.table === "cycle_profiles" && m.input.avg_cycle_length === 31)).toBe(true));
    expect(screen.getByLabelText("Period length")).toHaveValue(7);
  });

  it("keeps a device draft when explicit remote saving fails", async () => {
    const view = mount();
    fireEvent.change(await screen.findByLabelText("Cycle length"), { target: { value: "35" } });
    hoisted.mutationError = { message: "offline" };
    fireEvent.blur(screen.getByLabelText("Cycle length"));
    await waitFor(() => expect(hoisted.mutations).toHaveLength(1));
    view.unmount();
    mount();
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(35));
  });

  it("refreshes today's estimate after rollover without retargeting the selected check-in date", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-10T23:59:00"));
    mount();
    const date = await screen.findByTestId("cycle-log-date");
    expect(date).toHaveValue("2026-01-10");
    expect(screen.getByTestId("cycle-save-log")).toHaveTextContent("Save today's check-in");
    vi.setSystemTime(new Date("2026-01-11T00:01:00"));
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(date).toHaveValue("2026-01-10");
    expect(screen.getByTestId("cycle-save-log")).toHaveTextContent("Save this day's check-in");
  });

  it("retains a verified draft on route exit without a confirmation or remote save", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = mount();
    fireEvent.change(await screen.findByLabelText("Cycle length"), { target: { value: "36" } });
    fireEvent.click(screen.getByText("Leave cycle"));
    expect(window.location.pathname).toBe("/other");
    expect(confirm).not.toHaveBeenCalled();
    expect(hoisted.mutations).toEqual([]);
    view.unmount();
    window.history.replaceState({ idx: 0 }, "", "/app/cycle");
    mount();
    await waitFor(() => expect(screen.getByLabelText("Cycle length")).toHaveValue(36));
  });

  it("preserves the existing unsaved check-in date guard", async () => {
    mount();
    const notes = await screen.findByLabelText("Notes");
    const date = screen.getByTestId("cycle-log-date");
    const previous = (date as HTMLInputElement).value;
    fireEvent.change(notes, { target: { value: "Keep on this date" } });
    fireEvent.change(date, { target: { value: "2026-01-12" } });
    expect(await screen.findByTestId("cycle-unsaved-dialog")).toBeInTheDocument();
    expect(date).toHaveValue(previous);
    fireEvent.click(screen.getByTestId("cycle-unsaved-cancel"));
    expect(notes).toHaveValue("Keep on this date");
    expect(hoisted.mutations).toEqual([]);
  });
});
