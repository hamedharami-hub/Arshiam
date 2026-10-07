import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Task, TaskNote } from "@/lib/taskTypes";

// Mock dependencies
const testUser = { id: "user-test-456" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: testUser }),
}));
vi.mock("@/hooks/useShareAccess", () => ({
  useShareAccess: () => ({ canEdit: true, canComment: true, isOwner: true }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/firestoreDataService", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/firestoreDataService")>(),
  subscribeFolders: () => () => {}, subscribeTags: () => () => {},
}));
const mockTaskNotes: TaskNote[] = [];

vi.mock("@/lib/taskNotesService", () => ({
  getTaskNotes: vi.fn().mockImplementation((taskId, userId) => Promise.resolve(mockTaskNotes.filter(note => note.task_id === taskId && note.user_id === userId))),
  createTaskNote: vi.fn().mockImplementation((userId, taskId, data) => {
    const created: TaskNote = {
      id: `note-${Date.now()}`,
      user_id: userId,
      task_id: taskId,
      title: data.title || "Note",
      content: data.content || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockTaskNotes.push(created);
    return Promise.resolve(created);
  }),
  updateTaskNote: vi.fn().mockImplementation((userId, noteId, taskId, patch) => {
    const existing = mockTaskNotes.find((n) => n.id === noteId);
    const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
    return Promise.resolve(updated);
  }),
  deleteTaskNote: vi.fn().mockImplementation((userId, noteId, taskId) => {
    const idx = mockTaskNotes.findIndex((n) => n.id === noteId);
    if (idx !== -1) mockTaskNotes.splice(idx, 1);
    return Promise.resolve(true);
  }),
}));

vi.mock("@/lib/firebaseStore", () => {
  const makeQuery = (): any => ({
    eq: () => makeQuery(),
    neq: () => makeQuery(),
    in: () => makeQuery(),
    order: () => makeQuery(),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    catch: (reject: any) => Promise.resolve({ data: [], error: null }).catch(reject),
  });
  return {
    firebaseStore: {
      from: () => ({
        select: () => makeQuery(),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => makeQuery(),
        delete: () => makeQuery(),
      }),
    },
  };
});

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="mock-popover">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="mock-popover-trigger">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="mock-popover-content">{children}</div>,
}));

vi.mock("@/components/TaskSubtasksInline", () => ({ TaskSubtasksInline: () => null }));
vi.mock("@/components/TaskDescriptionEditor", () => ({ TaskDescriptionEditor: () => null }));
vi.mock("@/components/TaskActionSheet", () => ({ default: () => null }));
vi.mock("@/components/PomodoroSheet", () => ({ default: () => null }));
vi.mock("@/components/TaskOutcomeSheet", () => ({ TaskOutcomeSheet: () => null }));
vi.mock("@/components/TaskAIPanel", () => ({ TaskAIPanel: () => null }));
vi.mock("@/components/TaskAttachments", () => ({ TaskAttachments: () => null }));
vi.mock("@/components/task-detail/TaskRelatedContacts", () => ({ TaskRelatedContacts: () => null }));
vi.mock("@/components/task-detail/TaskNoteEditorDialog", () => ({
  TaskNoteEditorDialog: ({ open, note, userId, taskId, onOpenChange, onCreated }: any) =>
    open ? (
      <div data-testid="mock-note-editor">
        <div>Edit Task Note</div>
        <input placeholder="Note title..." defaultValue={note?.title || ""} />
        <textarea placeholder="Write note content..." defaultValue={note?.content || ""} />
        <button onClick={() => onOpenChange(false)}>Cancel</button>
        <button onClick={() => {
          void import("@/lib/taskNotesService").then(({ createTaskNote }) =>
            createTaskNote(userId, taskId, {
              title: "Architecture Decision",
              content: "We decided to keep notes within the same TaskDetail panel.",
            }).then(onCreated),
          );
        }}>Save Note</button>
      </div>
    ) : null,
}));

import { TaskDetail } from "@/components/TaskDetail";
import { createTaskNote, getTaskNotes } from "@/lib/taskNotesService";

describe("TaskDetail Notes integration", { timeout: 15000 }, () => {
  const dummyTask: Task = {
    id: "task-test-notes",
    user_id: "user-test-456",
    title: "Project launch meeting",
    description: "",
    completed: false,
    status: "todo",
    priority: "none",
    folder_id: null,
    parent_id: null,
    due_date: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskNotes.length = 0;
  });

  it("1. shows Add form when New note button is clicked, and cancel does not create records", async () => {
    render(
      <TaskDetail
        task={dummyTask}
        mode="modal"
        onClose={() => {}}
        onChanged={() => {}}
        setConfirm={() => {}}
      />
    );

    // Initial load: no notes yet, but can trigger via bottom rail or more menu
    // Open add menu via the "Add" button on the rail
    const addRailBtn = screen.getByTestId("task-bottom-rail-add-btn");
    expect(addRailBtn).toBeInTheDocument();
    fireEvent.click(addRailBtn);

    const addNoteOption = screen.getByText("Add Note");
    expect(addNoteOption).toBeInTheDocument();
    fireEvent.click(addNoteOption);

    // The existing task-note dialog should now be visible
    const titleInput = screen.getByPlaceholderText(/Note title\.\.\./i);
    const contentTextarea = screen.getByPlaceholderText(/Write note content\.\.\./i);
    expect(titleInput).toBeInTheDocument();
    expect(contentTextarea).toBeInTheDocument();

    // Type some draft text
    fireEvent.change(titleInput, { target: { value: "Draft Title" } });
    fireEvent.change(contentTextarea, { target: { value: "Draft Content" } });

    // Click Cancel
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Form inputs should be dismissed
    expect(screen.queryByPlaceholderText(/Write note content\.\.\./i)).not.toBeInTheDocument();

    // Zero records created in service
    expect(createTaskNote).not.toHaveBeenCalled();
    expect(mockTaskNotes.length).toBe(0);
  });

  it("2. saves a note from the task editor and renders the returned note", async () => {
    render(
      <TaskDetail
        task={dummyTask}
        mode="modal"
        onClose={() => {}}
        onChanged={() => {}}
        setConfirm={() => {}}
      />
    );

    // Click Add Rail Button then Add Note
    const addRailBtn = screen.getByTestId("task-bottom-rail-add-btn");
    fireEvent.click(addRailBtn);

    const addNoteOption = screen.getByText("Add Note");
    fireEvent.click(addNoteOption);

    const titleInput = screen.getByPlaceholderText(/Note title\.\.\./i);
    const contentTextarea = screen.getByPlaceholderText(/Write note content\.\.\./i);

    fireEvent.change(titleInput, { target: { value: "Architecture Decision" } });
    fireEvent.change(contentTextarea, { target: { value: "We decided to keep notes within the same TaskDetail panel." } });

    const saveNoteBtn = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveNoteBtn);

    await waitFor(() => {
      expect(createTaskNote).toHaveBeenCalledWith(
        "user-test-456",
        "task-test-notes",
        expect.objectContaining({
          title: "Architecture Decision",
          content: "We decided to keep notes within the same TaskDetail panel.",
        })
      );
    });

    await waitFor(() => {
      // Form closed
      expect(screen.queryByPlaceholderText(/Write note content\.\.\./i)).not.toBeInTheDocument();
      // Note card is rendered with title and preview
      expect(screen.getByText("Architecture Decision")).toBeInTheDocument();
      expect(screen.getByText("We decided to keep notes within the same TaskDetail panel.")).toBeInTheDocument();
    });

    // Route was NEVER changed
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("3. clicking note card opens TaskNoteEditorDialog without closing TaskDetail or changing route", async () => {
    // Populate an existing note
    mockTaskNotes.push({
      id: "note-existing-1",
      user_id: "user-test-456",
      task_id: "task-test-notes",
      title: "Existing Task Note",
      content: "Important considerations for deployment",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(
      <TaskDetail
        task={dummyTask}
        mode="modal"
        onClose={() => {}}
        onChanged={() => {}}
        setConfirm={() => {}}
      />
    );

    // Note card appears on load
    await waitFor(() => {
      expect(screen.getByText("Existing Task Note")).toBeInTheDocument();
    });

    // Click note card
    const cardTitle = screen.getByText("Existing Task Note");
    fireEvent.click(cardTitle);

    // TaskNoteEditorDialog should appear with title "Edit Task Note"
    await waitFor(() => {
      expect(screen.getByText("Edit Task Note")).toBeInTheDocument();
    });

    // Editor fields populated
    const editorTitleInput = screen.getByDisplayValue("Existing Task Note");
    const editorContentInput = screen.getByDisplayValue("Important considerations for deployment");
    expect(editorTitleInput).toBeInTheDocument();
    expect(editorContentInput).toBeInTheDocument();

    // Ensure navigate was NOT called
    expect(mockNavigate).not.toHaveBeenCalled();

    // Close the dialog
    const closeBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Edit Task Note")).not.toBeInTheDocument();
    });

    // The main task detail remains open and visible!
    expect(screen.getByText("Project launch meeting")).toBeInTheDocument();
  });
  it("clears the old note and open editor when switching tasks", async () => {
    mockTaskNotes.push({ id: "old", user_id: testUser.id, task_id: dummyTask.id, title: "Private old task note", content: "Private" });
    const props = { mode: "modal" as const, onClose: vi.fn(), onChanged: vi.fn(), setConfirm: vi.fn() };
    const view = render(<TaskDetail task={dummyTask} {...props} />);
    fireEvent.click(await screen.findByText("Private old task note"));
    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();
    view.rerender(<TaskDetail task={{ ...dummyTask, id: "second-task", title: "Second task" }} {...props} />);
    await waitFor(() => expect(getTaskNotes).toHaveBeenCalledWith("second-task", testUser.id));
    expect(screen.queryByText("Private old task note")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-note-editor")).not.toBeInTheDocument();
  });
  it("discards a note-list response after its task was closed", async () => {
    let finish!: (notes: TaskNote[]) => void;
    vi.mocked(getTaskNotes).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const props = { mode: "modal" as const, onClose: vi.fn(), onChanged: vi.fn(), setConfirm: vi.fn() };
    const view = render(<TaskDetail task={dummyTask} {...props} />);
    view.rerender(<TaskDetail task={{ ...dummyTask, id: "second-task", title: "Second task" }} {...props} />);
    await act(async () => finish([{ id: "late", user_id: testUser.id, task_id: dummyTask.id, title: "Late old task note", content: "Private" }]));
    expect(screen.queryByText("Late old task note")).not.toBeInTheDocument();
  });

});
