import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AgendaView from "./AgendaView";
import DayView from "./DayView";
import WeekView from "./WeekView";
import type { CalendarTask } from "./CalendarTask";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/usePinchZoom", () => ({ usePinchZoom: () => ({ scale: 1, handlers: { onTouchStart: vi.fn(), onTouchMove: vi.fn(), onTouchEnd: vi.fn() } }) }));
vi.mock("@/lib/useTapGestures", () => ({ useTapGestures: () => ({ handlers: {} }) }));

const day = new Date(2026, 4, 6);
const dayKey = "2026-05-06";
const calendarTasks: CalendarTask[] = [
  { id: "all-day", title: "Day-only task", completed: false, due_date: dayKey, priority: "none", schedule_v: 2 },
  { id: "timed", title: "Timed task", completed: false, due_date: new Date(2026, 4, 6, 9, 30).toISOString(), priority: "none", schedule_v: 2 },
];

describe("calendar day-level task display", () => {
  it("labels day-only agenda tasks as all day instead of midnight", () => {
    render(<MemoryRouter><AgendaView start={new Date(2026, 4, 6)} end={new Date(2026, 4, 6, 23, 59, 59)} tasks={calendarTasks} holidays={[]} system="gregorian" /></MemoryRouter>);

    expect(screen.getByText("Day-only task").parentElement).toHaveTextContent("All day");
    expect(screen.getByText("Timed task").parentElement).toHaveTextContent("۰۹:۳۰");
  });

  it("puts day-only tasks in the day view all-day area and keeps timed tasks in the timeline", () => {
    render(<MemoryRouter><DayView date={day} tasks={calendarTasks} system="gregorian" /></MemoryRouter>);

    const allDay = screen.getByTestId("calendar-all-day-tasks");
    expect(within(allDay).getByRole("button", { name: "Day-only task" })).toBeInTheDocument();
    expect(within(allDay).queryByText("Timed task")).toBeNull();
    expect(screen.getByText("Timed task")).toBeInTheDocument();
  });

  it("puts day-only tasks in a separate week row instead of the midnight slot", () => {
    render(<MemoryRouter><WeekView date={day} tasks={calendarTasks} holidays={[]} system="gregorian" onDayClick={() => {}} /></MemoryRouter>);

    const allDay = screen.getByTestId("calendar-all-day-row");
    expect(within(allDay).getByRole("button", { name: "Day-only task" })).toBeInTheDocument();
    expect(within(allDay).queryByText("Timed task")).toBeNull();
  });
});
