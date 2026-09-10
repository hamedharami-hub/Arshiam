import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { haptic } from "@/lib/haptics";
import { swipeAction, type Swipe } from "@/lib/androidGestures";

const routes = ["/app/today", "/app/tomorrow", "/app/next7", "/app/inbox"];
export default function AndroidGestures() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const loc = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    if (!isMobile) return;
    let start: Swipe | null = null;
    let drawer: HTMLElement | null = null;
    const reset = () => {
      if (drawer) drawer.style.transform = "";
      drawer = null;
      start = null;
    };
    const onStart = (e: TouchEvent) => {
      reset();
      if (
        localStorage.getItem("android_gestures_off") === "1" ||
        e.touches.length !== 1 ||
        window.getSelection()?.toString()
      )
        return;
      const target = e.target instanceof Element ? e.target : null;
      if (
        target?.closest(
          'input,textarea,select,button,a,[contenteditable="true"],[role="slider"],[role="button"],[data-no-swipe-nav],[draggable="true"]',
        )
      )
        return;
      if (
        document.querySelector(
          '[role="dialog"]:not([data-sidebar]),[role="alertdialog"],[role="menu"]',
        )
      )
        return;
      const t = e.touches[0],
        w = window.innerWidth;
      const inDrawer = Boolean(target?.closest('[data-sidebar="sidebar"]'));
      // Leave the outermost 20px to Android's system back gesture.
      const mode =
        openMobile && inDrawer
          ? "close"
          : !openMobile && t.clientX >= w - 80 && t.clientX <= w - 20
            ? "open"
            : !openMobile &&
                t.clientX > 80 &&
                t.clientX < w - 80 &&
                routes.includes(loc.pathname)
              ? "navigate"
              : null;
      if (!mode) return;
      start = { x: t.clientX, y: t.clientY, time: Date.now(), mode };
      if (mode === "close")
        drawer = document.querySelector(
          '[data-sidebar="sidebar"][data-mobile="true"]',
        );
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1) {
        reset();
        return;
      }
      const t = e.touches[0],
        dx = t.clientX - start.x,
        dy = t.clientY - start.y;
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        reset();
        return;
      }
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        if (e.cancelable) e.preventDefault();
        if (
          drawer &&
          dx > 0 &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          drawer.style.transform = "translateX(" + Math.min(dx, 320) + "px)";
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0],
        action = t
          ? swipeAction(start, t.clientX, t.clientY, Date.now())
          : null;
      reset();
      if (!action) return;
      if (action === "open" || action === "close") {
        setOpenMobile(action === "open");
        haptic("light");
        return;
      }
      const index = routes.indexOf(loc.pathname) + (action === "next" ? 1 : -1);
      if (index >= 0 && index < routes.length) {
        navigate(routes[index]);
        haptic("light");
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      reset();
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [isMobile, openMobile, setOpenMobile, loc.pathname, navigate]);
  return null;
}
