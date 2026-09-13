import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check, MoreHorizontal, Folder as FolderIcon, ChevronDown, ListTree } from "lucide-react";
import { toast } from "sonner";
import { TaskDetail, type TaskDetailHandle, type TaskHeaderContext } from "@/components/TaskDetail";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import { deleteTask } from "@/lib/firestoreDataService";
import { enqueueOp } from "@/lib/offlineQueue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [leaveDestination, setLeaveDestination] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [headerContext, setHeaderContext] = useState<TaskHeaderContext | null>(null);
  const createdRef = useRef(false);
  const savedRef = useRef(false);
  const persistedRef = useRef(false);
  const initialTagSavedRef = useRef(false);
  const draftRef = useRef<Task | null>(null);
  const detailRef = useRef<TaskDetailHandle>(null);
  const onHeaderContextChange = useCallback((context: TaskHeaderContext) => setHeaderContext(context), []);
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
    const d = detailRef.current?.getCurrentTask() || draftRef.current;
    if (!d) return false;
    return !!(d.title?.trim() || d.description?.trim());
  };

  const handleBack = () => {
    setLeaveDestination(null);
    if (detailRef.current?.hasPendingChanges() || hasContent()) setBackAsk(true);
    else navigate(-1);
  };

  const goToParent = () => {
    const parentId = headerContext?.parentId || detailRef.current?.getCurrentTask()?.parent_id;
    if (!parentId) return;
    const destination = `/app/tasks/${encodeURIComponent(parentId)}`;
    if (detailRef.current?.hasPendingChanges() || hasContent()) {
      setLeaveDestination(destination);
      setBackAsk(true);
    } else navigate(destination);
  };

  const selectFolder = (folderId: string | null) => {
    setFolderOpen(false);
    void detailRef.current?.setFolderId(folderId).catch(() => toast.error("تغییر فولدر ذخیره نشد"));
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
    if (leaveDestination) navigate(leaveDestination);
    else navigate(-1);
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
      if (leaveDestination) navigate(leaveDestination);
      else navigate(-1);
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

  const folderId = headerContext
    ? (headerContext.folderId ?? (headerContext.parentId ? headerContext.parentFolderId : null))
    : draft.folder_id;
  const folders = headerContext?.folders || [];
  const selectedFolder = folders.find(folder => folder.id === folderId);
  const parentFolder = selectedFolder?.parent_id ? folders.find(folder => folder.id === selectedFolder.parent_id) : null;
  const folderLabel = folderId
    ? selectedFolder ? `${parentFolder ? `${parentFolder.name} / ` : ""}${selectedFolder.name}` : "فولدر…"
    : "صندوق ورودی";
  const parentId = headerContext?.parentId ?? draft.parent_id;

  return (
    <div dir="rtl" className="w-full pb-40">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 shrink-0">
            <ArrowRight className="w-4 h-4" /> برگشت
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => detailRef.current?.openActions()} disabled={busy} aria-label="گزینه‌های بیشتر" title="گزینه‌های بیشتر">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
            <Button onClick={finish} disabled={busy} size="sm" className="gap-1.5 min-w-20 rounded-xl font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {busy ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          </div>
        </div>
        <nav aria-label="مسیر تسک" className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
          <Popover open={folderOpen} onOpenChange={setFolderOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex min-w-0 max-w-[60%] items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-foreground hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`تغییر فولدر: ${folderLabel}`}>
                <FolderIcon className="h-4 w-4 shrink-0 text-primary" style={{ color: selectedFolder?.color || undefined }} />
                <span className="truncate">{folderLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 max-h-[55vh] overflow-y-auto p-2">
              <button type="button" onClick={() => selectFolder(null)} className="w-full rounded-lg px-2.5 py-2 text-start text-sm hover:bg-accent">{parentId && headerContext?.parentFolderId ? "استفاده از فولدر والد" : "صندوق ورودی"}</button>
              {folders.filter(folder => !folder.parent_id).map(folder => (
                <div key={folder.id}>
                  <button type="button" onClick={() => selectFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm hover:bg-accent">
                    <FolderIcon className="h-4 w-4 shrink-0" style={{ color: folder.color || undefined }} />{folder.name}
                  </button>
                  {folders.filter(child => child.parent_id === folder.id).map(child => (
                    <button key={child.id} type="button" onClick={() => selectFolder(child.id)} className="flex w-full items-center gap-2 rounded-lg py-2 pe-2.5 ps-8 text-start text-sm hover:bg-accent">
                      <FolderIcon className="h-3.5 w-3.5 shrink-0" style={{ color: child.color || undefined }} />{child.name}
                    </button>
                  ))}
                </div>
              ))}
              {!folders.length && <p className="px-2.5 py-2 text-xs text-muted-foreground">فولدری برای نمایش پیدا نشد.</p>}
            </PopoverContent>
          </Popover>
          {parentId && <>
            <span className="text-muted-foreground" aria-hidden="true">/</span>
            <button type="button" onClick={goToParent} className="inline-flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title={headerContext?.parentTitle || "تسک والد"}>
              <ListTree className="h-4 w-4 shrink-0" />
              <span className="truncate">{headerContext?.parentTitle || "تسک والد"}</span>
            </button>
          </>}
        </nav>
      </div>

      <TaskDetail
        ref={detailRef}
        task={draft}
        mode="page"
        hidePageToolbar
        onHeaderContextChange={onHeaderContextChange}
        onRequestFolderPicker={() => setFolderOpen(true)}
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
