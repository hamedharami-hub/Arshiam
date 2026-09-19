import { PanelRight, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarPosition } from "@/lib/sidebarPosition";
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
  const { sidebarPosition } = useSidebarPosition();
  const isSidebarLeft = sidebarPosition === "left";
  const { t } = useTranslation();

  const MenuIcon = isSidebarLeft ? PanelLeft : PanelRight;

  const menuButton = (
    <button
      key="bottom-bar-menu-toggle"
      type="button"
      className="group relative h-full flex-1 flex flex-col items-center justify-center pt-1.5 pb-1 select-none active:scale-92 transition-transform duration-150 min-w-0"
      aria-label={t("nav.menu", "منو")}
      onClick={() => {
        haptic("light");
        toggleSidebar();
      }}
    >
      {/* Material 3 Capsule Indicator */}
      <div
        className={`relative flex items-center justify-center h-8 w-16 rounded-full transition-all duration-300 ease-out ${
          openMobile
            ? "bg-primary/15 dark:bg-primary/25 text-primary scale-100"
            : "text-muted-foreground/75 hover:text-foreground group-hover:bg-muted/35"
        }`}
      >
        <MenuIcon
          className={`w-5 h-5 transition-all duration-200 ${
            openMobile
              ? "scale-105 text-primary stroke-[2.2]"
              : "stroke-[1.8] group-hover:scale-105"
          }`}
        />
      </div>

      {/* Material 3 Label */}
      <span
        dir={dir}
        className={`tracking-tight truncate max-w-full px-1 transition-all duration-200 text-[11px] leading-tight mt-1 ${
          openMobile
            ? "font-semibold text-primary dark:text-primary"
            : "font-medium text-muted-foreground/75 group-hover:text-foreground"
        }`}
      >
        {t("nav.menu", "منو")}
      </span>
    </button>
  );

  const todayTabs = secondaryTabs.map((tab) => (
    <BottomTabItem
      key={tab.key}
      tab={tab}
      isActive={tab.match(currentPath)}
      mode="mobile"
      dir={dir}
    />
  ));

  const generalTabs = primaryTabs.map((tab) => (
    <BottomTabItem
      key={tab.key}
      tab={tab}
      isActive={tab.match(currentPath)}
      mode="mobile"
      dir={dir}
    />
  ));

  return (
    <nav
      dir="ltr"
      data-bottom-bar="true"
      data-sidebar-side={sidebarPosition}
      className="fixed z-40 transition-all duration-300 ease-out select-none inset-x-0 bottom-0 h-[4.85rem] bg-background/85 dark:bg-card/85 backdrop-blur-2xl border-t border-border/25 dark:border-white/10 flex items-stretch shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
      }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}
    >
      {/* Subtle modern top hairline glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/25 to-transparent pointer-events-none" />

      {isSidebarLeft ? (
        <>
          {/* Left zone: Menu (far left) & Today (adjacent to center) */}
          {menuButton}
          {todayTabs}

          {/* Elevated center Quick Add action */}
          <div className="flex-1 flex items-center justify-center">
            <BottomQuickAddButton mode="mobile" />
          </div>

          {/* Right zone: Mind, Notes */}
          {generalTabs}
        </>
      ) : (
        <>
          {/* Left zone: Mind, Notes */}
          {generalTabs}

          {/* Elevated center Quick Add action */}
          <div className="flex-1 flex items-center justify-center">
            <BottomQuickAddButton mode="mobile" />
          </div>

          {/* Right zone: Today (adjacent to center) & Menu (far right) */}
          {todayTabs}
          {menuButton}
        </>
      )}
    </nav>
  );
}
