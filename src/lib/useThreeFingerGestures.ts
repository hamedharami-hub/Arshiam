import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Global 3-finger gestures (mobile multi-touch):
 *  - 3-finger tap (quick lift)         → Quick Capture
 *  - 3-finger swipe DOWN               → open Recently Deleted tray
 *  - 3-finger swipe UP                 → open Search (⌘K)
 */
type Opts = {
  onQuickCapture: () => void;
  onOpenTrash: () => void;
  onOpenSearch: () => void;
};

const MIN_DY = 60;
const MAX_DURATION_TAP = 250;

export function useThreeFingerGestures({ onQuickCapture, onOpenTrash, onOpenSearch }: Opts) {
  useEffect(() => {
    let active = false;
    let startY = 0;
    let startedAt = 0;
    let moved = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 3) {
        active = false;
        return;
      }
      active = true;
      moved = false;
      startedAt = Date.now();
      startY =
        (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY) / 3;
    };

    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 3) return;
      const y =
        (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY) / 3;
      if (Math.abs(y - startY) > 12) moved = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const dt = Date.now() - startedAt;
      const t = e.changedTouches[0];
      if (!t) return;
      // For end, use the average of any remaining + changed touches' Y as approximation:
      const endY = t.clientY;
      const dy = endY - startY;
      if (!moved && dt < MAX_DURATION_TAP) {
        haptic("medium");
        onQuickCapture();
        return;
      }
      if (Math.abs(dy) >= MIN_DY) {
        haptic("light");
        if (dy > 0) onOpenTrash();
        else onOpenSearch();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onQuickCapture, onOpenTrash, onOpenSearch]);
}
