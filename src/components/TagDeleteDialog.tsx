import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function TagDeleteDialog({
  open, onOpenChange, tagId, tagName, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tagId: string;
  tagName: string;
  onDone?: () => void;
}) {
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsage(null);
    supabase
      .from("task_tags")
      .select("task_id", { count: "exact", head: true })
      .eq("tag_id", tagId)
      .then(({ count }) => setUsage(count ?? 0));
  }, [open, tagId]);

  const onDelete = async () => {
    // Remove links first, then the tag itself
    await supabase.from("task_tags").delete().eq("tag_id", tagId);
    await supabase.from("note_tags").delete().eq("tag_id", tagId);
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) { toast.error(error.message); return; }
    toast.success("تگ حذف شد");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف تگ «{tagName}»؟</AlertDialogTitle>
          <AlertDialogDescription>
            {usage === null ? "در حال بررسی..." : usage > 0 ? (
              <>
                این تگ روی <span className="font-bold text-destructive">{usage}</span> تسک استفاده شده است.
                تگ از همه آن‌ها حذف می‌شود ولی خود تسک‌ها باقی می‌مانند.
              </>
            ) : "این تگ روی هیچ تسکی استفاده نشده است."}
            <span className="block mt-2 text-xs">این عمل قابل بازگشت نیست.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
