import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";

// Task scope routes that participate in horizontal swipe navigation, in order.
// After the LAST route, swiping forward (RTL: left) opens the sidebar menu.
const TASK_ROUTES = [
  "/app/today",
  "/app/tomorrow",
  "/app/next7",
  "/app/inbox",
];

const EDGE_IGNORE = 28;
const MIN_DX = 70;
const MAX_DY = 60;

export default function SwipeNavigator() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;

    let startX = 0, startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      const t = e.touches[0];
      const w = window.innerWidth;
      if (t.clientX <= EDGE_IGNORE || t.clientX >= w - EDGE_IGNORE) { tracking = false; return; }
      const el = e.target as HTMLElement | null;
      // Only skip if user starts on a real interactive control (not on a card/row).
      if (el?.closest("input, textarea, select, [data-no-swipe-nav], [data-radix-scroll-area-viewport]")) {
        tracking = false; return;
      }
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (Math.abs(dx) < MIN_DX || dy > MAX_DY) return;
      const idx = TASK_ROUTES.indexOf(loc.pathname);
      if (idx === -1) return;
      // RTL: swipe LEFT = forward (next), swipe RIGHT = backward (previous)
      const dir = dx < 0 ? 1 : -1;
      const nextIdx = idx + dir;
      if (nextIdx < 0) return; // before first → nothing
      if (nextIdx >= TASK_ROUTES.length) {
        // past last → open side menu
        setOpenMobile(true);
        return;
      }
      navigate(TASK_ROUTES[nextIdx]);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [loc.pathname, navigate, setOpenMobile]);

  return null;
}
