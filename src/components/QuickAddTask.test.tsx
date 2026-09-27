import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QuickAddTask } from "./QuickAddTask";
import { enqueueOps } from "@/lib/offlineQueue";
import { toast } from "sonner";

const { testUser } = vi.hoisted(() => ({ testUser: { id: "test-user-1" } }));

vi.mock("@/lib/offlineQueue", () => ({
  enqueueOp: vi.fn(() => Promise.resolve(true)),
  enqueueOps: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: testUser }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (fa: string, en?: string) => en || fa,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => ({
      select: () => ({
        order: () => Promise.resolve({ data: table === "tags" ? [{ id: "tag-1", name: "Work", color: "#123456" }] : [] }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

vi.mock("@/lib/taskTemplates", () => ({
  listTaskTemplates: () => Promise.resolve([]),
  buildTaskFromTemplate: (t: any) => t,
}));

vi.mock("@/lib/firestoreDataService", () => ({
  upsertTask: vi.fn(() => Promise.resolve(true)),
}));

describe("QuickAddTask component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("atomically queues an offline task and its tags before clearing the form", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const onCreated = vi.fn();
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" defaults={{ tag_id: "tag-1" }} onCreated={onCreated} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    fireEvent.change(screen.getByPlaceholderText("+ Add task"), { target: { value: "Offline task" } });
    fireEvent.click(screen.getByTitle("Add task (Enter)"));

    await waitFor(() => expect(enqueueOps).toHaveBeenCalledTimes(1));
    const [operations] = vi.mocked(enqueueOps).mock.calls[0];
    expect(operations.map(({ table }) => table)).toEqual(["tasks", "task_tags"]);
    expect(operations.every(({ ownerId }) => ownerId === "test-user-1")).toBe(true);
    expect(onCreated).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByPlaceholderText("+ Add task")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("will sync"));
  });

  it("keeps the offline form intact and reports failure when the queue rejects the write", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    vi.mocked(enqueueOps).mockResolvedValueOnce(false);
    const onCreated = vi.fn();
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" onCreated={onCreated} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByPlaceholderText("+ Add task");
    fireEvent.change(input, { target: { value: "Keep this task" } });
    fireEvent.click(screen.getByTitle("Add task (Enter)"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Could not save offline")));
    expect(screen.getByPlaceholderText("+ Add task")).toHaveValue("Keep this task");
    expect(onCreated).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("renders collapsed initially and expands on click", () => {
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" />
      </MemoryRouter>
    );

    // Shows placeholder
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
    // Options such as Add button or priority are not visible initially
    expect(screen.queryByTitle("Add task (Enter)")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("+ Add task"));

    // Now options and input are expanded
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("collapses when clicking Cancel", () => {
    render(
      <MemoryRouter>
        <QuickAddTask placeholder="+ Add task" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    // Collapses back to placeholder
    expect(screen.queryByTitle("Add task (Enter)")).not.toBeInTheDocument();
  });

  it("collapses when clicking outside with minimal movement (< 10px)", () => {
    render(
      <MemoryRouter>
        <div>
          <div data-testid="outside-target">Outside Content</div>
          <QuickAddTask placeholder="+ Add task" />
        </div>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();

    const outside = screen.getByTestId("outside-target");

    // Simulate pointerdown and pointerup at same coordinate (a tap/click)
    fireEvent.pointerDown(outside, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(outside, { clientX: 102, clientY: 101 });

    // Should collapse
    expect(screen.queryByTitle("Add task (Enter)")).not.toBeInTheDocument();
  });

  it("does NOT collapse when scrolling (> 10px movement)", () => {
    render(
      <MemoryRouter>
        <div>
          <div data-testid="outside-scroll-area">Scrollable Tasks</div>
          <QuickAddTask placeholder="+ Add task" />
        </div>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("+ Add task"));
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();

    const scrollArea = screen.getByTestId("outside-scroll-area");

    // Simulate a scroll touch gesture with pointermove and displacement
    const downEv = new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 200 } as any);
    const moveEv = new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 150 } as any);
    const upEv = new MouseEvent("pointerup", { bubbles: true, clientX: 100, clientY: 120 } as any);
    scrollArea.dispatchEvent(downEv);
    scrollArea.dispatchEvent(moveEv);
    scrollArea.dispatchEvent(upEv);

    // Should remain expanded while scrolling tasks!
    expect(screen.getByTitle("Add task (Enter)")).toBeInTheDocument();
  });
});
