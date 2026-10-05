import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpperLevelPanel } from "./UpperLevelPanel";
import type { Task } from "@/lib/taskTypes";

const parent = { id: "upper-1", title: "Publish the book", priority: "none", completed: false, status: "todo" } as Task;
const parentPeriod = { horizon: "month" as const, start: "2026-10-01", end: "2026-10-31" };
const current = { horizon: "week" as const, start: "2026-10-05", end: "2026-10-11" };
const settings = { calendar: "gregorian" as const, weekStart: "mon" as const, seasonsEnabled: false };

describe("UpperLevelPanel pull persistence", () => {
  it("keeps the smaller-step draft on failure and reuses its intent for a queued retry", async () => {
    let finishFirst!: (status: "failed") => void;
    const onPull = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce("queued");
    render(<UpperLevelPanel parentPeriod={parentPeriod} items={[parent]} kids={new Map()} current={current} settings={settings} fa={false}
      onPull={onPull} onMoveHere={vi.fn().mockResolvedValue("saved")} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByTestId("plan-upper-step-upper-1"));
    const input = screen.getByTestId("plan-upper-step-input-upper-1");
    fireEvent.change(input, { target: { value: "Write one chapter" } });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onPull).toHaveBeenCalledTimes(1);
    const intentId = onPull.mock.calls[0][2];
    finishFirst("failed");

    await waitFor(() => expect(screen.getByTestId("plan-upper-step-input-upper-1")).toHaveValue("Write one chapter"));
    fireEvent.submit(screen.getByTestId("plan-upper-step-input-upper-1").closest("form")!);
    await waitFor(() => expect(onPull).toHaveBeenCalledTimes(2));

    expect(onPull.mock.calls[1][2]).toBe(intentId);
    await waitFor(() => expect(screen.queryByTestId("plan-upper-step-input-upper-1")).not.toBeInTheDocument());
  });
});
