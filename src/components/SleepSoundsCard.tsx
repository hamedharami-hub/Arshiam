import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Play, Square, Volume2, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AMBIENT_SOUNDS } from "@/lib/ambientSounds";
import { startSynth, stopSynth, setSynthVolume, scheduleSleepFade, cancelSleepFade } from "@/lib/pomodoroSynth";
import { toPersianDigits } from "@/lib/persianDigits";
import { isPathAllowed, useModules } from "@/lib/appModules";

const SLEEP_IDS = ["sleep_music", "sleep_ocean_music", "sleep_rain_music", "sleep_pink", "sleep_brown", "sleep_delta_pink", "sleep_white", "sleep_lullaby"];
const TIMERS = [15, 30, 45, 60, 0];
const PREF_KEY = "sleep_sounds_prefs_v1";

export function SleepSoundsCard({ isEn }: { isEn: boolean }) {
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const [prefs, setPrefs] = useState(() => {
    try { return { sound: "sleep_music", minutes: 30, vol: 35, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; }
    catch { return { sound: "sleep_music", minutes: 30, vol: 35 }; }
  });
  const modules = useModules();
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const playing = endAt !== null;
  const sounds = SLEEP_IDS.map((id) => AMBIENT_SOUNDS.find((s) => s.id === id)).filter(Boolean) as typeof AMBIENT_SOUNDS;
  const hint = sounds.find((s) => s.id === prefs.sound)?.hint;

  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } }, [prefs]);

  const play = (sound = prefs.sound, minutes = prefs.minutes) => {
    startSynth(sound, prefs.vol);
    if (minutes > 0) {
      const total = minutes * 60;
      scheduleSleepFade(total, Math.min(600, total / 3), prefs.vol);
      setEndAt(Date.now() + total * 1000);
    } else { cancelSleepFade(); setEndAt(Infinity); }
  };
  const stop = () => { cancelSleepFade(); stopSynth(); setEndAt(null); };

  useEffect(() => {
    if (!endAt || endAt === Infinity) return;
    const tick = () => {
      const s = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) setEndAt(null);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => () => cancelSleepFade(), []);

  const pick = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (playing && (patch.sound || patch.minutes !== undefined)) play(next.sound, next.minutes);
  };
  const setVol = (v: number) => {
    setPrefs((p: typeof prefs) => ({ ...p, vol: v }));
    if (!playing) return;
    if (endAt && endAt !== Infinity) scheduleSleepFade(Math.max(1, (endAt - Date.now()) / 1000), Math.min(600, (prefs.minutes * 60) / 3), v);
    else setSynthVolume(v);
  };
  const chip = (active: boolean) => `inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`;
  const mmss = `${num(Math.floor(left / 60))}:${String(left % 60).padStart(2, "0").replace(/\d/g, (d) => num(Number(d)))}`;

  return (
    <Card className="p-4 space-y-4" data-testid="sleep-sounds-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold"><Moon className="h-4 w-4 text-primary" />{T("صداهای خواب", "Sleep sounds")}</div>
        {isPathAllowed("/app/breathing", modules) && <Link to="/app/breathing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="sleep-breathing-link">
          <Wind className="h-3.5 w-3.5" />{T("تمرین تنفس", "Breathing")}
        </Link>}
      </div>

      <div className="flex flex-wrap gap-1.5" data-testid="sleep-sound-chips">
        {sounds.map((s) => (
          <button key={s.id} type="button" onClick={() => pick({ sound: s.id })} className={chip(prefs.sound === s.id)} data-testid={`sleep-sound-${s.id}`}>
            <span>{s.emoji}</span>{T(s.name, s.nameEn)}
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-amber-600 dark:text-amber-400">{T(hint, "Experimental — use headphones")}</p>}

      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">{T("خاموشی تدریجی بعد از", "Fade out after")}</div>
        <div className="flex flex-wrap gap-1.5">
          {TIMERS.map((m) => (
            <button key={m} type="button" onClick={() => pick({ minutes: m })} className={chip(prefs.minutes === m)} data-testid={`sleep-timer-${m}`}>
              {m ? T(`${num(m)} دقیقه`, `${m} min`) : T("بدون توقف", "No limit")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button className="h-11 gap-2 rounded-full px-5" onClick={() => (playing ? stop() : play())} data-testid="sleep-play-toggle">
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? T("توقف", "Stop") : T("پخش", "Play")}
        </Button>
        <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Slider value={[prefs.vol]} min={0} max={100} step={5} onValueChange={([v]) => setVol(v)} dir={isEn ? "ltr" : "rtl"} className="flex-1" data-testid="sleep-volume" />
      </div>
      {playing && (
        <p className="text-xs text-muted-foreground" data-testid="sleep-remaining">
          {endAt === Infinity ? T("در حال پخش — بدون توقف خودکار", "Playing — no auto stop") : T(`${mmss} تا خاموشی · صدا در انتها آرام کم می‌شود`, `${mmss} left · fades out gently`)}
        </p>
      )}
    </Card>
  );
}
