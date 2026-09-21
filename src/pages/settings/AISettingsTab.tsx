import { useState, useMemo } from "react";
import {
  Sparkles, Save, Trash2, Languages, Shield, Wand2, Star, RefreshCw, Eye, Cpu, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { SectionCard } from "./SectionCard";
import { OfflineIntelligenceSettings } from "@/components/OfflineIntelligenceSettings";
import { getAILanguage, setAILanguage, type AILanguage } from "@/lib/ai";
import {
  loadAISettings, saveAISettings, clearAllStoredAIKeys, defaultConfig,
  PROVIDER_INFO, OPERATIONS, MODEL_DESCRIPTIONS, OP_RECOMMENDED,
  resolveOpConfig, resolveOpStrategy,
  type Provider, type ProviderConfig, type AIPerOpSettings, type OperationMeta, type OpStrategy, type AIOperation,
} from "@/lib/aiSettings";
import { fetchProviderModels, getMergedModels, getAllKnownModels } from "@/lib/fetchModels";

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
                    <Checkbox checked={!isHidden} onCheckedChange={(checked) => {
                      const next = checked ? hidden.filter((x) => x !== m) : [...hidden, m];
                      onUpdateHidden?.(value.provider, next);
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

export interface AISettingsTabProps {
  settings: AIPerOpSettings;
  setSettings: React.Dispatch<React.SetStateAction<AIPerOpSettings>>;
  lang: AILanguage;
  setLang: (l: AILanguage) => void;
  isEn: boolean;
}

export function AISettingsTab({
  settings,
  setSettings,
  lang,
  setLang,
  isEn,
}: AISettingsTabProps) {
  const { t } = useTranslation();

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

  const aiResponseOptions = [
    { value: "fa", label: t("settings.persian") },
    { value: "en", label: t("settings.english") },
    { value: "auto", label: t("settings.aiAuto") },
  ];

  return (
    <div className="space-y-5">
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
        icon={Shield}
        title={isEn ? "AI Privacy & Personalization (BYOK)" : "حریم خصوصی و شخصی‌سازی هوش مصنوعی (BYOK)"}
        description={
          isEn
            ? "Transparent client-side AI keys and explicit opt-in for personalizing responses with your profile."
            : "شفافیت کلیدهای اختصاصی (BYOK) و انتخاب آگاهانه برای شخصی‌سازی با داده‌های پروفایل."
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-2 text-xs text-muted-foreground leading-relaxed">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              {isEn ? "Strict BYOK (Bring Your Own Key) Architecture" : "معماری کاملاً شفاف BYOK (کلید اختصاصی کاربر)"}
            </div>
            <p>
              {isEn
                ? "Your AI API keys are stored solely on your local device (localStorage) and never transmitted to ARSHNAZ servers. Requests are sent directly from your browser to the official provider endpoint (Google AI Studio, OpenAI, Anthropic, or Groq). No shared production key exists in the app."
                : "کلیدهای API شما صرفاً در حافظه محلی همین دستگاه (localStorage) نگهداری می‌شوند و هرگز به سرورهای ARSHNAZ ارسال نمی‌شوند. درخواست‌ها مستقیماً از مرورگر شما به سرور رسمی ارائه‌دهنده (گوگل، OpenAI، آنتروپیک یا Groq) ارسال می‌گردند. هیچ کلید اشتراکی در برنامه وجود ندارد."}
            </p>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8"
                onClick={() => {
                  clearAllStoredAIKeys();
                  setSettings(loadAISettings());
                  toast.success(
                    isEn
                      ? "All locally stored AI keys have been completely removed from this device."
                      : "تمام کلیدهای ذخیره‌شده هوش مصنوعی با موفقیت از این دستگاه حذف شدند."
                  );
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isEn ? "Remove all locally stored AI keys" : "حذف یک‌کلیکه تمام کلیدهای هوش مصنوعی از این دستگاه"}
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="ai-personalization-toggle" className="text-sm font-medium cursor-pointer">
                  {isEn ? "Include Profile & Goals in AI Prompts (Opt-In)" : "شخصی‌سازی هوشمند با پروفایل و درباره من (اختیاری)"}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEn
                    ? "By default, zero profile notes, mental health data, or task histories are sent to external models. When opted in, only a minimal, relevant summary is included:"
                    : "در حالت پیش‌فرض، هیچ داده‌ای از ذهن، درباره من، نوت‌ها یا تاریخچه تسک‌ها به مدل خارجی ارسال نمی‌شود. در صورت فعال‌سازی، فقط خلاصه حداقلی زیر همراه پرامپت ارسال خواهد شد:"}
                </p>
              </div>
              <Switch
                id="ai-personalization-toggle"
                checked={settings.personalizationOptIn === true}
                onCheckedChange={(checked) => {
                  const next = { ...settings, personalizationOptIn: checked };
                  setSettings(next);
                  saveAISettings(next);
                  toast.success(
                    isEn
                      ? (checked ? "Personalization enabled" : "Personalization disabled")
                      : (checked ? "شخصی‌سازی فعال شد" : "شخصی‌سازی غیرفعال شد")
                  );
                }}
              />
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs text-muted-foreground space-y-1.5">
              <div className="font-medium text-foreground text-[11px]">
                {isEn ? "Categories of data included only when opted in:" : "دسته‌بندی داده‌های ارسالی فقط پس از فعال‌سازی:"}
              </div>
              <ul className="list-disc pe-4 space-y-1 text-[11px] leading-relaxed">
                <li>{isEn ? "Primary goals & focus life areas (from About Me)" : "اهداف اصلی و حوزه‌های تمرکز (از پرسشنامه درباره من)"}</li>
                <li>{isEn ? "Communication & energy style preferences" : "ترجیحات ارتباطی و زمان اوج انرژی روزانه"}</li>
                <li>{isEn ? "Mind profile summary (if previously recorded by you)" : "خلاصه پروفایل ذهن (در صورت ثبت قبلی توسط خودتان)"}</li>
                <li className="font-semibold text-foreground/80">
                  {isEn
                    ? "Never sent: raw private notes, full task lists, or past chat history."
                    : "هرگز ارسال نمی‌شوند: متن خام نوت‌های خصوصی، لیست کامل تسک‌ها یا تاریخچه چت‌های گذشته."}
                </li>
              </ul>
            </div>
          </div>
        </div>
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
    </div>
  );
}
