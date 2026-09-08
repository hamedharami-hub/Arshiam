import { useLocation, useNavigate } from "react-router-dom";
import { ListTodo, FileText, Plus, Brain, PanelRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { useSidebar } from "@/components/ui/sidebar";
import RecentlyDeletedSheet from "@/components/RecentlyDeletedSheet";

import { isRTL } from "@/i18n";

type Tab = { key: string; to: string; icon: typeof ListTodo; match: (p: string) => boolean };

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const { t, i18n } = useTranslation();
  const dir = isRTL(i18n.language || "fa") ? "rtl" : "ltr";
  const [trashOpen, setTrashOpen] = useState(false);

  // Allow other parts of the app to open the trash via a global event.
  useEffect(() => {
    const open = () => setTrashOpen(true);
    window.addEventListener("lov:open-trash", open);
    return () => window.removeEventListener("lov:open-trash", open);
  }, []);

  if (!loc.pathname.startsWith("/app")) return null;

  const openQuickCapture = () => {
    haptic("medium");
    window.dispatchEvent(new Event("lov:open-quick-capture"));
  };

  const leftTabs: Tab[] = [
    {
      key: "mind",
      to: "/app/mind",
      icon: Brain,
      match: (p) =>
        p === "/app/mind" ||
        p.startsWith("/app/checkin") ||
        p.startsWith("/app/thoughts") ||
        p.startsWith("/app/abc") ||
        p.startsWith("/app/worry") ||
        p.startsWith("/app/values") ||
        p.startsWith("/app/breathing") ||
        p.startsWith("/app/socratic") ||
        p.startsWith("/app/screener") ||
        p.startsWith("/app/self"),
    },
    { key: "notes", to: "/app/notes", icon: FileText, match: (p) => p.startsWith("/app/notes") },
  ];

  const rightTabs: Tab[] = [
    { key: "today", to: "/app/today", icon: ListTodo, match: (p) => p === "/app/today" || p === "/app" },
  ];

  const go = (to: string) => {
    haptic("light");
    navigate(to);
  };

  const itemClass = (active: boolean) =>
    `relative h-full flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium select-none active:scale-90 transition-all duration-150 ${
      active ? "text-primary" : "text-muted-foreground/75 hover:text-foreground"
    }`;

  return (
    <>
      <nav
        dir={dir}
        className="md:hidden fixed inset-x-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/70 flex items-stretch h-14 shadow-xs"
        style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={t("nav.menu", "Bottom bar")}
      >
        {leftTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(loc.pathname);
          return (
            <button
              key={tab.key}
              type="button"
              className={itemClass(active)}
              aria-label={t(`nav.${tab.key}`)}
              aria-current={active ? "page" : undefined}
              onClick={() => go(tab.to)}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-105" : ""}`} />
                {active && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span dir={dir} className={active ? "font-semibold text-primary" : ""}>
                {t(`nav.${tab.key}`)}
              </span>
            </button>
          );
        })}

        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={openQuickCapture}
            aria-label={t("nav.quickAdd")}
            className="-mt-6 h-13 w-13 rounded-full bg-gradient-to-tr from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 hover:scale-105 transition-all duration-200 ring-4 ring-background"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {rightTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(loc.pathname);
          return (
            <button
              key={tab.key}
              type="button"
              className={itemClass(active)}
              aria-label={t(`nav.${tab.key}`)}
              aria-current={active ? "page" : undefined}
              onClick={() => go(tab.to)}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-105" : ""}`} />
                {active && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span dir={dir} className={active ? "font-semibold text-primary" : ""}>
                {t(`nav.${tab.key}`)}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          className={itemClass(false)}
          aria-label={t("nav.menu")}
          onClick={() => {
            haptic("light");
            toggleSidebar();
          }}
        >
          <PanelRight className="w-5 h-5" />
          <span dir={dir}>{t("nav.menu")}</span>
        </button>
      </nav>

      <RecentlyDeletedSheet open={trashOpen} onOpenChange={setTrashOpen} />
    </>
  );
}
