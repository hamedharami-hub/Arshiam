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

  // If user has collapsed the dock on desktop, show a subtle floating trigger
  if (collapsed) {
    return (
      <div className="hidden md:flex fixed bottom-3 left-1/2 -translate-x-1/2 z-40">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={t("nav.showDock", "نمایش ناوبری سریع")}
              className="group h-7 px-2.5 rounded-full bg-card/85 dark:bg-card/90 backdrop-blur-xl border border-border/70 text-muted-foreground hover:text-foreground text-xs font-medium shadow-md hover:shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium">{t("nav.dock", "ناوبری شناور")}</span>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t("nav.expandDock", "بازکردن ناوبری سریع دسکتاپ")}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside
      dir={dir}
      className="hidden md:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-40 items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-card/85 dark:bg-card/90 backdrop-blur-2xl border border-border/70 shadow-xl shadow-black/10 dark:shadow-black/40 select-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
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

      <div className="w-px h-5 bg-border/70 mx-1" />

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
                ? "bg-accent/70 text-foreground"
                : "text-muted-foreground/80 hover:text-foreground hover:bg-accent/40"
            }`}
          >
            <PanelRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform" />
            <span className="hidden xl:inline">{t("nav.menu", "سایدبار")}</span>
            <kbd className="text-[9px] px-1 py-0.2 rounded font-mono bg-muted/60 text-muted-foreground/80 border border-border/50 ltr">
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
        <TooltipContent side="top" className="text-xs">
          {t("nav.hideDock", "کوچک‌کردن بار ناوبری")}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
