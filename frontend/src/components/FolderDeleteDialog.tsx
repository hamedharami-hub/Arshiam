import { useState } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { deleteFolder } from "@/lib/firestoreDataService";
import { cacheGet, cacheSet } from "@/lib/offlineDb";
import { deleteNoteTaskLinksForEndpoints } from "@/lib/noteTaskLinkService";
import { assertFolderContainerEmpty, assertFolderDeletePlanEmpty, assertNoPendingFolderWrites, collectFolderDeletePlan, deleteFolderContents, emptyFolderDeleteLockState, FolderDeleteError, markFolderDeleteLocks, releaseFolderDeleteLocks, sameFolderDeletePlan, type FolderDeleteLockState, type FolderDeleteResult } from "@/lib/folderDeletionService";

type Mode = "move" | "delete-all";

export function FolderDeleteDialog({
  open, onOpenChange, folderId, folderName, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderId: string;
  folderName: string;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("move");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    let deletionLocks: FolderDeleteLockState | null = null;
    try {
      const ownerId = user?.id;
      if (!ownerId) throw new Error("برای حذف فولدر باید وارد حساب خودت باشی.");
      let deletedFolderIds = [folderId];
      if (mode === "move") {
        const plan = await collectFolderDeletePlan(ownerId, folderId);
        await assertNoPendingFolderWrites(ownerId, plan);
        deletionLocks = emptyFolderDeleteLockState();
        await markFolderDeleteLocks(ownerId, { folderIds: [folderId], taskIds: [], noteIds: [], columnIds: [] }, deletionLocks);

        // Closing the source folder first prevents new content from appearing.
        // The guarded update paths allow only a location-only move out of a
        // closing folder, so existing contents can be preserved at the root.
        const { error: tErr } = await firebaseStore.from("tasks", ownerId).update({ folder_id: null }).eq("folder_id", folderId);
        if (tErr) throw new Error("خطا در انتقال تسک‌ها: " + tErr.message);

        const { error: nErr } = await firebaseStore.from("notes", ownerId).update({ folder_id: null }).eq("folder_id", folderId);
        if (nErr) throw new Error("خطا در انتقال نوت‌ها: " + nErr.message);

        const { error: fErr } = await firebaseStore.from("folders", ownerId).update({ parent_id: null }).eq("parent_id", folderId);
        if (fErr) throw new Error("خطا در انتقال زیرپوشه‌ها: " + fErr.message);

        // folder_columns belong to this folder; delete them along with the folder
        const { error: columnsError } = await firebaseStore.from("folder_columns", ownerId).delete().eq("folder_id", folderId);
        if (columnsError) throw new Error("خطا در حذف ستون‌های فولدر: " + columnsError.message);

        await assertFolderContainerEmpty(ownerId, folderId);
        await assertNoPendingFolderWrites(ownerId, plan);
      } else {
        let plan = await collectFolderDeletePlan(ownerId, folderId);
        await assertNoPendingFolderWrites(ownerId, plan);
        deletionLocks = emptyFolderDeleteLockState();
        await markFolderDeleteLocks(ownerId, plan, deletionLocks);
        let stable = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          const latest = await collectFolderDeletePlan(ownerId, folderId);
          await markFolderDeleteLocks(ownerId, latest, deletionLocks);
          stable = sameFolderDeletePlan(plan, latest);
          // The deletion set is always the latest server-confirmed membership.
          // Previously seen ids stay locked until stale members are released,
          // but an item moved out of the tree is never added to the delete set.
          plan = latest;
          if (stable) break;
        }
        if (!stable) throw new Error("هم‌زمان دادهٔ تازه‌ای به فولدر اضافه شد؛ حذف متوقف شد. دوباره تلاش کن.");

        const finalFolders = new Set(plan.folderIds);
        const finalTasks = new Set(plan.taskIds);
        const finalNotes = new Set(plan.noteIds);
        const staleLocks: FolderDeleteLockState = {
          operationId: deletionLocks.operationId,
          folderIds: deletionLocks.folderIds.filter((id) => !finalFolders.has(id)),
          taskIds: deletionLocks.taskIds.filter((id) => !finalTasks.has(id)),
          noteIds: deletionLocks.noteIds.filter((id) => !finalNotes.has(id)),
        };
        if (staleLocks.folderIds.length || staleLocks.taskIds.length || staleLocks.noteIds.length) {
          if (!await releaseFolderDeleteLocks(ownerId, staleLocks)) throw new Error("قفل مواردی که از فولدر خارج شده‌اند برداشته نشد؛ حذف متوقف شد.");
          deletionLocks.folderIds = deletionLocks.folderIds.filter((id) => finalFolders.has(id));
          deletionLocks.taskIds = deletionLocks.taskIds.filter((id) => finalTasks.has(id));
          deletionLocks.noteIds = deletionLocks.noteIds.filter((id) => finalNotes.has(id));
        }
        deletedFolderIds = plan.folderIds;
        let deletedContent: Pick<FolderDeleteResult, "deletedTaskIds" | "deletedNoteIds"> = { deletedTaskIds: [], deletedNoteIds: [] };
        let deleteError: unknown;
        try {
          const result = await deleteFolderContents(ownerId, plan);
          deletedContent = result;
        } catch (error) {
          deleteError = error;
          if (error instanceof FolderDeleteError) deletedContent = error.result;
        }
        const swept = await deleteNoteTaskLinksForEndpoints(ownerId, {
          task_id: deletedContent.deletedTaskIds,
          note_id: deletedContent.deletedNoteIds,
        }, { durableSweep: true }).catch(() => false);
        if (!swept) throw new Error("بخشی از محتوا حذف شد، اما پاک‌سازی پیوندها در صف ذخیره نشد. فولدر باقی ماند؛ دوباره تلاش کن.");
        if (deleteError) throw deleteError;
        await assertFolderDeletePlanEmpty(ownerId, folderId);
        await assertNoPendingFolderWrites(ownerId, plan);
      }

      const deleted = await deleteFolder(ownerId, folderId);
      if (!deleted) throw new Error("حذف فولدر از فضای ابری تأیید نشد.");
      deletionLocks = null;
      window.dispatchEvent(new Event("firebase-store-changed"));

      const deletedIds = new Set(deletedFolderIds);
      const cached = (await cacheGet<any[]>(`folders:all:${ownerId}`)) || [];
      const next = cached.filter((f) => !deletedIds.has(f.id));
      await cacheSet(`folders:all:${ownerId}`, next);
      window.dispatchEvent(new Event("arshnaz:tasks-updated"));

      toast.success(mode === "move" ? "فولدر حذف شد، محتوا منتقل شد" : "فولدر و محتوا حذف شد");
      onDone?.();
      onOpenChange(false);
    } catch (e: any) {
      let message = e.message || "خطا در حذف";
      if (deletionLocks && user?.id) {
        const unlocked = await releaseFolderDeleteLocks(user.id, deletionLocks);
        if (!unlocked) message += " قفل موقت بعضی موارد برداشته نشد؛ دوباره حذف را اجرا کن یا اتصال را بررسی کن.";
      }
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف فولدر «{folderName}»</AlertDialogTitle>
          <AlertDialogDescription>
            با محتوای این فولدر چه کنیم؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-2 my-2">
          <div className="flex items-start gap-2 rounded-md border p-3">
            <RadioGroupItem value="move" id="m-move" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="m-move" className="font-medium text-sm cursor-pointer">انتقال محتوا به ریشه</Label>
              <p className="text-xs text-muted-foreground mt-0.5">تسک‌ها، نوت‌ها و زیرفولدرها به «بدون فولدر» منتقل می‌شن.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 p-3">
            <RadioGroupItem value="delete-all" id="m-del" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="m-del" className="font-medium text-sm cursor-pointer text-destructive">حذف کامل با همه محتوا</Label>
              <p className="text-xs text-muted-foreground mt-0.5">همه تسک‌ها، نوت‌ها، زیرفولدرها و ستون‌های Kanban درون این فولدر برای همیشه حذف می‌شن.</p>
            </div>
          </div>
        </RadioGroup>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); run(); }}
            disabled={busy}
            className={mode === "delete-all" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {busy ? "در حال انجام..." : (mode === "delete-all" ? "حذف کامل" : "حذف فولدر")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
