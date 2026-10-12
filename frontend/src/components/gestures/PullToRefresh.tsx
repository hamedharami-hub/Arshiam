import { ReactNode, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { navigationInteractionBlocked } from "@/lib/appNavigation";

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
  const startX = useRef(0);
  const touchId = useRef(0);
  const pulling = useRef(false);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

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
    let active = true;
    const reset = () => {
      pulling.current = false;
      armed.current = false;
      setPull(0);
    };
    const distance = (x: number, y: number) => Math.abs(x - startX.current) > 60 ? 0 : Math.min(MAX, Math.pow(Math.max(0, y - startY.current), 0.85));

    const onStart = (e: TouchEvent) => {
      reset();
      if (busy.current) return;
      if (e.touches.length !== 1 || navigationInteractionBlocked(e.target)) return;
      // A scroller can contain multiple refresh wrappers. Only its owning
      // wrapper may respond, and horizontal screen edges belong to navigation.
      if (!(e.target instanceof Node) || !el.contains(e.target)) return;
      const touch = e.touches[0];
      if (touch.clientX <= 28 || touch.clientX >= window.innerWidth - 28) return;
      if ((target?.scrollTop || 0) > 0) return;
      startY.current = touch.clientY;
      startX.current = touch.clientX;
      touchId.current = touch.identifier;
      pulling.current = true;
      armed.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch || touch.identifier !== touchId.current || navigationInteractionBlocked(e.target) || (target?.scrollTop || 0) > 0 || Math.abs(touch.clientX - startX.current) > 60) { reset(); return; }
      const eased = distance(touch.clientX, touch.clientY);
      setPull(eased);
      if (!armed.current && eased >= TRIGGER) {
        armed.current = true;
        haptic("light");
      }
      armed.current = eased >= TRIGGER;
    };
    const onEnd = async (e: TouchEvent) => {
      if (!pulling.current) return;
      pulling.current = false;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === touchId.current);
      const commit = touch && !e.touches.length && distance(touch.clientX, touch.clientY) >= TRIGGER && !navigationInteractionBlocked(e.target) && !(target?.scrollTop || 0);
      armed.current = false;
      if (commit && !busy.current) {
        busy.current = true;
        setRefreshing(true);
        setPull(48);
        try {
          await refresh.current();
        } catch {
          // The refresh owner renders its error state; rejected work must not
          // leave the gesture busy or create an unhandled event promise.
        } finally {
          busy.current = false;
          if (active) {
            setRefreshing(false);
            setPull(0);
          }
        }
      } else {
        setPull(0);
      }
    };
    target?.addEventListener("touchstart", onStart, { passive: true });
    target?.addEventListener("touchmove", onMove, { passive: true });
    target?.addEventListener("touchend", onEnd, { passive: true });
    target?.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      active = false;
      pulling.current = false;
      armed.current = false;
      target?.removeEventListener("touchstart", onStart);
      target?.removeEventListener("touchmove", onMove);
      target?.removeEventListener("touchend", onEnd);
      target?.removeEventListener("touchcancel", reset);
    };
  }, []);

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
