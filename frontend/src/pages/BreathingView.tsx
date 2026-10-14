import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Wind, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";
import { startSynth, stopSynth, setSynthVolume } from "@/lib/pomodoroSynth";
import { useBilingual } from "@/hooks/useBilingual";
import { awardWaterDrops } from "@/lib/garden";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { recordMindFeedback } from "@/lib/mind/feedback";

type Phase = "inhale" | "hold-in" | "exhale" | "hold-out";

type Pattern = {
  id: string;
  name_fa: string;
  name_en: string;
  emoji: string;
  goal_fa: string;
  goal_en: string;
  // seconds for each phase, 0 means skip
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  loops: number;
  ambient?: string; // optional default ambient
  color: string;   // tailwind gradient
};

const PATTERNS: Pattern[] = [
  {
    id: "box",
    name_fa: "Box · ۴-۴-۴-۴",
    name_en: "Box · 4-4-4-4",
    emoji: "🟦",
    goal_fa: "الگوی چهارمرحله‌ای با حبس نفس؛ فقط در صورت راحتی انتخاب کن.",
    goal_en: "Four-phase pattern with breath holds; choose only if comfortable.",
    inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, loops: 8,
    ambient: "calm_pad",
    color: "from-sky-500 via-blue-500 to-indigo-500",
  },
  {
    id: "478",
    name_fa: "۴-۷-۸ · خواب",
    name_en: "4-7-8 · Sleep",
    emoji: "🌙",
    goal_fa: "یک تمرین اختیاری قبل از خواب؛ اثر آرام‌بخشی برای همه یکسان نیست.",
    goal_en: "Optional bedtime practice; calming effects vary.",
    inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, loops: 6,
    ambient: "binaural_delta",
    color: "from-indigo-600 via-purple-600 to-violet-700",
  },
  {
    id: "coherent",
    name_fa: "Coherent · ۵-۵",
    name_en: "Coherent · 5-5",
    emoji: "💗",
    goal_fa: "تنفس آهسته و یکنواخت؛ ممکن است به آرامش کمک کند.",
    goal_en: "Slow, even breathing; may support a sense of calm.",
    inhale: 5, holdIn: 0, exhale: 5, holdOut: 0, loops: 12,
    ambient: "binaural_alpha",
    color: "from-rose-500 via-pink-500 to-fuchsia-500",
  },
  {
    id: "energizing",
    name_fa: "دم بلندتر · ۶-۲-۴",
    name_en: "Longer inhale · 6-2-4",
    emoji: "⚡",
    goal_fa: "دم ۶ ثانیه، مکث ۲ و بازدم ۴؛ جایگزین قهوه یا درمان نیست.",
    goal_en: "6-second inhale, 2-second hold, 4-second exhale; not a coffee or treatment substitute.",
    inhale: 6, holdIn: 2, exhale: 4, holdOut: 0, loops: 10,
    ambient: "binaural_beta",
    color: "from-amber-500 via-orange-500 to-red-500",
  },
  {
    id: "wimhof",
    name_fa: "ریتم سریع‌تر · ۲-۲",
    name_en: "Faster rhythm · 2-2",
    emoji: "❄️",
    goal_fa: "ریتم سریع‌تر؛ اثر آن متفاوت است. نفس را به زور عمیق نکن و در صورت ناراحتی توقف کن.",
    goal_en: "Faster rhythm; effects vary. Do not force deep breaths; stop if uncomfortable.",
    inhale: 2, holdIn: 0, exhale: 2, holdOut: 0, loops: 30,
    ambient: "wind",
    color: "from-cyan-500 via-teal-500 to-emerald-500",
  },
];

const PHASE_LABEL: Record<Phase, { fa: string; en: string }> = {
  inhale: { fa: "دم", en: "Inhale" },
  "hold-in": { fa: "نگه‌داشتن", en: "Hold" },
  exhale: { fa: "بازدم", en: "Exhale" },
  "hold-out": { fa: "نگه‌داشتن", en: "Hold" },
};

/** The breathing cycle is driven by requestAnimationFrame, so it must also
    honour the OS "reduce motion" setting instead of only relying on the CSS
    animation-duration override in index.css. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

export default function BreathingView() {
  const { user } = useAuth();
  return <BreathingEditor key={user?.id || "guest"} ownerId={user?.id} />;
}

function BreathingEditor({ ownerId }: { ownerId: string | undefined }) {
  const { T, isEn } = useBilingual();
  const reducedMotion = usePrefersReducedMotion();
  const [pattern, setPattern] = useState<Pattern>(PATTERNS.find(p => p.id === "coherent")!);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [phaseLeft, setPhaseLeft] = useState(0); // remaining seconds (float, for smooth display)
  const [phaseTotal, setPhaseTotal] = useState(0);
  const [loop, setLoop] = useState(0);
  const [ambient, setAmbient] = useState(false);
  const [vol, setVol] = useState(35);
  const [completedSession, setCompletedSession] = useState(false);
  const [postMood, setPostMood] = useState<number | null>(null);
  const [moodSkipped, setMoodSkipped] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const lastFrameRef = useRef(0);
  const remainingRef = useRef(0);
  const autoStartedRef = useRef(false);

  const rafRef = useRef<number | null>(null);
  const phaseStartRef = useRef<number>(0);   // performance.now() when current phase started
  const phaseIdxRef = useRef<number>(0);
  const loopRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  // Build the phase sequence skipping zero-length phases
  const sequence = useMemo<Array<{ phase: Phase; dur: number }>>(() => {
    const seq: Array<{ phase: Phase; dur: number }> = [];
    if (pattern.inhale > 0) seq.push({ phase: "inhale", dur: pattern.inhale });
    if (pattern.holdIn > 0) seq.push({ phase: "hold-in", dur: pattern.holdIn });
    if (pattern.exhale > 0) seq.push({ phase: "exhale", dur: pattern.exhale });
    if (pattern.holdOut > 0) seq.push({ phase: "hold-out", dur: pattern.holdOut });
    return seq;
  }, [pattern]);

  const stop = useCallback((reset = false) => {
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    stopSynth();
    if (reset) {
      setPaused(false);
      phaseIdxRef.current = 0;
      loopRef.current = 0;
      const first = sequence[0];
      setPhase(first?.phase || "inhale");
      setPhaseTotal(first?.dur || 0);
      setPhaseLeft(first?.dur || 0);
      remainingRef.current = first?.dur || 0;
      setLoop(0);
    }
  }, [sequence]);

  // Reset on pattern change
  useEffect(() => {
    stop(true);
    setCompletedSession(false);
    setPostMood(null);
    setMoodSkipped(false);
    setFeedbackSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern.id]);

  // Ambient
  useEffect(() => {
    if (running && ambient && pattern.ambient) startSynth(pattern.ambient, vol);
    else stopSynth();
    return () => { stopSynth(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ambient, pattern.id]);
  useEffect(() => { setSynthVolume(vol); }, [vol]);

  const loop_ = useCallback(() => {
    if (!runningRef.current) return;
    const now = performance.now();
    // Hidden tabs and long frame gaps are not evidence of participation.
    if (document.hidden || now - lastFrameRef.current > 1000) {
      stop();
      setPaused(true);
      return;
    }
    lastFrameRef.current = now;
    const seq = sequence;
    if (!seq.length) { stop(true); return; }
    let idx = phaseIdxRef.current;
    let cur = seq[idx];
    let elapsed = (now - phaseStartRef.current) / 1000;

    // Advance only through observed foreground time.
    while (elapsed >= cur.dur) {
      elapsed -= cur.dur;
      idx += 1;
      if (idx >= seq.length) {
        idx = 0;
        loopRef.current += 1;
        if (loopRef.current >= pattern.loops) {
          stop(true);
          awardWaterDrops(10, isEn ? "Mindful Breathing Session" : "تمرین تنفس آگاهانه");
          setCompletedSession(true);
          toast.success(T("راهنمای زمان‌بندی به پایان رسید؛ اثر تمرین را خودت انتخاب می‌کنی.", "The guided timer ended; only you can report its effect."));
          return;
        }
        setLoop(loopRef.current);
      }
      cur = seq[idx];
      phaseStartRef.current = now - elapsed * 1000;
      phaseIdxRef.current = idx;
      setPhase(cur.phase);
      setPhaseTotal(cur.dur);
    }

    const left = Math.max(0, cur.dur - elapsed);
    setPhaseLeft(left);
    remainingRef.current = left;
    rafRef.current = requestAnimationFrame(loop_);
  }, [sequence, pattern.loops, stop, isEn, T]);

  const start = () => {
    if (runningRef.current) return;
    if (!sequence.length) return;
    setCompletedSession(false);
    setPostMood(null);
    setMoodSkipped(false);
    setFeedbackSaved(false);
    setPaused(false);
    setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    phaseIdxRef.current = 0;
    loopRef.current = 0;
    phaseStartRef.current = performance.now();
    lastFrameRef.current = phaseStartRef.current;
    const first = sequence[0];
    setPhase(first.phase);
    setPhaseTotal(first.dur);
    setPhaseLeft(first.dur);
    remainingRef.current = first.dur;
    setLoop(0);
    runningRef.current = true;
    setRunning(true);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop_);
  };

  const pause = () => {
    setPaused(true);
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    stopSynth();
  };

  const resume = () => {
    if (runningRef.current) return;
    if (!sequence.length) return;
    // continue from current phaseLeft
    const cur = sequence[phaseIdxRef.current] || sequence[0];
    const elapsedInPhase = cur.dur - remainingRef.current;
    phaseStartRef.current = performance.now() - elapsedInPhase * 1000;
    lastFrameRef.current = performance.now();
    setPaused(false);
    runningRef.current = true;
    setRunning(true);
    rafRef.current = requestAnimationFrame(loop_);
  };

  // This effect follows pattern reset: quick-start must not be stopped by setup.
  useEffect(() => {
    if (autoStartedRef.current || new URLSearchParams(window.location.search).get("start") !== "1" || document.hidden) return;
    autoStartedRef.current = true;
    start();
    return () => { autoStartedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && runningRef.current) {
        runningRef.current = false;
        setRunning(false);
        setPaused(true);
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        stopSynth();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { runningRef.current = false; document.removeEventListener("visibilitychange", onVisibility); if (rafRef.current != null) cancelAnimationFrame(rafRef.current); stopSynth(); };
  }, []);

  const saveFeedback = () => {
    if (!ownerId || postMood === null || feedbackSaved || !sessionId) return;
    const response = postMood <= 3 ? "helpful" : postMood === 4 ? "no_change" : postMood === 5 ? "uncomfortable" : "unsure";
    const ok = recordMindFeedback(ownerId, { toolId: "breathing", toolVersion: `2:${pattern.id}`, sessionId, response });
    if (ok) setFeedbackSaved(true);
    else toast.error(T("بازخورد حفظ نشد؛ دوباره تلاش کن.", "Feedback was not retained; please retry."));
  };

  // Visual scale for the orb — based on continuous phaseLeft
  const total = phaseTotal || 1;
  const elapsed = Math.max(0, total - phaseLeft);
  const t = Math.max(0, Math.min(1, elapsed / total));
  const eased = 0.5 - Math.cos(Math.PI * t) / 2;
  const phaseScale =
    phase === "inhale" ? 0.55 + eased * 0.6 :
    phase === "exhale" ? 1.15 - eased * 0.6 :
    phase === "hold-in" ? 1.15 :
    0.55;
  // Reduced motion: keep the guidance/timer, freeze the pulsing + rotating orb
  // so the JS-driven cycle produces no continuous visual motion.
  const scale = reducedMotion ? 1 : phaseScale;
  const orbRotateY = reducedMotion ? 0 : t * 30;

  const displaySeconds = Math.max(1, Math.ceil(phaseLeft));

  return (
    <div className="page-shell page-shell--sm space-y-5 animate-fade-in" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex items-center gap-2">
        <Wind className="w-6 h-6 text-primary" />
        <HeaderTitlePortal title={T("تمرین تنفس ۳بعدی", "3D Breathing Practice")} />
      </div>
      <p className="text-sm text-muted-foreground">
        {T(
          "راهنمای اختیاری تنفس؛ پیش‌فرض ۵-۵ بدون حبس نفس است. اثر آن برای افراد متفاوت است.",
          "Optional paced breathing; the default 5-5 rhythm has no breath holds. Effects vary."
        )}
      </p>
      <Card className="p-4 text-sm space-y-2">
        <p>{T("پیش از شروع: نشسته و در جای امن تمرین کن؛ نه هنگام رانندگی، در آب یا جایی که افتادن خطرناک است. نفس را عمیق یا طولانی به زور نگه ندار. اگر سرگیجه، تنگی نفس یا ناراحتی داشتی، توقف کن و عادی نفس بکش.", "Before starting: sit somewhere safe, never while driving, in water, or where falling is dangerous. Do not force deep breaths or holds. Stop and breathe normally if dizzy, breathless, or uncomfortable.")}</p>
        <p>{T("این تمرین درمان نیست؛ در بیماری قلبی/تنفسی، بارداری یا سابقهٔ غش دربارهٔ حبس نفس با پزشک مشورت کن.", "This is not treatment. Ask a clinician about breath holds if you have heart/lung conditions, are pregnant, or have a history of fainting.")}</p>
        <Link className="inline-flex min-h-10 items-center text-primary underline" to="/app/calm#grounding">{T("گزینهٔ بدون تمرکز بر نفس: زمین‌گیری با حواس", "Prefer not to focus on breathing? Try sensory grounding")}</Link>
      </Card>

      {/* Pattern picker */}
      <div className="grid grid-cols-2 gap-2">
        {PATTERNS.map((p) => {
          const active = pattern.id === p.id;
          return (
            <button
              key={p.id}
               onClick={() => setPattern(p)}
               aria-pressed={active}
              className={`relative overflow-hidden rounded-2xl p-3 text-start text-white transition shadow-sm bg-gradient-to-br ${p.color} ${active ? "ring-2 ring-primary scale-[1.02]" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="text-xs opacity-90">{p.emoji} {isEn ? `${p.loops} cycles · about ${Math.round((p.inhale + p.holdIn + p.exhale + p.holdOut) * p.loops / 60)} min` : `${p.loops} دور · حدود ${Math.round((p.inhale + p.holdIn + p.exhale + p.holdOut) * p.loops / 60)} دقیقه`}</div>
              <div className="font-bold mt-1">{isEn ? p.name_en : p.name_fa}</div>
              <div className="text-[11px] opacity-90 mt-1 leading-snug">{isEn ? p.goal_en : p.goal_fa}</div>
            </button>
          );
        })}
      </div>

      {/* 3D Orb visualizer */}
      <Card className={`relative overflow-hidden p-6 bg-gradient-to-br ${pattern.color}`}>
        <div className="absolute -top-12 -end-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div
          className="relative flex items-center justify-center h-72"
          style={{ perspective: 800 }}
          role="img"
          aria-label={T(
            `راهنمای تنفس: ${PHASE_LABEL[phase].fa}`,
            `Breathing guide: ${PHASE_LABEL[phase].en}`
          )}
        >
          {/* Outer pulse ring */}
          <div
            aria-hidden="true"
            className="absolute rounded-full border border-white/30"
            style={{
              width: 240, height: 240,
              transform: `scale(${scale * 1.15}) rotateX(15deg)`,
              transition: "none",
              boxShadow: "0 0 80px rgba(255,255,255,0.18) inset",
            }}
          />
          {/* Inner orb */}
          <div
            aria-hidden="true"
            className="rounded-full bg-gradient-to-br from-white/80 via-white/40 to-white/10 backdrop-blur"
            style={{
              width: 200, height: 200,
              transform: `scale(${scale}) rotateX(15deg) rotateY(${orbRotateY}deg)`,
              transition: "none",
              willChange: reducedMotion ? "auto" : "transform",
              boxShadow: "0 30px 60px rgba(0,0,0,0.25), 0 0 90px rgba(255,255,255,0.35)",
            }}
          />
          {/* Center text */}
          <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
            <div className="text-3xl font-extrabold tabular-nums drop-shadow">{displaySeconds || phaseTotal || "—"}</div>
            <div className="text-sm font-medium opacity-95 mt-1">{isEn ? PHASE_LABEL[phase].en : PHASE_LABEL[phase].fa}</div>
            {running && (
              <div className="text-[11px] opacity-80 mt-1">
                {isEn ? `Cycle ${loop + 1} of ${pattern.loops}` : `دور ${loop + 1} از ${pattern.loops}`}
              </div>
            )}
          </div>
        </div>

        {/* Screen-reader rhythm: announce each phase change politely. */}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {running ? (isEn ? PHASE_LABEL[phase].en : PHASE_LABEL[phase].fa) : ""}
        </p>

        <div className="relative flex gap-2 justify-center mt-4">
          {!running ? (
            <Button onClick={paused ? resume : start} size="lg" className="bg-white text-foreground hover:bg-white/90">
              <Play className="w-5 h-5 me-1" /> {paused ? T("ادامه", "Resume") : T("شروع", "Start")}
            </Button>
          ) : (
            <Button onClick={pause} size="lg" variant="secondary">
              <Pause className="w-5 h-5 me-1" /> {T("توقف", "Pause")}
            </Button>
          )}
          <Button aria-label={T("بازنشانی تمرین", "Reset exercise")} onClick={() => { stop(true); setCompletedSession(false); }} size="lg" variant="outline" className="bg-white/15 text-white border-white/30 hover:bg-white/25">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
        {paused && <p role="status" className="relative text-center text-white text-sm mt-3">{T("متوقف شده؛ برای ادامه خودت انتخاب کن. زمان پس‌زمینه شمرده نمی‌شود.", "Paused. Resume when you choose; background time is not counted.")}</p>}
        {sessionId && !completedSession && <Button className="relative mt-3 w-full" variant="secondary" onClick={() => { stop(); setPaused(false); setCompletedSession(true); }}>{T("فعلاً کافی است", "Enough for now")}</Button>}
      </Card>

      {/* Completion & Post-Session Mood Check */}
      {completedSession && (
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>{T("تمرین را اینجا تمام می‌کنیم.", "The practice ends here.")}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {T("اثر تمرین برای هر فرد متفاوت است و از پایان تمرین نمی‌توان وضعیت سیستم عصبی را تعیین کرد. الان احساست چطوره؟ (اختیاری)", "Effects vary; completing the exercise does not establish a change in your nervous system. How are you feeling now? (Optional)")}
          </p>
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {[
              { emoji: "😌", label: T("آرام‌تر", "Calmer"), val: 1 },
              { emoji: "⚡", label: T("پرانرژی‌تر", "Energized"), val: 2 },
              { emoji: "🎯", label: T("متمرکزتر", "Focused"), val: 3 },
              { emoji: "😐", label: T("بدون تغییر", "No change"), val: 4 },
              { emoji: "😟", label: T("بدتر یا ناراحت‌تر", "Worse or uncomfortable"), val: 5 },
              { emoji: "❓", label: T("مطمئن نیستم", "Not sure"), val: 6 },
            ].map((item) => (
              <button
                key={item.val}
                 type="button"
                 disabled={feedbackSaved}
                 aria-pressed={postMood === item.val}
                onClick={() => {
                  setPostMood(item.val);
                  setMoodSkipped(false);
                }}
                className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  postMood === item.val
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                    : "bg-card/70 hover:bg-card border-border/50 text-foreground"
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <Button disabled={feedbackSaved} variant="ghost" size="sm" onClick={() => { setPostMood(null); setMoodSkipped(true); }}>
              {T("رد کردن", "Skip")}
            </Button>
          </div>
          <Button variant="outline" disabled={!ownerId || postMood === null || feedbackSaved} onClick={saveFeedback}>{feedbackSaved ? T("بازخورد حفظ شد", "Feedback saved") : T("ذخیرهٔ بازخورد", "Save feedback")}</Button>
          <p className="text-xs">{T("فقط با انتخاب ذخیره، بازخورد در این دستگاه برای حساب تو حفظ می‌شود؛ پایان تایمر به‌معنای مفید بودن نیست.", "Only Save feedback retains your answer on this device for your account. Timer completion does not imply helpfulness.")}</p>
          {moodSkipped && <p role="status" className="text-xs">{T("پاسخی ثبت نشد؛ احساس تو نامشخص می‌ماند.", "No response recorded; your feeling remains unknown.")}</p>}
          {postMood === 5 && <p role="status" className="text-xs">{T("تمرین را ادامه نده و عادی نفس بکش. اگر علائم شدید یا ماندگار است، کمک پزشکی بگیر.", "Do not continue the exercise; breathe normally. Seek medical help for severe or persistent symptoms.")}</p>}
        </Card>
      )}

      {/* Audio controls */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> {T("صدای همراه", "Ambient Sound")}
          </label>
          <Button aria-label={T("صدای همراه", "Ambient sound")} aria-pressed={ambient} size="sm" variant={ambient ? "default" : "outline"} onClick={() => setAmbient(v => !v)}>
            {ambient ? T("روشن", "On") : T("خاموش", "Off")}
          </Button>
        </div>
        {ambient && (
          <div className="flex items-center gap-2">
            {vol === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
            <Slider aria-label={T("بلندی صدای همراه", "Ambient sound volume")} value={[vol]} min={0} max={100} step={5} onValueChange={([v]) => setVol(v)} className="flex-1" />
            <span className="text-xs tabular-nums w-10 text-center">{vol}%</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {T(
            "صدا فقط همراه اختیاری است؛ نام آلفا/بتا/دلتا توصیف صداست، نه اثبات تغییر امواج مغز یا اثر درمانی. صدای کم و حالت بی‌صدا هر دو معتبرند.",
            "Audio is optional. Alpha/beta/delta names describe sounds, not proven brainwave changes or treatment effects. Low volume or silence are both valid."
          )}
        </p>
      </Card>

      <Card className="p-4 bg-muted/40 text-xs text-muted-foreground space-y-1">
        <div>💡 <b>{T("نکته:", "Tip:")}</b> {T("اگر سرگیجه گرفتی، تمرین را قطع کن و عادی نفس بکش.", "If you feel dizzy, pause the exercise and breathe normally.")}</div>
        <div>🩺 {T("این تمرین جایگزین درمان نیست. در صورت بیماری قلبی/تنفسی با پزشک مشورت کن.", "This exercise is not a substitute for clinical care. Consult your doctor if you have cardiovascular or respiratory conditions.")}</div>
      </Card>
    </div>
  );
}
