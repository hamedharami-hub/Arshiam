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
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-card/90 dark:bg-card/95 backdrop-blur-2xl border-t border-border/60 flex items-stretch h-15 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.35)] transition-all select-none"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
      }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}
    >
      {/* Primary tabs (Today, Notes) */}
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

      {/* Secondary tabs (Mind / Habits) */}
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
        className={`relative h-full flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium select-none active:scale-90 transition-all duration-150 ${
          openMobile ? "text-primary" : "text-muted-foreground/75 hover:text-foreground"
        }`}
        aria-label={t("nav.menu", "منو")}
        onClick={() => {
          haptic("light");
          toggleSidebar();
        }}
      >
        <div className={`relative flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
          openMobile ? "bg-primary/10" : ""
        }`}>
          <PanelRight className={`w-5 h-5 transition-transform duration-200 ${
            openMobile ? "scale-110 text-primary stroke-[2.2]" : "stroke-[1.8]"
          }`} />
          {openMobile && (
            <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span
          dir={dir}
          className={`tracking-tight transition-colors duration-150 ${
            openMobile ? "font-bold text-primary" : "text-muted-foreground/90"
          }`}
        >
          {t("nav.menu", "منو")}
        </span>
      </button>
    </nav>
  );
}
