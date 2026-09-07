import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Wind, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";
import { startSynth, stopSynth, setSynthVolume } from "@/lib/pomodoroSynth";

type Phase = "inhale" | "hold-in" | "exhale" | "hold-out";

type Pattern = {
  id: string;
  name: string;
  emoji: string;
  goal: string;
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
    name: "Box · ۴-۴-۴-۴",
    emoji: "🟦",
    goal: "آرامش متمرکز و کنترل استرس — مناسب قبل از جلسه/امتحان.",
    inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, loops: 8,
    ambient: "calm_pad",
    color: "from-sky-500 via-blue-500 to-indigo-500",
  },
  {
    id: "478",
    name: "۴-۷-۸ · خواب",
    emoji: "🌙",
    goal: "آرام‌سازی سریع سیستم عصبی — قبل از خواب.",
    inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, loops: 6,
    ambient: "binaural_delta",
    color: "from-indigo-600 via-purple-600 to-violet-700",
  },
  {
    id: "coherent",
    name: "Coherent · ۵-۵",
    emoji: "💗",
    goal: "هماهنگی ضربان قلب و تنفس — تعادل احساسی.",
    inhale: 5, holdIn: 0, exhale: 5, holdOut: 0, loops: 12,
    ambient: "binaural_alpha",
    color: "from-rose-500 via-pink-500 to-fuchsia-500",
  },
  {
    id: "energizing",
    name: "Energizing · ۶-۲-۴",
    emoji: "⚡",
    goal: "افزایش انرژی و بیداری — جایگزین قهوه‌ی بعدازظهر.",
    inhale: 6, holdIn: 2, exhale: 4, holdOut: 0, loops: 10,
    ambient: "binaural_beta",
    color: "from-amber-500 via-orange-500 to-red-500",
  },
  {
    id: "wimhof",
    name: "Wim Hof سبک",
    emoji: "❄️",
    goal: "تحریک سیستم سمپاتیک — تمرکز و مقاومت ذهنی.",
    inhale: 2, holdIn: 0, exhale: 2, holdOut: 0, loops: 30,
    ambient: "wind",
    color: "from-cyan-500 via-teal-500 to-emerald-500",
  },
];

const PHASE_LABEL: Record<Phase, string> = {
  inhale: "دم",
  "hold-in": "نگه‌داشتن",
  exhale: "بازدم",
  "hold-out": "نگه‌داشتن",
};

export default function BreathingView() {
  const [pattern, setPattern] = useState<Pattern>(PATTERNS[0]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [phaseLeft, setPhaseLeft] = useState(0); // remaining seconds (float, for smooth display)
  const [phaseTotal, setPhaseTotal] = useState(0);
  const [loop, setLoop] = useState(0);
  const [ambient, setAmbient] = useState(true);
  const [vol, setVol] = useState(35);

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
      phaseIdxRef.current = 0;
      loopRef.current = 0;
      const first = sequence[0];
      setPhase(first?.phase || "inhale");
      setPhaseTotal(first?.dur || 0);
      setPhaseLeft(first?.dur || 0);
      setLoop(0);
    }
  }, [sequence]);

  // Reset on pattern change
  useEffect(() => {
    stop(true);
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
    const seq = sequence;
    if (!seq.length) { stop(true); return; }
    let idx = phaseIdxRef.current;
    let cur = seq[idx];
    let elapsed = (now - phaseStartRef.current) / 1000;

    // Advance through any completed phases (in case of tab throttling jumps)
    while (elapsed >= cur.dur) {
      elapsed -= cur.dur;
      idx += 1;
      if (idx >= seq.length) {
        idx = 0;
        loopRef.current += 1;
        if (loopRef.current >= pattern.loops) {
          stop(true);
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
    rafRef.current = requestAnimationFrame(loop_);
  }, [sequence, pattern.loops, stop]);

  const start = () => {
    if (runningRef.current) return;
    if (!sequence.length) return;
    phaseIdxRef.current = 0;
    loopRef.current = 0;
    phaseStartRef.current = performance.now();
    const first = sequence[0];
    setPhase(first.phase);
    setPhaseTotal(first.dur);
    setPhaseLeft(first.dur);
    setLoop(0);
    runningRef.current = true;
    setRunning(true);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop_);
  };

  const pause = () => {
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
    const elapsedInPhase = cur.dur - phaseLeft;
    phaseStartRef.current = performance.now() - elapsedInPhase * 1000;
    runningRef.current = true;
    setRunning(true);
    rafRef.current = requestAnimationFrame(loop_);
  };

  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); stopSynth(); }, []);

  // Visual scale for the orb — based on continuous phaseLeft
  const total = phaseTotal || 1;
  const elapsed = Math.max(0, total - phaseLeft);
  const t = Math.max(0, Math.min(1, elapsed / total));
  const eased = 0.5 - Math.cos(Math.PI * t) / 2;
  const scale =
    phase === "inhale" ? 0.55 + eased * 0.6 :
    phase === "exhale" ? 1.15 - eased * 0.6 :
    phase === "hold-in" ? 1.15 :
    0.55;

  const displaySeconds = Math.max(1, Math.ceil(phaseLeft));

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2">
        <Wind className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">تمرین تنفس ۳بعدی</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        تنفس آگاهانه با راهنمای بصری. مناسب قبل از جلسه، خواب، یا برای تنظیم انرژی.
      </p>

      {/* Pattern picker */}
      <div className="grid grid-cols-2 gap-2">
        {PATTERNS.map((p) => {
          const active = pattern.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPattern(p)}
              className={`relative overflow-hidden rounded-2xl p-3 text-start text-white transition shadow-sm bg-gradient-to-br ${p.color} ${active ? "ring-2 ring-primary scale-[1.02]" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="text-xs opacity-90">{p.emoji} {p.loops} دور</div>
              <div className="font-bold mt-1">{p.name}</div>
              <div className="text-[11px] opacity-90 mt-1 leading-snug">{p.goal}</div>
            </button>
          );
        })}
      </div>

      {/* 3D Orb visualizer */}
      <Card className={`relative overflow-hidden p-6 bg-gradient-to-br ${pattern.color}`}>
        <div className="absolute -top-12 -end-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-center justify-center h-72" style={{ perspective: 800 }}>
          {/* Outer pulse ring */}
          <div
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
            className="rounded-full bg-gradient-to-br from-white/80 via-white/40 to-white/10 backdrop-blur"
            style={{
              width: 200, height: 200,
              transform: `scale(${scale}) rotateX(15deg) rotateY(${t * 30}deg)`,
              transition: "none",
              willChange: "transform",
              boxShadow: "0 30px 60px rgba(0,0,0,0.25), 0 0 90px rgba(255,255,255,0.35)",
            }}
          />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
            <div className="text-3xl font-extrabold tabular-nums drop-shadow">{displaySeconds || phaseTotal || "—"}</div>
            <div className="text-sm font-medium opacity-95 mt-1">{PHASE_LABEL[phase]}</div>
            {running && (
              <div className="text-[11px] opacity-80 mt-1">
                دور {loop + 1} از {pattern.loops}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex gap-2 justify-center mt-4">
          {!running ? (
            <Button onClick={phaseLeft > 0 && phaseLeft < phaseTotal ? resume : start} size="lg" className="bg-white text-foreground hover:bg-white/90">
              <Play className="w-5 h-5 me-1" /> {phaseLeft > 0 && phaseLeft < phaseTotal ? "ادامه" : "شروع"}
            </Button>
          ) : (
            <Button onClick={pause} size="lg" variant="secondary">
              <Pause className="w-5 h-5 me-1" /> توقف
            </Button>
          )}
          <Button onClick={() => stop(true)} size="lg" variant="outline" className="bg-white/15 text-white border-white/30 hover:bg-white/25">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Audio controls */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> صدای همراه
          </label>
          <Button size="sm" variant={ambient ? "default" : "outline"} onClick={() => setAmbient(v => !v)}>
            {ambient ? "روشن" : "خاموش"}
          </Button>
        </div>
        {ambient && (
          <div className="flex items-center gap-2">
            {vol === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
            <Slider value={[vol]} min={0} max={100} step={5} onValueChange={([v]) => setVol(v)} className="flex-1" />
            <span className="text-xs tabular-nums w-10 text-center">{vol}%</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          صدا متناسب با نوع تمرین انتخاب شده — برای امواج بتا/تتا/دلتا با هندزفری گوش بده.
        </p>
      </Card>

      <Card className="p-4 bg-muted/40 text-xs text-muted-foreground space-y-1">
        <div>💡 <b>نکته:</b> اگر سرگیجه گرفتی، تمرین را قطع کن و عادی نفس بکش.</div>
        <div>🩺 این تمرین جایگزین درمان نیست. در صورت بیماری قلبی/تنفسی با پزشک مشورت کن.</div>
      </Card>
    </div>
  );
}
