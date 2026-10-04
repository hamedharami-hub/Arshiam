import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { getGardenState } from "@/lib/garden";
import { ISLAND_UNLOCK_EVENT, type Material } from "@/lib/island";
import "./island.css";

const CONFETTI_COLORS = ["#d9a93a", "#7cc46a", "#5fb4d6", "#c0674a", "#e8e2d6", "#a0703f"];
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.08,
  duration: 1.6 + ((i * 13) % 9) / 10,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: (i * 47) % 360,
}));

function playUnlockSound() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch { /* sound is optional */ }
}

/** Global, non-blocking celebration shown whenever a new island material unlocks. */
export function IslandUnlockCelebration() {
  const { T, isEn } = useBilingual();
  const [materials, setMaterials] = useState<Material[] | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const onUnlock = (e: Event) => {
      const list = (e as CustomEvent<Material[]>).detail;
      if (!list?.length) return;
      setMaterials(list);
      let soundOn = true;
      try { soundOn = getGardenState().soundEnabled !== false; } catch { /* default on */ }
      if (soundOn) playUnlockSound();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMaterials(null), 4200);
    };
    window.addEventListener(ISLAND_UNLOCK_EVENT, onUnlock);
    return () => { window.removeEventListener(ISLAND_UNLOCK_EVENT, onUnlock); window.clearTimeout(timer); };
  }, []);

  if (!materials) return null;
  const names = materials.map((m) => (isEn ? m.en : m.fa)).join(isEn ? ", " : "، ");

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden" data-testid="island-unlock-celebration" dir={isEn ? "ltr" : "rtl"} role="status" aria-live="polite">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="island-confetti"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, transform: `rotate(${p.rotate}deg)` }}
        />
      ))}
      <div className="absolute inset-x-0 top-20 flex justify-center px-4">
      <div className="island-unlock-card pointer-events-auto w-full max-w-[380px] rounded-3xl border bg-background/85 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
            {materials.map((m) => <span key={m.id} className="island-unlock-swatch size-12 rounded-2xl border-2 border-background shadow-md" style={{ background: m.color }} />)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary"><PartyPopper className="size-4" />{T("مصالح تازه باز شد!", "New material unlocked!")}</p>
            <h2 className="mt-1 text-lg font-semibold" data-testid="island-unlock-title">{names}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{T("حالا سازه‌های تازه‌ای در «جزیرهٔ من» در دسترس شماست.", "New buildings are now available on My Island.")}</p>
          </div>
          <Button size="icon" variant="ghost" className="-me-2 -mt-2 size-9 shrink-0" onClick={() => setMaterials(null)} aria-label={T("بستن", "Close")} data-testid="island-unlock-close"><X className="size-4" /></Button>
        </div>
      </div>
      </div>
    </div>
  );
}
