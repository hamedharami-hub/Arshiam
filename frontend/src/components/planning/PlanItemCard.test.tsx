import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanItemCard } from "./PlanItemCard";
import type { Task } from "@/lib/taskTypes";

const task = { id: "parent-1", title: "Parent", priority: "none", completed: false, status: "todo" } as Task;
const settings = { calendar: "gregorian" as const, weekStart: "mon" as const, seasonsEnabled: false };

function openChildForm() {
  fireEvent.keyDown(screen.getByTestId("plan-item-menu-parent-1"), { key: "Enter" });
  fireEvent.click(screen.getByTestId("plan-item-add-child-parent-1"));
  return screen.getByTestId("plan-item-child-input-parent-1") as HTMLInputElement;
}

describe("PlanItemCard child creation", () => {
  it("keeps the draft and reuses the same intent after failure; queued retry clears it once", async () => {
    let finishFirst!: (status: "failed") => void;
    const onAddChild = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce("queued");
    render(<PlanItemCard
      task={task} kids={new Map()} byId={new Map()} settings={settings} fa={false} childLevelName="day"
      onAddChild={onAddChild} onToggle={vi.fn()} onOpen={vi.fn()} onMoveNext={vi.fn().mockResolvedValue("saved")} onUnplan={vi.fn().mockResolvedValue("saved")}
    />);

    const input = openChildForm();
    fireEvent.change(input, { target: { value: "Write outline" } });
    const form = input.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);
    expect(onAddChild).toHaveBeenCalledTimes(1);
    const intentId = onAddChild.mock.calls[0][2];
    finishFirst("failed");

    await waitFor(() => expect(screen.getByTestId("plan-item-child-input-parent-1")).toHaveValue("Write outline"));
    fireEvent.submit(screen.getByTestId("plan-item-child-input-parent-1").closest("form")!);
    await waitFor(() => expect(onAddChild).toHaveBeenCalledTimes(2));

    expect(onAddChild.mock.calls[1][2]).toBe(intentId);
    await waitFor(() => expect(screen.queryByTestId("plan-item-child-input-parent-1")).not.toBeInTheDocument());
  });

  it("releases the busy state and preserves the draft when a callback throws", async () => {
    const onAddChild = vi.fn().mockRejectedValueOnce(new Error("offline"));
    render(<PlanItemCard
      task={task} kids={new Map()} byId={new Map()} settings={settings} fa={false} childLevelName="day"
      onAddChild={onAddChild} onToggle={vi.fn()} onOpen={vi.fn()} onMoveNext={vi.fn().mockResolvedValue("saved")} onUnplan={vi.fn().mockResolvedValue("saved")}
    />);

    const input = openChildForm();
    fireEvent.change(input, { target: { value: "Keep this" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => expect(screen.getByTestId("plan-item-child-input-parent-1")).toHaveValue("Keep this"));
    expect(screen.getByTestId("plan-item-child-input-parent-1")).toBeEnabled();
    expect(onAddChild).toHaveBeenCalledTimes(1);
  });
});
