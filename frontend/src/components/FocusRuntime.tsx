import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pause, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusSession } from "@/hooks/useFocusSession";
import { useBilingual } from "@/hooks/useBilingual";
import { tickFocus, toggleFocus, finishFocus, flushFocusSessions, refreshFocusFromStorage } from "@/lib/focusSession";
import { playFocusAudio, stopFocusAudio } from "@/lib/focusAudio";

/** Mount once in the authenticated layout outside the route outlet. In-app controller, not an OS notification. */
export default function FocusRuntime() {
  const focus = useFocusSession();
  const { T } = useBilingual();
  const navigate = useNavigate();
  const location = useLocation();
  const title = useRef<string | null>(null);
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
  if (!focus || !focus.session.startedAt || location.pathname === "/app/pomodoro") return null;
  const s = focus.session;
  const clock = `${String(Math.floor(s.remaining / 60)).padStart(2, "0")}:${String(s.remaining % 60).padStart(2, "0")}`;
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-4 z-40 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm" data-testid="focus-mini-controller">
      <Button size="icon" variant="ghost" onClick={() => navigate("/app/pomodoro")} aria-label={T("بازکردن تمرکز", "Open focus")}><Timer className="h-4 w-4" /></Button>
      <button type="button" className="min-w-0 flex-1 text-start" onClick={() => navigate("/app/pomodoro")}>
        <span className="block truncate text-xs">{s.taskTitle || (s.taskId ? T("تمرکز روی کار", "Task focus") : T("تمرکز آزاد", "Free focus"))}</span>
        <span className="text-sm tabular-nums" dir="ltr">{clock}</span>
        {s.mode !== "work" && <span className="ms-2 text-xs text-muted-foreground">{T("استراحت", "Break")}</span>}
      </button>
      <Button size="icon" variant="ghost" onClick={() => toggleFocus()} aria-label={running ? T("مکث", "Pause") : T("ادامه", "Resume")}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
      <Button size="icon" variant="ghost" onClick={() => finishFocus(false)} aria-label={T("پایان و ثبت زمان", "Finish and save time")}><Square className="h-4 w-4" /></Button>
      {focus.pending > 0 && <span className="sr-only" role="status">{T("در انتظار همگام‌سازی", "Awaiting sync")}</span>}
    </div>
  );
}
