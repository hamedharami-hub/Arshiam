import { ReactNode, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

const TRIGGER = 70;
const MAX = 120;

/**
 * Pull-to-refresh for the closest scrollable ancestor (typically <main>).
 * Only triggers when that ancestor is at scrollTop = 0.
 */
export default function PullToRefresh({ onRefresh, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller && scroller !== document.body) {
      const oy = getComputedStyle(scroller).overflowY;
      if (oy === "auto" || oy === "scroll") break;
      scroller = scroller.parentElement;
    }
    const target = scroller || (document.scrollingElement as HTMLElement);

    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      if ((target?.scrollTop || 0) > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      armed.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // resistive curve
      const eased = Math.min(MAX, Math.pow(dy, 0.85));
      setPull(eased);
      if (!armed.current && eased >= TRIGGER) {
        armed.current = true;
        haptic("light");
      }
    };
    const onEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (armed.current && !refreshing) {
        setRefreshing(true);
        setPull(48);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };
    target?.addEventListener("touchstart", onStart, { passive: true });
    target?.addEventListener("touchmove", onMove, { passive: true });
    target?.addEventListener("touchend", onEnd, { passive: true });
    target?.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      target?.removeEventListener("touchstart", onStart);
      target?.removeEventListener("touchmove", onMove);
      target?.removeEventListener("touchend", onEnd);
      target?.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, refreshing]);

  return (
    <div ref={wrapRef} className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
        style={{
          height: pull,
          transition: pulling.current ? "none" : "height 200ms ease-out",
          opacity: pull > 4 ? 1 : 0,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${pull * 3}deg)` }}
        />
      </div>
      <div
        style={{
          transform: `translate3d(0,${pull}px,0)`,
          transition: pulling.current ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
