import { useLocation, useNavigate } from "react-router-dom";
import { ListTodo, FileText, Brain, Flame, CalendarDays } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import RecentlyDeletedSheet from "@/components/RecentlyDeletedSheet";
import { isRTL } from "@/i18n";
import { BottomTabItemConfig } from "./bottom-bar/types";
import { MobileBottomBar } from "./bottom-bar/MobileBottomBar";
import { DesktopFloatingDock } from "./bottom-bar/DesktopFloatingDock";

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const { i18n } = useTranslation();
  const dir = isRTL(i18n.language || "fa") ? "rtl" : "ltr";
  const [trashOpen, setTrashOpen] = useState(false);

  // Global trash listener
  useEffect(() => {
    const open = () => setTrashOpen(true);
    window.addEventListener("lov:open-trash", open);
    return () => window.removeEventListener("lov:open-trash", open);
  }, []);

  // Global Windows / Desktop keyboard shortcuts (Alt+1..5, Alt+N, Alt+M)
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
            e.preventDefault();
            navigate("/app/mind");
            break;
          case "2":
            e.preventDefault();
            navigate("/app/notes");
            break;
          case "3":
            e.preventDefault();
            navigate("/app/habits");
            break;
          case "4":
            e.preventDefault();
            navigate("/app/today");
            break;
          case "5":
            e.preventDefault();
            navigate("/app/calendar");
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
  }, [navigate, toggleSidebar]);

  // Tab configurations
  const tabs = useMemo<BottomTabItemConfig[]>(() => [
    {
      key: "mind",
      labelFa: "ذهن",
      labelEn: "Mind",
      to: "/app/mind",
      icon: Brain,
      shortcutKey: "1",
      shortcutLabel: "Alt+1",
      match: (p) =>
        p === "/app/mind" ||
        p.startsWith("/app/checkin") ||
        p.startsWith("/app/thoughts") ||
        p.startsWith("/app/abc") ||
        p.startsWith("/app/worry") ||
        p.startsWith("/app/values") ||
        p.startsWith("/app/breathing") ||
        p.startsWith("/app/socratic") ||
        p.startsWith("/app/screener") ||
        p.startsWith("/app/self"),
    },
    {
      key: "notes",
      labelFa: "یادداشت‌ها",
      labelEn: "Notes",
      to: "/app/notes",
      icon: FileText,
      shortcutKey: "2",
      shortcutLabel: "Alt+2",
      match: (p) => p.startsWith("/app/notes"),
    },
    {
      key: "habits",
      labelFa: "عادت‌ها",
      labelEn: "Habits",
      to: "/app/habits",
      icon: Flame,
      shortcutKey: "3",
      shortcutLabel: "Alt+3",
      match: (p) => p.startsWith("/app/habits"),
    },
    {
      key: "today",
      labelFa: "امروز",
      labelEn: "Today",
      to: "/app/today",
      icon: ListTodo,
      shortcutKey: "4",
      shortcutLabel: "Alt+4",
      match: (p) => p === "/app/today" || p === "/app",
    },
    {
      key: "calendar",
      labelFa: "تقویم",
      labelEn: "Calendar",
      to: "/app/calendar",
      icon: CalendarDays,
      shortcutKey: "5",
      shortcutLabel: "Alt+5",
      match: (p) => p.startsWith("/app/calendar"),
    },
  ], []);

  // For mobile view, we take the primary tabs, secondary tabs, and foldable extra tabs
  const mobilePrimaryTabs = useMemo(() => [tabs[0], tabs[1]], [tabs]);
  const mobileSecondaryTabs = useMemo(() => [tabs[3]], [tabs]);
  const foldableExtraLeftTab = useMemo(() => tabs[2], [tabs]); // Habits
  const foldableExtraRightTab = useMemo(() => tabs[4], [tabs]); // Calendar

  if (!loc.pathname.startsWith("/app")) return null;

  return (
    <>
      {/* Mobile view: Phone & foldable tablet bottom navigation bar */}
      <MobileBottomBar
        primaryTabs={mobilePrimaryTabs}
        secondaryTabs={mobileSecondaryTabs}
        foldableExtraLeftTab={foldableExtraLeftTab}
        foldableExtraRightTab={foldableExtraRightTab}
        currentPath={loc.pathname}
        dir={dir}
      />

      {/* Windows & Desktop view: Floating quick navigation dock */}
      <DesktopFloatingDock
        allTabs={tabs}
        currentPath={loc.pathname}
        dir={dir}
      />

      <RecentlyDeletedSheet open={trashOpen} onOpenChange={setTrashOpen} />
    </>
  );
}
export default BottomTabBar;
