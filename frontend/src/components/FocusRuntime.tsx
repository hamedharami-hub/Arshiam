import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Pause, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusSession } from "@/hooks/useFocusSession";
import { useBilingual } from "@/hooks/useBilingual";
import { tickFocus, toggleFocus, finishFocus, flushFocusSessions, refreshFocusFromStorage } from "@/lib/focusSession";
import { playFocusAudio, stopFocusAudio } from "@/lib/focusAudio";
import { focusBackgroundDisclosure, requestFocusNotificationPermission, syncFocusNotification } from "@/lib/focusNotifications";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Mount once in the authenticated layout for timer recovery, notifications and the compact controller. */
export default function FocusRuntime() {
  const focus = useFocusSession();
  const { user } = useAuth();
  const { T } = useBilingual();
  const navigate = useNavigate();
  const location = useLocation();
  const title = useRef<string | null>(null);
  const previousPath = useRef(location.pathname);
  const [leavingTaskTitle, setLeavingTaskTitle] = useState<string | null>(null);
  const syncedNotificationKey = useRef("");
  const notificationOwner = useRef(user?.id ?? null);
  useEffect(() => {
    const tick = () => { tickFocus(); };
    const retry = () => { tick(); void flushFocusSessions(); };
    const storage = (event: StorageEvent) => refreshFocusFromStorage(event.key);
    const timer = window.setInterval(tick, 250);
    const retryTimer = window.setInterval(() => { void flushFocusSessions(); }, 30000);
    document.addEventListener("visibilitychange", retry);
    window.addEventListener("online", retry);
    window.addEventListener("storage", storage);
    tick();
    return () => { clearInterval(timer); clearInterval(retryTimer); document.removeEventListener("visibilitychange", retry); window.removeEventListener("online", retry); window.removeEventListener("storage", storage); stopFocusAudio(); };
  }, []);
  useEffect(() => {
    const openFocus = () => navigate("/app/pomodoro");
    window.addEventListener("arshnaz:open-focus-timer", openFocus);
    return () => window.removeEventListener("arshnaz:open-focus-timer", openFocus);
  }, [navigate]);
  const running = focus?.session.endAt != null;
  const mode = focus?.session.mode;
  useEffect(() => {
    if (running && mode === "work" && focus) playFocusAudio(focus.prefs.ambient, focus.prefs.ambientVol);
    else stopFocusAudio();
  }, [running, mode, focus?.userId, focus?.prefs.ambient, focus?.prefs.ambientVol]);
  useEffect(() => {
    if (running && focus) {
      title.current ??= document.title;
      document.title = `${String(Math.floor(focus.session.remaining / 60)).padStart(2, "0")}:${String(focus.session.remaining % 60).padStart(2, "0")} · ${T("تمرکز", "Focus")}`;
    } else if (title.current) { document.title = title.current; title.current = null; }
  }, [running, focus?.session.remaining, T]);
  useEffect(() => () => { if (title.current) document.title = title.current; }, []);
  useEffect(() => {
    const currentOwner = user?.id ?? null;
    if (notificationOwner.current && notificationOwner.current !== currentOwner) {
      void syncFocusNotification({ active: false, running: false, completed: false, sessionId: "", title: "", mode: "work", endAt: 0, remainingSeconds: 0 }).catch(() => {});
      syncedNotificationKey.current = "";
    }
    notificationOwner.current = currentOwner;
  }, [user?.id]);
  useEffect(() => {
    const previous = previousPath.current;
    if (previous !== location.pathname) {
      const taskRoute = /^\/app\/tasks\/([^/]+)$/.exec(previous);
      if (taskRoute && focus?.session.endAt && focus.session.taskId) {
        let previousTaskId = taskRoute[1];
        try { previousTaskId = decodeURIComponent(previousTaskId); } catch { /* keep encoded route id */ }
        if (previousTaskId === focus.session.taskId) setLeavingTaskTitle(focus.session.taskTitle || T("این کار", "this task"));
      }
      previousPath.current = location.pathname;
    }
  }, [location.pathname, focus?.session.id, focus?.session.taskId, focus?.session.endAt, focus?.session.taskTitle, T]);
  useEffect(() => {
    if (!focus?.session.endAt && leavingTaskTitle) setLeavingTaskTitle(null);
  }, [focus?.session.endAt, leavingTaskTitle]);

  useEffect(() => {
    if (!focus) return;
    const s = focus.session;
    const outcome = focus.lastOutcome;
    const active = Boolean(s.id && s.startedAt !== null);
    const key = active
      ? `${focus.userId}|${s.id}|${s.mode}|${s.endAt ?? "paused"}|${s.taskTitle || ""}`
      : outcome
        ? `${focus.userId}|outcome|${outcome.id}|${outcome.completed}`
        : `${focus.userId}|idle`;
    if (key === syncedNotificationKey.current) return;
    syncedNotificationKey.current = key;
    void syncFocusNotification({
      active,
      running: Boolean(active && s.endAt !== null),
      completed: Boolean(!active && outcome?.completed),
      sessionId: active ? (s.id || "") : (outcome?.id || ""),
      title: active ? (s.taskTitle || "") : (outcome?.taskTitle || ""),
      mode: active ? s.mode : (outcome?.mode || s.mode),
      endAt: active ? (s.endAt || 0) : 0,
      remainingSeconds: active ? s.remaining : 0,
    }).catch(() => {});
  }, [focus?.userId, focus?.session.id, focus?.session.startedAt, focus?.session.endAt, focus?.session.mode, focus?.session.taskTitle, focus?.session.remaining, focus?.lastOutcome]);

  const s = focus?.session;
  const shouldShowMini = Boolean(focus && s?.startedAt && location.pathname !== "/app/pomodoro");
  const clock = s ? `${String(Math.floor(s.remaining / 60)).padStart(2, "0")}:${String(s.remaining % 60).padStart(2, "0")}` : "";
  const backgroundDisclosure = focusBackgroundDisclosure(
    Capacitor.getPlatform() === "android" ? "android" : Capacitor.getPlatform() === "ios" ? "ios" : "web",
  );
  return (
    <>
      {shouldShowMini && s && focus && <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-4 z-40 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm" data-testid="focus-mini-controller">
        <Button size="icon" variant="ghost" onClick={() => navigate("/app/pomodoro")} aria-label={T("بازکردن تمرکز", "Open focus")}><Timer className="h-4 w-4" /></Button>
        <button type="button" className="min-w-0 flex-1 text-start" onClick={() => navigate("/app/pomodoro")}>
          <span className="block truncate text-xs">{s.taskTitle || (s.taskId ? T("تمرکز روی کار", "Task focus") : T("تمرکز آزاد", "Free focus"))}</span>
          <span className="text-sm tabular-nums" dir="ltr">{clock}</span>
          {s.mode !== "work" && <span className="ms-2 text-xs text-muted-foreground">{T("استراحت", "Break")}</span>}
        </button>
        <Button size="icon" variant="ghost" onClick={async () => { if (!running) await requestFocusNotificationPermission(); toggleFocus(); }} aria-label={running ? T("مکث", "Pause") : T("ادامه", "Resume")}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
        <Button size="icon" variant="ghost" onClick={() => finishFocus(false)} aria-label={T("پایان و ثبت زمان", "Finish and save time")}><Square className="h-4 w-4" /></Button>
        {focus.pending > 0 && <span className="sr-only" role="status">{T("در انتظار همگام‌سازی", "Awaiting sync")}</span>}
      </div>}
      <AlertDialog open={Boolean(leavingTaskTitle)} onOpenChange={(open) => !open && setLeavingTaskTitle(null)}>
        <AlertDialogContent dir="auto" className="z-[100]" data-testid="focus-background-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>{T("تایمر تمرکز روشن بماند؟", "Keep the focus timer running?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(`از صفحهٔ «${leavingTaskTitle || "این کار"}» خارج شدی. ${backgroundDisclosure.descriptionFa}`, `You left “${leavingTaskTitle || "this task"}”. ${backgroundDisclosure.descriptionEn}`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { finishFocus(false); setLeavingTaskTitle(null); }}>{T("توقف و ثبت زمان", "Stop and save time")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLeavingTaskTitle(null)}>{T(backgroundDisclosure.actionFa, backgroundDisclosure.actionEn)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
