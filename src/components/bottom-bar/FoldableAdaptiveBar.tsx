import { useMemo } from "react";
import { PanelRight, Sparkles, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { useSidebar } from "@/components/ui/sidebar";
import { BottomTabItemConfig } from "./types";

interface FoldableAdaptiveBarProps {
  allTabs: BottomTabItemConfig[];
  currentPath: string;
  dir: "rtl" | "ltr";
}

export function FoldableAdaptiveBar({
  allTabs,
  currentPath,
  dir,
}: FoldableAdaptiveBarProps) {
  const { toggleSidebar, openMobile } = useSidebar();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = (i18n.language || "fa").startsWith("en");

  // Left thumb cluster: Mind, Notes, Habits
  const leftCluster = useMemo(() => allTabs.slice(0, 3), [allTabs]);
  // Right thumb cluster: Today, Calendar
  const rightCluster = useMemo(() => allTabs.slice(3, 5), [allTabs]);

  const handleQuickAdd = () => {
    haptic("medium");
    window.dispatchEvent(new Event("lov:open-quick-capture"));
  };

  return (
    <nav
      dir={dir}
      data-foldable-adaptive-bar="true"
      className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 w-[min(46rem,calc(100%-2rem))] select-none animate-in fade-in-0 slide-in-from-bottom-3 duration-250"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2px)",
      }}
      aria-label={t("nav.foldableBar", "ناوبری گوشی‌های تاشو")}
    >
      <div className="relative flex items-center justify-between px-3.5 py-1.5 h-[4.25rem] rounded-[2rem] bg-card/90 dark:bg-card/90 backdrop-blur-2xl border border-primary/25 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.12)_inset] dark:shadow-[0_22px_55px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset] ring-1 ring-primary/10">
        
        {/* Subtle decorative edge gradient */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />

        {/* Left Thumb Cluster (Mind, Notes, Habits) */}
        <div className="flex-1 flex items-center justify-around max-w-[42%]">
          {leftCluster.map((tab) => {
            const isActive = tab.match(currentPath);
            const label = isEn ? tab.labelEn : tab.labelFa;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  haptic("light");
                  navigate(tab.to);
                }}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-92 transition-transform duration-150 min-w-0 ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground/75 hover:text-foreground"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300 ease-out ${
                    isActive
                      ? "bg-primary/15 dark:bg-primary/25 text-primary scale-100"
                      : "hover:bg-muted/40 text-muted-foreground/75 group-hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? "scale-110 text-primary stroke-[2.2]" : "stroke-[1.8]"
                    }`}
                  />
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground min-w-3.5 h-3.5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10.5px] truncate max-w-full px-1 tracking-tight mt-1 leading-tight ${
                  isActive ? "font-semibold text-primary" : "text-muted-foreground/75 font-medium"
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center Ergonomic Quick Add FAB (Hinge / Bridge Zone) */}
        <div className="relative px-2 flex items-center justify-center -mt-6">
          <div className="absolute -inset-1 rounded-[22px] bg-gradient-to-tr from-primary via-indigo-500 to-violet-400 blur-lg opacity-35 pointer-events-none -z-10" />
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={t("nav.quickAdd", "افزودن سریع")}
            className="group relative h-13 w-13 rounded-[20px] bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 text-white shadow-[0_8px_22px_-2px_rgba(99,102,241,0.4)] flex items-center justify-center active:scale-90 hover:scale-105 transition-all duration-200 ring-[4px] ring-background dark:ring-card border border-white/20 select-none"
          >
            <Plus className="w-6 h-6 stroke-[2.5] text-white transition-transform duration-300 ease-out group-hover:rotate-90 group-active:rotate-45" />
            <span className="sr-only">{t("nav.quickAdd", "افزودن سریع")}</span>
          </button>
        </div>

        {/* Right Thumb Cluster (Today, Calendar, Menu) */}
        <div className="flex-1 flex items-center justify-around max-w-[42%]">
          {rightCluster.map((tab) => {
            const isActive = tab.match(currentPath);
            const label = isEn ? tab.labelEn : tab.labelFa;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  haptic("light");
                  navigate(tab.to);
                }}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-92 transition-transform duration-150 min-w-0 ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground/75 hover:text-foreground"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300 ease-out ${
                    isActive
                      ? "bg-primary/15 dark:bg-primary/25 text-primary scale-100"
                      : "hover:bg-muted/40 text-muted-foreground/75 group-hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? "scale-110 text-primary stroke-[2.2]" : "stroke-[1.8]"
                    }`}
                  />
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground min-w-3.5 h-3.5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10.5px] truncate max-w-full px-1 tracking-tight mt-1 leading-tight ${
                  isActive ? "font-semibold text-primary" : "text-muted-foreground/75 font-medium"
                }`}>
                  {label}
                </span>
              </button>
            );
          })}

          {/* Menu / Sidebar Toggle */}
          <button
            type="button"
            onClick={() => {
              haptic("light");
              toggleSidebar();
            }}
            aria-label={t("nav.menu", "منو")}
            className={`group relative flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-92 transition-transform duration-150 min-w-0 ${
              openMobile ? "text-primary font-bold" : "text-muted-foreground/75 hover:text-foreground"
            }`}
          >
            <div
              className={`relative flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300 ease-out ${
                openMobile
                  ? "bg-primary/15 dark:bg-primary/25 text-primary scale-100"
                  : "hover:bg-muted/40 text-muted-foreground/75 group-hover:text-foreground"
              }`}
            >
              <PanelRight
                className={`w-4 h-4 transition-transform duration-200 ${
                  openMobile ? "scale-105 text-primary stroke-[2.2]" : "stroke-[1.8]"
                }`}
              />
            </div>
            <span className={`text-[10.5px] truncate max-w-full px-1 tracking-tight mt-1 leading-tight ${
              openMobile ? "font-semibold text-primary" : "text-muted-foreground/75 font-medium"
            }`}>
              {t("nav.menu", "منو")}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
