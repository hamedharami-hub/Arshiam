import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskScheduleBody } from "./TaskSchedulingSheet";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/components/DueDatePicker", () => ({ DueDatePicker: () => <div data-testid="due-date-picker-stub" /> }));
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

describe("TaskScheduleBody compact layout", () => {
  it("keeps the folded sections closed by default", () => {
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} postpone={vi.fn()} T={T} isEn={false} />);
    expect(screen.getByTestId("due-date-picker-stub")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-deadline-row")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-block-row")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-bucket-row")).toBeInTheDocument();
    expect(screen.queryByTestId("schedule-block-body")).toBeNull();
    expect(screen.queryByTestId("schedule-bucket-body")).toBeNull();
  });

  it("opens the deadline calendar on demand and closes it after picking", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} postpone={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-deadline-row"));
    fireEvent.click(screen.getByTestId("inline-calendar-pick"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ due_date: "2026-05-01" }));
    expect(screen.queryByTestId("inline-calendar-pick")).toBeNull();
  });

  it("saves a part-of-day bucket from the folded section", () => {
    const save = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={save} postpone={vi.fn()} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("schedule-bucket-row"));
    fireEvent.click(screen.getByTestId("bucket-pick-morning"));
    expect(save).toHaveBeenCalledWith({ bucket_kind: "morning", bucket_calendar: "gregorian", bucket_anchor: "2026-04-10" });
  });

  it("postpones from the compact chip row", () => {
    const postpone = vi.fn();
    render(<TaskScheduleBody t={base} canEdit save={vi.fn()} postpone={postpone} T={T} isEn={false} />);
    fireEvent.click(screen.getByTestId("postpone-3"));
    expect(postpone).toHaveBeenCalledWith(3);
  });
});
