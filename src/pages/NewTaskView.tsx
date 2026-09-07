import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { TaskDetail } from "@/components/TaskDetail";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Full-screen "new task" page. Creates an empty draft on mount.
 * On back-press: if anything was entered, ask save / discard / continue.
 */
export default function NewTaskView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [backAsk, setBackAsk] = useState(false);
  const createdRef = useRef(false);
  const savedRef = useRef(false);
  const draftRef = useRef<Task | null>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  useEffect(() => {
    if (!user || createdRef.current) return;
    createdRef.current = true;
    const parentId = params.get("parent_id");
    const tagId = params.get("tag_id");
    const folderId = params.get("folder_id");
    const dueDate = params.get("due_date");
    const initialTitle = params.get("title") || "";
    const initialDescription = params.get("description") || "";
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: initialTitle,
          description: initialDescription || null,
          folder_id: parentId ? null : folderId,
          parent_id: parentId,
          due_date: dueDate,
          priority: "none" as const,
        })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      if (data && tagId) {
        await supabase.from("task_tags").insert({ task_id: data.id, tag_id: tagId, user_id: user.id });
      }
      setDraft(data as any);
    })();
  }, [user]);

  // Cleanup: if unmounted with empty title and not saved, delete the draft.
  useEffect(() => {
    return () => {
      if (savedRef.current) return;
      const d = draftRef.current;
      if (!d) return;
      if (!d.title?.trim()) {
        supabase.from("tasks").delete().eq("id", d.id).then(() => {});
      }
    };
  }, []);

  const hasContent = () => {
    const d = draftRef.current;
    if (!d) return false;
    return !!(d.title?.trim() || d.description?.trim());
  };

  const handleBack = () => {
    if (hasContent()) setBackAsk(true);
    else navigate(-1);
  };

  const finish = async () => {
    const d = draftRef.current;
    if (!d) return;
    if (!d.title?.trim()) {
      toast.error("عنوان تسک را وارد کن");
      return;
    }
    setBusy(true);
    savedRef.current = true;
    setBusy(false);
    toast.success("تسک ذخیره شد");
    navigate(-1);
  };

  const discardAndBack = async () => {
    const d = draftRef.current;
    if (d) {
      savedRef.current = true; // prevent cleanup double-delete
      await supabase.from("tasks").delete().eq("id", d.id);
    }
    setBackAsk(false);
    navigate(-1);
  };

  const saveAndBack = async () => {
    const d = draftRef.current;
    if (!d?.title?.trim()) {
      toast.error("برای ذخیره، عنوان لازم است");
      return;
    }
    savedRef.current = true;
    setBackAsk(false);
    toast.success("تسک ذخیره شد");
    navigate(-1);
  };

  if (!draft) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full pb-40">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b flex items-center justify-between gap-2 p-3">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
          <ArrowRight className="w-4 h-4" /> برگشت
        </Button>
        <h1 className="text-base font-bold flex-1 text-center">تسک جدید</h1>
        <Button onClick={finish} disabled={busy} size="sm" className="gap-1">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          ذخیره
        </Button>
      </div>

      <TaskDetail
        task={draft}
        mode="page"
        onClose={handleBack}
        onChanged={() => {
          supabase.from("tasks").select("*").eq("id", draft.id).single()
            .then(({ data }) => { if (data) setDraft(data as any); });
        }}
        setConfirm={setConfirm}
      />

      {/* Back-press: save / discard / cancel */}
      <AlertDialog open={backAsk} onOpenChange={setBackAsk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تسک ذخیره بشه؟</AlertDialogTitle>
            <AlertDialogDescription>
              قبل از برگشت، می‌خوای این تسک ذخیره بشه یا دور انداخته بشه؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={saveAndBack}>ذخیره</AlertDialogAction>
            <AlertDialogAction
              onClick={discardAndBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              دور بنداز
            </AlertDialogAction>
            <AlertDialogCancel>ادامه ویرایش</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmations from TaskDetail (subtasks/notes) */}
      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "task" ? "حذف تسک؟" : confirm?.kind === "note" ? "حذف نوت؟" : "حذف زیرتسک؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئنی می‌خوای «{confirm?.title}» را حذف کنی؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirm) await confirm.onConfirm();
                setConfirm(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
