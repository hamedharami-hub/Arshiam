import { useRef } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CalendarRange, Calendar, Leaf, CalendarClock } from "lucide-react";
import { horizonLabel, type Horizon } from "@/lib/timeHorizon";

const ICONS: Record<Horizon, any> = { day: CalendarDays, week: CalendarRange, month: Calendar, quarter: Leaf, year: CalendarClock };

/**
 * Horizontal day → year timeline. Tap a level, or zoom with pinch / ctrl+wheel / arrow keys.
 * Zooming in = finer level (towards "day").
 */
export function HorizonTimeline({ levels, value, onChange, lang }: {
  levels: Horizon[]; value: Horizon; onChange: (h: Horizon) => void; lang: "fa" | "en";
}) {
  const idx = levels.indexOf(value);
  const last = useRef(0);
  const pinch = useRef<number | null>(null);

  const zoom = (dir: 1 | -1) => {
    const now = Date.now();
    if (now - last.current < 320) return;
    last.current = now;
    const next = levels[Math.min(levels.length - 1, Math.max(0, idx + dir))];
    if (next !== value) onChange(next);
  };

  const dist = (e: React.TouchEvent) => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  return (
    <div
      className="relative flex items-stretch gap-1 rounded-2xl bg-muted/70 p-1 select-none touch-pan-x"
      role="tablist"
      aria-label={lang === "fa" ? "سطح زمانی" : "Time level"}
      data-testid="horizon-timeline"
      tabIndex={0}
      onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(e.deltaY < 0 ? -1 : 1); } }}
      onKeyDown={(e) => {
        if (e.key === "+" || e.key === "=") zoom(-1);
        if (e.key === "-") zoom(1);
      }}
      onTouchStart={(e) => { if (e.touches.length === 2) pinch.current = dist(e); }}
      onTouchMove={(e) => {
        if (e.touches.length !== 2 || pinch.current === null) return;
        const ratio = dist(e) / pinch.current;
        if (ratio > 1.3) { zoom(-1); pinch.current = dist(e); }
        else if (ratio < 0.75) { zoom(1); pinch.current = dist(e); }
      }}
      onTouchEnd={() => { pinch.current = null; }}
    >
      {levels.map((h) => {
        const Icon = ICONS[h];
        const active = h === value;
        return (
          <button
            key={h}
            role="tab"
            aria-selected={active}
            data-testid={`horizon-tab-${h}`}
            onClick={() => onChange(h)}
            className={`relative flex-1 min-w-0 h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {active && (
              <motion.span
                layoutId="horizon-indicator"
                className="absolute inset-0 rounded-xl bg-primary shadow-md"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative w-3.5 h-3.5 shrink-0" />
            <span className="relative truncate">{horizonLabel(h, lang)}</span>
          </button>
        );
      })}
    </div>
  );
}
