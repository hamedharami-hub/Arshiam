import { useEffect } from "react";
import { undoLast, redoLast } from "@/lib/undoStack";
import { haptic } from "@/lib/haptics";

/**
 * Global two-finger horizontal swipe → Undo / Redo (Apple Notes style).
 * - Two fingers swipe LEFT  → Undo
 * - Two fingers swipe RIGHT → Redo
 * Requires both touches to move horizontally together with little vertical drift.
 */
const MIN_DX = 70;
const MAX_DY = 60;

export function useTwoFingerSwipe() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let startX0 = 0, startX1 = 0, startY0 = 0, startY1 = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        tracking = false;
        return;
      }
      tracking = true;
      startX0 = e.touches[0].clientX;
      startY0 = e.touches[0].clientY;
      startX1 = e.touches[1].clientX;
      startY1 = e.touches[1].clientY;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      // Use changedTouches first; fall back to touches.
      const t0 = e.changedTouches[0];
      const t1 = e.changedTouches[1] || e.touches[0];
      if (!t0 || !t1) return;
      const dx0 = t0.clientX - startX0;
      const dx1 = t1.clientX - startX1;
      const dy0 = Math.abs(t0.clientY - startY0);
      const dy1 = Math.abs(t1.clientY - startY1);
      // Both fingers must move in the same horizontal direction.
      if (Math.sign(dx0) !== Math.sign(dx1)) return;
      const avgDx = (dx0 + dx1) / 2;
      const maxDy = Math.max(dy0, dy1);
      if (Math.abs(avgDx) < MIN_DX || maxDy > MAX_DY) return;
      haptic("light");
      if (avgDx < 0) undoLast();
      else redoLast();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);
}
