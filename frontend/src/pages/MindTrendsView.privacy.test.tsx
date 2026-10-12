import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
  for (const method of ["select", "eq", "gte", "order", "in"]) query[method] = () => query;
  return query;
} } }));
vi.mock("@/lib/mindAI", async (importOriginal) => ({ ...await importOriginal<object>(), executeMindAI: mocks.execute }));

import MindTrendsView from "./MindTrendsView";
import { formatContextForPrompt } from "@/lib/mindAI";

const result = { data: { logged_days_summary: "Summary", cautious_observation: "Observation", suggested_reflection_question: "Question" } };
const page = () => <MemoryRouter><MindTrendsView /></MemoryRouter>;

describe("Weekly insight consent snapshot", () => {
  beforeEach(() => { mocks.uid = "owner-1"; mocks.reads = []; mocks.execute.mockReset().mockResolvedValue(result); });

  it("sends the previewed snapshot even when stats finish loading before confirmation", async () => {
    render(page());
    fireEvent.click(screen.getByTestId("mind-ai-weekly"));
    const preview = screen.getByRole("dialog").querySelector("pre")!.textContent;
    await act(async () => {
      mocks.reads.forEach((resolve, index) => resolve(index === 0 ? { data: [{ checkin_date: new Date().toISOString().slice(0, 10), mood: 8 }] } : { data: [], count: 0 }));
    });
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
    fireEvent.click(screen.getByTestId("mind-ai-weekly"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Analyze" }));
    mocks.uid = "owner-2";
    rendered.rerender(page());
    await act(async () => finish(result));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Summary/)).toBeNull();
    expect(mocks.execute.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
