import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { toast } from "sonner";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { TaskDetail, type TaskDetailHandle } from "@/components/TaskDetail";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cacheGet } from "@/lib/offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";
import { useBilingual } from "@/hooks/useBilingual";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TaskDetailView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromTaskId = searchParams.get("from");
  const isFromWidget =
    searchParams.get("fromWidget") === "1" ||
    searchParams.get("fromWidget") === "true" ||
    searchParams.get("from") === "widget" ||
    searchParams.get("source") === "widget";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const { isPhone } = useDeviceFormFactor();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const taskDetailRef = useRef<TaskDetailHandle | null>(null);
  const loadGeneration = useRef(0);
  const lastBackRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    if (!id) {
      setTask(null);
      setLoading(false);
      setLoadedId(null);
      return;
    }
    setLoading(true);
    let cachedTask: Task | null = null;
    try {
      // The account-scoped cache gives a widget tap an immediate task screen.
      // The network result still refreshes it once available.
      if (user) {
        try {
          const cachedRaw = await cacheGet<unknown>(`tasks:all:${user.id}`);
          const cached = extractTasksFromCache(cachedRaw);
          cachedTask = cached.find(t => t.id === id) || null;
        } catch { /* Network fetch below still runs if cache is unavailable. */ }
        if (generation !== loadGeneration.current) return;
        if (cachedTask) {
          setTask(cachedTask);
          setLoading(false);
          setLoadedId(id);
        }
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cachedTask) setTask(null);
        return;
      }
      try {
        const { data } = await firebaseStore.from("tasks").select("*").eq("id", id).maybeSingle();
        if (generation === loadGeneration.current) setTask(data ? data as unknown as Task : null);
      } catch {
        if (generation === loadGeneration.current && !cachedTask) setTask(null);
      }
    } finally {
      if (generation === loadGeneration.current) {
        setLoadedId(id);
        setLoading(false);
      }
    }
  }, [id, user]);

  useEffect(() => {
    void load();
    const currentRef = loadGeneration;
    return () => {
      currentRef.current++;
    };
  }, [load]);

  const visibleTask = task?.id === id ? task : null;
  const effectiveParentId = fromTaskId || (visibleTask?.parent_id ?? null);

  const handleClose = useCallback(() => {
    if (isFromWidget) {
      void CapApp.exitApp();
      return;
    }
    if (effectiveParentId) {
      navigate(`/app/tasks/${encodeURIComponent(effectiveParentId)}`);
      return;
    }
    navigate("/app/today", { replace: true });
  }, [isFromWidget, effectiveParentId, navigate]);

  const handleBack = useCallback(() => {
    if (isFromWidget) {
      if (taskDetailRef.current?.hasPendingChanges()) {
        taskDetailRef.current?.requestClose();
        return;
      }
      const now = Date.now();
      if (lastBackRef.current && now - lastBackRef.current < 2000) {
        void CapApp.exitApp();
        return;
      }
      lastBackRef.current = now;
      toast(isEn ? "Press back again to exit" : "برای خروج یک‌بار دیگر برگشت را بزن", { duration: 1800 });
      return;
    }
    if (effectiveParentId) {
      navigate(`/app/tasks/${encodeURIComponent(effectiveParentId)}`);
      return;
    }
    handleClose();
  }, [effectiveParentId, isFromWidget, navigate, handleClose, isEn]);

  useEffect(() => {
    if (isPhone) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector('[role="alertdialog"],[role="menu"]')) return;
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhone, handleClose]);

  if ((loading || loadedId !== id) && !visibleTask) {
    if (isPhone) {
      return (
        <div dir={isEn ? "ltr" : "rtl"} className="flex items-center justify-center h-[60vh] text-muted-foreground page-enter">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={handleClose}>
        <div className="bg-card p-6 rounded-2xl shadow-xl border border-border/80 flex items-center justify-center text-muted-foreground" onClick={(e) => e.stopPropagation()}>
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!visibleTask) {
    if (isPhone) {
      return (
        <div dir={isEn ? "ltr" : "rtl"} className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground p-4 text-center space-y-4 page-enter">
          <p className="text-base font-medium">{T("تسک مورد نظر پیدا نشد یا حذف شده است.", "Task not found or has been deleted.")}</p>
          <Button variant="outline" onClick={handleClose} className="gap-1.5">
            <BackIcon className="w-4 h-4" /> {isFromWidget ? T("خروج", "Exit") : T("بازگشت به تسک‌ها", "Back to tasks")}
          </Button>
        </div>
      );
    }
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={handleClose}>
        <div className="bg-card p-6 rounded-2xl shadow-xl border border-border/80 max-w-md w-full text-center p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-base font-medium">{T("تسک مورد نظر پیدا نشد یا حذف شده است.", "Task not found or has been deleted.")}</p>
          <Button variant="outline" onClick={handleClose} className="gap-1.5">
            <BackIcon className="w-4 h-4" /> {isFromWidget ? T("خروج", "Exit") : T("بازگشت به تسک‌ها", "Back to tasks")}
          </Button>
        </div>
      </div>
    );
  }

  const confirmDialog = (
    <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
      <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirm?.kind === "task"
              ? T("حذف تسک؟", "Delete task?")
              : confirm?.kind === "note"
              ? T("حذف نوت؟", "Delete note?")
              : T("حذف زیرتسک؟", "Delete subtask?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {T(
              `آیا مطمئنی می‌خوای «${confirm?.title || ""}» را حذف کنی؟`,
              `Are you sure you want to delete "${confirm?.title || ""}"?`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (confirm) await confirm.onConfirm();
              setConfirm(null);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {T("حذف", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!isPhone) {
    return (
      <div
        dir={isEn ? "ltr" : "rtl"}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={handleClose}
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] h-[85vh] flex flex-col bg-card rounded-2xl shadow-2xl border border-border/80 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <TaskDetail
            ref={taskDetailRef}
            key={visibleTask.id}
            task={visibleTask}
            onClose={handleClose}
            onBack={handleBack}
            hasBackHistory={true}
            onOpenParentTask={(targetId) => {
              navigate(`/app/tasks/${encodeURIComponent(targetId)}?from=${encodeURIComponent(visibleTask.id)}${isFromWidget ? "&fromWidget=1" : ""}`);
            }}
            onChanged={load}
            setConfirm={setConfirm}
            mode="modal"
            allowDelete
          />
        </div>
        {confirmDialog}
      </div>
    );
  }

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-enter">
      <TaskDetail
        ref={taskDetailRef}
        key={visibleTask.id}
        task={visibleTask}
        onClose={handleClose}
        onBack={handleBack}
        hasBackHistory={true}
        onOpenParentTask={(targetId) => {
          navigate(`/app/tasks/${encodeURIComponent(targetId)}?from=${encodeURIComponent(visibleTask.id)}${isFromWidget ? "&fromWidget=1" : ""}`);
        }}
        onChanged={load}
        setConfirm={setConfirm}
        mode="page"
        allowDelete
      />
      {confirmDialog}
    </div>
  );
}
