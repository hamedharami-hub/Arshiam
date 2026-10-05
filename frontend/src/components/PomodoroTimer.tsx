import { useCallback, useEffect, useRef, useState, type TouchEvent as RTouchEvent } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Music2, Settings2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AMBIENT_SOUNDS } from "@/lib/ambientSounds";
import { startSynth, stopSynth, setSynthVolume } from "@/lib/pomodoroSynth";
import { END_BELLS, playEndBell, type EndBellId } from "@/lib/pomodoroSounds";
import { useTapGestures } from "@/lib/useTapGestures";
import { recordPomodoroFocusSession } from "@/lib/garden";
import { haptic } from "@/lib/haptics";
import { toPersianDigits } from "@/lib/persianDigits";
import { todayISO } from "@/lib/timeHorizon";

type Props = {
  taskId?: string | null;
  defaultMinutes?: number;
  compact?: boolean;
  onSessionComplete?: () => void;
};

type Mode = "work" | "short" | "long";
const PREF_KEY = "pomodoro_prefs_v1";
const COUNT_KEY = (userId: string | null) => `pomodoro_today_count_v2:${userId || "guest"}`;
const SESSION_KEY = (userId: string | null) => `pomodoro_session_v1:${userId || "guest"}`;
type PersistedSession = { userId: string | null; mode: Mode; endAt: number | null; remaining: number; startedAt: number | null; taskId: string | null };
export function loadSession(userId: string | null): PersistedSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY(userId)) || "null") as PersistedSession | null;
    if (!session || session.userId !== userId || !["work", "short", "long"].includes(session.mode) ||
        !Number.isFinite(session.remaining) || session.remaining < 0 ||
        (session.endAt !== null && (!Number.isFinite(session.endAt) || session.endAt <= 0)) ||
        (session.startedAt !== null && !Number.isFinite(session.startedAt))) return null;
    return session;
  } catch { return null; }
}
type Prefs = {
  minutes: number; shortBreak: number; longBreak: number; longEvery: number;
  autoStart: boolean; bell: EndBellId; ambient: string; ambientVol: number;
};
const DEFAULT_PREFS: Prefs = { minutes: 25, shortBreak: 5, longBreak: 15, longEvery: 4, autoStart: false, bell: "bell", ambient: "none", ambientVol: 30 };

function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; } catch { return DEFAULT_PREFS; }
}
const todayKey = () => todayISO();
export function loadCount(userId: string | null): number {
  try { const v = JSON.parse(localStorage.getItem(COUNT_KEY(userId)) || "{}"); return v.date === todayKey() ? Number(v.count) || 0 : 0; } catch { return 0; }
}
function saveCount(userId: string | null, count: number) {
  try { localStorage.setItem(COUNT_KEY(userId), JSON.stringify({ date: todayKey(), count })); } catch { /* ignore */ }
}

export default function PomodoroTimer({ taskId = null, defaultMinutes, compact = false, onSessionComplete }: Props) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...loadPrefs(), ...(defaultMinutes ? { minutes: defaultMinutes } : {}) }));
  const userId = user?.id ?? null;
  const [initialSession] = useState(() => loadSession(userId));
  const [hydratedUserId, setHydratedUserId] = useState(userId);
  const [mode, setMode] = useState<Mode>(initialSession?.mode ?? "work");
  const [endAt, setEndAt] = useState<number | null>(initialSession?.endAt ?? null);
  const [remaining, setRemaining] = useState(initialSession?.remaining ?? prefs.minutes * 60);
  const [doneToday, setDoneToday] = useState(() => loadCount(userId));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const startedAtRef = useRef<number | null>(initialSession?.startedAt ?? null);
  const sessionTaskIdRef = useRef<string | null>(initialSession?.taskId ?? null);
  const finishingRef = useRef(false);
  const running = endAt !== null;

  const lengthOf = useCallback((m: Mode) => (m === "work" ? prefs.minutes : m === "short" ? prefs.shortBreak : prefs.longBreak) * 60, [prefs]);
  const total = lengthOf(mode);

  useEffect(() => {
    if (hydratedUserId === userId) return;
    const restored = loadSession(userId);
    setMode(restored?.mode ?? "work");
    setRemaining(restored?.remaining ?? prefs.minutes * 60);
    setEndAt(restored?.endAt ?? null);
    startedAtRef.current = restored?.startedAt ?? null;
    sessionTaskIdRef.current = restored?.taskId ?? null;
    setDoneToday(loadCount(userId));
    setHydratedUserId(userId);
  }, [userId, hydratedUserId, prefs.minutes]);

  useEffect(() => {
    if (hydratedUserId !== userId) return;
    try {
      if (endAt === null && startedAtRef.current === null) localStorage.removeItem(SESSION_KEY(userId));
      else localStorage.setItem(SESSION_KEY(userId), JSON.stringify({ userId, mode, endAt, remaining, startedAt: startedAtRef.current, taskId: sessionTaskIdRef.current } satisfies PersistedSession));
    } catch { /* Timer remains usable when storage is unavailable. */ }
  }, [userId, hydratedUserId, mode, endAt, remaining]);

  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } }, [prefs]);

  // Ambient sound follows the running state (focus only).
  useEffect(() => {
    if (running && mode === "work" && prefs.ambient !== "none") startSynth(prefs.ambient, prefs.ambientVol);
    else stopSynth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.ambient, running, mode]);
  useEffect(() => { setSynthVolume(prefs.ambientVol); }, [prefs.ambientVol]);
  useEffect(() => () => stopSynth(), []);

  const switchMode = (m: Mode, autoStart = false) => {
    setMode(m);
    const len = lengthOf(m);
    setRemaining(len);
    startedAtRef.current = autoStart ? Date.now() : null;
    sessionTaskIdRef.current = autoStart && m === "work" ? taskId : null;
    setEndAt(autoStart ? Date.now() + len * 1000 : null);
  };

  const finishSession = async () => {
    if (hydratedUserId !== userId) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    setEndAt(null);
    stopSynth();
    playEndBell(prefs.bell);
    haptic("success");
    if (mode === "work") {
      const dur = Math.round(total / 60);
      const sessionEndedAt = Date.now();
      const sessionStartedAt = startedAtRef.current || sessionEndedAt - dur * 60000;
      const sessionTaskId = sessionTaskIdRef.current;
      const count = doneToday + 1;
      setDoneToday(count);
      saveCount(userId, count);
      recordPomodoroFocusSession(dur);
      const next: Mode = count % prefs.longEvery === 0 ? "long" : "short";
      toast.success(T(`${num(dur)} دقیقه تمرکز ثبت شد — وقت استراحت`, `${dur} min focus logged — time for a break`));
      switchMode(next, prefs.autoStart);
      if (user) {
        await firebaseStore.from("pomodoro_sessions").insert({
          user_id: user.id,
          task_id: sessionTaskId,
          duration_minutes: dur,
          completed: true,
          started_at: new Date(sessionStartedAt).toISOString(),
          ended_at: new Date(sessionEndedAt).toISOString(),
        });
      }
      onSessionComplete?.();
    } else {
      toast.success(T("استراحت تمام شد. آماده‌ای؟", "Break finished. Ready?"));
      switchMode("work", prefs.autoStart);
    }
    finishingRef.current = false;
  };

  // Timestamp-based ticking: accurate even when the tab/phone sleeps.
  useEffect(() => {
    if (!endAt || hydratedUserId !== userId) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) void finishSession();
    };
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt, hydratedUserId, userId]);

  // Show the countdown in the browser tab while running.
  useEffect(() => {
    if (!running) return;
    const prev = document.title;
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    document.title = `${mm}:${ss} · ${mode === "work" ? T("تمرکز", "Focus") : T("استراحت", "Break")}`;
    return () => { document.title = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, mode]);

  const toggle = () => {
    if (running) {
      setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      setEndAt(null);
      return;
    }
    const left = remaining > 0 ? remaining : total;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    if (mode === "work" && !sessionTaskIdRef.current) sessionTaskIdRef.current = taskId;
    setRemaining(left);
    setEndAt(Date.now() + left * 1000);
  };

  const reset = () => {
    setEndAt(null);
    setRemaining(total);
    startedAtRef.current = null;
    sessionTaskIdRef.current = null;
  };

  const skip = () => {
    setEndAt(null);
    if (mode === "work") switchMode(((doneToday + 1) % prefs.longEvery === 0) ? "long" : "short");
    else switchMode("work");
  };

  const setWorkMinutes = (v: number) => {
    setPrefs((p) => ({ ...p, minutes: v }));
    if (mode === "work" && !running) setRemaining(v * 60);
  };

  const { handlers: timerHandlers } = useTapGestures({
    onDoubleTap: () => { haptic("light"); toggle(); },
    onLongPress: () => { haptic("warning"); reset(); },
  });

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onTimerTouchStart = (e: RTouchEvent) => {
    const t = e.touches[0]; if (t) swipeStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTimerTouchEnd = (e: RTouchEvent) => {
    const s = swipeStart.current; swipeStart.current = null;
    const t = e.changedTouches[0];
    if (!s || !t || running) return;
    const dy = t.clientY - s.y;
    if (Math.abs(dy) > 40 && mode === "work") {
      const next = Math.max(5, Math.min(90, prefs.minutes + (dy < 0 ? 5 : -5)));
      setWorkMinutes(next);
      haptic("light");
    }
  };

  const progress = total > 0 ? 1 - remaining / total : 0;
  const R = 88;
  const C = 2 * Math.PI * R;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const MODES: { id: Mode; fa: string; en: string }[] = [
    { id: "work", fa: "تمرکز", en: "Focus" },
    { id: "short", fa: "استراحت کوتاه", en: "Short break" },
    { id: "long", fa: "استراحت بلند", en: "Long break" },
  ];
  const cycleDone = doneToday % prefs.longEvery;
  const currentSound = AMBIENT_SOUNDS.find((s) => s.id === prefs.ambient);

  return (
    <div className="space-y-5" data-testid="pomodoro-timer">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            disabled={running}
            onClick={() => switchMode(m.id)}
            className={`rounded-md px-2 py-1.5 text-xs transition-colors disabled:opacity-60 ${mode === m.id ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-testid={`pomodoro-mode-${m.id}`}
          >
            {T(m.fa, m.en)}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <div
          {...timerHandlers}
          onTouchStart={(e) => { timerHandlers.onTouchStart(e); onTimerTouchStart(e); }}
          onTouchEnd={(e) => { timerHandlers.onTouchEnd(); onTimerTouchEnd(e); }}
          className={`relative select-none ${compact ? "h-44 w-44" : "h-56 w-56"}`}
          title={T("دابل‌تاچ: شروع/توقف • نگه‌داشتن: ریست • سوایپ عمودی: ±۵ دقیقه", "Double-tap: start/stop • Hold: reset • Vertical swipe: ±5 min")}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
            <circle
              cx="100" cy="100" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
              className={mode === "work" ? "stroke-primary" : "stroke-emerald-500"}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" dir="ltr">
            <span className={`font-bold tabular-nums tracking-tight text-foreground ${compact ? "text-4xl" : "text-5xl"}`} data-testid="pomodoro-time">{mm}:{ss}</span>
            <span className="mt-1 text-xs text-muted-foreground" dir={isEn ? "ltr" : "rtl"}>
              {running ? (mode === "work" ? T("در حال تمرکز", "Focusing") : T("در حال استراحت", "On a break")) : T("آماده", "Ready")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full" onClick={reset} aria-label={T("ریست", "Reset")} title={T("ریست", "Reset")} data-testid="pomodoro-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button className="h-14 w-14 rounded-full" onClick={toggle} aria-label={running ? T("توقف", "Pause") : T("شروع", "Start")} data-testid="pomodoro-toggle">
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full" onClick={skip} aria-label={T("رد کردن", "Skip")} title={T("رد کردن این مرحله", "Skip this phase")} data-testid="pomodoro-skip">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" data-testid="pomodoro-sessions">
          <div className="flex gap-1">
            {Array.from({ length: prefs.longEvery }).map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i < cycleDone ? "bg-primary" : "bg-muted-foreground/25"}`} />
            ))}
          </div>
          <span>{T(`امروز ${num(doneToday)} جلسه`, `${doneToday} today`)}</span>
        </div>
      </div>

      {!running && mode === "work" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <Label className="text-xs">{T("مدت تمرکز", "Focus length")}</Label>
            <span className="tabular-nums text-muted-foreground">{num(prefs.minutes)} {T("دقیقه", "min")}</span>
          </div>
          <Slider value={[prefs.minutes]} min={5} max={90} step={5} onValueChange={([v]) => setWorkMinutes(v)} dir={isEn ? "ltr" : "rtl"} data-testid="pomodoro-minutes-slider" />
          <div className="flex flex-wrap justify-center gap-1">
            {[15, 25, 45, 60].map((m) => (
              <Button key={m} size="sm" variant={prefs.minutes === m ? "default" : "outline"} className="h-7 rounded-full px-3 text-xs" onClick={() => setWorkMinutes(m)} data-testid={`pomodoro-preset-${m}`}>
                {T(`${num(m)} د`, `${m}m`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2" data-testid="pomodoro-sound-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold"><Music2 className="h-3.5 w-3.5 text-muted-foreground" />{T("صدای محیطی", "Ambient sound")}</div>
          {currentSound?.hint && <span className="text-[10px] text-amber-600 dark:text-amber-400">{T(currentSound.hint, currentSound.hintEn || currentSound.hint)}</span>}
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" data-testid="pomodoro-ambient-chips">
          {[{ id: "none", emoji: "", name: "بی‌صدا", nameEn: "Off" }, ...AMBIENT_SOUNDS].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, ambient: s.id }))}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${prefs.ambient === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              data-testid={`pomodoro-ambient-${s.id}`}
            >
              {s.id === "none" ? <VolumeX className="h-3 w-3" /> : <span>{s.emoji}</span>}
              {T(s.name, s.nameEn)}
            </button>
          ))}
        </div>
        {prefs.ambient !== "none" && (
          <div className="flex items-center gap-2">
            {prefs.ambientVol === 0 ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-muted-foreground" />}
            <Slider value={[prefs.ambientVol]} min={0} max={100} step={5} onValueChange={([v]) => setPrefs((p) => ({ ...p, ambientVol: v }))} className="flex-1" dir={isEn ? "ltr" : "rtl"} data-testid="pomodoro-ambient-volume" />
            <span className="w-9 text-center text-xs tabular-nums">{num(prefs.ambientVol)}%</span>
          </div>
        )}
      </div>

      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold" data-testid="pomodoro-settings-toggle">
          <span className="flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5 text-muted-foreground" />{T("تنظیمات", "Settings")}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Label className="flex-1 text-xs">{T("زنگ پایان", "End bell")}</Label>
            <Select value={prefs.bell} onValueChange={(v) => { setPrefs((p) => ({ ...p, bell: v as EndBellId })); playEndBell(v as EndBellId); }}>
              <SelectTrigger className="h-8 w-40 text-xs" data-testid="pomodoro-bell-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {END_BELLS.map((b) => <SelectItem key={b.id} value={b.id}>{b.emoji} {T(b.name, b.nameEn)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["shortBreak", "استراحت کوتاه", "Short break", [3, 5, 10]], ["longBreak", "استراحت بلند", "Long break", [10, 15, 20, 30]], ["longEvery", "بلند بعد از", "Long every", [2, 3, 4, 5, 6]]] as const).map(([key, fa, en, opts]) => (
              <div key={key} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{T(fa, en)}</Label>
                <Select value={String(prefs[key])} onValueChange={(v) => { setPrefs((p) => ({ ...p, [key]: Number(v) })); if (!running && ((key === "shortBreak" && mode === "short") || (key === "longBreak" && mode === "long"))) setRemaining(Number(v) * 60); }}>
                  <SelectTrigger className="h-8 text-xs" data-testid={`pomodoro-${key}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {opts.map((o) => <SelectItem key={o} value={String(o)}>{key === "longEvery" ? T(`${num(o)} جلسه`, `${o} sessions`) : T(`${num(o)} دقیقه`, `${o} min`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pomodoro-autostart" className="text-xs">{T("شروع خودکار مرحلهٔ بعد", "Auto-start next phase")}</Label>
            <Switch id="pomodoro-autostart" checked={prefs.autoStart} onCheckedChange={(v) => setPrefs((p) => ({ ...p, autoStart: v }))} data-testid="pomodoro-autostart" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
