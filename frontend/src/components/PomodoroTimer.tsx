import { useEffect, useRef, useState, type TouchEvent as RTouchEvent } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Music2, Settings2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FOCUS_SOUNDS } from "@/lib/focusSounds";
import { END_BELLS, playEndBell, type EndBellId } from "@/lib/pomodoroSounds";
import { useTapGestures } from "@/lib/useTapGestures";
import { haptic } from "@/lib/haptics";
import { toPersianDigits } from "@/lib/persianDigits";
import { useFocusSession } from "@/hooks/useFocusSession";
import { DEFAULT_PREFS, getFocusState, updateFocusPrefs, switchFocusMode, toggleFocus, resetFocus, skipFocus, finishFocus, type Prefs, type Mode } from "@/lib/focusSession";
import { previewFocusSound } from "@/lib/focusAudio";

type Props = {
  taskId?: string | null;
  taskTitle?: string;
  defaultMinutes?: number;
  compact?: boolean;
  onSessionComplete?: () => void;
};
export { loadSession, loadCount } from "@/lib/focusSession";
export default function PomodoroTimer({ taskId = null, taskTitle = "", defaultMinutes, compact = false, onSessionComplete }: Props) {
  const focus = useFocusSession();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const prefs = focus?.prefs || DEFAULT_PREFS;
  const session = focus?.session;
  const mode = session?.mode || "work";
  const remaining = session?.remaining ?? prefs.minutes * 60;
  const doneToday = focus?.doneToday || 0;
  const running = session?.endAt != null;
  const total = session?.total || (mode === "work" ? prefs.minutes : mode === "short" ? prefs.shortBreak : prefs.longBreak) * 60;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const lastCompleted = useRef(focus?.completedVersion);
  useEffect(() => {
    if (!focus) return;
    if (lastCompleted.current !== undefined && lastCompleted.current !== focus.completedVersion) onSessionComplete?.();
    lastCompleted.current = focus.completedVersion;
  }, [focus?.completedVersion, onSessionComplete]);
  useEffect(() => { if (defaultMinutes && !getFocusState().session.startedAt) updateFocusPrefs({ minutes: defaultMinutes }); }, [defaultMinutes]);
  const setPrefs = (fn: (p: Prefs) => Prefs) => updateFocusPrefs(fn(prefs));
  const switchMode = (m: Mode) => switchFocusMode(m);
  const toggle = () => toggleFocus(taskId, taskTitle);
  const reset = resetFocus;
  const skip = skipFocus;
  const setWorkMinutes = (v: number) => updateFocusPrefs({ minutes: v });

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
    if (!s || !t || running || session?.startedAt) return;
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
  const cycleDone = (session?.cycle || 0) % prefs.longEvery;
  const currentSound = FOCUS_SOUNDS.find((s) => s.id === prefs.ambient);

  return (
    <div className="space-y-5" data-testid="pomodoro-timer">
      {session?.startedAt && session.taskId !== taskId && <p className="text-xs text-muted-foreground" role="status">{T("جلسهٔ فعال:", "Active session:")} {session.taskTitle || T("تمرکز آزاد", "Free focus")}</p>}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            disabled={running || Boolean(session?.startedAt)}
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

        {session?.startedAt && (
          <Button variant="ghost" size="sm" onClick={() => finishFocus(false)} data-testid="pomodoro-finish">{T("پایان و ثبت زمان", "Finish and save time")}</Button>
        )}
        {focus?.storageError && session?.startedAt && <Button size="sm" variant="outline" onClick={() => finishFocus(remaining === 0)}>{T("تلاش دوباره برای ذخیره", "Retry saving")}</Button>}
        {(focus?.pending || focus?.storageError) ? <p role="status" className="text-xs text-muted-foreground">{focus.storageError ? T("ذخیرهٔ محلی در دسترس نیست؛ جلسه را باز نگه دارید.", "Local storage unavailable; keep this session open.") : T("جلسه در انتظار همگام‌سازی", "Session awaiting sync")}</p> : null}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" data-testid="pomodoro-sessions">
          <div className="flex gap-1">
            {Array.from({ length: prefs.longEvery }).map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i < cycleDone ? "bg-primary" : "bg-muted-foreground/25"}`} />
            ))}
          </div>
          <span>{T(`امروز ${num(doneToday)} جلسه`, `${doneToday} today`)}</span>
        </div>
      </div>

      {!running && !session?.startedAt && mode === "work" && (
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
          {[{ id: "none", emoji: "", name: "بی‌صدا", nameEn: "Off" }, ...FOCUS_SOUNDS].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setPrefs((p) => ({ ...p, ambient: s.id })); if (!running) previewFocusSound(s.id, prefs.ambientVol); }}
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
            <Select value={prefs.bell} onValueChange={(v) => { setPrefs((p) => ({ ...p, bell: v as EndBellId })); playEndBell(v as EndBellId, prefs.bellVol); }}>
              <SelectTrigger className="h-8 w-40 text-xs" data-testid="pomodoro-bell-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {END_BELLS.map((b) => <SelectItem key={b.id} value={b.id}>{b.emoji} {T(b.name, b.nameEn)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">{T("بلندی زنگ پایان", "End bell volume")}</Label>
            <Slider value={[prefs.bellVol]} min={0} max={100} step={5} onValueChange={([v]) => updateFocusPrefs({ bellVol: v })} aria-label={T("بلندی زنگ پایان", "End bell volume")} className="flex-1" data-testid="pomodoro-bell-volume" />
          </div>
          {session?.startedAt && session.taskId !== taskId && <p className="text-xs text-muted-foreground" role="status">{T("جلسهٔ فعال:", "Active session:")} {session.taskTitle || T("تمرکز آزاد", "Free focus")}</p>}
      <div className="grid grid-cols-3 gap-2">
            {([["shortBreak", "استراحت کوتاه", "Short break", [3, 5, 10]], ["longBreak", "استراحت بلند", "Long break", [10, 15, 20, 30]], ["longEvery", "بلند بعد از", "Long every", [2, 3, 4, 5, 6]]] as const).map(([key, fa, en, opts]) => (
              <div key={key} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{T(fa, en)}</Label>
                <Select value={String(prefs[key])} onValueChange={(v) => { setPrefs((p) => ({ ...p, [key]: Number(v) })); }}>
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
