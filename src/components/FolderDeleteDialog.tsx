import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const [mode, setMode] = useState<Mode>("move");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      if (mode === "move") {
        // Move tasks & notes & subfolders to root, then delete the folder
        await supabase.from("tasks").update({ folder_id: null }).eq("folder_id", folderId);
        await supabase.from("notes").update({ folder_id: null }).eq("folder_id", folderId);
        await supabase.from("folders").update({ parent_id: null }).eq("parent_id", folderId);
        // folder_columns belong to this folder; delete them along with the folder
        await supabase.from("folder_columns").delete().eq("folder_id", folderId);
      } else {
        // Delete tasks (cascade subtasks via parent_id), notes, columns, and subfolders recursively
        await deleteCascade(folderId);
      }
      const { error } = await supabase.from("folders").delete().eq("id", folderId);
      if (error) throw error;
      toast.success(mode === "move" ? "فولدر حذف شد، محتوا منتقل شد" : "فولدر و محتوا حذف شد");
      onDone?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "خطا در حذف");
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

async function deleteCascade(folderId: string) {
  // Recurse into subfolders
  const { data: subs } = await supabase.from("folders").select("id").eq("parent_id", folderId);
  for (const s of subs || []) {
    await deleteCascade((s as any).id);
    await supabase.from("folders").delete().eq("id", (s as any).id);
  }
  // Get task ids in this folder
  const { data: tasks } = await supabase.from("tasks").select("id").eq("folder_id", folderId);
  const taskIds = (tasks || []).map((t: any) => t.id);
  if (taskIds.length) {
    // Delete subtasks (children referencing parent_id)
    await supabase.from("tasks").delete().in("parent_id", taskIds);
    await supabase.from("tasks").delete().in("id", taskIds);
  }
  // Notes belonging to folder
  await supabase.from("notes").delete().eq("folder_id", folderId);
  // Kanban columns belonging to folder
  await supabase.from("folder_columns").delete().eq("folder_id", folderId);
}
