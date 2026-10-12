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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cacheGet } from "@/lib/offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";
import { useBilingual } from "@/hooks/useBilingual";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { TaskDeleteConfirmDialog } from "@/components/tasks/TaskDeleteConfirmDialog";

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
    const returnTo = searchParams.get("returnTo");
    if (effectiveParentId) {
      const returnSuffix = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      navigate(`/app/tasks/${encodeURIComponent(effectiveParentId)}${returnSuffix}`);
      return;
    }
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/app/today", { replace: true });
  }, [isFromWidget, effectiveParentId, searchParams, navigate]);

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

  // Escape and an outside click both go through TaskDetail's own close request,
  // so an unsaved edit still prompts before the modal disappears.
  const requestClose = useCallback(() => {
    if (taskDetailRef.current?.requestClose) {
      taskDetailRef.current.requestClose();
      return;
    }
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    if (isPhone) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // A real modal (Radix dialog/alertdialog/menu) owns Escape while it is
        // open; only the non-modal loading/empty overlays are handled here.
        if (document.querySelector('[role="dialog"]:not([data-sidebar]),[role="alertdialog"],[role="menu"]')) return;
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhone, requestClose]);

  // The empty state must not claim deletion when the real reason is that the
  // device is offline and no cached copy exists.
  const loadingLabel = T("در حال بارگذاری تسک…", "Loading task…");
  const offlineNoTask = !visibleTask && typeof navigator !== "undefined" && !navigator.onLine;
  const notFoundMessage = offlineNoTask
    ? T("این تسک در حالت آفلاین در دسترس نیست.", "This task isn't available offline.")
    : T("تسک مورد نظر پیدا نشد یا حذف شده است.", "Task not found or has been deleted.");

  if ((loading || loadedId !== id) && !visibleTask) {
    if (isPhone) {
      return (
        <div dir={isEn ? "ltr" : "rtl"} role="status" aria-live="polite" className="flex items-center justify-center h-[60vh] text-muted-foreground page-enter">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      );
    }
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={handleClose}>
        <div role="status" aria-live="polite" className="bg-card p-6 rounded-2xl shadow-xl border border-border/80 flex items-center justify-center gap-2 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      </div>
    );
  }

  if (!visibleTask) {
    if (isPhone) {
      return (
        <div dir={isEn ? "ltr" : "rtl"} className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground p-4 text-center space-y-4 page-enter">
          <p role="alert" className="text-base font-medium">{notFoundMessage}</p>
          <Button variant="outline" onClick={handleClose} className="gap-1.5">
            <BackIcon className="w-4 h-4" /> {isFromWidget ? T("خروج", "Exit") : T("بازگشت به تسک‌ها", "Back to tasks")}
          </Button>
        </div>
      );
    }
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={handleClose}>
        <div className="bg-card p-6 rounded-2xl shadow-xl border border-border/80 max-w-md w-full text-center p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p role="alert" className="text-base font-medium">{notFoundMessage}</p>
          <Button variant="outline" onClick={handleClose} className="gap-1.5">
            <BackIcon className="w-4 h-4" /> {isFromWidget ? T("خروج", "Exit") : T("بازگشت به تسک‌ها", "Back to tasks")}
          </Button>
        </div>
      </div>
    );
  }

  const confirmDialog = (
    <TaskDeleteConfirmDialog confirm={confirm} setConfirm={setConfirm} T={T} />
  );

  if (!isPhone) {
    return (
      <>
        <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-2xl sm:max-w-2xl max-h-[75vh] p-0 gap-0 flex flex-col bg-card rounded-2xl sm:rounded-2xl shadow-2xl border border-border/80 overflow-hidden [&>button:last-child]:hidden"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{visibleTask.title || T("تسک", "Task")}</DialogTitle>
            </DialogHeader>
            <TaskDetail
              ref={taskDetailRef}
              key={visibleTask.id}
              task={visibleTask}
              onClose={handleClose}
              onBack={handleBack}
              hasBackHistory={true}
              onOpenParentTask={(targetId) => {
                const returnTo = searchParams.get("returnTo");
                const returnSuffix = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
                navigate(`/app/tasks/${encodeURIComponent(targetId)}?from=${encodeURIComponent(visibleTask.id)}${isFromWidget ? "&fromWidget=1" : ""}${returnSuffix}`);
              }}
              onChanged={load}
              setConfirm={setConfirm}
              mode="modal"
              allowDelete
            />
          </DialogContent>
        </Dialog>
        {confirmDialog}
      </>
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
          const returnTo = searchParams.get("returnTo");
          const returnSuffix = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
          navigate(`/app/tasks/${encodeURIComponent(targetId)}?from=${encodeURIComponent(visibleTask.id)}${isFromWidget ? "&fromWidget=1" : ""}${returnSuffix}`);
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
