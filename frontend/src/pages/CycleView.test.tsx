import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const profiles = [
    { id: "p1", user_id: "user-1", label: "Me", color: "#ec4899", is_self: true, avg_cycle_length: 28, avg_period_length: 5, luteal_length: 14, notify_period: false, notify_ovulation: false },
    { id: "p2", user_id: "user-1", label: "Partner", color: "#8b5cf6", is_self: false, avg_cycle_length: 30, avg_period_length: 4, luteal_length: 13, notify_period: false, notify_ovulation: false },
  ];
  const logs = [
    { id: "l1", user_id: "user-1", profile_id: "p1", log_date: "2026-01-05", event: "period_start", flow: 2, pain: null, mood: null, energy: null, symptoms: null, notes: null },
  ];
  return {
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
          if (mutated) return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          const rows = (hoisted.store[table] || []) as Record<string, unknown>[];
          const data = rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: hoisted.T, isEn: true }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/cycleProfileService", () => ({ persistActiveCycleProfile: vi.fn().mockResolvedValue({ error: null }), deleteCycleProfileAndLogs: vi.fn() }));

import { persistActiveCycleProfile } from "@/lib/cycleProfileService";
import CycleView from "./CycleView";

describe("CycleView check-in contracts", () => {
  beforeEach(() => {
    hoisted.mutations.length = 0;
    vi.mocked(persistActiveCycleProfile).mockClear();
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  });

  it("logs a period start for the date the user picked", async () => {
    render(<CycleView />);
    const dateInput = await screen.findByTestId("cycle-period-date");
    fireEvent.change(dateInput, { target: { value: "2026-01-10" } });
    fireEvent.click(screen.getByTestId("cycle-log-period-start"));

    await waitFor(() => expect(hoisted.mutations.some((m) => m.table === "cycle_logs" && m.input.log_date === "2026-01-10" && m.input.event === "period_start")).toBe(true));
  });

  it("guards an unsaved check-in before switching profiles", async () => {
    render(<CycleView />);
    fireEvent.change(await screen.findByLabelText("Notes"), { target: { value: "cramps" } });
    expect(await screen.findByTestId("cycle-checkin-dirty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Partner/ }));
    expect(await screen.findByTestId("cycle-unsaved-dialog")).toBeInTheDocument();
    expect(persistActiveCycleProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("cycle-unsaved-discard"));
    await waitFor(() => expect(persistActiveCycleProfile).toHaveBeenCalledWith("user-1", "p2"));
  });

  it("undoes a period start from a recent log without deleting the profile", async () => {
    render(<CycleView />);
    expect(await screen.findByTestId("cycle-log-2026-01-05")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cycle-undo-period-2026-01-05"));

    await waitFor(() => expect(hoisted.mutations.some((m) => m.table === "cycle_logs" && m.kind === "update" && m.input.event === null && m.filters.id === "l1")).toBe(true));
  });
});
