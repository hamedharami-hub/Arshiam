import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CalendarView from "./CalendarView";

const taskReads: Array<{ resolve: (value: { data: unknown[] }) => void; userId?: string }> = [];
const user = { id: "user-1" };
let currentUser = user;
const occasionSets: string[] = [];
const metadata: Record<string, unknown[]> = {
  folders: [{ id: "folder-1", name: "Work", user_id: "user-1" }, { id: "folder-2", name: "Home", user_id: "user-1" }],
  tags: [{ id: "tag-1", name: "Important", user_id: "user-1" }, { id: "tag-2", name: "Later", user_id: "user-1" }],
  task_tags: [
    { task_id: "matching", tag_id: "tag-1", user_id: "user-1" },
    { task_id: "wrong-tag", tag_id: "tag-2", user_id: "user-1" },
    { task_id: "wrong-status", tag_id: "tag-1", user_id: "user-1" },
  ],
};
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        order: () => query,
        maybeSingle: async () => ({ data: null }),
        then: (resolve: (value: { data: unknown[] }) => unknown, reject?: (reason: unknown) => unknown) => {
          if (table === "tasks") {
            return new Promise<{ data: unknown[] }>((finish) => taskReads.push({ resolve: finish, userId: filters.user_id as string | undefined })).then(resolve, reject);
          }
          const rows = (metadata[table] || []) as Record<string, unknown>[];
          const filtered = rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
          return Promise.resolve({ data: filtered }).then(resolve, reject);
        },
      };
      return query;
    },
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/holidays", () => ({
  getHolidaysForRange: async () => [], getOccasionSets: () => occasionSets, setOccasionSets: vi.fn(), HOLIDAYS_EVENT: "holidays-changed",
}));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/calendar/MonthGrid", () => ({ default: ({ tasks }: { tasks: { id: string; due_date?: string | null; deadline_date?: string | null; calendar_kind?: string }[] }) => <div data-testid="calendar-tasks" data-dates={JSON.stringify(tasks.map(({ id, due_date, deadline_date, calendar_kind }) => ({ id, due_date, deadline_date, calendar_kind })))}>{tasks.map(t => t.id).join(",")}</div> }));
vi.mock("@/components/calendar/WeekView", () => ({ default: ({ tasks }: { tasks: { id: string }[] }) => <div data-testid="week-task-list">{tasks.map(t => t.id).join(",")}</div> }));
vi.mock("@/components/calendar/DayView", () => ({ default: ({ tasks }: { tasks: { id: string }[] }) => <div data-testid="day-task-list">{tasks.map(t => t.id).join(",")}</div> }));
vi.mock("@/components/calendar/AgendaView", () => ({ default: ({ tasks }: { tasks: { id: string }[] }) => <div data-testid="agenda-task-list">{tasks.map(t => t.id).join(",")}</div> }));
vi.mock("@/components/calendar/DayDetailSheet", () => ({ default: () => null }));
vi.mock("@/components/calendar/HolidayList", () => ({ HolidayList: () => null }));

describe("Calendar task refresh", () => {
  beforeEach(() => { taskReads.length = 0; currentUser = user; localStorage.clear(); });

  const todayTasks = () => {
    const today = new Date();
    const workDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    return [
      { id: "matching", user_id: "user-1", title: "Matching task", work_date: workDate, schedule_v: 2, folder_id: "folder-1", status: "in_progress", completed: false },
      { id: "wrong-folder", user_id: "user-1", title: "Other folder", work_date: workDate, schedule_v: 2, folder_id: "folder-2", status: "in_progress", completed: false },
      { id: "wrong-tag", user_id: "user-1", title: "Other tag", work_date: workDate, schedule_v: 2, folder_id: "folder-1", status: "in_progress", completed: false },
      { id: "wrong-status", user_id: "user-1", title: "Other status", work_date: workDate, schedule_v: 2, folder_id: "folder-1", status: "todo", completed: false },
      { id: "foreign", user_id: "user-2", title: "Other account", work_date: workDate, schedule_v: 2, folder_id: "folder-1", status: "in_progress", completed: false },
      { id: "period-only", user_id: "user-1", title: "Period plan", work_date: null, due_date: workDate, schedule_v: 2, planning_horizon: "week", planning_start: workDate, planning_end: workDate, folder_id: "folder-1", status: "in_progress", completed: false },
    ];
  };

  const resolveRead = (index: number, rows: unknown[] = todayTasks()) => {
    const request = taskReads[index];
    request.resolve({ data: rows.filter((row) => (row as { user_id?: string }).user_id === request.userId) });
  };

  it("refreshes on task changes and ignores an older, slower response", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("tasks-changed")); });
    await waitFor(() => expect(taskReads).toHaveLength(2));
    act(() => { resolveRead(1, [{ id: "fresh", user_id: "user-1", work_date: todayTasks()[0].work_date, schedule_v: 2 }]); });
    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("fresh"));
    act(() => { resolveRead(0, [{ id: "stale", user_id: "user-1", work_date: todayTasks()[0].work_date, schedule_v: 2 }]); });
    expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("fresh");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("stale");
    expect(taskReads[0].userId).toBe("user-1");
  });

  it("refreshes after a Firestore write event", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("firebase-store-changed")); });
    await waitFor(() => expect(taskReads).toHaveLength(2));
  });

  it("hides the prior account tasks while the next account is loading", async () => {
    const view = render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    act(() => resolveRead(0, [{ id: "account-one", user_id: "user-1", work_date: todayTasks()[0].work_date, schedule_v: 2 }]));
    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("account-one"));

    currentUser = { id: "user-2" };
    view.rerender(<MemoryRouter><CalendarView /></MemoryRouter>);

    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("account-one");
    await waitFor(() => expect(taskReads).toHaveLength(2));
    expect(taskReads[1].userId).toBe("user-2");
    act(() => resolveRead(1, [{ id: "account-two", user_id: "user-2", work_date: todayTasks()[0].work_date, schedule_v: 2 }]));
    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("account-two"));
  });

  it("filters by folder, tag, and status, then preserves filters when changing views", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    act(() => resolveRead(0));
    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("matching"));

    fireEvent.click(screen.getByRole("button", { name: "Calendar filters" }));
    fireEvent.change(screen.getByLabelText("Folder filter"), { target: { value: "folder-1" } });
    fireEvent.change(screen.getByLabelText("Tag filter"), { target: { value: "tag-1" } });
    fireEvent.change(screen.getByLabelText("Status filter"), { target: { value: "in_progress" } });
    expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("matching");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("wrong-folder");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("wrong-tag");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("wrong-status");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("foreign");
    expect(screen.getByTestId("calendar-tasks")).not.toHaveTextContent("period-only");

    fireEvent.click(screen.getByRole("button", { name: "Calendar filters" }));
    const weekTab = screen.getByRole("tab", { name: "Week" });
    fireEvent.mouseDown(weekTab, { button: 0 });
    fireEvent.click(weekTab);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true"));
    await waitFor(() => expect(taskReads).toHaveLength(2));
    act(() => resolveRead(1));
    await waitFor(() => expect(screen.getByTestId("week-task-list")).toHaveTextContent("matching"));
    expect(screen.getByTestId("week-task-list")).not.toHaveTextContent("wrong-folder");
    expect(screen.getByTestId("week-task-list")).not.toHaveTextContent("wrong-tag");
    expect(screen.getByTestId("week-task-list")).not.toHaveTextContent("wrong-status");
  });

  it("includes deadline-only tasks on their deadline day", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    const today = todayTasks()[0].work_date as string;
    act(() => resolveRead(0, [
      { id: "deadline-only", user_id: "user-1", title: "Deadline only", deadline_date: today, status: "todo", completed: false },
      { id: "scheduled-elsewhere", user_id: "user-1", title: "Deadline in range", work_date: "2099-01-01", schedule_v: 2, deadline_date: today, status: "todo", completed: false },
    ]));

    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("deadline-only"));
    const rows = JSON.parse(screen.getByTestId("calendar-tasks").getAttribute("data-dates") || "[]");
    expect(rows).toEqual(expect.arrayContaining([
      { id: "deadline-only", due_date: today, deadline_date: today, calendar_kind: "deadline" },
      { id: "scheduled-elsewhere", due_date: today, deadline_date: today, calendar_kind: "deadline" },
    ]));
  });

  it("creates separate schedule and deadline entries on their own days", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    const deadlineDay = new Date();
    deadlineDay.setDate(2);
    const workDay = new Date(deadlineDay);
    workDay.setDate(3);
    const ymd = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    const deadlineDate = ymd(deadlineDay);
    const workDate = ymd(workDay);
    act(() => resolveRead(0, [{
      id: "two-dates", user_id: "user-1", title: "Task with deadline", work_date: workDate,
      schedule_v: 2, deadline_date: deadlineDate, status: "todo", completed: false,
    }]));

    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("two-dates"));
    const rows = JSON.parse(screen.getByTestId("calendar-tasks").getAttribute("data-dates") || "[]");
    expect(rows).toEqual(expect.arrayContaining([
      { id: "two-dates", due_date: workDate, deadline_date: null, calendar_kind: "schedule" },
      { id: "two-dates", due_date: deadlineDate, deadline_date: deadlineDate, calendar_kind: "deadline" },
    ]));
  });

  it("keeps the deadline marker when schedule and deadline share a day", async () => {
    render(<MemoryRouter><CalendarView /></MemoryRouter>);
    await waitFor(() => expect(taskReads).toHaveLength(1));
    const sameDay = todayTasks()[0].work_date as string;
    act(() => resolveRead(0, [{
      id: "same-day", user_id: "user-1", title: "Same day deadline", work_date: sameDay,
      schedule_v: 2, deadline_date: sameDay, status: "todo", completed: false,
    }]));

    await waitFor(() => expect(screen.getByTestId("calendar-tasks")).toHaveTextContent("same-day"));
    const rows = JSON.parse(screen.getByTestId("calendar-tasks").getAttribute("data-dates") || "[]");
    expect(rows).toEqual([
      { id: "same-day", due_date: sameDay, deadline_date: sameDay, calendar_kind: "schedule" },
    ]);
  });
});
