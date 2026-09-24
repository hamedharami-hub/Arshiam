import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Save, Trash2, Languages, Download, ShieldOff, Shield, Settings2, Bell, Moon, Palette, Type, ZoomIn, LayoutGrid, Heart, Coffee, Star, Wand2, RotateCw, Sun, Upload, CheckCircle2, AlertCircle, Clock, Zap, Cpu, Eye, EyeOff, RefreshCw, Package, Database, Info, Compass, ArrowUp, ArrowDown, Pin, Sliders, PanelLeft, CalendarDays, FolderTree, Tag, Inbox, Calendar, Filter, Timer, BarChart3, Sprout, Target, FileText, BrainCircuit, Activity, BookOpen, MessageCircleQuestion, Wind, User, Users, Search, GripVertical } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { applyFontSize, applyUIScale, type FontSize } from "@/lib/uiScale";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { useAuth } from "@/hooks/useAuth";
import { loadSettings, saveSettings, ensureNotificationPermission, type UserSettings } from "@/lib/reminders";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "next-themes";
import { applyTheme, getBaseTheme } from "@/lib/theme";
import { TaskDefaultSettings } from "@/components/TaskDefaultSettings";
import FirebaseSyncCard from "@/components/FirebaseSyncCard";
import { fetchFromFirestore, saveEntityToFirestore } from "@/lib/firestoreSync";
import { cacheGet, cacheSet } from "@/lib/offlineQueue";
import { extractTasksFromCache, createTaskCacheEnvelope } from "@/features/tasks/taskCache";
import type { TaskDefaults } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import AndroidSettings from "@/components/AndroidSettings";
import { AndroidReminderHealth } from "@/components/AndroidReminderHealth";
import { ReminderCenter } from "@/components/ReminderCenter";
import { isAndroid, nativeExperience, type NativeAppInfo } from "@/lib/nativeExperience";
import { SectionCard, SettingRow } from "./settings/SectionCard";
import { TimeBucketsSettings } from "./settings/TimeBucketsSettings";
import { CrisisSupportSettings } from "./settings/CrisisSupportSettings";
import { SidebarQuickLinksSettings } from "./settings/SidebarQuickLinksSettings";
import { AISettingsTab } from "./settings/AISettingsTab";
import { AppearanceSettingsSection } from "./settings/AppearanceSettingsSection";
import { AssistantAccessSettings } from "./settings/AssistantAccessSettings";

const AUTO_UPDATE_KEY = "arshnaz_auto_update";

type PwaGlobals = {
  __applyPwaUpdate?: () => void;
  __pwaCheckUpdate?: () => Promise<boolean>;
};

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

  const version = (import.meta.env.VITE_APP_VERSION as string) || "0.0.0";
  const buildTime = (import.meta.env.VITE_BUILD_TIME as string) || "";
  const buildId = (import.meta.env.VITE_BUILD_ID as string) || "";
  const buildNumber = (import.meta.env.VITE_BUILD_NUMBER as string) || "";
  const commit = (import.meta.env.VITE_GIT_COMMIT as string) || "";
  const fullVersion = (import.meta.env.VITE_FULL_VERSION as string) || version;
  const nativeAndroid = isAndroid();
  const updateAvailable = updateState === "available";

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
    if (typeof apply === "function") {
      try { apply(); } catch { /* ignore */ }
      setTimeout(() => window.location.reload(), 3000);
      return;
    }
    forceReload();
  }, [forceReload]);

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
        toast.success(nativeAndroid
          ? (isEn ? "A newer build was found. Install a newer APK to update Android." : "نسخهٔ جدید پیدا شد؛ برای به‌روزرسانی اندروید APK جدید نصب کن.")
          : (isEn ? "New version found — applying…" : "نسخه‌ی جدید پیدا شد — در حال اعمال…"));
        if (!nativeAndroid && autoUpdate) applyUpdate();
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
          toast.success(nativeAndroid
            ? (isEn ? "A newer build was found. Install a newer APK to update Android." : "نسخهٔ جدید پیدا شد؛ برای به‌روزرسانی اندروید APK جدید نصب کن.")
            : (isEn ? "Update available — reloading…" : "نسخه‌ی جدید پیدا شد — در حال نصب…"));
          if (!nativeAndroid) applyUpdate();
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
            toast.success(nativeAndroid
              ? (isEn ? "A newer build was found. Install a newer APK to update Android." : "نسخهٔ جدید پیدا شد؛ برای به‌روزرسانی اندروید APK جدید نصب کن.")
              : (isEn ? "Update available — reloading…" : "نسخه‌ی جدید پیدا شد — در حال نصب…"));
            if (!nativeAndroid) forceReload();
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
            {isEn ? "Version" : "نسخه"}: <span className="ltr inline-block font-mono">{fullVersion}</span>
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
        <Button size="sm" variant="outline" onClick={forceReload} className="gap-2">
          <Trash2 className="w-4 h-4" />
          {isEn ? "Clear cache & reload" : "پاکسازی کش و بارگذاری"}
        </Button>
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
  const [reminders, setReminders] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    setSettings(loadAISettings());
    setLang(getAILanguage());
    if (user) {
      loadSettings(user.id).then(setReminders);
    }
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#ai-")) setActiveTab("ai");
  }, []);

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
    if (reminders?.theme) {
      applyTheme(reminders.theme);
      setTheme(getBaseTheme(reminders.theme));
    }
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
      // 1. Gather from Firestore
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
      const tables = [
        "profiles", "tasks", "subtasks", "folders", "tags", "task_tags", "notes", "note_tags",
        "habits", "habit_logs", "pomodoro_sessions", "folder_columns",
        "daily_checkins", "thought_records", "abc_records",
      ];
      const remoteData: Record<string, unknown> = {};
      for (const tbl of tables) {
        try {
          const { data } = await fromTable(tbl).select("*");
          if (data) remoteData[tbl] = data;
        } catch {}
      }

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

      const out = {
        app: "arshnaz",
        version: "2.5.0",
        exported_at: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        counts: {
          tasks: tasksMap.size,
          notes: notesMap.size,
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
      toast.success(
        isEn
          ? `Backup completed: ${tasksMap.size} tasks, ${notesMap.size} notes`
          : `خروجی کامل با موفقیت ذخیره شد: ${tasksMap.size} تسک و ${notesMap.size} یادداشت`
      );
    } catch (e: any) {
      toast.error(e?.message || (isEn ? "Export error" : "خطا در خروجی فایل"));
    } finally {
      setExporting(false);
    }
  }

  async function importAll(file: File) {
    if (!user) {
      toast.error(isEn ? "Please sign in first" : "لطفاً ابتدا وارد حساب شوید");
      return;
    }
    setExporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Record<string, any>;

      if (!data || typeof data !== "object") {
        throw new Error(isEn ? "Invalid backup file format" : "قالب فایل پشتیبان نامعتبر است");
      }
      if (!Array.isArray(data.tasks) && !Array.isArray(data.notes)) {
        throw new Error(isEn ? "No tasks or notes found in backup file" : "هیچ تسک یا یادداشتی در فایل یافت نشد");
      }
      
      let importedTasks = 0;
      let importedNotes = 0;

      // Import tasks
      const tasksList = (Array.isArray(data.tasks) ? data.tasks : []) as any[];
      const existingCachedRaw = (await cacheGet<any>(`tasks:all:${user.id}`)) ?? (await cacheGet<any>("tasks"));
      const existingCached = extractTasksFromCache(existingCachedRaw);
      const mergedTasks = [...existingCached];

      for (const t of tasksList) {
        if (!t?.id) continue;
        const taskObj = {
          ...t,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        };
        // 1. Save to Firestore
        await saveEntityToFirestore(user.id, "tasks", t.id, taskObj);
        // 2. Also save to firebaseStore if possible
        try {
          await fromTable("tasks").upsert(taskObj);
        } catch {}
        // 3. Merge into local
        const idx = mergedTasks.findIndex((x) => x.id === t.id);
        if (idx >= 0) mergedTasks[idx] = taskObj;
        else mergedTasks.push(taskObj);
        importedTasks++;
      }
      await cacheSet(`tasks:all:${user.id}`, createTaskCacheEnvelope(mergedTasks));
      await cacheSet("tasks", mergedTasks);

      // Import notes
      const notesList = (Array.isArray(data.notes) ? data.notes : []) as any[];
      for (const n of notesList) {
        if (!n?.id) continue;
        const noteObj = {
          ...n,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        };
        await saveEntityToFirestore(user.id, "notes", n.id, noteObj);
        try {
          await fromTable("notes").upsert(noteObj);
        } catch {}
        importedNotes++;
      }

      // Update local notes cache as well
      try {
        const rawNotes = localStorage.getItem("arshnaz_notes") || localStorage.getItem("notes");
        let existingNotesList = rawNotes ? JSON.parse(rawNotes) : [];
        if (!Array.isArray(existingNotesList)) existingNotesList = [];
        for (const n of notesList) {
          if (!n?.id) continue;
          const idx = existingNotesList.findIndex((x: any) => x.id === n.id);
          if (idx >= 0) existingNotesList[idx] = n;
          else existingNotesList.push(n);
        }
        localStorage.setItem("arshnaz_notes", JSON.stringify(existingNotesList));
      } catch {}

      // Notify application of changes
      window.dispatchEvent(new Event("arshnaz:tasks-updated"));
      window.dispatchEvent(new Event("offline_queue_synced"));

      toast.success(
        isEn
          ? `Restored ${importedTasks} tasks and ${importedNotes} notes to Firestore cloud!`
          : `بازیابی با موفقیت انجام شد: ${importedTasks} تسک و ${importedNotes} یادداشت در دیتابیس Firestore ثبت گردید!`
      );
    } catch (e: any) {
      toast.error(e?.message || (isEn ? "Import error" : "خطا در خواندن و وارد کردن فایل"));
    } finally {
      setExporting(false);
    }
  }

  async function deleteAll() {
    if (!user) return;
    setDeleting(true);
    try {
      const tables = [
        "task_tags", "note_tags", "subtasks", "habit_logs", "folder_columns",
        "tasks", "notes", "habits", "folders", "tags", "pomodoro_sessions",
        "daily_checkins", "thought_records", "abc_records",
        "assessment_responses", "assessment_results", "mh_profile",
      ];
      for (const tbl of tables) {
        await fromTable(tbl).delete().eq("user_id", user.id);
      }
      await logoutUser();
      try { await firebaseStore.auth.signOut(); } catch {}
      localStorage.clear();
      toast.success(isEn ? "All data deleted" : "همه داده‌ها حذف شد");
      window.location.href = "/auth";
    } catch (e) {
      toast.error((e instanceof Error ? e.message : String(e)) || (isEn ? "Delete error" : "خطا در حذف"));
    } finally {
      setDeleting(false);
    }
  }

  const currentTheme = reminders?.theme || theme || "system";

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 animate-fade-in" dir={isEn ? "ltr" : "rtl"}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> {t("settings.title")}
        </h1>
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

          <AppearanceSettingsSection
            isEn={isEn}
            reminders={reminders}
            updateReminder={updateReminder}
            currentTheme={currentTheme}
            setAppTheme={setAppTheme}
          />

          <SidebarQuickLinksSettings isEn={isEn} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-5 mt-5">
          <AssistantAccessSettings />
          {reminders && (
            <TaskDefaultSettings
              value={reminders.task_defaults || {}}
              onChange={(next: TaskDefaults) => updateReminder({ task_defaults: { ...(reminders.task_defaults || {}), ...next } })}
            />
          )}
          <TimeBucketsSettings />
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
                    if (file) importAll(file);
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
