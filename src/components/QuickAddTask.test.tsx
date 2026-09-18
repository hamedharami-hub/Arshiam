import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QuickAddTask } from "./QuickAddTask";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-1" } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (fa: string, en?: string) => en || fa,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [] }),
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
