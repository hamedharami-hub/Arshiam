import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskScheduleBody } from "./TaskSchedulingSheet";
import { getLocalDateString } from "@/lib/taskDate";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/components/DueDatePicker", () => ({ DueDatePicker: () => <div data-testid="reminder-editor-stub" /> }));
vi.mock("@/components/RecurrenceEditor", () => ({
  RecurrenceEditor: ({ onChange }: { onChange: (v: { freq: string; interval: number } | null) => void }) => (
    <button type="button" data-testid="repeat-pick-daily" onClick={() => onChange({ freq: "daily", interval: 1 })}>daily</button>
  ),
}));
vi.mock("@/components/BucketPickerInline", () => ({
  BucketPickerBody: ({ onChange }: { onChange: (v: { kind: string; calendar: string; anchor: string }) => void }) => (
    <button type="button" data-testid="bucket-pick-morning" onClick={() => onChange({ kind: "morning", calendar: "gregorian", anchor: "2026-04-10" })}>pick</button>
  ),
}));
vi.mock("@/components/InlineDatePicker", () => ({
  InlineDatePicker: ({ onSelect }: { onSelect: (ymd: string) => void }) => (
    <button type="button" data-testid="inline-calendar-pick" onClick={() => onSelect("2026-05-01")}>day</button>
  ),
}));

const base = { id: "t1", user_id: "u1", title: "x", completed: false, status: "todo", priority: "none" } as Task;
const T = (fa: string, _en: string) => fa;
const today = getLocalDateString();
const customDay = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 10));

describe("TaskScheduleBody — one quiet uniform list", () => {
  it("renders the quick day rows and keeps every detail folded by default", () => {
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} postpone={vi.fn()} T={T} isEn={false} />);
    expect(screen.getByTestId("schedule-quick-today")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-quick-tomorrow")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-pick-date")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-repeat")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-reminder")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-deadline")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-bucket")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-block")).toBeInTheDocument();
    expect(screen.queryByTestId("schedule-time")).toBeNull(); // no date yet
    expect(screen.queryByTestId("schedule-repeat-body")).toBeNull();
    expect(screen.queryByTestId("schedule-bucket-body")).toBeNull();
  });

  it("picking Today saves the work date instantly", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} postpone={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-quick-today"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ work_date: today }));
  });

  it("shows the custom date row and the time row once a date is set", () => {
    const dated = { ...base, work_date: `${customDay}T09:30:00` } as Task;
    render(<TaskScheduleBody t={dated} canEdit save={vi.fn()} postpone={vi.fn()} T={T} isEn={false} />);
    expect(screen.getByTestId("schedule-custom-date")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-time")).toBeInTheDocument();
  });

  it("picks an arbitrary date from the on-demand calendar and folds it away", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} postpone={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-pick-date"));
    fireEvent.click(screen.getByTestId("inline-calendar-pick"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ work_date: "2026-05-01" }));
    expect(screen.queryByTestId("inline-calendar-pick")).toBeNull();
  });

  it("saves a repeat rule and a part-of-day bucket from their folded sections", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} postpone={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-repeat"));
    fireEvent.click(screen.getByTestId("repeat-pick-daily"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ recurrence: "daily" }));
    fireEvent.click(screen.getByTestId("schedule-bucket"));
    fireEvent.click(screen.getByTestId("bucket-pick-morning"));
    expect(save).toHaveBeenCalledWith({ bucket_kind: "morning", bucket_calendar: "gregorian", bucket_anchor: "2026-04-10" });
  });

  it("picks a deadline from the on-demand calendar", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} postpone={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-deadline"));
    fireEvent.click(screen.getByTestId("inline-calendar-pick"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ due_date: "2026-05-01" }));
  });

  it("postpones from the slim footer row", () => {
    const postpone = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} postpone={postpone} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("postpone-3"));
    expect(postpone).toHaveBeenCalledWith(3);
  });
});
