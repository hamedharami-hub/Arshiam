import { lazy, Suspense, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { installUndoShortcuts } from "@/lib/undoStack";
import { toast } from "sonner";
import { ThemeProvider } from "next-themes";
import { getStoredTheme, getBaseTheme } from "@/lib/theme";
import { nativeRoute } from "@/lib/nativeRoutes";

export const PWA_UPDATE_TOAST_ID = "pwa-update-available";

export function usePwaUpdateToast() {
  useEffect(() => {
    const onUpdate = () => {
      // Detect language from i18next or localStorage for the toast
      const lang = (() => { try { return localStorage.getItem("i18nextLng") || "fa"; } catch { return "fa"; } })();
      const isEn = lang.startsWith("en");
      toast(isEn ? "A new version is ready" : "نسخه‌ی جدید برنامه آماده است", {
        id: PWA_UPDATE_TOAST_ID,
        description: isEn
          ? "Refresh to get the latest features."
          : "برای دریافت امکانات جدید، برنامه را به‌روزرسانی کن.",
        duration: Infinity,
        action: {
          label: isEn ? "Update" : "به‌روزرسانی",
          onClick: () => {
            const apply = (window as any).__applyPwaUpdate;
            if (typeof apply === "function") apply();
            else window.location.reload();
          },
        },
      });
    };
    window.addEventListener("pwa-update-available", onUpdate);
    return () => window.removeEventListener("pwa-update-available", onUpdate);
  }, []);
}

// Keep entry-critical routes eager so first paint isn't gated on a chunk
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";

// Lazy-load everything else — each page becomes its own chunk, slashing initial JS
const AppLayout = lazy(() => import("@/layouts/AppLayout"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const TasksView = lazy(() => import("./pages/TasksView"));
const TodayDashboardView = lazy(() => import("./pages/TodayDashboardView"));
const NotesView = lazy(() => import("./pages/NotesView"));
const HabitsView = lazy(() => import("./pages/HabitsView"));
const GardenView = lazy(() => import("./pages/GardenView"));
const PomodoroView = lazy(() => import("./pages/PomodoroView"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const StatsView = lazy(() => import("./pages/StatsView"));
const SettingsView = lazy(() => import("./pages/SettingsView"));
const KanbanView = lazy(() => import("./pages/KanbanView"));

const SelfKnowledgeView = lazy(() => import("./pages/SelfKnowledgeView"));
const MindView = lazy(() => import("./pages/MindView"));
const LifeArchitectView = lazy(() => import("./pages/LifeArchitectView"));
const AssessmentRunner = lazy(() => import("./pages/AssessmentRunner"));
const AssessmentResult = lazy(() => import("./pages/AssessmentResult"));
const CheckinView = lazy(() => import("./pages/CheckinView"));
const ThoughtRecordsView = lazy(() => import("./pages/ThoughtRecordsView"));
const ABCView = lazy(() => import("./pages/ABCView"));
const SocraticView = lazy(() => import("./pages/SocraticView"));
const AboutMeView = lazy(() => import("./pages/AboutMeView"));
const BreathingView = lazy(() => import("./pages/BreathingView"));
const ScreenerView = lazy(() => import("./pages/ScreenerView"));
const ValuesGoalsView = lazy(() => import("./pages/ValuesGoalsView"));
const WorryView = lazy(() => import("./pages/WorryView"));
const CycleView = lazy(() => import("./pages/CycleView"));
const CrisisView = lazy(() => import("./pages/CrisisView"));

const NewTaskView = lazy(() => import("./pages/NewTaskView"));
const NewNoteView = lazy(() => import("./pages/NewNoteView"));
const TaskDetailView = lazy(() => import("./pages/TaskDetailView"));
const AdminView = lazy(() => import("./pages/AdminView"));
const SharedWithMeView = lazy(() => import("./pages/SharedWithMeView"));
const ShareTargetView = lazy(() => import("./pages/ShareTargetView"));
const BucketsView = lazy(() => import("./pages/BucketsView"));
const ArticleRewriteView = lazy(() => import("./pages/ArticleRewriteView"));
const WidgetsView = lazy(() => import("./pages/WidgetsView"));
const ContactsView = lazy(() => import("./pages/ContactsView"));
const KnowledgeBaseView = lazy(() => import("./pages/KnowledgeBaseView"));
const PharmacyProductsView = lazy(() => import("./pages/PharmacyProductsView"));
const PharmacyScenarioPracticeView = lazy(() => import("./pages/PharmacyScenarioPracticeView"));
const PharmacyFredPracticeView = lazy(() => import("./pages/PharmacyFredPracticeView"));
const InteractiveStudyView = lazy(() => import("./pages/InteractiveStudyView"));
const ReviewView = lazy(() => import("./pages/ReviewView"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1m: avoid refetch storms
      gcTime: 5 * 60_000,       // 5m cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background" />
);

export function CapacitorUrlHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeGenerationRef = useRef(0);
  const initialLaunchConsumedRef = useRef(false);
  const programmaticTargetRef = useRef<string | null>(null);
  const currentRouteRef = useRef<string>(location.pathname + location.search);
  const lastHandledUrlRef = useRef<{ url: string; time: number }>({ url: "", time: 0 });

  // Invalidate any in-flight widget route request whenever the user navigates inside the app
  useEffect(() => {
    const currentLoc = location.pathname + location.search;
    if (programmaticTargetRef.current === currentLoc) {
      // Location update was initiated by our own widget navigation handler
      programmaticTargetRef.current = null;
    } else {
      const prevLoc = currentRouteRef.current;
      // Index.tsx redirects root ("/" or "/index.html") to the user's default landing page at boot.
      // That initial boot transition should NOT invalidate cold-start widget route requests.
      const isInitialRootTransition =
        (prevLoc === "/" || prevLoc === "/index.html") &&
        (currentLoc.startsWith("/app/") || currentLoc === "/auth");

      if (!isInitialRootTransition) {
        // Genuine user navigation inside React Router:
        // 1. Invalidate any in-flight asynchronous widget route request
        routeGenerationRef.current++;
        // 2. Prevent cold-start launch URL from overwriting this navigation later
        initialLaunchConsumedRef.current = true;
      }
    }
    currentRouteRef.current = currentLoc;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const isNative =
      typeof window !== "undefined" &&
      Boolean(
        (window as any).Capacitor?.isNativePlatform?.() ||
        (window as any).Capacitor?.isNative ||
        window.location.protocol === "capacitor:"
      );

    if (!isNative) return;

    let disposed = false;

    // Popstate (browser back/forward button) listener as additional safety guard
    const onPopState = () => {
      routeGenerationRef.current++;
      initialLaunchConsumedRef.current = true;
    };
    window.addEventListener("popstate", onPopState);

    const navigateForUrl = (rawUrl: string, isFromLaunch = false) => {
      if (!rawUrl || disposed) return;

      // Ensure cold-start launch URL is consumed only once
      if (isFromLaunch) {
        if (initialLaunchConsumedRef.current) return;
        initialLaunchConsumedRef.current = true;
      }

      const now = Date.now();
      // Deduplicate rapid duplicate events (e.g. simultaneous __arshnazDispatchUrl and appUrlOpen)
      if (
        rawUrl === lastHandledUrlRef.current.url &&
        now - lastHandledUrlRef.current.time < 800
      ) {
        return;
      }
      lastHandledUrlRef.current = { url: rawUrl, time: now };

      const targetGeneration = ++routeGenerationRef.current;

      void import("@/lib/firebase")
        .then(({ auth }) => auth.authStateReady().then(() => {
          if (disposed || targetGeneration !== routeGenerationRef.current) return;

          const path = nativeRoute(rawUrl, auth.currentUser?.uid);
          if (!path || disposed || targetGeneration !== routeGenerationRef.current) return;

          if (currentRouteRef.current === path) return;

          programmaticTargetRef.current = path;
          navigate(path);
        }))
        .catch(() => {});
    };

    let handle: any = null;
    try {
      const onDispatchUrl = (event: { url?: string } | null | undefined) => {
        if (event?.url) {
          navigateForUrl(event.url, false);
        }
      };
      (window as any).__arshnazDispatchUrl = onDispatchUrl;

      // Drain cold-start pending URL if injected by native before React effect mounted
      if (typeof (window as any).__arshnazPendingUrl === "string") {
        const pending = (window as any).__arshnazPendingUrl;
        delete (window as any).__arshnazPendingUrl;
        navigateForUrl(pending, true);
      }

      // Subscribe before reading the cold-start URL. Otherwise a warm widget
      // tap can be missed and an older launch URL wins when the WebView resumes.
      CapApp.addListener("appUrlOpen", (event) => {
        if (event?.url) navigateForUrl(event.url, false);
      })
        .then((h) => {
          handle = h;
          if (disposed) { void h.remove(); return; }
          return CapApp.getLaunchUrl().then((launch) => {
            if (launch?.url && !initialLaunchConsumedRef.current && !disposed) {
              navigateForUrl(launch.url, true);
            }
          });
        })
        .catch((e) => console.warn("Capacitor widget route notice:", e));
    } catch (e) {
      console.warn("Capacitor appUrlOpen error:", e);
    }

    return () => {
      disposed = true;
      window.removeEventListener("popstate", onPopState);
      delete (window as any).__arshnazDispatchUrl;
      try {
        handle?.remove?.();
      } catch {}
    };
  }, [navigate]);

  return null;
}

const App = () => {
  useEffect(() => {
    try {
      installUndoShortcuts();
    } catch {}
  }, []);

  usePwaUpdateToast();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme={getBaseTheme(getStoredTheme() || "system")}
          storageKey="__arshnaz_base_theme"
          enableSystem
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CapacitorUrlHandler />
              <AuthProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/index.html" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    {/* Root shortcut aliases */}
                    <Route path="/today" element={<Navigate to="/app/today" replace />} />
                    <Route path="/inbox" element={<Navigate to="/app/inbox" replace />} />
                    <Route path="/garden" element={<Navigate to="/app/garden" replace />} />
                    <Route path="/pomodoro" element={<Navigate to="/app/pomodoro" replace />} />
                    <Route path="/checkin" element={<Navigate to="/app/checkin" replace />} />
                    <Route path="/notes" element={<Navigate to="/app/notes" replace />} />
                    <Route path="/habits" element={<Navigate to="/app/habits" replace />} />
                    <Route path="/calendar" element={<Navigate to="/app/calendar" replace />} />
                    <Route path="/contacts" element={<Navigate to="/app/contacts" replace />} />
                    <Route path="/knowledge" element={<Navigate to="/app/knowledge" replace />} />
                    <Route path="/interactive-study" element={<Navigate to="/app/interactive-study" replace />} />
                    <Route path="/review" element={<Navigate to="/app/review" replace />} />
                    <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
                    <Route path="/life-architect" element={<Navigate to="/app/life-architect" replace />} />
                    <Route path="/new-task" element={<Navigate to="/app/new/task" replace />} />
                    <Route path="/new/task" element={<Navigate to="/app/new/task" replace />} />
                    <Route path="/crisis" element={<Navigate to="/app/crisis" replace />} />
                    <Route path="/sos" element={<Navigate to="/app/crisis" replace />} />

                    <Route
                      path="/app"
                      element={
                        <ProtectedRoute>
                          <ErrorBoundary>
                            <AppLayout />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="today" replace />} />

                      <Route path="inbox" element={<TasksView scope="inbox" />} />
                      <Route path="today" element={<TodayDashboardView />} />
                      <Route path="tomorrow" element={<TasksView scope="tomorrow" />} />
                      <Route path="next7" element={<TasksView scope="next7" />} />
                      <Route path="smart" element={<TasksView scope="smart" />} />
                      <Route path="folder/:id" element={<TasksView scope="folder" />} />
                      <Route path="tag/:id" element={<TasksView scope="tag" />} />
                      <Route path="notes" element={<NotesView />} />
                      <Route path="habits" element={<HabitsView />} />
                      <Route path="garden" element={<GardenView />} />
                      <Route path="pomodoro" element={<PomodoroView />} />
                      <Route path="calendar" element={<CalendarView />} />
                      <Route path="contacts" element={<ContactsView />} />
                      <Route path="knowledge" element={<KnowledgeBaseView />} />
                      <Route path="pharmacy-products" element={<PharmacyProductsView />} />
                      <Route path="pharmacy-scenario-practice" element={<PharmacyScenarioPracticeView />} />
                      <Route path="pharmacy-fred-practice" element={<PharmacyFredPracticeView />} />
                      <Route path="interactive-study" element={<InteractiveStudyView />} />
                      <Route path="review" element={<ReviewView />} />
                      <Route path="stats" element={<StatsView />} />
                      <Route path="kanban" element={<KanbanView />} />
                      <Route path="buckets" element={<BucketsView />} />

                      <Route path="mind" element={<MindView />} />
                      <Route path="crisis" element={<CrisisView />} />
                      <Route path="sos" element={<Navigate to="/app/crisis" replace />} />
                      <Route path="self" element={<SelfKnowledgeView />} />
                      <Route path="self/test/:type" element={<AssessmentRunner />} />
                      <Route path="self/result/:type" element={<AssessmentResult />} />
                      <Route path="checkin" element={<CheckinView />} />
                      <Route path="thoughts" element={<ThoughtRecordsView />} />
                      <Route path="abc" element={<ABCView />} />
                      <Route path="socratic" element={<SocraticView />} />
                      <Route path="breathing" element={<BreathingView />} />
                      <Route path="screener/:type" element={<ScreenerView />} />
                      <Route path="values" element={<ValuesGoalsView />} />
                      <Route path="life-architect" element={<LifeArchitectView />} />
                      <Route path="worry" element={<WorryView />} />
                      <Route path="cycle" element={<CycleView />} />
                      <Route path="about-me" element={<AboutMeView />} />
                      <Route path="settings" element={<SettingsView />} />
                      <Route path="admin" element={<AdminView />} />
                      <Route path="shared" element={<SharedWithMeView />} />
                      <Route path="new/task" element={<NewTaskView />} />
                      <Route path="new-task" element={<Navigate to="/app/new/task" replace />} />
                      <Route path="new/note" element={<NewNoteView />} />
                      <Route path="new-note" element={<Navigate to="/app/new/note" replace />} />
                      <Route path="share-target" element={<ShareTargetView />} />
                      <Route path="rewrite-article" element={<ArticleRewriteView />} />
                      <Route path="tasks/:id" element={<TaskDetailView />} />
                      <Route path="widgets" element={<WidgetsView />} />
                      <Route path="widget/:id" element={<WidgetsView />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
