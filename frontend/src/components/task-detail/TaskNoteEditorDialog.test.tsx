import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskNoteEditorDialog } from "./TaskNoteEditorDialog";
import { createTaskNote, deleteTaskNote, updateTaskNote } from "@/lib/taskNotesService";
import type { TaskNote } from "@/lib/taskTypes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/lib/taskNotesService", () => ({
  createTaskNote: vi.fn().mockImplementation((userId, taskId, patch) => Promise.resolve({ ...patch, user_id: userId, task_id: taskId })),
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
  beforeEach(() => { vi.clearAllMocks(); });
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
  it("requires explicit confirmation before discarding unsaved edits", () => {
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    render(<TaskNoteEditorDialog {...props} />);
    fireEvent.change(screen.getByLabelText("Note content editor"), { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Close$/ })[0]);
    expect(props.onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Note content editor")).toHaveValue("Keep this draft");
    fireEvent.click(screen.getAllByRole("button", { name: /^Close$/ })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Discard and close" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the original conflict precondition after a remote refresh while dirty", async () => {
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    const view = render(<TaskNoteEditorDialog {...props} />);
    fireEvent.change(screen.getByLabelText("Note content editor"), { target: { value: "Local draft" } });
    view.rerender(<TaskNoteEditorDialog {...props} note={{ ...dummyNote, content: "Remote edit" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    await waitFor(() => expect(updateTaskNote).toHaveBeenCalledWith("user-123", dummyNote.id, "task-123", expect.objectContaining({ content: "Local draft" }), { title: dummyNote.title, content: dummyNote.content }));
  });

  it("reuses the creation identity after an ambiguous failure", async () => {
    vi.mocked(createTaskNote).mockRejectedValueOnce(new Error("Storage failed"));
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: null, canEdit: true, onSaved: vi.fn(), onCreated: vi.fn(), onDeleted: vi.fn() };
    render(<TaskNoteEditorDialog {...props} />);
    fireEvent.change(screen.getByLabelText("Note content editor"), { target: { value: "New note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Note" })).not.toBeDisabled());
    expect(props.onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    await waitFor(() => expect(props.onCreated).toHaveBeenCalledTimes(1));
    const calls = vi.mocked(createTaskNote).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2].id).toEqual(expect.any(String));
    expect(calls[1][2].id).toBe(calls[0][2].id);
  });

  it("retains failed saves and still asks to discard after edit permission is revoked", async () => {
    vi.mocked(updateTaskNote).mockRejectedValueOnce(new Error("Save failed"));
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    const view = render(<TaskNoteEditorDialog {...props} />);
    fireEvent.change(screen.getByLabelText("Note content editor"), { target: { value: "Keep failed draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Note" })).not.toBeDisabled());
    view.rerender(<TaskNoteEditorDialog {...props} canEdit={false} />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Close$/ })[0]);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Unsaved changes");
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("does not report deletion success when the service returns false", async () => {
    vi.mocked(deleteTaskNote).mockResolvedValueOnce(false);
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    render(<TaskNoteEditorDialog {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Note" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Note" })).not.toBeDisabled());
    expect(deleteTaskNote).toHaveBeenCalledWith("user-123", dummyNote.id, "task-123", { title: dummyNote.title, content: dummyNote.content });
    expect(props.onDeleted).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it("ignores an old account's delayed delete after the editor account switches", async () => {
    let finish!: (deleted: boolean) => void;
    vi.mocked(deleteTaskNote).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    const view = render(<TaskNoteEditorDialog {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Note" }));
    view.rerender(<TaskNoteEditorDialog {...props} userId="second-user" note={{ ...dummyNote, user_id: "second-user", title: "Other account note" }} />);
    await act(async () => finish(true));
    expect(props.onDeleted).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Other account note")).toBeInTheDocument();
  });

  it("warns before browser exit with a dirty draft", () => {
    render(<TaskNoteEditorDialog open onOpenChange={vi.fn()} userId="user-123" taskId="task-123" note={dummyNote} canEdit onSaved={vi.fn()} onDeleted={vi.fn()} />);
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText("Note content editor"), { target: { value: "Unsaved" } });
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("does not unlock a pending save on a clean subscribed refresh", async () => {
    let finish!: (note: TaskNote) => void;
    vi.mocked(updateTaskNote).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const props = { open: true, onOpenChange: vi.fn(), userId: "user-123", taskId: "task-123", note: dummyNote, canEdit: true, onSaved: vi.fn(), onDeleted: vi.fn() };
    const view = render(<TaskNoteEditorDialog {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    view.rerender(<TaskNoteEditorDialog {...props} note={{ ...dummyNote }} />);
    expect(screen.getByRole("button", { name: "Save Note" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    expect(updateTaskNote).toHaveBeenCalledTimes(1);
    await act(async () => finish(dummyNote));
    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

});
