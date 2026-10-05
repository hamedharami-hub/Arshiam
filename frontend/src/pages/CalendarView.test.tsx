import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CalendarView from "./CalendarView";

const taskReads: Array<(value: { data: unknown[] }) => void> = [];
const user = { id: "user-1" };
const occasionSets: string[] = [];
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => ({
      select: () => table === "tasks"
        ? { then: (resolve: (value: { data: unknown[] }) => void) => { taskReads.push(resolve); } }
        : { eq: () => ({ maybeSingle: async () => ({ data: null }) }) },
    }),
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/holidays", () => ({
  getHolidaysForRange: async () => [], getOccasionSets: () => occasionSets, setOccasionSets: vi.fn(), HOLIDAYS_EVENT: "holidays-changed",
}));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/calendar/MonthGrid", () => ({ default: ({ tasks }: { tasks: { id: string }[] }) => <div data-testid="calendar-tasks">{tasks.map(t => t.id).join(",")}</div> }));
vi.mock("@/components/calendar/WeekView", () => ({ default: () => null }));
vi.mock("@/components/calendar/DayView", () => ({ default: () => null }));
vi.mock("@/components/calendar/AgendaView", () => ({ default: () => null }));
vi.mock("@/components/calendar/DayDetailSheet", () => ({ default: () => null }));
vi.mock("@/components/calendar/HolidayList", () => ({ HolidayList: () => null }));

describe("Calendar task refresh", () => {
  beforeEach(() => { taskReads.length = 0; });

  it("refreshes on task changes and ignores an older, slower response", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("tasks-changed")); });
    await waitFor(() => expect(taskReads).toHaveLength(2));
    const today = new Date();
    const workDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    act(() => { taskReads[1]({ data: [{ id: "fresh", work_date: workDate, schedule_v: 2 }] }); });
    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("fresh"));
    act(() => { taskReads[0]({ data: [{ id: "stale", work_date: workDate, schedule_v: 2 }] }); });
    expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("fresh");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("stale");
  });

  it("refreshes after a Firestore write event", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("firebase-store-changed")); });
    await waitFor(() => expect(taskReads).toHaveLength(2));
  });
});
