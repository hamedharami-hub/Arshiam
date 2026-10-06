import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Save, Trash2, Loader2, FileText } from "lucide-react";
import type { TaskNote } from "@/lib/taskTypes";
import { createTaskNote, updateTaskNote, deleteTaskNote } from "@/lib/taskNotesService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  taskId: string;
  note: TaskNote | null;
  canEdit: boolean;
  onSaved: (updatedNote: TaskNote) => void;
  onCreated?: (createdNote: TaskNote) => void;
  onDeleted: (noteId: string) => void;
}

export function TaskNoteEditorDialog(props: Props) {
  return <TaskNoteEditorContent key={`${props.userId}:${props.taskId}:${props.note?.id ?? "new"}`} {...props} />;
}

function TaskNoteEditorContent({
  open,
  onOpenChange,
  userId,
  taskId,
  note,
  canEdit,
  onSaved,
  onCreated,
  onDeleted,
}: Props) {
  const { prefersDialog } = useDeviceFormFactor();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [title, setTitle] = useState(() => note?.title || "");
  const [content, setContent] = useState(() => note?.content || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const operation = useRef(0);
  const dirty = useRef(false);
  const wasOpen = useRef(false);
  const identity = useRef("");
  identity.current = `${userId}:${taskId}:${note?.id ?? "new"}:${open}`;
  useEffect(() => {
    if (open && (!wasOpen.current || !dirty.current)) {
      dirty.current = false;
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setConfirmDelete(false);
      setSaving(false);
    }
    if (wasOpen.current !== open) operation.current++;
    wasOpen.current = open;
  }, [open, note]);
  useEffect(() => () => { operation.current++; }, []);

  if (!open) return null;

  const handleSave = async () => {
    if (!canEdit || saving || uploading) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      toast.error(T("عنوان یا متن نوت نباید خالی باشد", "Title or content cannot be empty"));
      return;
    }

    const sequence = ++operation.current;
    const target = identity.current;
    setSaving(true);
    try {
      const patch = {
        title: trimmedTitle || trimmedContent.slice(0, 40) || T("یادداشت", "Note"),
        content: trimmedContent,
      };
      const updated = note
        ? await updateTaskNote(userId, note.id, taskId, patch, { title: note.title, content: note.content })
        : await createTaskNote(userId, taskId, patch);
      if (operation.current !== sequence || identity.current !== target) return;
      if (note) onSaved(updated);
      else if (onCreated) onCreated(updated);
      else onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      if (operation.current === sequence && identity.current === target) toast.error(err instanceof Error ? err.message : T("خطا در ذخیره نوت", "Error saving note"));
    } finally {
      if (operation.current === sequence && identity.current === target) setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !canEdit || saving || uploading) return;
    const sequence = ++operation.current;
    const target = identity.current;
    setSaving(true);
    try {
      await deleteTaskNote(userId, note.id, taskId);
      if (operation.current !== sequence || identity.current !== target) return;
      toast.success(T("نوت حذف شد", "Note deleted"));
      onDeleted(note.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      if (operation.current === sequence && identity.current === target) toast.error(err instanceof Error ? err.message : T("خطا در حذف نوت", "Error deleting note"));
    } finally {
      if (operation.current === sequence && identity.current === target) setSaving(false);
    }
  };

  const editorBody = (
    <div className="space-y-3 py-1 flex flex-col min-h-0 flex-1">
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">
          {T("عنوان نوت", "Note Title")}
        </label>
        <Input
          value={title}
          onChange={(e) => { dirty.current = true; setTitle(e.target.value); }}
          disabled={!canEdit || saving}
          placeholder={T("عنوان نوت...", "Note title...")}
          className="h-9 text-sm font-medium"
          dir="auto"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-muted-foreground block">
            {T("متن یادداشت", "Note Content")}
          </label>
        </div>
        <NoteEditorTabs noteId={`task-note-${note?.id ?? `new-${taskId}`}`} markdown={content} onChange={(md) => { dirty.current = true; setContent(md); }} readOnly={!canEdit || saving} onBusyChange={setUploading} />
      </div>

      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 shrink-0">
        {note && canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving || uploading}
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:bg-destructive/10 gap-1.5 h-8 px-2.5 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{T("حذف نوت", "Delete")}</span>
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving || uploading}
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            {T("بستن", "Close")}
          </Button>

          {canEdit && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || uploading}
              className="gap-1.5 h-8 text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{T("ذخیره نوت", "Save Note")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {prefersDialog ? (
        <Dialog open={open} onOpenChange={next => { if (!saving && !uploading) onOpenChange(next); }}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-5 overflow-hidden rounded-2xl"
          >
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <DialogTitle className="text-start text-sm sm:text-base font-bold">
                  {note ? T("ویرایش یادداشت تسک", "Edit Task Note") : T("یادداشت تازه برای تسک", "New Task Note")}
                </DialogTitle>
              </div>
              <DialogDescription className="sr-only">Task note editor dialog</DialogDescription>
            </DialogHeader>

            {editorBody}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={next => { if (!saving && !uploading) onOpenChange(next); }}>
          <SheetContent
            side="bottom"
            dir={isEn ? "ltr" : "rtl"}
            className="rounded-t-2xl max-h-[85vh] flex flex-col p-4 pb-6 overflow-hidden"
          >
            <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <SheetTitle className="text-start text-sm sm:text-base font-bold">
                  {note ? T("ویرایش یادداشت تسک", "Edit Task Note") : T("یادداشت تازه برای تسک", "New Task Note")}
                </SheetTitle>
              </div>
            </SheetHeader>

            {editorBody}
          </SheetContent>
        </Sheet>
      )}

      {/* Confirmation for deleting note */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start font-bold">
              {T("حذف این نوت؟", "Delete this note?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start text-xs leading-relaxed">
              {T(
                `آیا از حذف نوت «${note?.title || "بدون عنوان"}» اطمینان دارید؟ تسک و سایر نوت‌ها بدون تغییر باقی خواهند ماند.`,
                `Are you sure you want to delete note "${note?.title || "Untitled"}"? The task and other notes will remain intact.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {T("حذف نوت", "Delete Note")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
