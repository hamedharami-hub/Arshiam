import { useRef, useCallback, useEffect } from "react";
import { haptic } from "@/lib/haptics";

interface Options {
  onLongPress: () => void;
  delay?: number;
  moveTolerance?: number;
  ignoreButtons?: boolean;
}

/**
 * Long-press detector for touch devices. Returns spread-able touch handlers.
 * Cancels on move > tolerance, scroll, or touch end before delay.
 */
export function useLongPress({ onLongPress, delay = 480, moveTolerance = 10, ignoreButtons = false }: Options) {
  const timer = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const fired = useRef(false);
  const firedUntil = useRef(0);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => clear, [clear]);

  const onTouchStart = (e: React.TouchEvent) => {
    clear();
    fired.current = false;
    const t = e.touches[0];
    if (!t || e.touches.length !== 1) return;
    // Skip long-press if user started on a drag handle or interactive control we want to keep "pure".
    const tgt = e.target as HTMLElement | null;
    if (tgt?.closest("[data-drag-handle], [data-no-longpress], input, textarea, select, [contenteditable='true'], [role='checkbox']")) return;
    if (ignoreButtons && tgt?.closest("button") && !tgt.closest("[data-task-row-open]")) return;
    if (window.getSelection()?.toString()) return;
    e.stopPropagation();
    startX.current = t.clientX;
    startY.current = t.clientY;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fired.current = true;
      firedUntil.current = Date.now() + 1000;
      haptic("medium");
      onLongPress();
    }, delay);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (
      Math.abs(t.clientX - startX.current) > moveTolerance ||
      Math.abs(t.clientY - startY.current) > moveTolerance
    ) {
      clear();
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (fired.current) { firedUntil.current = Date.now() + 1000; e.preventDefault(); e.stopPropagation(); }
    clear();
  };
  const onTouchCancel = () => clear();

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    didFire: () => fired.current && Date.now() <= firedUntil.current,
  };
}
