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
  foldableExtraLeftTab?: BottomTabItemConfig;
  foldableExtraRightTab?: BottomTabItemConfig;
  currentPath: string;
  dir: "rtl" | "ltr";
}

export function MobileBottomBar({
  primaryTabs,
  secondaryTabs,
  foldableExtraLeftTab,
  foldableExtraRightTab,
  currentPath,
  dir,
}: MobileBottomBarProps) {
  const { toggleSidebar, openMobile } = useSidebar();
  const { t } = useTranslation();

  return (
    <nav
      dir={dir}
      data-bottom-bar="true"
      className="md:hidden fixed z-40 transition-all duration-300 ease-out select-none inset-x-0 bottom-0 h-15 bg-card/90 dark:bg-card/95 backdrop-blur-2xl border-t border-border/60 flex items-stretch shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.35)] min-[520px]:bottom-3.5 min-[520px]:inset-x-auto min-[520px]:left-1/2 min-[520px]:-translate-x-1/2 min-[520px]:w-[calc(100%-2rem)] min-[520px]:max-w-xl min-[520px]:h-16 min-[520px]:rounded-3xl min-[520px]:border min-[520px]:border-border/70 min-[520px]:px-2 min-[520px]:shadow-[0_16px_40px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.12)_inset] dark:min-[520px]:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
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

      {/* Extra tab for foldable / wide mobile screens (Habits) */}
      {foldableExtraLeftTab && (
        <BottomTabItem
          key={foldableExtraLeftTab.key}
          tab={foldableExtraLeftTab}
          isActive={foldableExtraLeftTab.match(currentPath)}
          mode="mobile"
          dir={dir}
          className="hidden min-[520px]:flex"
        />
      )}

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

      {/* Extra tab for foldable / wide mobile screens (Calendar) */}
      {foldableExtraRightTab && (
        <BottomTabItem
          key={foldableExtraRightTab.key}
          tab={foldableExtraRightTab}
          isActive={foldableExtraRightTab.match(currentPath)}
          mode="mobile"
          dir={dir}
          className="hidden min-[520px]:flex"
        />
      )}

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
