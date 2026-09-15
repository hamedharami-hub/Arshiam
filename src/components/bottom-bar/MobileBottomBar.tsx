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
      className="xl:hidden fixed z-40 transition-all duration-300 ease-out select-none inset-x-0 bottom-0 h-[4.5rem] bg-card/90 dark:bg-card/90 backdrop-blur-2xl border-t border-border/60 flex items-stretch shadow-[0_-8px_30px_rgba(0,0,0,0.06),0_-1px_0_rgba(255,255,255,0.4)_inset] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.45),0_-1px_0_rgba(255,255,255,0.06)_inset] min-[600px]:bottom-4 min-[600px]:inset-x-auto min-[600px]:left-1/2 min-[600px]:-translate-x-1/2 min-[600px]:w-[min(34rem,calc(100%-3rem))] min-[600px]:h-[4.5rem] min-[600px]:rounded-[1.75rem] min-[600px]:border min-[600px]:border-border/80 min-[600px]:px-2 min-[600px]:shadow-[0_20px_50px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.12)_inset] dark:min-[600px]:shadow-[0_25px_60px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
      }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}
    >
      {/* Subtle top border gradient accent */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/35 to-transparent pointer-events-none" />

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
        className={`group relative h-full flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] select-none active:scale-95 transition-all duration-200 min-w-0 ${
          openMobile ? "text-primary font-bold" : "text-muted-foreground/75 hover:text-foreground"
        }`}
        aria-label={t("nav.menu", "منو")}
        onClick={() => {
          haptic("light");
          toggleSidebar();
        }}
      >
        <div
          className={`relative flex items-center justify-center h-8 w-12 rounded-2xl transition-all duration-200 ${
            openMobile
              ? "bg-primary/15 dark:bg-primary/25 text-primary shadow-[0_2px_10px_-2px_hsl(var(--primary)/0.3)] border border-primary/20"
              : "hover:bg-muted/40 text-muted-foreground/75 group-hover:text-foreground"
          }`}
        >
          <PanelRight
            className={`w-5 h-5 transition-transform duration-200 ${
              openMobile ? "scale-105 text-primary stroke-[2.2]" : "stroke-[1.8]"
            }`}
          />
          {openMobile && (
            <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          )}
        </div>
        <span
          dir={dir}
          className={`tracking-tight truncate max-w-full px-1 transition-colors duration-150 leading-tight mt-0.5 ${
            openMobile ? "font-bold text-primary" : "text-muted-foreground/80 font-medium group-hover:text-foreground"
          }`}
        >
          {t("nav.menu", "منو")}
        </span>
      </button>
    </nav>
  );
}
