import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { TaskDetail } from "@/components/TaskDetail";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cacheGet } from "@/lib/offlineQueue";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TaskDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const loadGeneration = useRef(0);

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
          const cached = await cacheGet<Task[]>(`tasks:all:${user.id}`);
          cachedTask = cached?.find(t => t.id === id) || null;
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
    return () => { loadGeneration.current++; };
  }, [load]);

  const visibleTask = task?.id === id ? task : null;

  if ((loading || loadedId !== id) && !visibleTask) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!visibleTask) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground p-4 text-center space-y-4">
        <p className="text-base font-medium">{T("تسک مورد نظر پیدا نشد یا حذف شده است.", "Task not found or has been deleted.")}</p>
        <Button variant="outline" onClick={() => navigate("/app/today")} className="gap-1.5">
          <ArrowRight className="w-4 h-4" /> {T("بازگشت به تسک‌ها", "Back to tasks")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b flex items-center justify-between gap-2 p-3">
        <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new Event("arshnaz:request-task-close"))} className="gap-1">
          <ArrowRight className="w-4 h-4" /> {T("برگشت", "Back")}
        </Button>
        <h1 className="text-sm font-semibold flex-1 text-center truncate px-2">
          {T("جزئیات تسک", "Task details")}
        </h1>
        <div className="w-20" />
      </div>
      <TaskDetail
        key={visibleTask.id}
        task={visibleTask}
        onClose={() => navigate(-1)}
        onChanged={load}
        setConfirm={setConfirm}
        mode="page"
        allowDelete
      />
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
    </>
  );
}
