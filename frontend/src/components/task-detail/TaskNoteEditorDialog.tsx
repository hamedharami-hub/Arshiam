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
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const operation = useRef(0);
  const busy = useRef(false);
  const creationId = useRef<string>();
  const baseline = useRef({ title: note?.title, content: note?.content });
  const dirty = useRef(false);
  const wasOpen = useRef(false);
  const identity = useRef("");
  identity.current = `${userId}:${taskId}:${note?.id ?? "new"}:${open}`;
  useEffect(() => {
    if (open && !busy.current && (!wasOpen.current || !dirty.current)) {
      dirty.current = false;
      baseline.current = { title: note?.title, content: note?.content };
      setTitle(typeof note?.title === "string" ? note.title : "");
      setContent(typeof note?.content === "string" ? note.content : "");
      setConfirmDelete(false);
      setConfirmDiscard(false);
      if (!busy.current) setSaving(false);
    }
    if (wasOpen.current !== open) {
      operation.current++;
      busy.current = false;
      setSaving(false);
    }
    wasOpen.current = open;
  }, [open, note]);
  useEffect(() => () => { operation.current++; }, []);
  useEffect(() => {
    if (!open) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current && !busy.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [open]);

  if (!open) return null;

  const requestClose = (next: boolean) => {
    if (saving || uploading) return;
    if (!next && dirty.current) { setConfirmDiscard(true); return; }
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!canEdit || busy.current || saving || uploading) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      toast.error(T("عنوان یا متن نوت نباید خالی باشد", "Title or content cannot be empty"));
      return;
    }

    const sequence = ++operation.current;
    const target = identity.current;
    busy.current = true;
    setSaving(true);
    try {
      const patch = {
        title: trimmedTitle || trimmedContent.slice(0, 40) || T("یادداشت", "Note"),
        content: trimmedContent,
      };
      const updated = note
        ? await updateTaskNote(userId, note.id, taskId, patch, baseline.current)
        : await createTaskNote(userId, taskId, { ...patch, id: creationId.current ??= (
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
        ) });
      if (operation.current !== sequence || identity.current !== target) return;
      dirty.current = false;
      baseline.current = { title: updated.title, content: updated.content };
      creationId.current = undefined;
      if (note) onSaved(updated);
      else if (onCreated) onCreated(updated);
      else onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      if (operation.current === sequence && identity.current === target) toast.error(err instanceof Error ? err.message : T("خطا در ذخیره نوت", "Error saving note"));
    } finally {
      if (operation.current === sequence && identity.current === target) { busy.current = false; setSaving(false); }
    }
  };

  const handleDelete = async () => {
    if (!note || !canEdit || busy.current || saving || uploading) return;
    const sequence = ++operation.current;
    const target = identity.current;
    busy.current = true;
    setSaving(true);
    try {
      const deleted = await deleteTaskNote(userId, note.id, taskId, baseline.current);
      if (operation.current !== sequence || identity.current !== target) return;
      if (!deleted) throw new Error(T("خطا در حذف نوت", "Error deleting note"));
      dirty.current = false;
      creationId.current = undefined;
      toast.success(T("نوت حذف شد", "Note deleted"));
      onDeleted(note.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      if (operation.current === sequence && identity.current === target) toast.error(err instanceof Error ? err.message : T("خطا در حذف نوت", "Error deleting note"));
    } finally {
      if (operation.current === sequence && identity.current === target) { busy.current = false; setSaving(false); }
    }
  };

  const editorBody = (
    <div className="space-y-3 py-1 flex flex-col min-h-0 flex-1">
      <div>
        <label htmlFor="task-note-title" className="text-xs font-semibold text-muted-foreground block mb-1">
          {T("عنوان نوت", "Note Title")}
        </label>
        <Input
          id="task-note-title"
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
        <NoteEditorTabs noteId={`task-note-${note?.id ?? `new-${taskId}`}`} markdown={typeof content === "string" ? content : ""} onChange={(md) => { dirty.current = true; setContent((prev) => (prev === md ? prev : md)); }} readOnly={!canEdit || saving} onBusyChange={setUploading} />
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
            onClick={() => requestClose(false)}
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
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("تغییرات ذخیره نشده‌اند", "Unsaved changes")}</AlertDialogTitle>
            <AlertDialogDescription>{T("با بستن، ویرایش‌های ذخیره‌نشده کنار گذاشته می‌شوند. برای ذخیره به ویرایش برگرد.", "Closing will discard your unsaved edits. Return to the editor to save your note.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("ادامهٔ ویرایش", "Keep editing")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { dirty.current = false; creationId.current = undefined; onOpenChange(false); }}>{T("کنارگذاشتن و بستن", "Discard and close")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {prefersDialog ? (
        <Dialog open={open} onOpenChange={requestClose}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-5 overflow-hidden rounded-2xl"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
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
        <Sheet open={open} onOpenChange={requestClose}>
          <SheetContent
            side="bottom"
            dir={isEn ? "ltr" : "rtl"}
            className="rounded-t-2xl max-h-[85vh] flex flex-col p-4 pb-6 overflow-hidden"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
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
