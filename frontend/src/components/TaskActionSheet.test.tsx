import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskActionSheet from "./TaskActionSheet";
import type { Task } from "@/lib/taskTypes";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
  }),
}));

vi.mock("@/hooks/useShareAccess", () => ({
  useShareAccess: () => ({
    isOwner: true,
    canEdit: true,
    canComment: true,
  }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock("@/lib/capabilities", () => ({
  isFeatureEnabled: () => false,
}));

vi.mock("@/components/TaskActivities", () => ({
  TaskActivities: () => <div data-testid="task-activities">Activities</div>,
}));

describe("TaskActionSheet Responsive Behavior", () => {
  const dummyTask: Task = {
    id: "task-test-1",
    title: "Responsive Task Test",
    user_id: "user-123",
    created_at: new Date().toISOString(),
    priority: "urgent",
    completed: false,
    status: "todo",
    updated_at: new Date().toISOString(),
  };

  const defaultProps = {
    task: dummyTask,
    open: true,
    onOpenChange: vi.fn(),
    onComplete: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
    onMakeChild: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders inside a bounded Dialog (not bottom sheet) on Windows", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");

    render(<TaskActionSheet {...defaultProps} />);

    // In Radix Dialog, dialog role is present
    const dialogElement = screen.getByRole("dialog");
    expect(dialogElement).toBeInTheDocument();

    // Verify it uses the bounded dialog classes
    expect(dialogElement.className).toContain("max-w-md");
    expect(dialogElement.className).toContain("max-h-[75vh]");
    expect(dialogElement.className).not.toContain("rounded-t-2xl");
  });

  it("renders inside a bounded Dialog on Foldable", () => {
    localStorage.setItem("arshnaz_nav_mode", "foldable");

    render(<TaskActionSheet {...defaultProps} />);

    const dialogElement = screen.getByRole("dialog");
    expect(dialogElement).toBeInTheDocument();
    expect(dialogElement.className).toContain("max-w-md");
    expect(dialogElement.className).toContain("max-h-[75vh]");
  });

  it("renders inside a bottom Sheet on Phone", () => {
    localStorage.setItem("arshnaz_nav_mode", "phone");

    render(<TaskActionSheet {...defaultProps} />);

    const sheetElement = screen.getByRole("dialog");
    expect(sheetElement).toBeInTheDocument();
    // Sheet has bottom sheet class rounded-t-2xl and max-h-[85vh]
    expect(sheetElement.className).toContain("rounded-t-2xl");
  });

  it("no longer offers an Add Comment entry (comments were merged into the task text)", async () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    expect(screen.queryByText(/افزودن توضیح|Add Comment/i)).not.toBeInTheDocument();
    const dialogElement = screen.getByRole("dialog");
    expect(dialogElement.className).toContain("max-h-[75vh]");
  });

  it("does not offer Save as Template while keeping the rest of the task actions", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    render(<TaskActionSheet {...defaultProps} />);
    fireEvent.click(screen.getByText(/بیشتر|More/i));
    expect(screen.queryByText(/Save as Template|تمپلیت/i)).not.toBeInTheDocument();
    expect(screen.getByText(/تکثیر|Duplicate/i)).toBeInTheDocument();
  });
});
