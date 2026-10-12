import { CompanionSettings } from "./settings/CompanionSettings";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Sparkles, Save, Trash2, Languages, Download, ShieldOff, Shield, Settings2, Bell, Moon, Palette, Type, ZoomIn, LayoutGrid, Heart, Coffee, Star, Wand2, RotateCw, Sun, Upload, CheckCircle2, AlertCircle, Clock, Zap, Cpu, Eye, EyeOff, RefreshCw, Package, Database, Info, Compass, ArrowUp, ArrowDown, Pin, Sliders, PanelLeft, CalendarDays, FolderTree, Tag, Inbox, Calendar, Filter, Timer, BarChart3, Sprout, Target, FileText, BrainCircuit, Activity, BookOpen, MessageCircleQuestion, Wind, User, Users, Search, GripVertical, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { applyFontSize, applyUIScale, type FontSize } from "@/lib/uiScale";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getAILanguage, type AILanguage } from "@/lib/ai";
import { loadAISettings, type AIPerOpSettings } from "@/lib/aiSettings";
import { firebaseStore } from "@/lib/firebaseStore";
import { logoutUser } from "@/lib/authService";
import { arshAuthHeader } from "@/lib/arshApi";
import { accountDeletionUrl } from "@/lib/accountDeletionUrl";
import { clearUserLocalData } from "@/lib/offlineQueue";
import { clearPersistentFirestoreCache, auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { loadSettings, saveSettings, ensureNotificationPermission, type UserSettings } from "@/lib/reminders";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "next-themes";
import { applyTheme, getBaseTheme, getStoredTheme, normalizeTheme } from "@/lib/theme";
import { TaskDefaultSettings } from "@/components/TaskDefaultSettings";
import FirebaseSyncCard from "@/components/FirebaseSyncCard";
import { FirestoreUsageCard } from "@/components/FirestoreUsageCard";
import { fetchFromFirestore } from "@/lib/firestoreSync";
import { restoreBackupRows } from "@/lib/backupRestoreService";
import { cacheGet, cacheSet, getQueue, onQueueChange, canReplayForOwner } from "@/lib/offlineQueue";
import { extractTasksFromCache, createTaskCacheEnvelope } from "@/features/tasks/taskCache";
import type { TaskDefaults } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import AndroidSettings from "@/components/AndroidSettings";
import { AndroidReminderHealth } from "@/components/AndroidReminderHealth";
import { ReminderCenter } from "@/components/ReminderCenter";
import { isAndroid, nativeExperience, type NativeAppInfo } from "@/lib/nativeExperience";
import { SectionCard, SettingRow } from "./settings/SectionCard";
import { TimeHorizonSettings } from "./settings/TimeHorizonSettings";
import { TimeBucketsSettings } from "./settings/TimeBucketsSettings";
import { TaskListSortSettings } from "./settings/TaskListSortSettings";
import { CompletedTasksSettings } from "./settings/CompletedTasksSettings";
import { CrisisSupportSettings } from "./settings/CrisisSupportSettings";
import { SidebarQuickLinksSettings } from "./settings/SidebarQuickLinksSettings";
import { MobileBottomBarSettings } from "./settings/MobileBottomBarSettings";
import { AISettingsTab } from "./settings/AISettingsTab";
import { AppearanceSettingsSection } from "./settings/AppearanceSettingsSection";
import { AssistantAccessSettings } from "./settings/AssistantAccessSettings";
import { GoogleLinkSettings } from "./settings/GoogleLinkSettings";
import { AdvancedModulesPanel } from "@/components/modules/AdvancedModulesPanel";
import { VersionTapTarget } from "@/components/modules/VersionTapTarget";

const AUTO_UPDATE_KEY = "arshnaz_auto_update";

const BACKUP_META_KEYS = new Set(["app", "version", "exported_at", "user_id", "user_email", "counts", "manifest", "status"]);

// Collections written by the exporter. Only tasks/notes can be restored today, but
// tracking all of them lets the UI report exactly what the backup contains.
const BACKUP_REMOTE_TABLES = [
  "profiles", "tasks", "subtasks", "folders", "tags", "task_tags", "notes", "note_tags",
  "habits", "habit_logs", "pomodoro_sessions", "folder_columns",
  "daily_checkins", "thought_records", "abc_records",
] as const;

type PendingImport = {
  fileName: string;
  tasks: any[];
  notes: any[];
  unsupported: string[];
  taskCollisions: number;
  noteCollisions: number;
};

type PwaGlobals = {
  __applyPwaUpdate?: () => void;
  __pwaCheckUpdate?: () => Promise<boolean>;
};

/**
 * Progressive disclosure for genuinely advanced/diagnostic settings. Collapsed by
 * default so the primary settings surface stays simple; nothing is removed.
 */
function AdvancedDisclosure({
  isEn,
  children,
  defaultOpen = false,
}: {
  isEn: boolean;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-2xl border border-border/70 bg-card/40"
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        data-testid="settings-advanced-toggle"
      >
        <span className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          {isEn ? "Advanced" : "پیشرفته"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-5 px-1 pb-1 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AppUpdateCard({ isEn }: { isEn: boolean }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [updateState, setUpdateState] = useState<"unknown" | "checking" | "current" | "available">("unknown");
  const [pwaReady, setPwaReady] = useState(false);
  const [nativeApp, setNativeApp] = useState<NativeAppInfo | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("arshnaz_update_last_checked");
      return v ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  });
  const [autoUpdate, setAutoUpdate] = useState(() => {
    try {
      return localStorage.getItem(AUTO_UPDATE_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [cacheConfirmOpen, setCacheConfirmOpen] = useState(false);
  const [reloadDeferred, setReloadDeferred] = useState(false);
  const pendingReloadAction = useRef<(() => void) | null>(null);

  const version = (import.meta.env.VITE_APP_VERSION as string) || "0.0.0";
  const buildTime = (import.meta.env.VITE_BUILD_TIME as string) || "";
  const buildId = (import.meta.env.VITE_BUILD_ID as string) || "";
  const buildNumber = (import.meta.env.VITE_BUILD_NUMBER as string) || "";
  const commit = (import.meta.env.VITE_GIT_COMMIT as string) || "";
  const fullVersion = (import.meta.env.VITE_FULL_VERSION as string) || version;
  const nativeAndroid = isAndroid();
  const updateAvailable = updateState === "available";

  const hasPendingOwnedOps = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      const queued = await getQueue();
      return uid ? queued.some((op) => canReplayForOwner(op, uid)) : queued.length > 0;
    } catch {
      // Unknown outbox state is not evidence that reloading is safe.
      return true;
    }
  }, []);

  // Gentle, non-destructive reload. If synced work is still pending, wait for the
  // outbox to drain instead of dropping the user's unsaved changes.
  const scheduleReload = useCallback(async (action?: () => void) => {
    try {
      if (await hasPendingOwnedOps()) {
        pendingReloadAction.current = action ?? null;
        setReloadDeferred(true);
        toast.info(isEn
          ? "Update ready. It will apply once your unsynced changes are saved."
          : "به‌روزرسانی آماده است؛ پس از ذخیرهٔ تغییرات همگام‌نشده اعمال می‌شود.");
        return;
      }
    } catch {
      setReloadDeferred(true);
      pendingReloadAction.current = action ?? null;
      return;
    }
    if (action) action();
    else setTimeout(() => window.location.reload(), 300);
  }, [hasPendingOwnedOps, isEn]);

  useEffect(() => {
    if (!reloadDeferred) return;
    let cancelled = false;
    const tryRun = async () => {
      if (cancelled) return;
      if (await hasPendingOwnedOps()) return;
      cancelled = true;
      setReloadDeferred(false);
      const action = pendingReloadAction.current;
      pendingReloadAction.current = null;
      if (action) action();
      else window.location.reload();
    };
    void tryRun();
    const unsubscribe = onQueueChange(() => { void tryRun(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [reloadDeferred, hasPendingOwnedOps]);

  // Destructive: only ever runs from the explicitly confirmed button below.
  const forceReload = useCallback(async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch { /* ignore */ }
    setTimeout(() => window.location.reload(), 200);
  }, []);

  const applyUpdate = useCallback(() => {
    const apply = (window as unknown as PwaGlobals).__applyPwaUpdate;
    void scheduleReload(() => {
      if (typeof apply === "function") {
        try { apply(); } catch { /* ignore */ }
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setTimeout(() => window.location.reload(), 300);
      }
    });
  }, [scheduleReload]);

  const getCurrentEntryHash = () => {
    const scripts = Array.from(document.querySelectorAll('script[type="module"][src]')) as HTMLScriptElement[];
    const entry = scripts.find((s) => /\/assets\/(index|main)[-.]/.test(s.src)) || scripts[0];
    return entry ? entry.src.split("/").pop() || "" : "";
  };

  const swHashCheck = async () => {
    const check = (window as unknown as PwaGlobals).__pwaCheckUpdate;
    if (check) return await check();

    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const before = reg.waiting || reg.installing;
    let found = false;
    let listener: (() => void) | undefined;
    const promise = new Promise<void>((resolve) => {
      listener = () => {
        const after = reg.installing || reg.waiting;
        if (after && after !== before) {
          found = true;
          resolve();
        }
      };
      reg.addEventListener("updatefound", listener);
      listener();
      setTimeout(() => resolve(), 5000);
    });
    await Promise.race([
      reg.update().catch(() => {}),
      new Promise<void>((r) => setTimeout(r, 3000)),
    ]);
    await promise;
    if (listener) reg.removeEventListener("updatefound", listener);
    return found;
  };

  useEffect(() => {
    if (!nativeAndroid) return;
    nativeExperience.appInfo().then(setNativeApp).catch(() => setNativeApp(null));
  }, [nativeAndroid]);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration();
      setPwaReady(!!reg);
      if (reg?.waiting || reg?.installing) {
        setUpdateState("available");
        if (!nativeAndroid && autoUpdate) {
          toast.info(isEn ? "New version found — installing now…" : "نسخه‌ی جدید پیدا شد — در حال نصب…");
          setTimeout(applyUpdate, 800);
        }
      }
    })();
    const onUpdate = () => {
      setUpdateState("available");
      if (!nativeAndroid && autoUpdate) {
        toast.info(isEn ? "New version found — installing now…" : "نسخه‌ی جدید پیدا شد — در حال نصب…");
        setTimeout(applyUpdate, 800);
      }
    };
    window.addEventListener("pwa-update-available", onUpdate);
    return () => window.removeEventListener("pwa-update-available", onUpdate);
  }, [autoUpdate, isEn, applyUpdate, nativeAndroid]);

  useEffect(() => {
    if (!lastChecked) return;
    try {
      localStorage.setItem("arshnaz_update_last_checked", String(lastChecked));
    } catch { /* ignore */ }
  }, [lastChecked]);

  const updateAvailableMessage = () =>
    nativeAndroid
      ? (isEn ? "A newer build was found. Install a newer APK to update Android." : "نسخهٔ جدید پیدا شد؛ برای به‌روزرسانی اندروید APK جدید نصب کن.")
      : (isEn ? "New version found — choose “Install update” to apply." : "نسخه‌ی جدید پیدا شد — برای اعمال، «نصب به‌روزرسانی» را بزن.");

  const check = async () => {
    setChecking(true);
    setUpdateState("checking");
    const hardTimeout = setTimeout(() => {
      setChecking(false);
      toast.info(isEn ? "Check timed out. Try again with internet on." : "بررسی طولانی شد. اتصال اینترنت را بررسی کن.");
    }, 12000);
    try {
      const hasSwUpdate = await swHashCheck();
      if (hasSwUpdate) {
        setUpdateState("available");
        setLastChecked(Date.now());
        toast.success(updateAvailableMessage());
        return;
      }

      const currentBuild = Number(buildNumber || buildId) || 0;
      const currentCommit = commit;
      let verified = false;
      const res = await fetch("/version.json", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        verified = true;
        const remote = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const remoteBuild = Number(String(remote.buildNumber || remote.buildId || 0));
        const remoteCommit = String(remote.commit || "");
        const isNewer = remoteBuild
          ? remoteBuild > currentBuild
          : Boolean(remoteCommit && remoteCommit !== currentCommit);
        if (isNewer) {
          setUpdateState("available");
          setLastChecked(Date.now());
          toast.success(updateAvailableMessage());
          return;
        }
      } else {
        const currentHash = getCurrentEntryHash();
        const origin = window.location.origin;
        const htmlRes = await fetch(`${origin}/?_v=${Date.now()}`, { cache: "no-store" });
        if (htmlRes.ok) {
          verified = true;
          const html = await htmlRes.text();
          const match = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i);
          const remoteSrc = match ? match[1] : "";
          const remoteHash = remoteSrc.split("/").pop() || "";
          if (remoteHash && currentHash && remoteHash !== currentHash) {
            setUpdateState("available");
            setLastChecked(Date.now());
            toast.success(updateAvailableMessage());
            return;
          }
        }
      }

      if (!verified) throw new Error("update-check-unavailable");
      setUpdateState("current");
      setLastChecked(Date.now());
      toast.success(isEn ? "You're on the latest version." : "نسخه‌ی شما به‌روز است.");
    } catch (e) {
      setUpdateState("unknown");
      toast.error(isEn ? "Could not verify updates. Check your internet and try again." : "وضعیت به‌روزرسانی قابل بررسی نیست؛ اینترنت را بررسی و دوباره تلاش کن.");
    } finally {
      clearTimeout(hardTimeout);
      setChecking(false);
    }
  };

  const toggleAutoUpdate = (v: boolean) => {
    setAutoUpdate(v);
    try {
      localStorage.setItem(AUTO_UPDATE_KEY, String(v));
    } catch { /* ignore */ }
  };

  const formatTime = (ts: number) => {
    try {
      return new Intl.DateTimeFormat(isEn ? "en-US" : "fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ts));
    } catch {
      return "";
    }
  };

  return (
    <SectionCard
      icon={Package}
      title={isEn ? "App version & updates" : "نسخه و به‌روزرسانی"}
    >
      <div className="flex items-center justify-between">
        <Badge variant={updateAvailable ? "default" : updateState === "unknown" ? "outline" : "secondary"} className="gap-1 text-[10px]">
          {updateAvailable ? (
            <>
              <AlertCircle className="w-3 h-3" />
              {isEn ? "Update available" : "نسخه جدید آماده"}
            </>
          ) : updateState === "unknown" ? (
            <>
              <AlertCircle className="w-3 h-3" />
              {isEn ? "Update status unknown" : "وضعیت به‌روزرسانی نامشخص"}
            </>
          ) : updateState === "checking" ? (
            <>
              <RotateCw className="w-3 h-3 animate-spin" />
              {isEn ? "Checking" : "در حال بررسی"}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" />
              {isEn ? "Up to date" : "به‌روز"}
            </>
          )}
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <VersionTapTarget>{isEn ? "Version" : "نسخه"}: <span className="ltr inline-block font-mono">{fullVersion}</span></VersionTapTarget>
          </span>
          {buildNumber && (
            <span className="flex items-center gap-1">
              <span className="mx-1">·</span>
              <span className="ltr inline-block font-mono">#{buildNumber}</span>
            </span>
          )}
        </div>
        {buildTime && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isEn ? "Built" : "ساخته‌شده"}: <span className="ltr inline-block font-mono">{buildTime}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          {nativeAndroid ? (isEn ? "Android app · web content is bundled" : "برنامه اندروید · محتوای وب داخل APK است") : pwaReady ? (isEn ? "PWA installed" : "PWA نصب شده") : (isEn ? "Web app" : "نسخه وب")}
        </div>
        {nativeAndroid && (
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {isEn ? "Installed APK" : "APK نصب‌شده"}: <span className="ltr inline-block font-mono">{nativeApp ? `${nativeApp.versionName} · #${nativeApp.versionCode}` : (isEn ? "Reading…" : "در حال خواندن…")}</span>
          </div>
        )}
        {lastChecked && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isEn ? "Last checked" : "آخرین بررسی"}: {formatTime(lastChecked)}
          </div>
        )}
      </div>

      {!nativeAndroid ? (
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <div className="text-sm">{isEn ? "Auto-refresh web updates" : "بارگذاری خودکار به‌روزرسانی وب"}</div>
          </div>
          <Switch checked={autoUpdate} onCheckedChange={toggleAutoUpdate} />
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-xs leading-6 text-muted-foreground">
          {isEn ? "Android APKs cannot be silently installed by this app. Install a newer verified APK through Android's package installer." : "APK اندروید را برنامه نمی‌تواند بی‌صدا نصب کند. نسخهٔ جدیدِ تأییدشده باید با نصب‌کنندهٔ خود اندروید نصب شود."}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {updateAvailable && nativeAndroid ? (
          <Button size="sm" disabled className="gap-2">
            <Package className="w-4 h-4" />
            {isEn ? "New APK needed" : "APK جدید لازم است"}
          </Button>
        ) : updateAvailable ? (
          <Button size="sm" onClick={applyUpdate} className="gap-2">
            <Download className="w-4 h-4" />
            {isEn ? "Install update" : "نصب به‌روزرسانی"}
          </Button>
        ) : (
          <Button size="sm" onClick={check} disabled={checking} className="gap-2">
            <RotateCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking
              ? isEn ? "Checking…" : "در حال بررسی…"
              : nativeAndroid ? (isEn ? "Check web content" : "بررسی محتوای وب") : (isEn ? "Check for updates" : "بررسی به‌روزرسانی")}
          </Button>
        )}
        <AlertDialog open={cacheConfirmOpen} onOpenChange={setCacheConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Trash2 className="w-4 h-4" />
              {isEn ? "Clear cache & reload" : "پاکسازی کش و بارگذاری"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
            <AlertDialogHeader>
              <AlertDialogTitle>{isEn ? "Clear cached files and reload?" : "کش پاک شود و دوباره بارگذاری شود؟"}</AlertDialogTitle>
              <AlertDialogDescription className="leading-6">
                {isEn
                  ? "This removes locally cached app files and unregisters the offline service worker, then reloads. Your cloud data is not deleted, but offline access and any not-yet-synced changes could be affected — make sure you are online first."
                  : "فایل‌های کش‌شدهٔ برنامه حذف و سرویس‌ورکر آفلاین غیرفعال می‌شود، سپس صفحه دوباره بارگذاری می‌شود. داده‌های ابری حذف نمی‌شوند، اما دسترسی آفلاین و تغییرات هنوز همگام‌نشده ممکن است آسیب ببینند؛ ابتدا از اتصال اینترنت مطمئن شو."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isEn ? "Cancel" : "انصراف"}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void forceReload()} className="bg-destructive hover:bg-destructive/90">
                <Trash2 className="w-4 h-4" /> {isEn ? "Clear & reload" : "پاکسازی و بارگذاری"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SectionCard>
  );
}

export default function SettingsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isEn = (i18n.language || "fa").startsWith("en");
  const [settings, setSettings] = useState<AIPerOpSettings>(() => loadAISettings());
  const [lang, setLang] = useState<AILanguage>(() => getAILanguage());
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [reminders, setReminders] = useState<UserSettings | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const requestedTab = searchParams.get("tab");
  const activeTab = location.hash.startsWith("#ai-") ? "ai" : ["general", "tasks", "notifications", "ai", "data", "about"].includes(requestedTab || "") ? requestedTab! : "general";
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const setActiveTab = (tab: string) => {
    // Radix can activate via focus and mouse-down before React renders again.
    // Treat them as one selection, not two identical browser-history entries.
    if (activeTabRef.current === tab) return;
    activeTabRef.current = tab;
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("tab", tab); return next; });
  };

  useEffect(() => {
    setSettings(loadAISettings());
    setLang(getAILanguage());
    let cancelled = false;
    setReminders(null);
    if (user) {
      loadSettings(user.id).then(value => { if (!cancelled) setReminders(value); }).catch(() => { if (!cancelled) toast.error(isEn ? "Could not load settings" : "تنظیمات بارگذاری نشد"); });
    }
    return () => { cancelled = true; };
  }, [user, isEn]);

  useEffect(() => {
    if (!settings) return;
    const hash = window.location.hash;
    if (hash.startsWith("#ai-op-")) {
      const id = hash.slice(1);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
        }
      }, 200);
    }
  }, [settings, activeTab]);

  const updateReminder = async (patch: Partial<UserSettings>) => {
    if (!user || !reminders) return;
    const next = { ...reminders, ...patch };
    setReminders(next);
    try {
      await saveSettings(user.id, patch);
    } catch (e) {
      setReminders(current => current === next ? reminders : current);
      toast.error((isEn ? "Save failed: " : "ذخیره نشد: ") + (e instanceof Error ? e.message : String(e)));
    }
  };

  const setAppTheme = (t: string) => {
    applyTheme(t);
    setTheme(getBaseTheme(t));
    updateReminder({ theme: t });
  };

  const enableNotifs = async () => {
    const ok = await ensureNotificationPermission();
    if (ok) {
      await updateReminder({ notifications_enabled: true });
      toast.success(isEn ? "Notifications enabled" : "نوتیفیکیشن فعال شد");
    } else {
      toast.error(isEn ? "Permission not granted" : "اجازه نوتیف داده نشد");
    }
  };

  useEffect(() => {
    if (!reminders?.theme) return;
    // Only re-apply when the cloud value actually differs from the device theme.
    // This stops loading settings (incl. fabricated offline/first-run defaults)
    // from silently flipping day↔night when you enter Settings.
    const stored = getStoredTheme();
    const cloud = normalizeTheme(reminders.theme);
    // "system" is the untouched default for most accounts — it must never override a
    // device-local choice ("system" follows the OS locally anyway, so syncing it
    // between devices is a semantic no-op).
    const cloudIsDefaultSystem = cloud === "system" && stored !== null;
    if (cloudIsDefaultSystem || cloud === stored) return;
    applyTheme(reminders.theme);
    setTheme(getBaseTheme(reminders.theme));
  }, [reminders?.theme, setTheme]);

  useEffect(() => {
    if (reminders?.ui_scale) applyUIScale(reminders.ui_scale);
  }, [reminders?.ui_scale]);
  useEffect(() => {
    if (reminders?.font_size) applyFontSize(reminders.font_size as FontSize);
  }, [reminders?.font_size]);



  // Dynamic table access for export/import/delete where table names are runtime strings.
  const fromTable = (table: string) => (firebaseStore as any).from(table);

  async function exportAll() {
    if (!user) {
      toast.error(isEn ? "Please sign in first" : "لطفاً ابتدا وارد حساب کاربری شوید");
      return;
    }
    setExporting(true);
    try {
      // 1. Gather from Firestore (best-effort: local caches are exported either way)
      const firestoreData = await fetchFromFirestore(user.id);

      // 2. Gather from local caches
      const cachedTasksRaw = (await cacheGet<any>(`tasks:all:${user.id}`)) ?? (await cacheGet<any>("tasks"));
      const cachedTasks = extractTasksFromCache(cachedTasksRaw);
      let cachedNotes: any[] = (await cacheGet<any[]>(`notes:all:${user.id}`)) || [];
      if (!cachedNotes.length) {
        try {
          const rawNotes = localStorage.getItem("arshnaz_notes") || localStorage.getItem("notes");
          if (rawNotes) cachedNotes = JSON.parse(rawNotes);
        } catch {}
      }

      // 3. Gather from firebaseStore if reachable
      const remoteData: Record<string, unknown> = {};
      const failedSections: string[] = [];
      for (const tbl of BACKUP_REMOTE_TABLES) {
        try {
          const { data } = await fromTable(tbl).select("*");
          if (data) remoteData[tbl] = data;
          else failedSections.push(tbl);
        } catch {
          failedSections.push(tbl);
        }
      }
      if (!firestoreData.success) failedSections.push("tasks", "notes");

      // Merge tasks without duplicates
      const tasksMap = new Map<string, any>();
      (remoteData.tasks as any[] || []).forEach((t: any) => tasksMap.set(t.id, t));
      firestoreData.tasks.forEach((t) => tasksMap.set(t.id, t));
      cachedTasks.forEach((t) => tasksMap.set(t.id, t));

      // Merge notes without duplicates
      const notesMap = new Map<string, any>();
      (remoteData.notes as any[] || []).forEach((n: any) => notesMap.set(n.id, n));
      firestoreData.notes.forEach((n) => notesMap.set(n.id, n));
      cachedNotes.forEach((n) => notesMap.set(n.id, n));

      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const failedUnique = Array.from(new Set(failedSections));
      const status: "complete" | "partial" | "offline" =
        failedUnique.length === 0 ? "complete" : offline ? "offline" : "partial";
      const exportedSections = (BACKUP_REMOTE_TABLES as readonly string[]).filter((s) => !failedUnique.includes(s));

      const out = {
        app: "arshnaz",
        version: "2.5.0",
        exported_at: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        status,
        counts: {
          tasks: tasksMap.size,
          notes: notesMap.size,
        },
        // A manifest so a restore (or support) can tell what was actually captured.
        manifest: {
          requested: [...BACKUP_REMOTE_TABLES],
          exported: exportedSections,
          failed: failedUnique,
          cloud_reachable: firestoreData.success,
        },
        ...remoteData,
        tasks: Array.from(tasksMap.values()),
        notes: Array.from(notesMap.values()),
      };

      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arshnaz-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      if (status === "complete") {
        toast.success(
          isEn
            ? `Backup completed: ${tasksMap.size} tasks, ${notesMap.size} notes`
            : `خروجی کامل با موفقیت ذخیره شد: ${tasksMap.size} تسک و ${notesMap.size} یادداشت`
        );
      } else {
        const detail = isEn
          ? `Captured ${tasksMap.size} tasks and ${notesMap.size} notes. Sections not reached: ${failedUnique.join(", ") || "none"}.${offline ? " You appear to be offline." : ""}`
          : `شامل ${tasksMap.size} تسک و ${notesMap.size} یادداشت. بخش‌های خوانده‌نشده: ${failedUnique.join("، ") || "ندارد"}.${offline ? " به‌نظر آفلاین هستی." : ""}`;
        toast.warning(
          status === "offline"
            ? (isEn ? "Backup saved from this device only" : "پشتیبان فقط از همین دستگاه ذخیره شد")
            : (isEn ? "Backup saved with gaps" : "پشتیبان با بخش‌هایی ناقص ذخیره شد"),
          {
            description: detail,
            action: { label: isEn ? "Retry" : "تلاش دوباره", onClick: () => void exportAll() },
          },
        );
      }
    } catch (e: any) {
      toast.error(e?.message || (isEn ? "Export error" : "خطا در خروجی فایل"));
    } finally {
      setExporting(false);
    }
  }

  /** Validate a chosen backup and stage it for an explicit, previewed restore. */
  async function prepareImport(file: File) {
    if (!user) {
      toast.error(isEn ? "Please sign in first" : "لطفاً ابتدا وارد حساب شوید");
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Record<string, any>;

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(isEn ? "Invalid backup file format" : "قالب فایل پشتیبان نامعتبر است");
      }
      if (!Array.isArray(data.tasks) && !Array.isArray(data.notes)) {
        throw new Error(isEn ? "No tasks or notes found in backup file" : "هیچ تسک یا یادداشتی در فایل یافت نشد");
      }

      const tasks = (Array.isArray(data.tasks) ? data.tasks : []) as any[];
      const notes = (Array.isArray(data.notes) ? data.notes : []) as any[];

      // Anything that is not a known meta field or a restorable row cannot be applied.
      const unsupported = Object.keys(data).filter(
        (k) => !BACKUP_META_KEYS.has(k) && k !== "tasks" && k !== "notes",
      );

      let taskCollisions = 0;
      let noteCollisions = 0;
      try {
        const existingTasksRaw = (await cacheGet<any>(`tasks:all:${user.id}`)) ?? (await cacheGet<any>("tasks"));
        const existingTaskIds = new Set(extractTasksFromCache(existingTasksRaw).map((t: any) => t?.id).filter(Boolean));
        taskCollisions = tasks.filter((t) => t && existingTaskIds.has(t.id)).length;
      } catch {}
      try {
        const existingNotes = await cacheGet<any[]>(`notes:all:${user.id}`);
        const existingNoteIds = new Set((Array.isArray(existingNotes) ? existingNotes : []).map((n: any) => n?.id).filter(Boolean));
        noteCollisions = notes.filter((n) => n && existingNoteIds.has(n.id)).length;
      } catch {}

      setPendingImport({ fileName: file.name, tasks, notes, unsupported, taskCollisions, noteCollisions });
    } catch (e: any) {
      toast.error(e?.message || (isEn ? "Import error" : "خطا در خواندن و وارد کردن فایل"));
    }
  }

  async function applyImport() {
    const pending = pendingImport;
    if (!user || !pending) return;
    setExporting(true);
    try {
      const tasksList = pending.tasks;
      const notesList = pending.notes;
      const taskResult = await restoreBackupRows(user.id, "tasks", tasksList);
      const noteResult = await restoreBackupRows(user.id, "notes", notesList);
      const acceptedTasks = [...taskResult.saved, ...taskResult.queued];
      const acceptedNotes = [...noteResult.saved, ...noteResult.queued];
      let localCacheWarning = false;

      if (acceptedTasks.length) {
        try {
          const existingCachedRaw = (await cacheGet<any>(`tasks:all:${user.id}`)) ?? (await cacheGet<any>("tasks"));
          const mergedTasks = extractTasksFromCache(existingCachedRaw);
          for (const task of acceptedTasks) {
            const index = mergedTasks.findIndex((existing) => existing.id === task.id);
            if (index >= 0) mergedTasks[index] = task as any;
            else mergedTasks.push(task as any);
          }
          await cacheSet(`tasks:all:${user.id}`, createTaskCacheEnvelope(mergedTasks));
          await cacheSet("tasks", mergedTasks);
        } catch {
          localCacheWarning = true;
        }
      }

      if (acceptedNotes.length) {
        try {
          const existingCachedNotes = await cacheGet<any>(`notes:all:${user.id}`);
          let mergedNotes: any[];
          if (Array.isArray(existingCachedNotes)) {
            mergedNotes = existingCachedNotes;
          } else {
            const rawNotes = localStorage.getItem("arshnaz_notes") || localStorage.getItem("notes");
            const parsedNotes = rawNotes ? JSON.parse(rawNotes) : [];
            mergedNotes = Array.isArray(parsedNotes) ? parsedNotes : [];
          }
          for (const note of acceptedNotes) {
            const index = mergedNotes.findIndex((existing) => existing.id === note.id);
            if (index >= 0) mergedNotes[index] = note;
            else mergedNotes.push(note);
          }
          await cacheSet(`notes:all:${user.id}`, mergedNotes);
          localStorage.setItem("arshnaz_notes", JSON.stringify(mergedNotes));
        } catch {
          localCacheWarning = true;
        }
      }

      if (acceptedTasks.length) window.dispatchEvent(new Event("arshnaz:tasks-updated"));

      const savedTasks = taskResult.saved.length;
      const savedNotes = noteResult.saved.length;
      const queuedRows = taskResult.queued.length + noteResult.queued.length;
      const failedRows = taskResult.failedIds.length + noteResult.failedIds.length;
      const skippedRows = taskResult.skipped + noteResult.skipped;
      const details = isEn
        ? `Saved to cloud: ${savedTasks} tasks, ${savedNotes} notes. Queued offline: ${taskResult.queued.length} tasks, ${noteResult.queued.length} notes. Failed: ${failedRows}; skipped invalid rows: ${skippedRows}${localCacheWarning ? ". Local cache refresh failed." : ""}`
        : `ذخیره‌شده در ابر: ${savedTasks} تسک و ${savedNotes} یادداشت؛ صف آفلاین: ${taskResult.queued.length} تسک و ${noteResult.queued.length} یادداشت؛ ناموفق: ${failedRows}؛ ردیفِ ردشده به‌دلیل شناسه نامعتبر: ${skippedRows}${localCacheWarning ? "؛ به‌روزرسانی حافظهٔ محلی کامل نشد." : ""}`;

      if (failedRows || skippedRows || localCacheWarning) {
        toast.error(isEn ? "Backup restore was incomplete" : "بازیابی پشتیبان کامل نشد", { description: details });
      } else if (queuedRows) {
        toast.info(isEn ? "Backup safely queued for sync" : "پشتیبان برای همگام‌سازی در صف امن قرار گرفت", { description: details });
      } else {
        toast.success(isEn ? "Backup restored to Firestore" : "بازیابی پشتیبان در Firestore انجام شد", { description: details });
      }
    } catch (e: any) {
      toast.error(e?.message || (isEn ? "Import error" : "خطا در وارد کردن فایل"));
    } finally {
      setExporting(false);
      setPendingImport(null);
    }
  }

  async function deleteAll() {
    if (!user) return;
    setDeleting(true);
    try {
      const headers = await arshAuthHeader();
      const response = await fetch(accountDeletionUrl(), { method: "DELETE", headers });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const code = body?.error?.code;
        if (code === "RECENT_LOGIN_REQUIRED") {
          throw new Error(isEn ? "For security, sign out and sign in again, then retry deletion." : "برای امنیت، یک‌بار خارج شو و دوباره وارد شو، سپس حذف را تکرار کن.");
        }
        throw new Error(isEn
          ? "Account deletion was incomplete. Your account remains available; sign in and retry."
          : "حذف حساب کامل نشد. حساب هنوز در دسترس است؛ وارد شو و دوباره تلاش کن.");
      }
      // Server has deleted owned Storage, the full Firestore tree, then Firebase Auth.
      // Clear only this account's local records; another signed-in profile may
      // have pending work on a shared device.
      const [localDataCleared, attachmentQueueCleared, albumCleared, firestoreCacheCleared] = await Promise.all([
        clearUserLocalData(user.id).catch(() => false),
        import("@/lib/attachmentUpload").then(({ clearQueuedAttachmentsForUser }) => clearQueuedAttachmentsForUser(user.id)).catch(() => false),
        import("@/lib/islandAlbum").then(({ clearAlbumForUser }) => clearAlbumForUser(user.id)).catch(() => false),
        clearPersistentFirestoreCache().catch(() => false),
      ]);
      try { await logoutUser(); } catch {}
      const localCleanupSucceeded = localDataCleared && attachmentQueueCleared && albumCleared && firestoreCacheCleared;
      if (localCleanupSucceeded) {
        toast.success(isEn ? "All account data deleted" : "همهٔ داده‌های حساب حذف شد");
      } else {
        toast.error(isEn ? "Account deleted; device cleanup incomplete" : "حساب حذف شد؛ پاک‌سازی دستگاه کامل نشد", {
          description: isEn
          ? "The account was deleted, but some data on this device could not be cleared. Clear this browser's site data before sharing the device."
          : "حساب حذف شد، اما پاک‌سازی بخشی از داده‌های همین دستگاه کامل نشد. پیش از واگذاری دستگاه، داده‌های سایت را پاک کن.",
        });
      }
      window.location.href = "/auth";
    } catch (e) {
      toast.error((e instanceof Error ? e.message : String(e)) || (isEn ? "Delete error" : "خطا در حذف"));
    } finally {
      setDeleting(false);
    }
  }

  const currentTheme = reminders?.theme || theme || "system";

  return (
    <div className="page-shell page-shell--narrow pb-safe-bottom animate-fade-in" dir={isEn ? "ltr" : "rtl"}>
      <div className="mb-3">
        <HeaderTitlePortal title={t("settings.title")} />
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1 bg-muted/60">
          {[
            { id: "general", label: t("settings.tabs.general"), icon: Settings2 },
            { id: "tasks", label: t("settings.tabs.tasks"), icon: LayoutGrid },
            { id: "notifications", label: t("settings.tabs.notifications"), icon: Bell },
            { id: "ai", label: t("settings.tabs.ai"), icon: Cpu },
            { id: "data", label: t("settings.tabs.data"), icon: Database },
            { id: "about", label: t("settings.tabs.about"), icon: Info },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="text-xs h-9 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <tab.icon className="w-3.5 h-3.5 hidden sm:inline" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="space-y-5 mt-5">
          <LanguageSwitcher />
          <CrisisSupportSettings />

          <SidebarQuickLinksSettings isEn={isEn} />
          <MobileBottomBarSettings isEn={isEn} />
          <AppearanceSettingsSection
            isEn={isEn}
            reminders={reminders}
            updateReminder={updateReminder}
            currentTheme={currentTheme}
            setAppTheme={setAppTheme}
          />

          <SectionCard
            icon={Compass}
            title={isEn ? "Life Architect & System Design" : "معمار هوشمند زندگی و ساخت سیستم"}
            description={isEn ? "Redesign your personal productivity system or audit your current tasks & folders." : "بازطراحی سیستم بهره‌وری شخصی از نقطه صفر یا عارضه‌یابی و تکمیل تسک‌ها و پوشه‌های فعلی."}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {isEn ? "Run Life & Productivity Architect" : "اجرای دستیار معمار زندگی"}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isEn ? "Answer a few questions to generate custom folders, multi-tier goals, habits, and starter tasks." : "با پاسخ به چند سوال علمی، پوشه‌ها، اهداف چندسطحی، عادات روزمره و تسک‌های آغازین خود را بسازید یا ارتقا دهید."}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate("/app/life-architect")} className="gap-1.5 text-xs shrink-0 rounded-xl shadow-xs">
                <Compass className="w-3.5 h-3.5" />
                {isEn ? "Launch Architect" : "شروع معمار زندگی"}
              </Button>
            </div>
          </SectionCard>

          <CompanionSettings />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-5 mt-5">
          <TaskListSortSettings />
          <CompletedTasksSettings />
          {reminders && (
            <TaskDefaultSettings
              value={reminders.task_defaults || {}}
              onChange={(next: TaskDefaults) => updateReminder({ task_defaults: { ...(reminders.task_defaults || {}), ...next } })}
            />
          )}
          <TimeHorizonSettings />
          <TimeBucketsSettings />
          <GoogleLinkSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-5 mt-5">
          <AndroidReminderHealth />
          <ReminderCenter onOpenTask={(id) => navigate(`/app/tasks/${id}`)} />
          <AndroidSettings />
          {reminders && (
            <SectionCard
              icon={Bell}
              title={t("settings.dailyReminders")}
              description={t("settings.notificationsCardDesc", isEn ? "Configure daily reminder schedules and task notifications" : "پیکربندی زمان‌بندی یادآورهای روزانه و اعلان‌های تسک")}
            >
              <SettingRow label={t("settings.browserNotif")} help={t("settings.browserNotifHelp")}>
                {reminders.notifications_enabled ? (
                  <Switch checked onCheckedChange={(v) => updateReminder({ notifications_enabled: v })} />
                ) : (
                  <Button size="sm" onClick={enableNotifs}>{isEn ? "Enable" : "فعال‌سازی"}</Button>
                )}
              </SettingRow>

              <SettingRow label={t("settings.autoCheckin")} help={t("settings.autoCheckinHelp")}>
                <Switch checked={reminders.auto_create_daily_tasks} onCheckedChange={(v) => updateReminder({ auto_create_daily_tasks: v })} />
              </SettingRow>

              <SettingRow label={t("settings.showCheckin")} help={t("settings.showCheckinHelp")}>
                <Switch checked={reminders.show_daily_checkin !== false} onCheckedChange={(v) => updateReminder({ show_daily_checkin: v })} />
              </SettingRow>

              <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3">
                <SettingRow label={t("settings.checkinReminder")}>
                  <Switch
                    checked={reminders.checkin_reminder_enabled}
                    disabled={reminders.show_daily_checkin === false}
                    onCheckedChange={(v) => updateReminder({ checkin_reminder_enabled: v })}
                  />
                </SettingRow>
                {reminders.checkin_reminder_enabled && (
                  <>
                    <Label className="text-xs text-muted-foreground">{t("settings.reminderTime")}</Label>
                    <Input
                      type="time"
                      value={reminders.checkin_reminder_time.slice(0, 5)}
                      onChange={(e) => updateReminder({ checkin_reminder_time: e.target.value })}
                    />
                  </>
                )}
              </div>
            </SectionCard>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-5 mt-5">
          <AISettingsTab
            settings={settings}
            setSettings={setSettings}
            lang={lang}
            setLang={setLang}
            isEn={isEn}
          />
          {/* Advanced: AI agent tokens & raw connection details */}
          <AdvancedDisclosure isEn={isEn}>
            <AssistantAccessSettings />
          </AdvancedDisclosure>
        </TabsContent>

        <TabsContent value="data" className="space-y-5 mt-5">
          <FirebaseSyncCard />

          <SectionCard
            icon={Database}
            title={t("settings.dataExport")}
            description={t("settings.dataExportDesc")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={exportAll} disabled={exporting} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> {exporting ? t("settings.exporting") : t("settings.exportJson")}
              </Button>
              <Button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".json";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) void prepareImport(file);
                  };
                  input.click();
                }}
                disabled={exporting}
                variant="outline"
                className="gap-2"
              >
                <Upload className="w-4 h-4" /> {exporting ? t("settings.importing") : t("settings.importJson")}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-5">
              {isEn
                ? "Restore covers tasks and notes only. You will review what is in the file before anything is written."
                : "بازیابی فقط شامل تسک‌ها و یادداشت‌هاست. پیش از نوشتن هر چیزی، محتوای فایل را بازبینی می‌کنی."}
            </p>

            <Separator />

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldOff className="w-4 h-4" />
                <h3 className="font-semibold text-sm">{t("settings.deleteAccount")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.deleteAllConfirmDesc")}</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <ShieldOff className="w-4 h-4" /> {t("settings.deleteAccount")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("settings.deleteAllConfirm")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("settings.deleteAllConfirmDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAll} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                      {deleting ? t("settings.deleting") : t("settings.deleteAllYes")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SectionCard>

          {/* Advanced: Firestore usage diagnostics */}
          <AdvancedDisclosure isEn={isEn}>
            <FirestoreUsageCard />
          </AdvancedDisclosure>

          <Dialog open={!!pendingImport} onOpenChange={(o) => { if (!o) setPendingImport(null); }}>
            <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isEn ? "Review restore" : "بازبینی بازیابی"}</DialogTitle>
                <DialogDescription className="leading-6">
                  {isEn
                    ? `Tasks-and-notes restore from “${pendingImport?.fileName ?? ""}”. Review what will happen before applying.`
                    : `بازیابی تسک‌ها و یادداشت‌ها از «${pendingImport?.fileName ?? ""}». پیش از اعمال، نتیجه را بررسی کن.`}
                </DialogDescription>
              </DialogHeader>
              {pendingImport && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <span>{isEn ? "Tasks" : "تسک‌ها"}</span>
                    <span className="font-mono">{pendingImport.tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <span>{isEn ? "Notes" : "یادداشت‌ها"}</span>
                    <span className="font-mono">{pendingImport.notes.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <span className="pe-2">{isEn ? "Matching items already on this device" : "موارد هم‌شناسه روی این دستگاه"}</span>
                    <span className="font-mono">{pendingImport.taskCollisions + pendingImport.noteCollisions}</span>
                  </div>
                  {pendingImport.unsupported.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-5">
                      {isEn
                        ? `Not restorable in this version (left out): ${pendingImport.unsupported.join(", ")}`
                        : `در این نسخه بازیابی نمی‌شود (نادیده گرفته می‌شود): ${pendingImport.unsupported.join("، ")}`}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground leading-5">
                    {isEn
                      ? "Items with the same id replace the local copy when the cloud accepts them; a newer cloud revision is kept and reported instead of being overwritten."
                      : "موارد هم‌شناسه، در صورت پذیرش ابر، جای نسخهٔ محلی را می‌گیرند؛ نسخهٔ جدیدترِ ابری بازنویسی نمی‌شود و گزارش می‌شود."}
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingImport(null)}>{t("common.cancel")}</Button>
                <Button onClick={() => void applyImport()} disabled={exporting}>
                  {exporting ? t("settings.importing") : (isEn ? "Restore tasks & notes" : "بازیابی تسک‌ها و یادداشت‌ها")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="about" className="space-y-5 mt-5">
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary/10 text-primary shrink-0">
                <img src="/favicon.png" alt="ARSHNAZ" className="w-7 h-7" width={28} height={28} loading="lazy" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">ARSHNAZ · ارشناز</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {t("app.tagline")} <Heart className="w-3 h-3 text-pink-500" />
                </p>
              </div>
            </div>
          </Card>

          <AppUpdateCard isEn={isEn} />
          <AdvancedModulesPanel />

          <SectionCard
            icon={Info}
            title={t("settings.aboutTitle")}
          >
            <p className="text-sm text-muted-foreground leading-7">{t("settings.aboutBody")}</p>
            <p className="text-xs text-muted-foreground leading-6 pt-2 border-t mt-3">{t("settings.aboutAiHint")}</p>
          </SectionCard>

          <SectionCard
            icon={Coffee}
            title={t("settings.donate")}
            description={t("settings.donateDesc")}
          >
            <Button asChild variant="outline" className="gap-2 w-fit">
              <a href="https://www.buymeacoffee.com/arshnaz" target="_blank" rel="noopener noreferrer">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>{t("settings.donateButton")}</span>
              </a>
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
