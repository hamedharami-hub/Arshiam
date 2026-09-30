import { useState, useCallback, useRef } from "react";

interface UseResizableSplitOptions {
  storageKey: string;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
}

export function useResizableSplit({
  storageKey,
  defaultRatio = 46,
  minRatio = 25,
  maxRatio = 75,
}: UseResizableSplitOptions) {
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    if (typeof window === "undefined") return defaultRatio;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= minRatio && val <= maxRatio) {
          return val;
        }
      }
    } catch {}
    return defaultRatio;
  });

  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only handle primary button on mouse (button === 0) or touch/pen
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (!containerRef.current) return;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      setIsResizing(true);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const offset = e.clientX - rect.left;
      const rawRatio = (offset / rect.width) * 100;
      const clamped = Math.min(Math.max(rawRatio, minRatio), maxRatio);
      setSplitRatio(clamped);
    },
    [isResizing, minRatio, maxRatio]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      setIsResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      try {
        localStorage.setItem(storageKey, String(splitRatio));
      } catch {}
    },
    [isResizing, storageKey, splitRatio]
  );

  const resetRatio = useCallback(() => {
    setSplitRatio(defaultRatio);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [defaultRatio, storageKey]);

  return {
    splitRatio,
    isResizing,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetRatio,
  };
}
