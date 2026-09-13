import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { TaskDetail, type TaskDetailHandle } from "@/components/TaskDetail";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import { deleteTask } from "@/lib/firestoreDataService";
import { enqueueOp } from "@/lib/offlineQueue";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Full-screen "new task" page. Keeps a local draft until a real save boundary,
 * so a slow connection never leaves the editor on a permanent spinner.
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
  const persistedRef = useRef(false);
  const initialTagSavedRef = useRef(false);
  const draftRef = useRef<Task | null>(null);
  const detailRef = useRef<TaskDetailHandle>(null);
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
    const id = (() => {
      try { return crypto.randomUUID(); }
      catch { return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
    })();
    setDraft({
      id,
      user_id: user.id,
      title: initialTitle,
      description: initialDescription || null,
      folder_id: parentId ? null : folderId,
      parent_id: parentId,
      due_date: dueDate,
      priority: "none",
      completed: false,
      status: "todo",
      reminder_at: null,
      recurrence: "none",
      recurrence_rule: null,
      pinned: false,
      start_at: null,
      end_at: null,
      estimated_minutes: null,
    } as Task);
  }, [user, params]);

  // Never send an empty local-only draft to the cloud. If an autosave had
  // already happened and the title was later cleared, queue a reliable delete.
  useEffect(() => {
    return () => {
      if (savedRef.current) return;
      const d = draftRef.current;
      if (d && persistedRef.current && !d.title?.trim() && user) void deleteTask(user.id, d.id);
    };
  }, [user]);

  const hasContent = () => {
    const d = draftRef.current;
    if (!d) return false;
    return !!(d.title?.trim() || d.description?.trim());
  };

  const handleBack = () => {
    if (detailRef.current?.hasPendingChanges() || hasContent()) setBackAsk(true);
    else navigate(-1);
  };

  const persistInitialTag = async (taskId: string) => {
    const tagId = params.get("tag_id");
    if (!user || !tagId || initialTagSavedRef.current) return true;
    const payload = { task_id: taskId, tag_id: tagId, user_id: user.id };
    try {
      const response = await firebaseStore.from("task_tags").insert(payload);
      if (response?.error) throw response.error;
      initialTagSavedRef.current = true;
      return true;
    } catch {
      const queued = await enqueueOp({ table: "task_tags", op: "insert", payload });
      if (queued) initialTagSavedRef.current = true;
      return queued;
    }
  };

  const finish = async () => {
    const d = draftRef.current;
    if (!d) return;
    const current = detailRef.current?.getCurrentTask() || d;
    if (!current.title?.trim()) {
      toast.error("عنوان تسک را وارد کن");
      return;
    }
    setBusy(true);
    try {
      await detailRef.current?.savePendingChanges(true);
      savedRef.current = true;
      if (!await persistInitialTag(current.id)) toast.error("تسک ذخیره شد، اما برچسب هنوز ذخیره نشده است");
      toast.success("تسک ذخیره شد");
      navigate(-1);
    } catch {
      toast.error("ذخیره انجام نشد؛ تغییرات همچنان باز هستند");
    } finally {
      setBusy(false);
    }
  };

  const discardAndBack = async () => {
    const d = draftRef.current;
    if (d) {
      savedRef.current = true; // prevent cleanup double-delete
      if (user && persistedRef.current && !await deleteTask(user.id, d.id)) {
        toast.error("حذف روی این دستگاه ذخیره نشد");
        savedRef.current = false;
        return;
      }
    }
    setBackAsk(false);
    navigate(-1);
  };

  const saveAndBack = async () => {
    const d = draftRef.current;
    const current = detailRef.current?.getCurrentTask() || d;
    if (!current?.title?.trim()) {
      toast.error("برای ذخیره، عنوان لازم است");
      return;
    }
    setBusy(true);
    try {
      await detailRef.current?.savePendingChanges(true);
      savedRef.current = true;
      if (!await persistInitialTag(current.id)) toast.error("تسک ذخیره شد، اما برچسب هنوز ذخیره نشده است");
      setBackAsk(false);
      toast.success("تسک ذخیره شد");
      navigate(-1);
    } catch {
      toast.error("ذخیره انجام نشد؛ تغییرات همچنان باز هستند");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        برای ساخت تسک، ابتدا وارد حساب خودت شو.
      </div>
    );
  }

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
        ref={detailRef}
        task={draft}
        mode="page"
        onClose={handleBack}
        onChanged={() => { persistedRef.current = true; }}
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
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void saveAndBack(); }} disabled={busy}>ذخیره</AlertDialogAction>
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
