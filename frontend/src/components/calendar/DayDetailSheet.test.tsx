import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DayDetailSheet from "./DayDetailSheet";

const save = vi.hoisted(() => vi.fn(async (_owner: string, _task: { due_date: string }) => true));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/hooks/useDeviceFormFactor", () => ({ useDeviceFormFactor: () => ({ prefersDialog: true }) }));
vi.mock("@/lib/appModules", () => ({ isPathAllowed: () => false }));
vi.mock("@/lib/firestoreDataService", () => ({ upsertTask: save, getDailyCheckin: async () => null }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => { const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: null }), insert: async () => ({ data: null }) }; return query; } } }));

describe("day quick add", () => {
  beforeEach(() => { save.mockClear(); });
  it("does not mirror a failed primary save into a second mutation", async () => {
    save.mockResolvedValueOnce(false);
    const created = vi.fn();
    render(<MemoryRouter><DayDetailSheet date={new Date(2026, 9, 13)} open onOpenChange={() => {}} onTaskCreated={created} tasks={[]} holidays={[]} system="gregorian" /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText("عنوان تسک"), { target: { value: "Keep failed draft" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "افزودن" })); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(created).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("عنوان تسک")).toHaveValue("Keep failed draft");
  });
  it("seeds midnight, saves the selected hour, then resets for another day or a day-only opening", async () => {
    const props = { date: new Date(2026, 9, 13), open: true, onOpenChange: vi.fn(), tasks: [], holidays: [], system: "gregorian" as const };
    const view = render(<MemoryRouter><DayDetailSheet {...props} initialHour={0} /></MemoryRouter>);
    expect(screen.getByLabelText("New task hour")).toHaveValue("0");
    fireEvent.change(screen.getByPlaceholderText("عنوان تسک"), { target: { value: "Midnight task" } });
    expect(screen.getByPlaceholderText("عنوان تسک")).toHaveValue("Midnight task");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "افزودن" })); });
    await waitFor(() => expect(save).toHaveBeenCalled(), { timeout: 10_000 });
    expect(new Date(save.mock.calls[0][1].due_date)).toEqual(new Date(2026, 9, 13));
    await act(async () => { view.rerender(<MemoryRouter><DayDetailSheet {...props} date={new Date(2026, 9, 14)} initialHour={17} /></MemoryRouter>); });
    expect(screen.getByLabelText("New task hour")).toHaveValue("17");
    await act(async () => { view.rerender(<MemoryRouter><DayDetailSheet {...props} initialHour={null} /></MemoryRouter>); });
    expect(screen.getByLabelText("New task hour")).toHaveValue("9");
  });
  it("uses canonical urgent and legacy high priority labels alongside dots", () => {
    render(<MemoryRouter><DayDetailSheet date={new Date(2026, 9, 13)} open onOpenChange={() => {}} tasks={[
      { id: "urgent", title: "Urgent task", due_date: "2026-10-13", priority: "urgent", completed: false },
      { id: "legacy", title: "Legacy task", due_date: "2026-10-13", priority: "p1" as any, completed: false },
    ]} holidays={[]} system="gregorian" /></MemoryRouter>);
    expect(screen.getByText("Urgent")).toHaveClass("text-red-700");
    expect(screen.getByText("High")).toHaveClass("text-rose-600");
  });
});
