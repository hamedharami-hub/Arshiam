import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskNoteEditorDialog } from "./TaskNoteEditorDialog";
import { updateTaskNote } from "@/lib/taskNotesService";
import type { TaskNote } from "@/lib/taskTypes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/lib/taskNotesService", () => ({
  updateTaskNote: vi.fn().mockImplementation((userId, noteId, taskId, patch) =>
    Promise.resolve({
      id: noteId,
      user_id: userId,
      task_id: taskId,
      title: patch.title || "Updated Title",
      content: patch.content || "Updated Content",
      updated_at: new Date().toISOString(),
    })
  ),
  deleteTaskNote: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/components/NoteEditorTabs", () => ({
  NoteEditorTabs: ({ markdown, onChange }: { markdown: string; onChange: (markdown: string, html: string) => void }) => (
    <textarea aria-label="Note content editor" value={markdown} onChange={(event) => onChange(event.target.value, "")} />
  ),
}));

describe("TaskNoteEditorDialog", () => {
  const dummyNote: TaskNote = {
    id: "note-dialog-1",
    user_id: "user-123",
    task_id: "task-123",
    title: "Test Note Title",
    content: "Test Note Content",
  };

  it("renders note title and content in bounded editor", () => {
    render(
      <TaskNoteEditorDialog
        open={true}
        onOpenChange={() => {}}
        userId="user-123"
        taskId="task-123"
        note={dummyNote}
        canEdit={true}
        onSaved={() => {}}
        onDeleted={() => {}}
      />
    );

    expect(screen.getByText("Edit Task Note")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Note Title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Note Content")).toBeInTheDocument();
  });

  it("saves updated note content", async () => {
    const onSaved = vi.fn();
    render(
      <TaskNoteEditorDialog
        open={true}
        onOpenChange={() => {}}
        userId="user-123"
        taskId="task-123"
        note={dummyNote}
        canEdit={true}
        onSaved={onSaved}
        onDeleted={() => {}}
      />
    );

    const titleInput = screen.getByDisplayValue("Test Note Title");
    fireEvent.change(titleInput, { target: { value: "Brand New Title" } });

    const saveBtn = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });
  it("preserves unsaved text when the subscribed note is refreshed", () => {
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    const view = render(<TaskNoteEditorDialog {...props} />);
    fireEvent.change(screen.getByLabelText("Note content editor"), { target: { value: "Unsaved local content" } });
    view.rerender(<TaskNoteEditorDialog {...props} note={{ ...dummyNote, content: "Remote refresh" }} />);
    expect(screen.getByLabelText("Note content editor")).toHaveValue("Unsaved local content");
  });
  it("does not close or update a newly opened note after an old save resolves", async () => {
    let finish!: (note: TaskNote) => void;
    vi.mocked(updateTaskNote).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    const view = render(<TaskNoteEditorDialog {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    view.rerender(<TaskNoteEditorDialog {...props} note={{ ...dummyNote, id: "second", title: "Second Note" }} />);
    await act(async () => finish(dummyNote));
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Second Note")).toBeInTheDocument();
  });

});
