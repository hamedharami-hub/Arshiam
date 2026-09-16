import { useState, useEffect } from "react";
import {
  Search,
  Sparkles,
  PanelRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Command,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { haptic } from "@/lib/haptics";
import { BottomTabItemConfig } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WindowsFluentBarProps {
  allTabs: BottomTabItemConfig[];
  currentPath: string;
  dir: "rtl" | "ltr";
  onOpenAI?: () => void;
}

export function WindowsFluentBar({
  allTabs,
  currentPath,
  dir,
  onOpenAI,
}: WindowsFluentBarProps) {
  const { toggleSidebar, state } = useSidebar();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = (i18n.language || "fa").startsWith("en");

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("windows_bar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("windows_bar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleToggle = () => toggleCollapse();
    window.addEventListener("lov:toggle-dock", handleToggle);
    return () => window.removeEventListener("lov:toggle-dock", handleToggle);
  }, []);

  const handleOpenSearch = () => {
    haptic("light");
    window.dispatchEvent(new CustomEvent("arshnaz:open-search"));
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
    );
  };

  const handleQuickAdd = () => {
    haptic("medium");
    window.dispatchEvent(new Event("lov:open-quick-capture"));
  };

  const handleOpenAI = () => {
    haptic("light");
    if (onOpenAI) {
      onOpenAI();
    } else {
      window.dispatchEvent(new CustomEvent("arshnaz:open-ai"));
    }
  };

  // If collapsed by user, render a sleek Windows 11 mini pill
  if (collapsed) {
    return (
      <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 select-none animate-in fade-in-0 duration-150">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={t("nav.showWindowsBar", "نمایش نوار ابزار ویندوز")}
              className="group h-8 px-3.5 rounded-full bg-card/85 dark:bg-card/90 backdrop-blur-2xl border border-border/80 text-muted-foreground hover:text-foreground text-xs font-medium shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex items-center gap-2 active:scale-95 hover:scale-105 transition-all duration-200"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold text-foreground/90">
                {isEn ? "Command Bar" : "نوار دستورات"}
              </span>
              <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-muted/80 text-muted-foreground border border-border/70 ltr">
                Alt+D
              </kbd>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
            <span>{t("nav.expandWindowsBar", "نمایش کامل نوار ابزار ویندوز")}</span>
            <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+D</kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside
      dir={dir}
      data-windows-fluent-bar="true"
      className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 select-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200 max-w-[calc(100vw-2rem)]"
      aria-label={t("nav.windowsBar", "نوار ناوبری ویندوز")}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-card/80 dark:bg-card/85 backdrop-blur-2xl border border-border/75 shadow-[0_12px_36px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.25)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-black/5 dark:ring-white/5">
        
        {/* Left Section: Quick Search (Ctrl+K) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label={t("nav.search", "جستجو")}
              className="h-8 px-2.5 rounded-xl text-muted-foreground/85 hover:text-foreground hover:bg-accent/50 active:scale-95 flex items-center gap-1.5 text-xs transition-all duration-150"
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline text-[11px] font-medium">
                {isEn ? "Search" : "جستجو"}
              </span>
              <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-muted/70 text-muted-foreground border border-border/70 ltr shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                Ctrl+K
              </kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
            <span>{t("nav.searchTasksNotes", "جستجوی سریع تسک‌ها و نوت‌ها")}</span>
            <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Ctrl+K</kbd>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border/80 dark:bg-white/10 mx-0.5" />

        {/* Center Section: All 5 Primary Tabs with Windows 11 Fluent Pills */}
        <div className="flex items-center gap-1">
          {allTabs.map((tab) => {
            const isActive = tab.match(currentPath);
            const label = isEn ? tab.labelEn : tab.labelFa;
            const Icon = tab.icon;

            return (
              <Tooltip key={tab.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      haptic("light");
                      navigate(tab.to);
                    }}
                    aria-label={label}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium select-none transition-all duration-150 ${
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30 font-semibold shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                        : "text-muted-foreground/85 hover:text-foreground hover:bg-accent/40 active:scale-95"
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Icon
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isActive ? "scale-110 text-primary" : "group-hover:scale-105"
                        }`}
                      />
                      {tab.badge ? (
                        <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground min-w-3.5 h-3.5 flex items-center justify-center shadow-xs">
                          {tab.badge}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px]">{label}</span>
                    <kbd
                      className={`text-[9px] px-1 py-0.2 rounded font-mono border ltr transition-colors ${
                        isActive
                          ? "bg-primary/20 text-primary border-primary/35 shadow-[0_1px_0_hsl(var(--primary)/0.2)]"
                          : "bg-muted/60 text-muted-foreground border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
                      }`}
                    >
                      {tab.shortcutKey}
                    </kbd>
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-2.5 h-0.5 bg-primary rounded-full shadow-[0_0_6px_hsl(var(--primary))]" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
                  <span>{label}</span>
                  <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">
                    {tab.shortcutLabel}
                  </kbd>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="w-px h-5 bg-border/80 dark:bg-white/10 mx-0.5" />

        {/* Right Section: Quick Add (Alt+N), AI, Sidebar Toggle, Minimize */}
        <div className="flex items-center gap-1">
          {/* Quick Add Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={t("nav.quickAdd", "افزودن سریع")}
                className="group relative h-8 px-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium text-xs shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 active:scale-95 flex items-center gap-1.5 transition-all duration-150 border border-primary/30 select-none"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
                <span className="text-[11px] hidden sm:inline">
                  {isEn ? "New" : "ثبت سریع"}
                </span>
                <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary-foreground/20 text-primary-foreground border border-white/20 shadow-[0_1px_0_rgba(0,0,0,0.1)] ltr">
                  Alt+N
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
              <span>{t("nav.quickAdd", "ثبت سریع تسک یا نوت")}</span>
              <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+N</kbd>
            </TooltipContent>
          </Tooltip>

          {/* AI Assistant Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleOpenAI}
                aria-label={t("nav.aiAssistant", "دستیار هوش مصنوعی")}
                className="h-8 px-2 rounded-xl text-muted-foreground/85 hover:text-primary hover:bg-primary/10 active:scale-95 flex items-center gap-1 text-xs transition-all duration-150"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span className="hidden md:inline text-[11px] font-medium">AI</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
              <span>{t("nav.aiAssistant", "دستیار هوش مصنوعی عرش‌ناز")}</span>
            </TooltipContent>
          </Tooltip>

          {/* Sidebar Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t("nav.sidebar", "سایدبار")}
                className={`h-8 px-2 rounded-xl text-xs font-medium select-none transition-all duration-150 flex items-center gap-1 ${
                  state === "expanded"
                    ? "bg-primary/15 text-primary border border-primary/25 shadow-xs font-semibold"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-accent/40 active:scale-95"
                }`}
              >
                <PanelRight className={`w-3.5 h-3.5 ${state === "expanded" ? "text-primary" : ""}`} />
                <kbd className="hidden lg:inline-flex text-[9px] px-1 py-0.2 rounded font-mono bg-muted/60 text-muted-foreground border border-border/70 ltr">
                  Alt+M
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
              <span>{t("nav.toggleSidebar", "باز و بسته کردن سایدبار")}</span>
              <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+M</kbd>
            </TooltipContent>
          </Tooltip>

          {/* Minimize / Collapse Bar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label={t("nav.minimizeWindowsBar", "کوچک‌کردن نوار")}
                className="w-7 h-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent/40 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
              <span>{t("nav.minimizeBar", "کوچک‌کردن نوار دستورات")}</span>
              <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+D</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
