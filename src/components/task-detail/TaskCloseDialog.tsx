import React from "react";
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
import { Save } from "lucide-react";
import { toast } from "sonner";
import { clearTaskDraft } from "@/lib/taskDraft";

export interface TaskCloseDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  savePendingChanges: () => Promise<void>;
  T: (fa: string, en: string) => string;
}

export function TaskCloseDialog({
  taskId,
  open,
  onOpenChange,
  onClose,
  savePendingChanges,
  T,
}: TaskCloseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{T("تغییرات ذخیره نشده‌اند", "Changes are not saved")}</AlertDialogTitle>
          <AlertDialogDescription>
            {T(
              "قبل از خروج، توضیحات و تغییرات این تسک ذخیره شوند؟",
              "Save this task's description and changes before leaving?",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>{T("ادامهٔ ویرایش", "Keep editing")}</AlertDialogCancel>
          <Button
            variant="ghost"
            onClick={() => {
              clearTaskDraft(taskId);
              onOpenChange(false);
              onClose();
            }}
          >
            {T("خروج بدون ذخیره", "Leave without saving")}
          </Button>
          <AlertDialogAction
            onClick={async (event) => {
              event.preventDefault();
              try {
                await savePendingChanges();
                onOpenChange(false);
                onClose();
              } catch {
                toast.error(
                  T(
                    "ذخیره انجام نشد؛ تغییرات همچنان باز هستند",
                    "Save failed; your changes are still open",
                  ),
                );
              }
            }}
          >
            <Save className="w-4 h-4" />
            {T("ذخیره و خروج", "Save and leave")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
