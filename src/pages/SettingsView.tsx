import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Save, Trash2, Languages, Download, ShieldOff, Settings2, Bell, Moon, Palette, Type, ZoomIn, LayoutGrid, Heart, Coffee, Star, Wand2, RotateCw, Sun, Upload, CheckCircle2, AlertCircle, Clock, Zap, Cpu, Eye, EyeOff, RefreshCw, Package, Database, Info, Compass } from "lucide-react";
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
import { getAILanguage, setAILanguage, type AILanguage } from "@/lib/ai";
import {
  loadAISettings, saveAISettings, defaultConfig, recommendedConfig,
  PROVIDER_INFO, OPERATIONS, MODEL_DESCRIPTIONS, OP_RECOMMENDED,
  resolveOpConfig, resolveOpStrategy,
  type Provider, type ProviderConfig, type AIPerOpSettings, type OperationMeta, type OpStrategy, type AIOperation,
} from "@/lib/aiSettings";
import { fetchProviderModels, getMergedModels, getAllKnownModels } from "@/lib/fetchModels";
import { firebaseStore } from "@/lib/firebaseStore";
import { logoutUser } from "@/lib/authService";
import { useAuth } from "@/hooks/useAuth";
import { loadSettings, saveSettings, ensureNotificationPermission, type UserSettings } from "@/lib/reminders";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ALL_BUCKET_KINDS, getEnabledBuckets, setEnabledBuckets, kindLabel, type BucketKind } from "@/lib/timeBuckets";
import { getCalendarSystem, setCalendarSystem, type CalendarSystem } from "@/lib/jalali";
import { useTheme } from "next-themes";
import { applyTheme, getBaseTheme } from "@/lib/theme";
import { TaskDefaultSettings } from "@/components/TaskDefaultSettings";
import FirebaseSyncCard from "@/components/FirebaseSyncCard";
import { saveEntityToFirestore, fetchFromFirestore } from "@/lib/firestoreSync";
import { cacheGet, cacheSet } from "@/lib/offlineQueue";
import type { TaskDefaults } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import AndroidSettings from "@/components/AndroidSettings";
import { OfflineIntelligenceSettings } from "@/components/OfflineIntelligenceSettings";
import { isAndroid, nativeExperience, type NativeAppInfo } from "@/lib/nativeExperience";

type LucideIcon = React.ComponentType<{ className?: string }>;

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 space-y-4 bg-card/60 border-border/60", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {description && <p className="text-xs text-muted-foreground leading-6">{description}</p>}
      {children}
    </Card>
  );
}

function SettingRow({
  label,
  help,
  children,
  className,
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b last:border-0 border-border/40", className)}>
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <div className="min-w-[140px] shrink-0">{children}</div>
    </div>
  );
}

function TimeBucketsSettings() {
  const [enabled, setEnabled] = useState<BucketKind[]>(() => getEnabledBuckets());
  const [cal, setCal] = useState<CalendarSystem>(() => getCalendarSystem());
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const toggle = (k: BucketKind) => {
    const next = enabled.includes(k) ? enabled.filter((x) => x !== k) : [...enabled, k];
    setEnabled(next);
    setEnabledBuckets(next);
  };
  const changeCal = (v: CalendarSystem) => {
    setCal(v);
    setCalendarSystem(v);
  };
  return (
    <SectionCard
      icon={LayoutGrid}
      title={t("settings.timeBucketsTitle")}
      description={t("settings.timeBucketsDesc")}
    >
      <div className="space-y-2">
        {ALL_BUCKET_KINDS.map((k) => (
          <div key={k} className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40">
            <span className="text-sm">{kindLabel(k, isEn ? "en" : "fa")}</span>
            <Switch checked={enabled.includes(k)} onCheckedChange={() => toggle(k)} />
          </div>
        ))}
      </div>
      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs">{t("settings.calendarSystem")}</Label>
        <Select value={cal} onValueChange={(v) => changeCal(v as CalendarSystem)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="jalali">{t("settings.jalali")}</SelectItem>
            <SelectItem value="gregorian">{t("settings.gregorian")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </SectionCard>
  );
}

function ProviderEditor({
  value, onChange, isEn, hiddenModels, onUpdateHidden,
}: {
  value: ProviderConfig;
  onChange: (c: ProviderConfig) => void;
  isEn: boolean;
  hiddenModels?: Partial<Record<Provider, string[]>>;
  onUpdateHidden?: (provider: Provider, hidden: string[]) => void;
}) {
  const { t } = useTranslation();
  const info = PROVIDER_INFO[value.provider];
  const [refreshing, setRefreshing] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const hidden = hiddenModels?.[value.provider] || [];
  const models = getMergedModels(value.provider, info.models, hidden);

  const onProvider = (p: Provider) => {
    const i = PROVIDER_INFO[p];
    onChange({ provider: p, apiKey: value.apiKey, model: i.defaultModel, baseUrl: i.baseUrl });
  };

  const refresh = async () => {
    if (value.provider === "offline") {
      toast.info(isEn ? "On-device models are managed locally." : "مدل‌های روی دستگاه از داخل برنامه مدیریت می‌شوند.");
      return;
    }
    if (!value.apiKey) { toast.error(t("settings.enterKey")); return; }
    setRefreshing(true);
    try {
      const list = await fetchProviderModels(value.provider, value.apiKey, value.baseUrl);
      toast.success(isEn ? `${list.length} models fetched from ${info.label}.` : `${list.length} مدل از ${info.label} دریافت شد.`);
    } catch (e) {
      toast.error((isEn ? "Failed to fetch models: " : "خطا در دریافت مدل‌ها: ") + (e instanceof Error ? e.message : String(e)));
    } finally { setRefreshing(false); }
  };

  const allKnown = getAllKnownModels(value.provider, info.models);

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("settings.serviceLabel")}</Label>
        <Select value={value.provider} onValueChange={(v) => onProvider(v as Provider)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => (
              <SelectItem key={p} value={p}>{PROVIDER_INFO[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">{t("settings.modelLabel")}</Label>
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
              onClick={refresh} disabled={refreshing} title={t("ai.updateModels")}>
              <RefreshCw className={`w-3.5 h-3.5 ms-1 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? t("settings.refreshing") : t("settings.refreshModels")}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
              onClick={() => setManageOpen(true)} title={t("ai.configureModels")}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {models.length > 0 || hidden.includes(value.model) ? (
          <Select value={value.model} onValueChange={(v) => onChange({ ...value, model: v })}>
            <SelectTrigger><SelectValue placeholder={info.defaultModel} /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  <div className="flex flex-col items-start">
                    <span className="font-mono text-xs">{m}</span>
                    {MODEL_DESCRIPTIONS[m] && (
                      <span className="text-[10px] text-muted-foreground">{MODEL_DESCRIPTIONS[m]}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {hidden.includes(value.model) && (
                <SelectItem value={value.model}>
                  <div className="flex flex-col items-start">
                    <span className="font-mono text-xs">{value.model}</span>
                    <span className="text-[10px] text-muted-foreground">{isEn ? "Hidden in selection" : "مخفی در انتخاب"}</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} placeholder={t("settings.modelName")} />
        )}
      </div>
      {value.provider !== "offline" && (
        <div className="space-y-1.5">
          <Label className="text-xs">API Key</Label>
          <Input type="password" value={value.apiKey} placeholder="sk-..." onChange={(e) => onChange({ ...value, apiKey: e.target.value })} autoComplete="off" />
        </div>
      )}
      {value.provider === "custom" && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("settings.baseUrl")}</Label>
          <Input value={value.baseUrl || ""} placeholder="https://your-endpoint/v1" onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} />
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{info.help}</p>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> {info.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isEn ? "Check the models you want to see in the selection dropdown." : "مدل‌هایی که می‌خواهی در لیست انتخاب نمایش داده شوند را علامت بزن."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {allKnown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("ai.noModels")}</p>
            ) : (
              allKnown.map((m) => {
                const isHidden = hidden.includes(m);
                return (
                  <label key={m} className="flex items-start gap-2 p-2 rounded-lg border border-border/60 bg-card/40 cursor-pointer">
                    <Checkbox
                      checked={!isHidden}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? hidden.filter((x) => x !== m)
                          : [...hidden, m];
                        onUpdateHidden?.(value.provider, next);
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs break-all">{m}</div>
                      {MODEL_DESCRIPTIONS[m] && <div className="text-[10px] text-muted-foreground">{MODEL_DESCRIPTIONS[m]}</div>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setManageOpen(false)}>{isEn ? "Done" : "انجام شد"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getSavedProviderKey(s: AIPerOpSettings, p: Provider) {
  if (s.default.provider === p && s.default.apiKey) {
    return { apiKey: s.default.apiKey, baseUrl: s.default.baseUrl || PROVIDER_INFO[p].baseUrl };
  }
  for (const cfg of Object.values(s.perOp || {})) {
    if (cfg.provider === p && cfg.apiKey) {
      return { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl || PROVIDER_INFO[p].baseUrl };
    }
  }
  return { apiKey: "", baseUrl: PROVIDER_INFO[p].baseUrl };
}

function ProviderModelManager({
  settings, isEn, onUpdateHidden,
}: {
  settings: AIPerOpSettings;
  isEn: boolean;
  onUpdateHidden: (provider: Provider, hidden: string[]) => void;
}) {
  const { t } = useTranslation();
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [refreshing, setRefreshing] = useState<Partial<Record<Provider, boolean>>>({});
  const [inputs, setInputs] = useState<Partial<Record<Provider, { apiKey: string; baseUrl: string }>>>(() => {
    const out: Partial<Record<Provider, { apiKey: string; baseUrl: string }>> = {};
    for (const p of Object.keys(PROVIDER_INFO) as Provider[]) out[p] = getSavedProviderKey(settings, p);
    return out;
  });

  const refresh = async (p: Provider) => {
    if (p === "offline") {
      toast.info(isEn ? "On-device models are managed locally." : "مدل‌های روی دستگاه از داخل برنامه مدیریت می‌شوند.");
      return;
    }
    const input = inputs[p] || { apiKey: "", baseUrl: PROVIDER_INFO[p].baseUrl };
    if (!input.apiKey) { toast.error(t("settings.enterKey")); setActiveProvider(p); return; }
    setRefreshing((r) => ({ ...r, [p]: true }));
    try {
      const list = await fetchProviderModels(p, input.apiKey, input.baseUrl);
      toast.success(isEn ? `${list.length} models fetched from ${PROVIDER_INFO[p].label}.` : `${list.length} مدل از ${PROVIDER_INFO[p].label} دریافت شد.`);
    } catch (e) {
      toast.error((isEn ? "Failed: " : "خطا: ") + (e instanceof Error ? e.message : String(e)));
    } finally { setRefreshing((r) => ({ ...r, [p]: false })); }
  };

  const activeInfo = activeProvider ? PROVIDER_INFO[activeProvider] : null;
  const activeHidden = activeProvider ? (settings.providerHiddenModels?.[activeProvider] || []) : [];
  const activeAll = activeProvider && activeInfo ? getAllKnownModels(activeProvider, activeInfo.models) : [];

  return (
    <SectionCard
      icon={Cpu}
      title={t("ai.modelManagement")}
      description={t("ai.modelManagementDesc")}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => {
          const info = PROVIDER_INFO[p];
          const hidden = settings.providerHiddenModels?.[p] || [];
          const visible = getMergedModels(p, info.models, hidden).length;
          const all = getAllKnownModels(p, info.models).length;
          return (
            <div key={p} className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{info.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{p}</div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{visible}/{all || info.models.length}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => refresh(p)} disabled={refreshing[p] || p === "offline"}>
                  <RefreshCw className={`w-3 h-3 me-1 ${refreshing[p] ? "animate-spin" : ""}`} />
                  {t("ai.updateModels")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => { setActiveProvider(p); if (!inputs[p]) setInputs((s) => ({ ...s, [p]: getSavedProviderKey(settings, p) })); }}>
                  <Settings2 className="w-3 h-3 me-1" />
                  {t("ai.configureModels")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!activeProvider} onOpenChange={(open) => { if (!open) setActiveProvider(null); }}>
        {activeProvider && activeInfo && (
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> {activeInfo.label}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEn ? "Enter the API key for this provider, update the list, then choose which model IDs are visible." : "کلید API این سرویس را وارد کن، لیست را به‌روز کن، سپس مدل‌های قابل نمایش را انتخاب کن."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 overflow-y-auto py-2">
              {activeProvider !== "offline" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <Input type="password" value={inputs[activeProvider]?.apiKey || ""} onChange={(e) => setInputs((s) => ({ ...s, [activeProvider]: { ...(s[activeProvider] || { baseUrl: activeInfo.baseUrl }), apiKey: e.target.value } }))} placeholder="sk-..." autoComplete="off" />
                  </div>
                  {activeProvider === "custom" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("settings.baseUrl")}</Label>
                      <Input value={inputs[activeProvider]?.baseUrl || ""} onChange={(e) => setInputs((s) => ({ ...s, [activeProvider]: { ...(s[activeProvider] || { apiKey: "" }), baseUrl: e.target.value } }))} placeholder="https://your-endpoint/v1" />
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={() => refresh(activeProvider)} disabled={refreshing[activeProvider]} className="w-full">
                    <RefreshCw className={`w-3.5 h-3.5 me-1 ${refreshing[activeProvider] ? "animate-spin" : ""}`} />
                    {refreshing[activeProvider] ? t("settings.refreshing") : t("ai.updateModels")}
                  </Button>
                </>
              )}
              <div className="space-y-2">
                <div className="text-xs font-medium">{isEn ? "Visible models" : "مدل‌های نمایشی"}</div>
                {activeAll.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("ai.noModels")}</p>
                ) : (
                  activeAll.map((m) => {
                    const isHidden = activeHidden.includes(m);
                    return (
                      <label key={m} className="flex items-start gap-2 p-2 rounded-lg border border-border/60 bg-card/40 cursor-pointer">
                        <Checkbox checked={!isHidden} onCheckedChange={(checked) => {
                          const next = checked ? activeHidden.filter((x) => x !== m) : [...activeHidden, m];
                          onUpdateHidden(activeProvider, next);
                        }} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs break-all">{m}</div>
                          {MODEL_DESCRIPTIONS[m] && <div className="text-[10px] text-muted-foreground">{MODEL_DESCRIPTIONS[m]}</div>}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setActiveProvider(null)}>{isEn ? "Done" : "انجام شد"}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </SectionCard>
  );
}

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

  const grouped = useMemo(() => {
    const GROUP_ORDER = ["General", "Tasks", "Notes", "Folder", "Mental health"];
    const m: Record<string, { groupEn: string; ops: OperationMeta[] }> = {};
    for (const op of OPERATIONS) {
      const g = isEn ? op.groupEn : op.group;
      (m[g] ||= { groupEn: op.groupEn, ops: [] }).ops.push(op);
    }
    return Object.entries(m)
      .map(([label, v]) => ({ label, groupEn: v.groupEn, ops: v.ops }))
      .sort((a, b) => GROUP_ORDER.indexOf(a.groupEn) - GROUP_ORDER.indexOf(b.groupEn));
  }, [isEn]);

  const onLangChange = (v: AILanguage) => {
    setLang(v);
    setAILanguage(v);
    toast.success(t("toasts.aiLangSaved"));
  };

  const save = () => {
    saveAISettings(settings);
    toast.success(t("settings.saved"));
  };

  const reset = () => {
    const strategies: Partial<Record<AIOperation, OpStrategy>> = {};
    for (const op of OPERATIONS) strategies[op.key] = "recommended";
    const fresh: AIPerOpSettings = { default: defaultConfig(), perOp: {}, useRecommended: true, opStrategies: strategies, providerHiddenModels: {} };
    setSettings(fresh);
    saveAISettings(fresh);
    toast.success(t("settings.resetDone"));
  };

  const applyRecommendedToAll = () => {
    const strategies: Partial<Record<AIOperation, OpStrategy>> = {};
    for (const op of OPERATIONS) strategies[op.key] = "recommended";
    const next = { ...settings, perOp: {}, opStrategies: strategies, useRecommended: true };
    setSettings(next);
    saveAISettings(next);
    toast.success(isEn ? "Recommended models applied to all sections." : "مدل پیشنهادی روی همه بخش‌ها اعمال شد.");
  };

  const clearAllOverrides = () => {
    const strategies: Partial<Record<AIOperation, OpStrategy>> = {};
    for (const op of OPERATIONS) strategies[op.key] = "recommended";
    const next = { ...settings, perOp: {}, opStrategies: strategies, useRecommended: true };
    setSettings(next);
    saveAISettings(next);
    toast.success(isEn ? "All overrides cleared." : "همه overrideها پاک شد.");
  };

  const setOpStrategy = (op: AIOperation, strategy: OpStrategy) => {
    const next = { ...settings, opStrategies: { ...settings.opStrategies } };
    next.opStrategies[op] = strategy;
    if (strategy !== "custom") {
      const perOp = { ...next.perOp };
      delete perOp[op];
      next.perOp = perOp;
    } else if (!next.perOp[op]) {
      next.perOp = { ...next.perOp, [op]: resolveOpConfig(next, op) };
    }
    setSettings(next);
    saveAISettings(next);
  };

  const updateOpCustom = (op: AIOperation, cfg: ProviderConfig) => {
    const next = {
      ...settings,
      opStrategies: { ...settings.opStrategies, [op]: "custom" as OpStrategy },
      perOp: { ...settings.perOp, [op]: cfg },
    };
    setSettings(next);
    saveAISettings(next);
  };

  const updateProviderHidden = (provider: Provider, hidden: string[]) => {
    const next = { ...settings, providerHiddenModels: { ...settings.providerHiddenModels, [provider]: hidden } };
    setSettings(next);
    saveAISettings(next);
  };

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
      const cachedTasks = (await cacheGet<any[]>(`tasks:all:${user.id}`)) || (await cacheGet<any[]>("tasks")) || [];
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
        tasks: Array.from(tasksMap.values()),
        notes: Array.from(notesMap.values()),
        ...remoteData,
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
      
      let importedTasks = 0;
      let importedNotes = 0;

      // Import tasks
      const tasksList = (Array.isArray(data.tasks) ? data.tasks : []) as any[];
      const existingCached = (await cacheGet<any[]>(`tasks:all:${user.id}`)) || (await cacheGet<any[]>("tasks")) || [];
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
      await cacheSet(`tasks:all:${user.id}`, mergedTasks);
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
  const themeOptions = [
    { value: "system", label: t("settings.themeSystem"), icon: Settings2, swatch: ["#94a3b8", "#cbd5e1", "#475569"] },
    { value: "light", label: t("settings.themeLight"), icon: Sun, swatch: ["#ffffff", "#f1f5f9", "#6366f1"] },
    { value: "dark", label: t("settings.themeDark"), icon: Moon, swatch: ["#0f172a", "#1e293b", "#818cf8"] },
    { value: "ticktick-light", label: t("settings.themeTickTick"), icon: CheckCircle2, swatch: ["#ffffff", "#f0fdf4", "#4ade80"] },
    { value: "arshnaz-light", label: t("settings.themeArshnaz"), icon: Heart, swatch: ["#fff7ed", "#fef3c7", "#f59e0b"] },
    { value: "arshnaz-dark", label: t("settings.themeArshnazDark"), icon: Moon, swatch: ["#1c1917", "#292524", "#fb923c"] },
  ];

  const fontSizeOptions = [
    { value: "small", label: t("settings.fontSmall") },
    { value: "medium", label: t("settings.fontMedium") },
    { value: "large", label: t("settings.fontLarge") },
    { value: "xlarge", label: t("settings.fontXLarge") },
  ];

  const landingOptions = [
    { value: "today", label: t("settings.landingToday") },
    { value: "last", label: t("settings.landingLast") },
  ];

  const layoutOptions = [
    { value: "comfortable", label: t("settings.layoutComfortable") },
    { value: "compact", label: t("settings.layoutCompact") },
  ];

  const aiResponseOptions = [
    { value: "fa", label: t("settings.persian") },
    { value: "en", label: t("settings.english") },
    { value: "auto", label: t("settings.aiAuto") },
  ];

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

          <SectionCard
            icon={Palette}
            title={t("settings.appearance")}
            description={t("settings.appearanceDesc")}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">{t("settings.theme")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = currentTheme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAppTheme(opt.value)}
                        className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${
                          active
                            ? "border-primary shadow-sm bg-primary/5"
                            : "border-border/60 bg-card/60 hover:border-primary/40"
                        }`}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-1 h-7 w-full rounded-lg overflow-hidden">
                          {opt.swatch.map((color, i) => (
                            <div key={i} className="flex-1 h-full" style={{ background: color }} />
                          ))}
                        </div>
                        {/* Icon + label */}
                        <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                          <Icon className="w-3 h-3" />
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {active && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {reminders && (
                <>
                  <SettingRow label={t("settings.fontSize")} help={t("settings.fontSizeHelp")}>
                    <Select value={reminders.font_size} onValueChange={(v) => updateReminder({ font_size: v as UserSettings["font_size"] })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {fontSizeOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow label={t("settings.uiZoom")} help={t("settings.uiZoomHelp")}>
                    <div className="flex items-center gap-3 w-full">
                      <Slider
                        value={[Math.round((reminders.ui_scale || 1) * 100)]}
                        min={80} max={140} step={5}
                        onValueChange={([v]) => updateReminder({ ui_scale: v / 100 })}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12 text-center">{Math.round((reminders.ui_scale || 1) * 100)}%</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => updateReminder({ ui_scale: 1 })} className="mt-2 h-7 text-xs">
                      {t("settings.resetTo100")}
                    </Button>
                  </SettingRow>

                  <SettingRow label={t("settings.taskCardLayout")} help={t("settings.layoutHelp")}>
                    <Select value={reminders.task_card_layout} onValueChange={(v) => updateReminder({ task_card_layout: v as UserSettings["task_card_layout"] })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {layoutOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow label={t("settings.defaultLanding")}>
                    <Select value={(reminders as { default_landing?: string }).default_landing === "home" ? "today" : ((reminders as { default_landing?: string }).default_landing || "today")} onValueChange={(v) => updateReminder({ default_landing: v as "today" | "last" | "home" })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {landingOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-5 mt-5">
          {reminders && (
            <TaskDefaultSettings
              value={reminders.task_defaults || {}}
              onChange={(next: TaskDefaults) => updateReminder({ task_defaults: { ...(reminders.task_defaults || {}), ...next } })}
            />
          )}
          <TimeBucketsSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-5 mt-5">
          <AndroidSettings />
          {reminders && (
            <SectionCard
              icon={Bell}
              title={t("settings.dailyReminders")}
              description={t("notificationsCardDesc")}
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
          <SectionCard
            icon={Cpu}
            title={isEn ? "Offline voice & assistant" : "صدا و دستیار آفلاین"}
            description={isEn ? "Optional on-device models for private Persian and English speech." : "مدل‌های اختیاری روی دستگاه برای دریافت صوت خصوصی فارسی و انگلیسی."}
          >
            <OfflineIntelligenceSettings isEn={isEn} />
          </SectionCard>

          <SectionCard
            icon={Languages}
            title={t("settings.aiResponseLang")}
            description={t("settings.aiResponseLangDesc")}
          >
            <Select value={lang} onValueChange={(v) => onLangChange(v as AILanguage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {aiResponseOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard
            icon={Sparkles}
            title={t("settings.aiGlobalDefault")}
            description={t("settings.aiGlobalDefaultDesc")}
          >
            <ProviderEditor
              isEn={isEn}
              value={settings.default}
              onChange={(c) => setSettings({ ...settings, default: c })}
              hiddenModels={settings.providerHiddenModels}
              onUpdateHidden={updateProviderHidden}
            />
            <div className="pt-1">
              <Button onClick={save} size="sm" className="gap-2"><Save className="w-3.5 h-3.5" /> {t("common.save")}</Button>
            </div>
          </SectionCard>

          <ProviderModelManager settings={settings} isEn={isEn} onUpdateHidden={updateProviderHidden} />

          <SectionCard
            icon={Wand2}
            title={t("ai.perSectionMap")}
            description={t("settings.aiPerSectionDesc")}
          >
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={applyRecommendedToAll}>
                <Star className="w-3.5 h-3.5 me-1" /> {t("settings.applyRecommendedToAll")}
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAllOverrides}>
                <Trash2 className="w-3.5 h-3.5 me-1" /> {t("settings.clearAllOverrides")}
              </Button>
            </div>

            <Accordion type="multiple" className="w-full">
              {grouped.map(({ label, ops }) => (
                <AccordionItem key={label} value={label}>
                  <AccordionTrigger className="text-sm">{label} ({ops.length})</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {ops.map((op) => {
                      const strategy = resolveOpStrategy(settings, op.key);
                      const cfg = resolveOpConfig(settings, op.key);
                      const rec = OP_RECOMMENDED[op.key];
                      const short = (m: string) => m.split("/").pop() || m;
                      return (
                        <div key={op.key} id={`ai-op-${op.key}`} className="border border-border/60 rounded-xl p-4 space-y-3 bg-card/40 transition-shadow hover:shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{isEn ? op.labelEn : op.labelFa}</span>
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {isEn ? op.usedInEn : op.usedInFa}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">{isEn ? op.descEn : op.descFa}</div>
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  <Star className="w-2.5 h-2.5" />
                                  {t("ai.recommended")}: <span className="font-mono">{short(rec.model)}</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground">— {isEn ? rec.whyEn : rec.whyFa}</span>
                              </div>
                              <div className="mt-1 text-[10px] text-muted-foreground">
                                {t("ai.using")}: <span className="font-mono text-foreground/80">{cfg.provider}/{short(cfg.model)}</span>
                                {strategy === "recommended" && <span className="ms-1 text-primary">· {t("ai.recommended")}</span>}
                                {strategy === "global" && <span className="ms-1 text-blue-600 dark:text-blue-400">· {t("ai.strategyGlobal")}</span>}
                                {strategy === "custom" && <span className="ms-1 text-amber-600 dark:text-amber-400">· {t("ai.strategyCustom")}</span>}
                              </div>
                            </div>
                            <div className="w-40 shrink-0">
                              <Select value={strategy} onValueChange={(v) => setOpStrategy(op.key, v as OpStrategy)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="recommended">{t("ai.strategyRecommended")}</SelectItem>
                                  <SelectItem value="global">{t("ai.strategyGlobal")}</SelectItem>
                                  <SelectItem value="custom">{t("ai.strategyCustom")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {strategy === "custom" && (
                            <ProviderEditor
                              isEn={isEn}
                              value={settings.perOp[op.key] || cfg}
                              onChange={(c) => updateOpCustom(op.key, c)}
                              hiddenModels={settings.providerHiddenModels}
                              onUpdateHidden={updateProviderHidden}
                            />
                          )}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} className="gap-2"><Save className="w-4 h-4" /> {t("common.saveAll")}</Button>
              <Button variant="outline" onClick={reset} className="gap-2"><Trash2 className="w-4 h-4" /> {t("common.reset")}</Button>
            </div>
          </SectionCard>
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
