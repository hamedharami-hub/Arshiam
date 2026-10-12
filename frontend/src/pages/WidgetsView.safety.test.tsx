import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import WidgetsView from "./WidgetsView";
import { todayISO } from "@/lib/timeHorizon";
import type { Task } from "@/lib/taskTypes";

const mocks = vi.hoisted(() => ({
  user: { id: "owner", uid: "owner" } as { id: string; uid: string } | null,
  fetch: vi.fn(), confirmed: vi.fn(), save: vi.fn(), remove: vi.fn(), complete: vi.fn(),
  success: vi.fn(), error: vi.fn(), info: vi.fn(), feedback: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/features/tasks/taskService", () => ({ fetchTasks: mocks.fetch, hasServerAuthoritativeTasks: mocks.confirmed, saveTask: mocks.save, deleteTask: mocks.remove }));
vi.mock("@/features/tasks/taskCompletion", () => ({ setTaskCompletion: mocks.complete }));
vi.mock("@/components/CompletionFeedbackSettingsCard", () => ({ CompletionFeedbackSettingsCard: () => null }));
vi.mock("@/lib/completionFeedback", () => ({ playCompletionFeedback: mocks.feedback }));
vi.mock("@/lib/completedTaskVisibility", () => ({ useShowCompletedTasks: () => true }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/lib/nativeExperience", () => ({ isAndroid: () => false }));
vi.mock("@/lib/androidWidget", () => ({ refreshAndroidWidgets: vi.fn().mockResolvedValue({}), getWidgetDiagnostics: () => ({ isNative: false, lastSyncTimestamp: null }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, info: mocks.info } }));

const realTask = (): Task => ({
  id: "server-task", user_id: "owner", title: "Real account task", completed: false,
  status: "todo", priority: "high", due_date: todayISO(),
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
});
function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname}{location.search}</p>; }
const mount = () => render(<MemoryRouter initialEntries={["/app/widgets"]}><Location /><WidgetsView /></MemoryRouter>);
const source = () => screen.getByTestId("widgets-task-source");
const noWrites = () => {
  expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.complete).not.toHaveBeenCalled();
};
async function taskMenu(title: string) {
  const row = screen.getByText(title).closest(".group")!;
  const trigger = within(row as HTMLElement).getByTitle("Widget task actions");
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  // JSDOM versions without PointerEvent need a keyboard activation fallback.
  if (!screen.queryByRole("menu")) fireEvent.keyDown(trigger, { key: "Enter" });
  await screen.findByRole("menu");
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.removeItem("arshnaz_widget_preferences");
  mocks.user = { id: "owner", uid: "owner" };
  mocks.fetch.mockResolvedValue([realTask()]); mocks.confirmed.mockReturnValue(true);
  mocks.complete.mockResolvedValue({ kind: "failed" });
  mocks.save.mockResolvedValue(false); mocks.remove.mockResolvedValue(false);
});

describe("Widget task source and persistence safety", () => {
  it("keeps an authenticated empty account empty, with no automatic samples or writes", async () => {
    mocks.fetch.mockResolvedValue([]);
    mount();
    await waitFor(() => expect(source()).toHaveAttribute("data-source", "empty"));
    expect(screen.getByText("Your account has no tasks yet.")).toBeInTheDocument();
    expect(screen.queryByText("Design UI and review widgets")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark done" })).not.toBeInTheDocument();
    noWrites();
  });

  it.each(["throw", "empty-cache"])("shows fetch failure explicitly without sample fallback (%s)", async (failure) => {
    if (failure === "throw") mocks.fetch.mockRejectedValue(new Error("offline"));
    else { mocks.fetch.mockResolvedValue([]); mocks.confirmed.mockReturnValue(false); }
    mount();
    await waitFor(() => expect(source()).toHaveAttribute("data-source", "error"));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not confirm task loading");
    expect(screen.queryByText("Design UI and review widgets")).not.toBeInTheDocument();
    noWrites();
    mocks.fetch.mockResolvedValue([]); mocks.confirmed.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry loading tasks" }));
    await waitFor(() => expect(source()).toHaveAttribute("data-source", "empty"));
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("allows an explicit authenticated demo but completion, postpone, delete and open stay local", async () => {
    mocks.fetch.mockResolvedValue([]);
    mount();
    await waitFor(() => expect(source()).toHaveAttribute("data-source", "empty"));
    fireEvent.click(screen.getByRole("button", { name: "Show sample demo" }));
    expect(source()).toHaveAttribute("data-source", "sample");
    expect(source()).toHaveTextContent("never saved to an account");
    fireEvent.click(screen.getByText("Design UI and review widgets"));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/widgets");
    await taskMenu("Design UI and review widgets");
    fireEvent.click(screen.getByRole("menuitem", { name: "Postpone to tomorrow" }));
    expect(screen.queryByText("Design UI and review widgets")).not.toBeInTheDocument();
    await taskMenu("3D breathing & peace of mind check-in");
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete task" }));
    expect(screen.queryByText("3D breathing & peace of mind check-in")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Mark done" })[0]);
    noWrites();
    expect(mocks.feedback).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });

  it("labels an unauthenticated preview as samples without fetching or writing account data", async () => {
    mocks.user = null;
    mount();
    await waitFor(() => expect(source()).toHaveAttribute("data-source", "sample"));
    fireEvent.click(screen.getAllByRole("button", { name: "Mark done" })[0]);
    expect(mocks.fetch).not.toHaveBeenCalled(); noWrites();
  });

  it.each(["failed", "throw"])("keeps the real task unchanged and never celebrates completion failure (%s)", async (failure) => {
    if (failure === "throw") mocks.complete.mockRejectedValue(new Error("failed"));
    mount();
    await screen.findByText("Real account task");
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByText("Real account task")).toBeInTheDocument();
    expect(mocks.complete).toHaveBeenCalledWith("owner", expect.objectContaining({ id: "server-task" }), true, { allKnownTasks: [expect.objectContaining({ id: "server-task" })] });
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.feedback).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });

  it("hands configured outcomes to the reviewed Tasks picker without completing locally", async () => {
    mocks.complete.mockResolvedValue({ kind: "outcomes", outcomes: [{ id: "outcome" }] });
    mount();
    await screen.findByText("Real account task");
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/app/tasks?completeTaskId=server-task"));
    expect(screen.getByText("Real account task")).toBeInTheDocument();
    expect(mocks.feedback).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });

  it("applies only the shared recurring advancement patch, not a fabricated done state", async () => {
    mocks.complete.mockResolvedValue({ kind: "advanced", patch: { due_date: todayISO(), completed: false, title: "Next occurrence" }, nextLabel: "Tomorrow" });
    mount();
    await screen.findByText("Real account task");
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await screen.findByText("Next occurrence");
    expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument();
    expect(mocks.success).toHaveBeenCalledWith("Next occurrence: Tomorrow");
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.feedback).toHaveBeenCalledOnce();
  });

  it("reports durable queued completion as pending sync, not server success", async () => {
    mocks.complete.mockResolvedValue({ kind: "queued", patch: { completed: true, status: "done" } });
    mount();
    await screen.findByText("Real account task");
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await waitFor(() => expect(mocks.info).toHaveBeenCalledWith("Change retained on this device; awaiting sync"));
    expect(screen.queryByText("Real account task")).not.toBeInTheDocument();
    expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.feedback).toHaveBeenCalledOnce();
  });

  it("redirects study completion to its real study flow without success feedback", async () => {
    mocks.complete.mockResolvedValue({ kind: "study", navUrl: "/app/study/session" });
    mount();
    await screen.findByText("Real account task");
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/app/study/session"));
    expect(mocks.feedback).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });

  it("does not let a pending account fetch overwrite an explicitly selected demo", async () => {
    let finish!: (tasks: Task[]) => void;
    mocks.fetch.mockImplementation(() => new Promise<Task[]>((resolve) => { finish = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Show sample demo" }));
    await act(async () => { finish([realTask()]); });
    expect(source()).toHaveAttribute("data-source", "sample");
    expect(screen.queryByText("Real account task")).not.toBeInTheDocument();
    noWrites();
  });

  it("keeps failed postpone and delete operations visible without success feedback", async () => {
    mount();
    await screen.findByText("Real account task");
    await taskMenu("Real account task");
    fireEvent.click(screen.getByRole("menuitem", { name: "Postpone to tomorrow" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
    expect(screen.getByText("Real account task")).toBeInTheDocument();
    await taskMenu("Real account task");
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete task" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Real account task")).toBeInTheDocument();
    expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.feedback).not.toHaveBeenCalled();
  });

  it("does not apply an old account's completion after switching accounts", async () => {
    let finish!: (result: unknown) => void;
    mocks.complete.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = mount();
    await screen.findByText("Real account task");
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    mocks.user = { id: "other-owner", uid: "other-owner" }; mocks.fetch.mockResolvedValue([]);
    view.rerender(<MemoryRouter initialEntries={["/app/widgets"]}><Location /><WidgetsView /></MemoryRouter>);
    await waitFor(() => expect(source()).toHaveAttribute("data-source", "empty"));
    await act(async () => { finish({ kind: "saved", patch: { completed: true, status: "done" } }); });
    expect(source()).toHaveAttribute("data-source", "empty");
    expect(mocks.feedback).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });
});
