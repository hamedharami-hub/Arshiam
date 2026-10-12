import { installMouseTabScroll } from "@/lib/mouseTabScroll";
import { Capacitor } from "@capacitor/core";
import { ModuleGatedOutlet } from "@/components/modules/ModuleGatedOutlet";
import { syncModulesForUser } from "@/lib/appModules";
import { loadSettings } from "@/lib/reminders";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIPanel } from "@/components/AIPanel";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Search } from "lucide-react";
import OfflineIndicator from "@/components/OfflineIndicator";
import FocusRuntime from "@/components/FocusRuntime";
import InstallPrompt from "@/components/InstallPrompt";
import EdgeSwipeHandler from "@/components/EdgeSwipeHandler";
import SwipeNavigator from "@/components/gestures/SwipeNavigator";
import ClinicalDisclaimer from "@/components/ClinicalDisclaimer";
import RemindersRunner from "@/components/RemindersRunner";
import { useAuth } from "@/hooks/useAuth";
import { migrateLegacyComments } from "@/lib/commentMigration";
import { startAttachmentQueueRunner } from "@/lib/attachmentUpload";
import BackButtonHandler from "@/components/BackButtonHandler";
import CommandPalette from "@/components/CommandPalette";
import { purgeRetiredFeatureKeys } from "@/lib/retiredFeatures";
import { PageColorButton } from "@/components/PageColorButton";
import { pageKeyForPath, pageTint, usePageBackground } from "@/lib/pageBackground";
import QuickCaptureDialog from "@/components/QuickCaptureDialog";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";
import { BottomTabBar } from "@/components/BottomTabBar";
import { SelectionActionToolbar } from "@/components/SelectionActionToolbar";
import Onboarding from "@/components/Onboarding";
import HeaderBackButton from "@/components/HeaderBackButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTwoFingerSwipe } from "@/lib/useTwoFingerSwipe";
import { useThreeFingerGestures } from "@/lib/useThreeFingerGestures";
import { applyTheme, getStoredTheme, getBaseTheme } from "@/lib/theme";
import { useTheme } from "next-themes";
import AndroidGestures from "@/components/AndroidGestures";
import AndroidBackButton from "@/components/AndroidBackButton";
import AndroidTaskSync from "@/components/AndroidTaskSync";
import { isAndroid } from "@/lib/nativeExperience";
import { cn } from "@/lib/utils";
import { shouldShowBottomNavigation, useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { hydrateSidebarPositionFromCloud, useSidebarPosition } from "@/lib/sidebarPosition";
import { navigationInteractionBlocked, rememberLastRoute, routeTitle } from "@/lib/appNavigation";

export default function AppLayout() {
  useEffect(() => installMouseTabScroll(), []);
  const [aiOpen, setAiOpen] = useState(false);
  const { setTheme } = useTheme();
  const loc = useLocation();
  const [routeAnnouncement, setRouteAnnouncement] = useState("");
  const isEn = document.documentElement.lang?.startsWith("en");
  useTwoFingerSwipe();
  const { user: layoutUser } = useAuth();
  useEffect(() => { purgeRetiredFeatureKeys(); }, []);
  useEffect(() => {
    if (!layoutUser?.id) return;
    let cancelled = false;
    void loadSettings(layoutUser.id).then((settings) => {
      if (!cancelled) hydrateSidebarPositionFromCloud(settings?.sidebar_position);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [layoutUser?.id]);
  const pageKey = pageKeyForPath(loc.pathname);
  const pageBg = usePageBackground(layoutUser?.id, pageKey);
  useEffect(() => { void syncModulesForUser(layoutUser?.id ?? null); }, [layoutUser?.id]);
  useEffect(() => {
    if (!layoutUser?.id) return;
    startAttachmentQueueRunner();
    void migrateLegacyComments(layoutUser.id).catch(() => {});
  }, [layoutUser?.id]);
  useThreeFingerGestures({
    onQuickCapture: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", metaKey: true })),
    onOpenTrash: () => window.dispatchEvent(new Event("lov:open-trash")),
    onOpenSearch: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })),
  });
  useEffect(() => {
    rememberLastRoute(layoutUser?.id, loc.pathname + loc.search);
  }, [layoutUser?.id, loc.pathname, loc.search]);

  useEffect(() => {
    setRouteAnnouncement("");
    const frame = requestAnimationFrame(() => {
      // An editor's autofocus or an open dialog takes precedence over route focus.
      if (navigationInteractionBlocked()) return;
      const main = document.getElementById("main-scroll");
      const heading = main?.querySelector<HTMLElement>("h1");
      const title = heading?.textContent?.trim() || document.getElementById("app-header-title")?.textContent?.trim() || routeTitle(loc.pathname, Boolean(isEn));
      const target = heading || main;
      if (target) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
      setRouteAnnouncement(title);
    });
    return () => cancelAnimationFrame(frame);
  }, [loc.pathname, isEn]);

  // Safety guard against Radix UI pointer-events locking when modals/drawers unmount
  useEffect(() => {
    const clearStuckPointerEvents = () => {
      if (typeof document === "undefined") return;
      const hasOpenModal = Boolean(
        document.querySelector('div[role="dialog"][data-state="open"], div[role="alertdialog"][data-state="open"], [data-radix-dialog-content][data-state="open"], [data-radix-alert-dialog-content][data-state="open"]')
      );
      if (!hasOpenModal && document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    clearStuckPointerEvents();
    const interval = setInterval(clearStuckPointerEvents, 300);
    return () => clearInterval(interval);
  }, [loc.pathname]);

  useEffect(() => {
    const handleOpenAi = () => setAiOpen(true);
    window.addEventListener("arshnaz:open-ai", handleOpenAi);
    return () => window.removeEventListener("arshnaz:open-ai", handleOpenAi);
  }, []);

  useEffect(() => {
    const stored = getStoredTheme() || "paper-light";
    applyTheme(stored);
    setTheme(getBaseTheme(stored));
  }, [setTheme]);
  const device = useDeviceFormFactor();
  const showMobileBottomBar = shouldShowBottomNavigation(device);

  const { sidebarPosition } = useSidebarPosition();
  const isRtl = typeof document !== "undefined" ? document.documentElement.dir !== "ltr" : true;
  const isSidebarLeft = sidebarPosition === "left";

  const desktopDefaultOpen =
    typeof window !== "undefined" && window.innerWidth >= 1024;

  const isTaskPage =
    loc.pathname.startsWith("/app/new/task") ||
    loc.pathname.startsWith("/app/new-task") ||
    loc.pathname.startsWith("/app/tasks/");

  return (
    <SidebarProvider defaultOpen={desktopDefaultOpen} side={sidebarPosition}>
      <a href="#main-scroll" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-background focus:p-3 focus:text-foreground" onClick={() => document.getElementById("main-scroll")?.focus()}>
        {isEn ? "Skip to main content" : "رفتن به محتوای اصلی"}
      </a>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{routeAnnouncement}</div>
      <div className="app-shell min-h-screen flex w-full bg-background" dir="ltr">
        <AppSidebar className={isSidebarLeft ? "order-1" : "order-2"} />
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            isSidebarLeft ? "order-2" : "order-1"
          )}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {!isTaskPage && (
            <header
              className="app-shell-header sticky top-0 z-10 flex items-center justify-between gap-3"
              data-testid="app-header"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <SidebarTrigger className="size-11 md:hidden" data-testid="header-sidebar-trigger" />
                <HeaderBackButton />
                <div id="app-header-title" className="min-w-0 flex items-center" />
              </div>
              <div className="flex items-center gap-1 justify-end shrink-0">
                <div id="app-header-actions" className="flex items-center gap-2 shrink-0 empty:hidden" />
                {pageKey && <PageColorButton color={pageBg.color} isDefault={pageBg.isDefault} onChange={pageBg.set} />}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("arshnaz:open-search"));
                  }}
                   aria-label={isEn ? "Search (Ctrl+K)" : "جستجو (Ctrl+K)"}
                   title={isEn ? "Search (Ctrl+K)" : "جستجو (Ctrl+K)"}
                  data-testid="header-search-button"
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="icon" onClick={() => setAiOpen(true)} className="h-11 w-11 shrink-0" title="AI" aria-label="AI" data-testid="header-ai-button">
                  <Sparkles className="w-4 h-4 text-primary" />
                </Button>
              </div>
            </header>
          )}
          <main
            id="main-scroll"
            tabIndex={-1}
            aria-label={routeTitle(loc.pathname, Boolean(isEn))}
            style={{ "--app-bottom-space": showMobileBottomBar ? "calc(var(--bottom-bar-height) + var(--bottom-bar-gap) + env(safe-area-inset-bottom, 0px))" : "0.5rem", backgroundColor: pageTint(pageBg.color, pageBg.isDefault ? 6 : 10), "--page-surface": pageTint(pageBg.color, pageBg.isDefault ? 6 : 10) || "hsl(var(--background))" } as CSSProperties}
            className={cn(
              "app-shell-main flex-1 overflow-auto",
              showMobileBottomBar ? "pb-safe-bottom" : "pb-2"
            )}
          >
            <div
              key={loc.pathname}
              className={cn(
                "animate-fade-in motion-reduce:animate-none w-full min-h-full",
                !isTaskPage && "app-shell-frame",
              )}
            >
              <ModuleGatedOutlet />
            </div>
          </main>
        </div>
        <AIPanel open={aiOpen} onOpenChange={setAiOpen} />
        <OfflineIndicator />
        <FocusRuntime />
        <InstallPrompt />
        {isAndroid() ? <AndroidGestures /> : !Capacitor.isNativePlatform() ? <><EdgeSwipeHandler /><SwipeNavigator /></> : null}
        <ClinicalDisclaimer />
        <RemindersRunner />
        {isAndroid() ? <AndroidTaskSync /> : null}
        {isAndroid() ? <AndroidBackButton /> : <BackButtonHandler />}
        <CommandPalette />
        <QuickCaptureDialog />
        <KeyboardShortcutsDialog />
        <BottomTabBar />
        <Onboarding />
        <SelectionActionToolbar />
      </div>
    </SidebarProvider>
  );
}
