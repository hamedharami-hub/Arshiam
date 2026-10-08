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
      className="group relative z-10 h-full flex-1 flex items-center justify-center select-none active:scale-95 transition-transform duration-150 min-w-0"
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

    </button>
  );

  const effectiveTabs = tabs || [...(primaryTabs || []), ...(secondaryTabs || [])];

  const tab1 = effectiveTabs[0] ? (
    <BottomTabItem
      key={effectiveTabs[0].key}
      tab={effectiveTabs[0]}
      isActive={effectiveTabs[0].match(currentPath)}
      mode="mobile"
    />
  ) : null;

  const tab2 = effectiveTabs[1] ? (
    <BottomTabItem
      key={effectiveTabs[1].key}
      tab={effectiveTabs[1]}
      isActive={effectiveTabs[1].match(currentPath)}
      mode="mobile"
    />
  ) : null;

  const tab3 = effectiveTabs[2] ? (
    <BottomTabItem
      key={effectiveTabs[2].key}
      tab={effectiveTabs[2]}
      isActive={effectiveTabs[2].match(currentPath)}
      mode="mobile"
    />
  ) : null;

  return (
    <nav
      dir={dir}
      data-bottom-bar="true"
      data-sidebar-side={sidebarPosition}
      className="isolate fixed z-40 inset-x-3 flex h-[var(--bottom-bar-height)] select-none items-stretch rounded-full border border-border bg-card text-foreground shadow-[0_12px_30px_-18px_hsl(30_10%_10%/0.45)]"
      style={{
        bottom: "max(env(safe-area-inset-bottom, 0px), 0.625rem)",
        left: "max(env(safe-area-inset-left, 0px), 0.75rem)",
        right: "max(env(safe-area-inset-right, 0px), 0.75rem)",
        paddingInline: "0.45rem",
      }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}
    >

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
