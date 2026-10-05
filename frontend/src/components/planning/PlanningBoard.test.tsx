import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningBoard } from "./PlanningBoard";
import type { Task } from "@/lib/taskTypes";
import { planPatch } from "@/lib/planCascade";
import { currentPeriod } from "@/lib/timeHorizon";

const mocks = vi.hoisted(() => ({
  persistTask: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  migrationPreview: vi.fn(),
  migrationApply: vi.fn(),
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
vi.mock("@/lib/taskScheduleMigration", () => ({
  previewTaskScheduleMigration: mocks.migrationPreview,
  applyTaskScheduleMigration: mocks.migrationApply,
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
    mocks.migrationPreview.mockReset().mockReturnValue([]);
    mocks.migrationApply.mockReset();
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

  it("shows a scoped dry-run and applies only the ready task after an explicit click", async () => {
    const legacy: Task = { id: "old-1", title: "Old task", due_date: "2026-03-10" } as Task;
    const plan = { uid: "user-1", taskId: legacy.id, sourceVersion: null, fingerprint: "fp", state: "ready", issues: [], proposed: { kind: "day", date: "2026-03-10" }, backup: {}, backupId: "backup", patch: {}, updatedAt: null };
    mocks.migrationPreview.mockReturnValue([plan]);
    mocks.migrationApply.mockResolvedValue("saved");
    const onCreated = vi.fn();
    const onOpen = vi.fn();
    render(<PlanningBoard tasks={[legacy]} settings={settings} fa={false} onToggle={vi.fn()} onUpdate={vi.fn().mockResolvedValue("saved")} onOpen={onOpen} onCreated={onCreated} />);

    fireEvent.click(screen.getByTestId("planning-schedule-migration-open"));
    expect(screen.getByTestId("planning-schedule-migration-dialog")).toHaveTextContent("Scoped to tasks loaded in this planning view");
    expect(screen.getAllByText("Old task")).not.toHaveLength(0);
    fireEvent.click(screen.getByTestId("planning-schedule-migration-apply-old-1"));
    await waitFor(() => expect(mocks.migrationApply).toHaveBeenCalledOnce());
    expect(mocks.migrationApply).toHaveBeenCalledWith(plan);
    expect(onCreated).toHaveBeenCalledOnce();
    expect(mocks.success).toHaveBeenCalledWith("Task schedule updated");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("keeps ambiguous entries blocked and offers open or dismiss actions", () => {
    const ambiguous: Task = { id: "old-2", title: "Ambiguous task", due_date: "2026-03-10" } as Task;
    const plan = { uid: "user-1", taskId: ambiguous.id, sourceVersion: null, fingerprint: "fp", state: "conflict", issues: ["unknown_timezone"], proposed: null, backup: {}, backupId: "backup", patch: null, updatedAt: null };
    mocks.migrationPreview.mockReturnValue([plan]);
    const onOpen = vi.fn();
    render(<PlanningBoard tasks={[ambiguous]} settings={settings} fa={false} onToggle={vi.fn()} onUpdate={vi.fn().mockResolvedValue("saved")} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId("planning-schedule-migration-open"));
    expect(screen.getByText("The time zone for this instant is unknown.")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-schedule-migration-apply-old-2")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("planning-schedule-migration-open-task-old-2"));
    expect(onOpen).toHaveBeenCalledWith(ambiguous);
    expect(screen.queryByTestId("planning-schedule-migration-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("planning-schedule-migration-open"));
    fireEvent.click(screen.getByTestId("planning-schedule-migration-dismiss-old-2"));
    expect(screen.queryByTestId("planning-schedule-migration-open")).not.toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("keeps review decisions separate: unplan clears only schedule, waiting and won't-do keep the task and goal link", async () => {
    const period = currentPeriod("week", settings);
    const work: Task = { id: "review-work", title: "Write a draft", priority: "none", completed: false, status: "todo", plan_parent_id: "goal", ...planPatch(period, settings) } as Task;
    const onUpdate = vi.fn().mockResolvedValue("saved");
    localStorage.setItem("arsh_planning_level_v2", "week");
    render(<PlanningBoard tasks={[work]} settings={settings} fa={false} onToggle={vi.fn()} onUpdate={onUpdate} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-review-open"));

    fireEvent.click(screen.getByTestId("planning-review-continue-review-work"));
    await waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith(work.id, { status: "in_progress", completed: false, waiting_reason: null }));
    fireEvent.change(screen.getByTestId("planning-review-waiting-reason-review-work"), { target: { value: "Needs approval" } });
    fireEvent.click(screen.getByTestId("planning-review-waiting-review-work"));
    await waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith(work.id, { status: "waiting", completed: false, waiting_reason: "Needs approval" }));
    fireEvent.click(screen.getByTestId("planning-review-setaside-review-work"));
    await waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith(work.id, { status: "wont_do", completed: false }));
    fireEvent.click(screen.getByTestId("planning-review-drop-review-work"));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(4));
    const [, unplanPatch] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    expect(unplanPatch.work_date).toBeNull();
    expect(unplanPatch.planning_horizon).toBeNull();
    expect(unplanPatch).not.toHaveProperty("plan_parent_id");
    expect(work.plan_parent_id).toBe("goal");
    expect(onUpdate.mock.calls.every(([id]) => id === work.id)).toBe(true);
  });

  it("moves a review item to a selected period without detaching it from its goal", async () => {
    const period = currentPeriod("week", settings);
    const work: Task = { id: "review-move", title: "Move this", priority: "none", completed: false, status: "todo", plan_parent_id: "goal", ...planPatch(period, settings) } as Task;
    const onUpdate = vi.fn().mockResolvedValue("saved");
    localStorage.setItem("arsh_planning_level_v2", "week");
    render(<PlanningBoard tasks={[work]} settings={settings} fa={false} onToggle={vi.fn()} onUpdate={onUpdate} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByTestId("planning-review-open"));
    fireEvent.click(screen.getByTestId("planning-review-move-review-move"));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
    const [id, movePatch] = onUpdate.mock.calls[0];
    expect(id).toBe(work.id);
    expect(movePatch.planning_horizon).toBe("week");
    expect(movePatch).not.toHaveProperty("plan_parent_id");
  });
});
