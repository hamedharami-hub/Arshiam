import { useCallback, useEffect, useRef, useState } from "react";
import { toPersianDigits } from "@/lib/persianDigits";

const ITEM_H = 34;
const VISIBLE = 5;

function Column({ count, value, onChange, fa, label, testid }: {
  count: number; value: number; onChange: (v: number) => void; fa: boolean; label: string; testid: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);
  const programmatic = useRef(false);

  // Keep the scroll position in sync with the value (initial mount and external changes).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ITEM_H) !== value) {
      programmatic.current = true;
      el.scrollTop = value * ITEM_H;
      window.setTimeout(() => { programmatic.current = false; }, 80);
    }
  }, [value]);

  const onScroll = () => {
    if (programmatic.current) return;
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.min(count - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      if (idx !== value) onChange(idx);
    }, 110);
  };
  useEffect(() => () => { if (settle.current) window.clearTimeout(settle.current); }, []);

  const fmt = (n: number) => { const s = String(n).padStart(2, "0"); return fa ? toPersianDigits(s) : s; };
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={label}
      data-testid={testid}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.min(count - 1, value + 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.max(0, value - 1)); }
      }}
      className="time-wheel-col no-scrollbar relative w-16 overflow-y-auto overscroll-contain rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{ height: ITEM_H * VISIBLE, scrollSnapType: "y mandatory" }}
    >
      <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2) }} aria-hidden />
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="option"
          aria-selected={i === value}
          onClick={() => {
            onChange(i);
            const el = ref.current;
            if (el) el.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
          }}
          className={`flex w-full items-center justify-center tabular-nums transition-colors ${i === value ? "text-lg font-semibold text-foreground" : "text-sm text-muted-foreground/70"}`}
          style={{ height: ITEM_H, scrollSnapAlign: "center" }}
        >
          {fmt(i)}
        </button>
      ))}
      <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2) }} aria-hidden />
    </div>
  );
}

/** Simple hour / minute wheel. Calls onChange once the wheel settles. */
export function TimeWheel({ value, onChange, fa }: { value: string; onChange: (hhmm: string) => void; fa: boolean }) {
  const parse = useCallback((v: string) => {
    const [h, m] = v.split(":").map(Number);
    return { h: Number.isFinite(h) ? h : 9, m: Number.isFinite(m) ? m : 0 };
  }, []);
  const [{ h, m }, setHm] = useState(() => parse(value));
  useEffect(() => { setHm(parse(value)); }, [value, parse]);
  const emit = (nh: number, nm: number) => {
    setHm({ h: nh, m: nm });
    onChange(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
  };
  return (
    <div dir="ltr" className="relative mx-auto flex w-fit items-center justify-center gap-1" data-testid="time-wheel">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg border border-[hsl(var(--rose-gold)/0.45)] bg-[hsl(var(--rose-gold)/0.08)]"
        style={{ height: ITEM_H }}
      />
      <Column count={24} value={h} onChange={(v) => emit(v, m)} fa={fa} label={fa ? "ساعت" : "Hour"} testid="time-wheel-hour" />
      <span className="z-10 text-lg font-semibold text-muted-foreground" aria-hidden>:</span>
      <Column count={60} value={m} onChange={(v) => emit(h, v)} fa={fa} label={fa ? "دقیقه" : "Minute"} testid="time-wheel-minute" />
    </div>
  );
}
