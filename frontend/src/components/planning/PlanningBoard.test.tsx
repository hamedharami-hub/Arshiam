import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningBoard } from "./PlanningBoard";
import type { Task } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => ({
  persistTask: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/planReviewService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/planReviewService")>(),
  usePlanReviews: () => ({ reviews: {}, loaded: true }),
}));
vi.mock("./ValuesGoalsPanel", () => ({
  ValuesGoalsPanel: () => null,
  domainOf: () => undefined,
  useMindGoalsState: () => ({ goals: [], status: "ready" }),
}));
vi.mock("@/lib/firestoreDataService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/firestoreDataService")>(),
  persistTask: mocks.persistTask,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, info: mocks.info, error: mocks.error } }));

const settings = { calendar: "gregorian" as const, weekStart: "mon" as const, seasonsEnabled: false };
const taskList: Task[] = [];

describe("PlanningBoard quick add", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.persistTask.mockReset();
    mocks.success.mockReset();
    mocks.info.mockReset();
    mocks.error.mockReset();
  });

  it("keeps a failed draft, prevents double submit, and reuses the same task id for a queued retry", async () => {
    mocks.persistTask.mockResolvedValueOnce("failed").mockResolvedValueOnce("queued");
    render(<PlanningBoard tasks={taskList} settings={settings} fa={false} onToggle={vi.fn()} onUpdate={vi.fn().mockResolvedValue("saved")} onOpen={vi.fn()} />);
    const input = screen.getByTestId("planning-quick-add") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Prepare a study outline" } });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(1));
    const firstTask = mocks.persistTask.mock.calls[0][1];
    expect(firstTask.id).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("planning-quick-add")).toHaveValue("Prepare a study outline"));
    fireEvent.submit(screen.getByTestId("planning-quick-add").closest("form")!);

    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    expect(mocks.persistTask.mock.calls[1][1].id).toBe(firstTask.id);
    await waitFor(() => expect(screen.getByTestId("planning-quick-add")).toHaveValue(""));
    expect(mocks.info).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
