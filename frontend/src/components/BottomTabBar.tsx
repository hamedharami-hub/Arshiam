import { useLocation, useNavigate } from "react-router-dom";
import { isPathAllowed, useModules } from "@/lib/appModules";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import RecentlyDeletedSheet from "@/components/RecentlyDeletedSheet";
import { isRTL } from "@/i18n";
import { shouldShowBottomNavigation, useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { BottomTabItemConfig } from "./bottom-bar/types";
import { MobileBottomBar } from "./bottom-bar/MobileBottomBar";
import {
  useMobileBottomTabs,
  getAccessibleMobileTabs,
} from "@/lib/mobileBottomBarSettings";

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const { i18n } = useTranslation();
  const dir = isRTL(i18n.language || "fa") ? "rtl" : "ltr";
  const [trashOpen, setTrashOpen] = useState(false);
  const device = useDeviceFormFactor();
  const modules = useModules();

  // Global trash listener
  useEffect(() => {
    const open = () => setTrashOpen(true);
    window.addEventListener("lov:open-trash", open);
    return () => window.removeEventListener("lov:open-trash", open);
  }, []);

  // Global Windows / Desktop keyboard shortcuts (Alt+1..4, Alt+N, Alt+M, Alt+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case "1":
            if (!isPathAllowed("/app/mind", modules)) break;
            e.preventDefault();
            navigate("/app/mind");
            break;
          case "2":
            e.preventDefault();
            navigate("/app/notes");
            break;
          case "3":
            e.preventDefault();
            navigate("/app/calendar");
            break;
          case "4":
            e.preventDefault();
            navigate("/app/today");
            break;
          case "n":
          case "N":
            e.preventDefault();
            window.dispatchEvent(new Event("lov:open-quick-capture"));
            break;
          case "m":
          case "M":
            e.preventDefault();
            toggleSidebar();
            break;
          case "d":
          case "D":
            e.preventDefault();
            window.dispatchEvent(new Event("lov:toggle-dock"));
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, toggleSidebar, modules]);

  // For compact phone layout: reactive user-chosen tabs from settings (default: today, calendar, notes).
  // The compact bar is the only rendered bar, so this list is the single source of tab config.
  const selectedTabKeys = useMobileBottomTabs();
  const mobileCustomTabs = useMemo<BottomTabItemConfig[]>(() => {
    return getAccessibleMobileTabs(selectedTabKeys, modules);
  }, [selectedTabKeys, modules]);

  const isTaskPage =
    loc.pathname.startsWith("/app/new/task") ||
    loc.pathname.startsWith("/app/new-task") ||
    loc.pathname.startsWith("/app/tasks/");

  if (!loc.pathname.startsWith("/app") || isTaskPage) return null;

  // Touch tablets retain bottom navigation even when their viewport is desktop-sized.
  const hideBottomBar = !shouldShowBottomNavigation(device);

  if (hideBottomBar) {
    return <RecentlyDeletedSheet open={trashOpen} onOpenChange={setTrashOpen} />;
  }

  return (
    <>
      {/* Regular Mobile Phone Bottom Bar — perfectly symmetric 5-item bar with long-press speed dial */}
      <MobileBottomBar
        tabs={mobileCustomTabs}
        currentPath={loc.pathname}
        dir={dir}
      />
      <RecentlyDeletedSheet open={trashOpen} onOpenChange={setTrashOpen} />
    </>
  );
}
export default BottomTabBar;
