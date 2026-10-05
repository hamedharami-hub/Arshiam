import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeriodReviewDialog } from "./PeriodReview";
import type { Task } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => ({ savePlanReview: vi.fn(), toastError: vi.fn(), toastInfo: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/planReviewService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/planReviewService")>(),
  savePlanReview: mocks.savePlanReview,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, info: mocks.toastInfo, success: mocks.toastSuccess } }));

const period = { horizon: "week" as const, start: "2026-09-28", end: "2026-10-04" };
const settings = { calendar: "gregorian" as const, weekStart: "mon" as const, seasonsEnabled: false };

const props = (overrides: Partial<React.ComponentProps<typeof PeriodReviewDialog>> = {}) => ({
  period, items: [], settings, fa: false, onClose: vi.fn(), reviews: {},
  onMove: vi.fn().mockResolvedValue("saved"), onDrop: vi.fn().mockResolvedValue("saved"),
  onContinue: vi.fn().mockResolvedValue("saved"), onWaiting: vi.fn().mockResolvedValue("saved"), onSetAside: vi.fn().mockResolvedValue("saved"),
  onComplete: vi.fn(), onAdd: vi.fn().mockResolvedValue("saved"),
  ...overrides,
});

describe("PeriodReviewDialog persistence feedback", () => {
  beforeEach(() => {
    mocks.savePlanReview.mockReset();
    mocks.toastError.mockReset();
    mocks.toastInfo.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it("keeps the review open after failed or queued save until a confirmed commit", async () => {
    mocks.savePlanReview.mockResolvedValueOnce("failed").mockResolvedValueOnce("queued");
    const reviewProps = props();
    render(<PeriodReviewDialog {...reviewProps} />);
    const note = screen.getByTestId("planning-review-note") as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "Keep this review" } });

    fireEvent.click(screen.getByTestId("planning-review-finish"));
    await waitFor(() => expect(mocks.savePlanReview).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("planning-review-note")).toHaveValue("Keep this review");
    expect(reviewProps.onClose).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId("planning-review-finish"));
    await waitFor(() => expect(screen.getByTestId("planning-review-sync-status")).toHaveTextContent("kept on this device"));
    expect(reviewProps.onClose).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("renders historical report and progress only from the frozen snapshot", () => {
    const saved = {
      id: "week_2026-09-28_2026-10-04_gregorian", horizon: "week" as const, start: period.start, end: period.end,
      note: "Then", reviewed_at: "2026-10-04T20:00:00Z", revision: 2,
      snapshot: {
        done: [{ id: "moved", title: "Done at review", status: "done" as const }],
        open: [{ id: "still-open", title: "Open at review", status: "open" as const }],
        set_aside: [{ id: "aside", title: "Set aside at review", status: "set_aside" as const }],
      },
    };
    render(<PeriodReviewDialog {...props({ reviews: { [saved.id]: saved }, items: [
      { id: "moved", title: "Moved after review", completed: false, status: "todo" } as Task,
      { id: "new", title: "Added after review", completed: false, status: "todo" } as Task,
    ] })} />);
    expect(screen.getByText("Done at review")).toBeInTheDocument();
    expect(screen.getByText("Open at review")).toBeInTheDocument();
    expect(screen.getByText("Set aside at review")).toBeInTheDocument();
    expect(screen.queryByText("Moved after review")).not.toBeInTheDocument();
    expect(screen.queryByText("Added after review")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planning-review-move-still-open")).not.toBeInTheDocument();
  });

  it("stores dirty notes and keeps the original snapshot when a historical note is corrected", async () => {
    mocks.savePlanReview.mockResolvedValue("saved");
    const saved = {
      id: "week_2026-09-28_2026-10-04_gregorian", horizon: "week" as const, start: period.start, end: period.end,
      note: "Prior", reviewed_at: "t1", revision: 1, snapshot: {
        done: [{ id: "done-before", title: "Done before move", status: "done" as const }],
        open: [{ id: "open-before", title: "Open before move", status: "open" as const }],
        set_aside: [],
      },
    };
    const reviewProps = props({ reviews: { [saved.id]: saved }, items: [{ id: "open-1", title: "Work", status: "todo" } as Task] });
    render(<PeriodReviewDialog {...reviewProps} />);
    fireEvent.change(screen.getByTestId("planning-review-note"), { target: { value: "Corrected" } });
    expect(localStorage.getItem("arsh_plan_review_drafts_v1:user-1")).toContain("Corrected");
    fireEvent.click(screen.getByTestId("planning-review-finish"));
    await waitFor(() => expect(reviewProps.onClose).toHaveBeenCalledOnce());
    expect(mocks.savePlanReview).toHaveBeenCalledOnce();
    expect(mocks.savePlanReview.mock.calls[0][2]).toMatchObject({ note: "Corrected", snapshot: saved.snapshot });
    expect(mocks.savePlanReview.mock.calls[0][3]).toMatchObject({ revision: 1, note: "Prior" });
  });

  it("does not invent a snapshot when correcting a legacy review that has none", async () => {
    mocks.savePlanReview.mockResolvedValueOnce("saved");
    const saved = {
      id: "week_2026-09-28_2026-10-04_gregorian", horizon: "week" as const, start: period.start, end: period.end,
      note: "Old note", reviewed_at: "t1", revision: 1, snapshot: null,
    };
    render(<PeriodReviewDialog {...props({ reviews: { [saved.id]: saved }, items: [{ id: "now", title: "Current task", status: "todo" } as Task] })} />);
    fireEvent.change(screen.getByTestId("planning-review-note"), { target: { value: "Corrected note" } });
    fireEvent.click(screen.getByTestId("planning-review-finish"));
    await waitFor(() => expect(mocks.savePlanReview).toHaveBeenCalledOnce());
    expect(mocks.savePlanReview.mock.calls[0][2]).toMatchObject({ note: "Corrected note", snapshot: null });
  });

  it("preserves a next-period draft after a thrown add and retries with the same intent", async () => {
    let finishFirst!: () => void;
    const onAdd = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { finishFirst = () => reject(new Error("offline")); }))
      .mockResolvedValueOnce("queued");
    render(<PeriodReviewDialog {...props({ onAdd })} />);
    const input = screen.getByTestId("planning-review-next-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Prepare slides" } });
    fireEvent.submit(input.closest("form")!);
    const intentId = onAdd.mock.calls[0][2];
    finishFirst();

    await waitFor(() => expect(screen.getByTestId("planning-review-next-input")).toHaveValue("Prepare slides"));
    fireEvent.submit(screen.getByTestId("planning-review-next-input").closest("form")!);
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(2));

    expect(onAdd.mock.calls[1][2]).toBe(intentId);
    await waitFor(() => expect(screen.getByTestId("planning-review-next-input")).toHaveValue(""));
  });

  it("offers continue, shrink, selected-period move, waiting, unplan, and won't-do without deleting the task", async () => {
    const work = { id: "work", title: "Write a draft", priority: "none", completed: false, status: "todo", plan_parent_id: "goal" } as Task;
    const onMove = vi.fn().mockResolvedValue("saved");
    const reviewProps = props({ items: [work], onMove });
    render(<PeriodReviewDialog {...reviewProps} />);

    fireEvent.click(screen.getByTestId("planning-review-continue-work"));
    await waitFor(() => expect(reviewProps.onContinue).toHaveBeenCalledWith(work));

    fireEvent.click(screen.getByTestId("planning-review-shrink-work"));
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0][1].horizon).toBe("day");
    expect(onMove.mock.calls[0][1].start >= period.start).toBe(true);
    expect(onMove.mock.calls[0][1].end <= period.end).toBe(true);

    fireEvent.click(screen.getByTestId("planning-review-move-work"));
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(2));
    expect(onMove.mock.calls[1][1].horizon).toBe("week");

    fireEvent.change(screen.getByTestId("planning-review-waiting-reason-work"), { target: { value: "Waiting on approval" } });
    fireEvent.click(screen.getByTestId("planning-review-waiting-work"));
    await waitFor(() => expect(reviewProps.onWaiting).toHaveBeenCalledWith(work, "Waiting on approval"));

    fireEvent.click(screen.getByTestId("planning-review-drop-work"));
    await waitFor(() => expect(reviewProps.onDrop).toHaveBeenCalledWith(work));
    fireEvent.click(screen.getByTestId("planning-review-setaside-work"));
    await waitFor(() => expect(reviewProps.onSetAside).toHaveBeenCalledWith(work));
    expect(work.plan_parent_id).toBe("goal");
  });
});
