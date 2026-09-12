import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, PanelRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import { BottomTabItemConfig } from "./types";
import { BottomTabItem } from "./BottomTabItem";
import { BottomQuickAddButton } from "./BottomQuickAddButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DesktopFloatingDockProps {
  allTabs: BottomTabItemConfig[];
  currentPath: string;
  dir: "rtl" | "ltr";
}

export function DesktopFloatingDock({
  allTabs,
  currentPath,
  dir,
}: DesktopFloatingDockProps) {
  const { toggleSidebar, state } = useSidebar();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("desktop_dock_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("desktop_dock_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleToggle = () => toggleCollapse();
    window.addEventListener("lov:toggle-dock", handleToggle);
    return () => window.removeEventListener("lov:toggle-dock", handleToggle);
  }, []);

  // If user has collapsed the dock on desktop, show a subtle floating trigger
  if (collapsed) {
    return (
      <div className="hidden xl:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={t("nav.showDock", "نمایش ناوبری سریع")}
              className="group h-8 px-3 rounded-full bg-card/80 dark:bg-card/85 backdrop-blur-2xl border border-white/20 dark:border-white/10 text-muted-foreground hover:text-foreground text-xs font-medium shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex items-center gap-2 active:scale-95 hover:scale-105 transition-all duration-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-[11px] font-medium">{t("nav.dock", "ناوبری شناور")}</span>
              <kbd className="text-[9px] px-1.5 py-0.5 rounded-md font-mono bg-muted/70 text-muted-foreground border border-border/70 ltr">
                Alt+D
              </kbd>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
            <span>{t("nav.expandDock", "بازکردن ناوبری سریع دسکتاپ")}</span>
            <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+D</kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside
      dir={dir}
      className="hidden xl:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-40 items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-card/90 dark:bg-card/90 backdrop-blur-3xl border border-border/70 shadow-[0_16px_40px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] select-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
      aria-label={t("nav.desktopDock", "ناوبری شناور دسکتاپ")}
    >
      {/* Navigation tabs */}
      <div className="flex items-center gap-1">
        {allTabs.map((tab) => (
          <BottomTabItem
            key={tab.key}
            tab={tab}
            isActive={tab.match(currentPath)}
            mode="desktop"
            dir={dir}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-border/70 dark:bg-white/10 mx-1" />

      {/* Quick Add action */}
      <BottomQuickAddButton mode="desktop" />

      {/* Sidebar toggle button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t("nav.menu", "منو و سایدبار")}
            className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium select-none transition-all duration-150 ${
              state === "expanded"
                ? "bg-primary/15 text-primary border border-primary/25 shadow-xs font-semibold"
                : "text-muted-foreground/80 hover:text-foreground hover:bg-accent/40"
            }`}
          >
            <PanelRight className={`w-4 h-4 transition-transform duration-200 ${state === "expanded" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
            <span className="hidden xl:inline">{t("nav.menu", "سایدبار")}</span>
            <kbd className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono border ltr transition-colors ${
              state === "expanded"
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-muted/70 text-muted-foreground border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.08)]"
            }`}>
              Alt+M
            </kbd>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
          <span>{t("nav.toggleSidebar", "باز و بسته کردن سایدبار")}</span>
          <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+M</kbd>
        </TooltipContent>
      </Tooltip>

      {/* Minimize dock toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={t("nav.minimizeDock", "کوچک‌کردن ناوبری")}
            className="w-6 h-6 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent/40 flex items-center justify-center transition-colors ms-0.5"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
          <span>{t("nav.hideDock", "کوچک‌کردن بار ناوبری")}</span>
          <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+D</kbd>
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
