import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN = 1;
const MAX = 3;
const STEP = 0.5;
const DRAG_THRESHOLD = 6;

type Pt = { x: number; y: number };

export interface ZoomPanLabels { zoomIn: string; zoomOut: string; reset: string; hint: string }

/**
 * Zoom (buttons, pinch, ctrl/trackpad wheel) and drag-to-pan wrapper.
 * A drag never triggers a tile tap: clicks are swallowed when the pointer moved.
 */
export function ZoomPan({ children, labels, initialScale = 1 }: { children: ReactNode; labels: ZoomPanLabels; initialScale?: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initialScale);
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Pt>());
  const start = useRef<{ offset: Pt; pt: Pt; dist: number; scale: number } | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback((o: Pt, s: number): Pt => {
    const el = boxRef.current;
    if (!el) return o;
    const maxX = ((s - 1) * el.clientWidth) / 2;
    const maxY = ((s - 1) * el.clientHeight) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) };
  }, []);

  const zoomTo = useCallback((next: number) => {
    const s = Math.max(MIN, Math.min(MAX, Math.round(next * 100) / 100));
    setScale(s);
    setOffset((o) => clamp({ x: (o.x * s) / scale, y: (o.y * s) / scale }, s));
  }, [clamp, scale]);

  useEffect(() => { setOffset((o) => clamp(o, scale)); }, [scale, clamp]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // keep normal page scroll; trackpad pinch sends ctrl+wheel
      e.preventDefault();
      zoomTo(scale * (e.deltaY < 0 ? 1.12 : 0.89));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, zoomTo]);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const center = (): Pt => {
    const vals = [...pointers.current.values()];
    return { x: vals.reduce((n, p) => n + p.x, 0) / vals.length, y: vals.reduce((n, p) => n + p.y, 0) / vals.length };
  };
  const begin = () => { start.current = { offset, pt: center(), dist: distance(), scale }; };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moved.current = false;
    begin();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = center();
    const dx = c.x - start.current.pt.x, dy = c.y - start.current.pt.y;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD && pointers.current.size < 2) return;
    if (!moved.current) {
      moved.current = true;
      setDragging(true);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    let s = scale;
    if (pointers.current.size >= 2 && start.current.dist > 0) {
      s = Math.max(MIN, Math.min(MAX, start.current.scale * (distance() / start.current.dist)));
      setScale(s);
    }
    setOffset(clamp({ x: start.current.offset.x + dx, y: start.current.offset.y + dy }, s));
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) begin();
    else { start.current = null; setDragging(false); }
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false; }
  };

  const zoomed = scale > 1;
  return (
    <div className="relative">
      <div
        ref={boxRef}
        data-testid="island-zoom-surface"
        className={`island-zoom-surface overflow-hidden ${zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        <div
          className={`origin-center ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      <div className="absolute bottom-3 end-3 z-10 flex flex-col gap-1.5 rounded-2xl bg-background/80 p-1.5 shadow-sm backdrop-blur-md" data-testid="island-zoom-controls">
        <Button size="icon" variant="ghost" className="size-11 rounded-xl" onClick={() => zoomTo(scale + STEP)} disabled={scale >= MAX} aria-label={labels.zoomIn} data-testid="island-zoom-in"><Plus className="size-5" /></Button>
        <span className="text-center text-xs tabular-nums text-muted-foreground" data-testid="island-zoom-level">{Math.round(scale * 100)}%</span>
        <Button size="icon" variant="ghost" className="size-11 rounded-xl" onClick={() => zoomTo(scale - STEP)} disabled={scale <= MIN} aria-label={labels.zoomOut} data-testid="island-zoom-out"><Minus className="size-5" /></Button>
        <Button size="icon" variant="ghost" className="size-11 rounded-xl" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} disabled={!zoomed && !offset.x && !offset.y} aria-label={labels.reset} data-testid="island-zoom-reset"><RotateCcw className="size-4" /></Button>
      </div>
      {zoomed && <p className="pointer-events-none absolute bottom-3 start-3 z-10 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur-md" data-testid="island-drag-hint">{labels.hint}</p>}
    </div>
  );
}
