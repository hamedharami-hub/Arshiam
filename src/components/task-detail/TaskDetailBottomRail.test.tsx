import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskDetailBottomRail, type TaskDetailBottomRailProps } from "./TaskDetailBottomRail";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="mock-popover">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="mock-popover-trigger">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="mock-popover-content">{children}</div>,
}));

describe("TaskDetailBottomRail Add Menu", () => {
  const dummyTask: Task = {
    id: "task-rail-1",
    title: "Task with Bottom Rail",
    user_id: "user-123",
    created_at: new Date().toISOString(),
    completed: false,
    status: "todo",
  };

  const defaultProps: TaskDetailBottomRailProps = {
    t: dummyTask,
    canEdit: true,
    canComment: true,
    isOwner: true,
    allowDelete: true,
    showAttachments: false,
    attachmentCount: 0,
    pickFileType: vi.fn(),
    linkUrl: "",
    setLinkUrl: vi.fn(),
    attachLink: vi.fn(),
    parentOpen: false,
    setParentOpen: vi.fn(),
    parentCandidates: [],
    showSubtasks: false,
    setShowSubtasks: vi.fn(),
    showSteps: false,
    setShowSteps: vi.fn(),
    showOutcomes: false,
    setShowOutcomes: vi.fn(),
    outcomeCount: 0,
    setAiOpen: vi.fn(),
    setFocusOpen: vi.fn(),
    setActionMenuOpen: vi.fn(),
    deleteTask: vi.fn(),
    save: vi.fn(),
    T: (fa: string, en: string) => `${fa} / ${en}`,
    onAddComment: vi.fn(),
    onAddNote: vi.fn(),
    onAddLocation: vi.fn(),
    onPickContact: vi.fn(),
    onNewContact: vi.fn(),
    onImportDeviceContact: vi.fn(),
  };

  it("renders Add button next to Attach button", () => {
    render(<TaskDetailBottomRail {...defaultProps} />);

    // Attach button exists
    const attachBtn = screen.getByTestId("task-bottom-rail-attach-btn");
    expect(attachBtn).toBeInTheDocument();

    // Add button exists
    const addBtn = screen.getByTestId("task-bottom-rail-add-btn");
    expect(addBtn).toBeInTheDocument();
  });

  it("opens popover with 6 options when Add is clicked", () => {
    render(<TaskDetailBottomRail {...defaultProps} />);

    const addBtn = screen.getByTestId("task-bottom-rail-add-btn");
    fireEvent.click(addBtn);

    // Options exist
    expect(screen.getByText(/افزودن کامنت \/ توضیح/i)).toBeInTheDocument();
    expect(screen.getByText(/افزودن نوت/i)).toBeInTheDocument();
    expect(screen.getByText(/افزودن موقعیت مکانی/i)).toBeInTheDocument();
    expect(screen.getByText(/انتخاب شخص موجود/i)).toBeInTheDocument();
    expect(screen.getByText(/ساخت شخص جدید/i)).toBeInTheDocument();
    expect(screen.getByText(/ورود از مخاطبین گوشی/i)).toBeInTheDocument();
  });

  it("triggers callbacks when options are clicked", () => {
    render(<TaskDetailBottomRail {...defaultProps} />);

    const addBtn = screen.getByTestId("task-bottom-rail-add-btn");
    fireEvent.click(addBtn);

    fireEvent.click(screen.getByText(/افزودن کامنت \/ توضیح/i));
    expect(defaultProps.onAddComment).toHaveBeenCalled();

    fireEvent.click(addBtn);
    fireEvent.click(screen.getByText(/افزودن نوت/i));
    expect(defaultProps.onAddNote).toHaveBeenCalled();

    fireEvent.click(addBtn);
    fireEvent.click(screen.getByText(/افزودن موقعیت مکانی/i));
    expect(defaultProps.onAddLocation).toHaveBeenCalled();

    fireEvent.click(addBtn);
    fireEvent.click(screen.getByText(/انتخاب شخص موجود/i));
    expect(defaultProps.onPickContact).toHaveBeenCalled();

    fireEvent.click(addBtn);
    fireEvent.click(screen.getByText(/ساخت شخص جدید/i));
    expect(defaultProps.onNewContact).toHaveBeenCalled();
  });
});
