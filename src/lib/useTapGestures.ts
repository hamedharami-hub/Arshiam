import { useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";

interface Options {
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  doubleTapWindow?: number;
  moveTolerance?: number;
}

/**
 * Combined tap / double-tap / long-press detector for touch elements.
 * - Single tap fires only after the double-tap window closes (so it doesn't
 *   conflict with double-tap).
 * - Long-press cancels the tap pipeline.
 */
export function useTapGestures({
  onSingleTap,
  onDoubleTap,
  onLongPress,
  longPressDelay = 460,
  doubleTapWindow = 240,
  moveTolerance = 10,
}: Options) {
  const lastTapAt = useRef(0);
  const singleTapTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);
  const longFired = useRef(false);

  const clearAll = useCallback(() => {
    if (singleTapTimer.current) { window.clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startX.current = t.clientX;
    startY.current = t.clientY;
    moved.current = false;
    longFired.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    if (onLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        longFired.current = true;
        haptic("medium");
        onLongPress();
      }, longPressDelay);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (
      Math.abs(t.clientX - startX.current) > moveTolerance ||
      Math.abs(t.clientY - startY.current) > moveTolerance
    ) {
      moved.current = true;
      if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (longFired.current || moved.current) return;
    const now = Date.now();
    if (now - lastTapAt.current < doubleTapWindow && onDoubleTap) {
      // double tap
      if (singleTapTimer.current) { window.clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
      lastTapAt.current = 0;
      haptic("light");
      onDoubleTap();
      return;
    }
    lastTapAt.current = now;
    if (onSingleTap) {
      // wait for possible second tap
      singleTapTimer.current = window.setTimeout(() => {
        singleTapTimer.current = null;
        onSingleTap();
      }, onDoubleTap ? doubleTapWindow : 0);
    }
  };

  const onTouchCancel = () => clearAll();

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel } };
}
