import { useState } from "react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ConfirmState } from "@/lib/taskTypes";

/**
 * The single owner of the task / note / subtask delete confirmation.
 * Stays open (with the same text) when the delete could not be saved, so the user can retry or cancel.
 */
export function TaskDeleteConfirmDialog({ confirm, setConfirm, T }: {
  confirm: ConfirmState; setConfirm: (c: ConfirmState) => void; T: (fa: string, en: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      const result = await confirm.onConfirm();
      if (result !== false) setConfirm(null);
    } catch {
      // keep the dialog open; the caller already reported the failure
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={!!confirm} onOpenChange={(v) => !v && !busy && setConfirm(null)}>
      <AlertDialogContent data-testid="task-delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirm?.kind === "task"
              ? confirm.childCount && confirm.childCount > 0
                ? T(`حذف این تسک و ${confirm.childCount} زیرتسک؟`, `Delete this task and ${confirm.childCount} subtasks?`)
                : T("حذف تسک؟", "Delete task?")
              : confirm?.kind === "note"
              ? T("حذف نوت؟", "Delete note?")
              : T("حذف زیرتسک؟", "Delete subtask?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.childCount && confirm.childCount > 0
              ? T(
                  `آیا مطمئنی می‌خوای «${confirm?.title || T("این تسک", "this task")}» و ${confirm.childCount} زیرتسک آن را حذف کنی؟`,
                  `Are you sure you want to delete "${confirm?.title || T("this task", "this task")}" and its ${confirm.childCount} subtasks?`
                )
              : T(
                  `آیا مطمئنی می‌خوای «${confirm?.title || T("این مورد", "this item")}» را حذف کنی؟`,
                  `Are you sure you want to delete "${confirm?.title || T("this item", "this item")}"?`
                )}
            <span className="block mt-2 text-xs">{T("این عمل قابل بازگشت نیست.", "This action cannot be undone.")}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} data-testid="task-delete-cancel">{T("انصراف", "Cancel")}</AlertDialogCancel>
          <Button onClick={() => void run()} disabled={busy} data-testid="task-delete-confirm-btn"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {T("حذف", "Delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
