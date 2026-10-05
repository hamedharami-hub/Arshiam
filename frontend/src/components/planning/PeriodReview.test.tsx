import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeriodReviewDialog } from "./PeriodReview";

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

  it("keeps the review note open on failed save and closes only after a queued save", async () => {
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
    await waitFor(() => expect(reviewProps.onClose).toHaveBeenCalledOnce());
    expect(mocks.toastInfo).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
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
});
