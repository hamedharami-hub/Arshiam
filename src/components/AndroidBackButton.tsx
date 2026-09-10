import { useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";

export default function AndroidBackButton() {
  const { openMobile, setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const lastBack = useRef(0);
  useEffect(() => {
    let disposed = false;
    const handle = CapApp.addListener("backButton", () => {
      if (disposed) return;
      if (document.querySelector('[role="dialog"]:not([data-sidebar]),[role="alertdialog"],[role="menu"]')) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }
      if (openMobile) { setOpenMobile(false); return; }
      if (!["/app/today","/app/tomorrow","/app/next7","/app/inbox"].includes(pathname)) {
        if (window.history.state?.idx > 0) navigate(-1); else navigate("/app/today", { replace: true });
        return;
      }
      const now = Date.now();
      if (lastBack.current && now - lastBack.current < 2000) { void CapApp.exitApp(); return; }
      lastBack.current = now;
      toast("برای خروج یک‌بار دیگر برگشت را بزن", { duration: 1800 });
    });
    return () => { disposed = true; void handle.then(h => h.remove()).catch(() => {}); };
  }, [pathname, navigate, openMobile, setOpenMobile]);
  return null;
}
