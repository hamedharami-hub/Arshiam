import { useRef, useState, useCallback } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Pinch-to-zoom handler. Returns `scale` clamped to [min,max] and touch handlers
 * to attach to the zoomable container. Triggers a light haptic on each
 * 25% change milestone.
 */
export function usePinchZoom({
  initial = 1,
  min = 0.6,
  max = 2.4,
  onChange,
}: {
  initial?: number;
  min?: number;
  max?: number;
  onChange?: (s: number) => void;
} = {}) {
  const [scale, setScale] = useState(initial);
  const startDist = useRef(0);
  const startScale = useRef(initial);
  const lastMilestone = useRef(Math.round(initial * 4));

  const dist = (e: React.TouchEvent) => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      startDist.current = dist(e);
      startScale.current = scale;
    }
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && startDist.current > 0) {
      const ratio = dist(e) / startDist.current;
      const next = Math.max(min, Math.min(max, startScale.current * ratio));
      setScale(next);
      onChange?.(next);
      const milestone = Math.round(next * 4);
      if (milestone !== lastMilestone.current) {
        lastMilestone.current = milestone;
        haptic("light");
      }
    }
  }, [min, max, onChange]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) startDist.current = 0;
  }, []);

  return { scale, setScale, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
