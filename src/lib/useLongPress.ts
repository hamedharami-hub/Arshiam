import { useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";

interface Options {
  onLongPress: () => void;
  delay?: number;
  moveTolerance?: number;
}

/**
 * Long-press detector for touch devices. Returns spread-able touch handlers.
 * Cancels on move > tolerance, scroll, or touch end before delay.
 */
export function useLongPress({ onLongPress, delay = 480, moveTolerance = 10 }: Options) {
  const timer = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    // Skip long-press if user started on a drag handle or interactive control we want to keep "pure".
    const tgt = e.target as HTMLElement | null;
    if (tgt?.closest("[data-drag-handle], [data-no-longpress]")) return;
    startX.current = t.clientX;
    startY.current = t.clientY;
    fired.current = false;
    clear();
    timer.current = window.setTimeout(() => {
      fired.current = true;
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
  const onTouchEnd = () => clear();
  const onTouchCancel = () => clear();

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    didFire: () => fired.current,
  };
}
