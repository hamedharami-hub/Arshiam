import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { haptic } from "@/lib/haptics";
import { navigationInteractionBlocked } from "@/lib/appNavigation";

const ROOTS = new Set(["/app/today", "/app/tomorrow", "/app/next7", "/app/inbox", "/app/notes", "/app/calendar", "/app/habits"]);

/** One web edge owner: sidebar edge opens the drawer; opposite edge goes back. */
export default function EdgeSwipeHandler() {
  const { isMobile, setOpenMobile, openMobile, side } = useSidebar();
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isMobile || Capacitor.isNativePlatform()) return;
    let start: { x: number; y: number; id: number; left: boolean; sidebar: boolean } | null = null;
    const reset = () => { start = null; };
    const onStart = (e: TouchEvent) => {
      reset();
      if (openMobile || e.touches.length !== 1 || navigationInteractionBlocked(e.target)) return;
      const t = e.touches[0];
      const left = t.clientX <= 28;
      if (!left && t.clientX < window.innerWidth - 28) return;
      const sidebar = left === (side === "left");
      if (!sidebar && (ROOTS.has(loc.pathname) || !(window.history.state?.idx > 0))) return;
      start = { x: t.clientX, y: t.clientY, id: t.identifier, left, sidebar };
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t || t.identifier !== start.id || Math.abs(t.clientY - start.y) > 60 || navigationInteractionBlocked(e.target)) reset();
    };
    const onEnd = (e: TouchEvent) => {
      const gesture = start;
      reset();
      if (!gesture || e.touches.length || openMobile || navigationInteractionBlocked(e.target)) return;
      const t = Array.from(e.changedTouches).find((touch) => touch.identifier === gesture.id);
      if (!t) return;
      const dx = (t.clientX - gesture.x) * (gesture.left ? 1 : -1);
      if (dx < (gesture.sidebar ? 56 : 80) || Math.abs(t.clientY - gesture.y) > 60) return;
      haptic(gesture.sidebar ? "light" : "medium");
      if (gesture.sidebar) setOpenMobile(true);
      else navigate(-1);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [isMobile, openMobile, side, setOpenMobile, loc.pathname, navigate]);
  return null;
}
