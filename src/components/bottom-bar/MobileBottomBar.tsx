import { PanelRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { useSidebar } from "@/components/ui/sidebar";
import { BottomTabItemConfig } from "./types";
import { BottomTabItem } from "./BottomTabItem";
import { BottomQuickAddButton } from "./BottomQuickAddButton";

interface MobileBottomBarProps {
  primaryTabs: BottomTabItemConfig[];
  secondaryTabs: BottomTabItemConfig[];
  currentPath: string;
  dir: "rtl" | "ltr";
}

export function MobileBottomBar({
  primaryTabs,
  secondaryTabs,
  currentPath,
  dir,
}: MobileBottomBarProps) {
  const { toggleSidebar, openMobile } = useSidebar();
  const { t } = useTranslation();

  return (
    <nav
      dir={dir}
      data-bottom-bar="true"
      className="xl:hidden fixed z-40 transition-all duration-300 ease-out select-none inset-x-0 bottom-0 h-[4.5rem] bg-card/95 dark:bg-card/95 backdrop-blur-2xl border-t border-border/70 flex items-stretch shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.35)] min-[600px]:bottom-4 min-[600px]:inset-x-auto min-[600px]:left-1/2 min-[600px]:-translate-x-1/2 min-[600px]:w-[min(34rem,calc(100%-3rem))] min-[600px]:h-[4.5rem] min-[600px]:rounded-[1.45rem] min-[600px]:border min-[600px]:border-border/80 min-[600px]:px-2 min-[600px]:shadow-[0_16px_40px_rgba(0,0,0,0.16),0_0_0_1px_rgba(255,255,255,0.12)_inset] dark:min-[600px]:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
      }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}
    >
      {/* Primary tabs (Mind, Notes) */}
      {primaryTabs.map((tab) => (
        <BottomTabItem
          key={tab.key}
          tab={tab}
          isActive={tab.match(currentPath)}
          mode="mobile"
          dir={dir}
        />
      ))}

      {/* Elevated center Quick Add action */}
      <div className="flex-1 flex items-center justify-center">
        <BottomQuickAddButton mode="mobile" />
      </div>

      {/* Secondary tabs (Today) */}
      {secondaryTabs.map((tab) => (
        <BottomTabItem
          key={tab.key}
          tab={tab}
          isActive={tab.match(currentPath)}
          mode="mobile"
          dir={dir}
        />
      ))}

      {/* Menu / Sidebar toggle button */}
      <button
        type="button"
        className={`relative h-full flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium select-none active:scale-95 transition-all duration-150 min-w-0 ${
          openMobile ? "text-primary font-bold" : "text-muted-foreground/75 hover:text-foreground"
        }`}
        aria-label={t("nav.menu", "منو")}
        onClick={() => {
          haptic("light");
          toggleSidebar();
        }}
      >
        <div
          className={`relative flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
            openMobile ? "bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.25)]" : "hover:bg-accent/40"
          }`}
        >
          <PanelRight
            className={`w-5 h-5 transition-transform duration-200 ${
              openMobile ? "scale-110 text-primary stroke-[2.2]" : "stroke-[1.8]"
            }`}
          />
          {openMobile && (
            <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span
          dir={dir}
          className={`tracking-tight truncate max-w-full px-0.5 transition-colors duration-150 ${
            openMobile ? "font-bold text-primary" : "text-muted-foreground/90 font-medium"
          }`}
        >
          {t("nav.menu", "منو")}
        </span>
      </button>
    </nav>
  );
}
