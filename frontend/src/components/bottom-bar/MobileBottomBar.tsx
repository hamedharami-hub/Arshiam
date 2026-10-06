import { PanelRight, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarPosition } from "@/lib/sidebarPosition";
import { BottomTabItemConfig } from "./types";
import { BottomTabItem } from "./BottomTabItem";
import { BottomQuickAddButton } from "./BottomQuickAddButton";

export interface MobileBottomBarProps {
  tabs?: BottomTabItemConfig[];
  primaryTabs?: BottomTabItemConfig[];
  secondaryTabs?: BottomTabItemConfig[];
  currentPath: string;
  dir: "rtl" | "ltr";
}

export function MobileBottomBar({
  tabs,
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
      className="group relative h-full flex-1 flex flex-col items-center justify-center pt-1.5 pb-1 select-none active:scale-95 transition-transform duration-150 min-w-0"
      aria-label={t("nav.menu", "منو")}
      onClick={() => {
        haptic("light");
        toggleSidebar();
      }}
    >
      {/* Material 3 Capsule Indicator */}
      <div
        className={`relative flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300 ease-out ${
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

  const effectiveTabs = tabs || [...(primaryTabs || []), ...(secondaryTabs || [])];

  const tab1 = effectiveTabs[0] ? (
    <BottomTabItem
      key={effectiveTabs[0].key}
      tab={effectiveTabs[0]}
      isActive={effectiveTabs[0].match(currentPath)}
      mode="mobile"
      dir={dir}
    />
  ) : null;

  const tab2 = effectiveTabs[1] ? (
    <BottomTabItem
      key={effectiveTabs[1].key}
      tab={effectiveTabs[1]}
      isActive={effectiveTabs[1].match(currentPath)}
      mode="mobile"
      dir={dir}
    />
  ) : null;

  const tab3 = effectiveTabs[2] ? (
    <BottomTabItem
      key={effectiveTabs[2].key}
      tab={effectiveTabs[2]}
      isActive={effectiveTabs[2].match(currentPath)}
      mode="mobile"
      dir={dir}
    />
  ) : null;

  return (
    <nav
      dir={dir}
      data-bottom-bar="true"
      data-sidebar-side={sidebarPosition}
      className="fixed z-40 transition-all duration-300 ease-out select-none inset-x-0 bottom-0 h-[var(--bottom-bar-height)] bg-background dark:bg-card border-t border-border/70 dark:border-white/15 flex items-stretch shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
      }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}
    >
      {/* Subtle modern top hairline glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/25 to-transparent pointer-events-none" />

      {/* 5 Symmetric, Balanced Slots: [Menu] [Tab 1] [Center +] [Tab 2] [Tab 3] */}
      {menuButton}
      {tab1}
      <BottomQuickAddButton mode="mobile" />
      {tab2}
      {tab3}
    </nav>
  );
}
export default MobileBottomBar;
