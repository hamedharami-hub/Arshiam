import { useCallback, useMemo, useState } from "react";
import { Bot, CheckCircle2, Cpu, Download, Loader2, Mic, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  deviceMemoryGB,
  loadOfflineModelSettings,
  modelDownloadReady,
  OFFLINE_ASSISTANT_MODELS,
  OFFLINE_SPEECH_MODELS,
  saveOfflineModelSettings,
  type OfflineSpeechMode,
  type OfflineAssistantModelId,
} from "@/lib/offlineModels";
import { prefetchOfflineSpeech } from "@/lib/offlineSpeech";
import { prefetchOfflineLLM, isOfflineLLMCached } from "@/lib/offlineLLM";

type DownloadState = "idle" | "loading" | "ready" | "error";

export function OfflineIntelligenceSettings({ isEn }: { isEn: boolean }) {
  const [settings, setSettings] = useState(() => loadOfflineModelSettings());
  const [speechState, setSpeechState] = useState<DownloadState>("idle");
  const [speechProgress, setSpeechProgress] = useState<number | null>(null);

  const [assistantState, setAssistantState] = useState<DownloadState>(() =>
    isOfflineLLMCached(settings.assistantModel) ? "ready" : "idle"
  );
  const [assistantProgress, setAssistantProgress] = useState<number | null>(null);

  const memory = useMemo(() => deviceMemoryGB(), []);
  const selectedSpeech = settings.speechMode === "system" ? null : OFFLINE_SPEECH_MODELS[settings.speechMode];
  const selectedAssistant = OFFLINE_ASSISTANT_MODELS[settings.assistantModel];

  const persist = useCallback((next: typeof settings) => {
    setSettings(next);
    saveOfflineModelSettings(next);
  }, []);

  const downloadSpeech = useCallback(async () => {
    if (!selectedSpeech || settings.speechMode === "system") return;
    const check = modelDownloadReady(selectedSpeech.minMemoryGB);
    if (!check.ready) {
      toast.error(isEn ? check.reason : "برای دانلود مدل به اینترنت و حافظهٔ کافی گوشی نیاز است.");
      return;
    }
    setSpeechState("loading");
    setSpeechProgress(null);
    try {
      await prefetchOfflineSpeech(settings.speechMode, (event) => {
        if (typeof event.progress === "number") setSpeechProgress(Math.round(event.progress));
      });
      setSpeechState("ready");
      toast.success(isEn ? "Offline speech model is ready." : "مدل تشخیص صوت آفلاین آماده است.");
    } catch (error) {
      setSpeechState("error");
      toast.error(
        isEn
          ? "Model download failed. Check your connection and storage."
          : "دانلود مدل ناموفق بود؛ اینترنت و فضای دستگاه را بررسی کنید."
      );
      console.warn("Offline speech model download failed", error);
    }
  }, [isEn, selectedSpeech, settings.speechMode]);

  const downloadAssistant = useCallback(async () => {
    if (!selectedAssistant || !selectedAssistant.isGenerative) return;
    const check = modelDownloadReady(selectedAssistant.minMemoryGB);
    if (!check.ready) {
      toast.error(
        isEn
          ? check.reason
          : `این مدل به حداقل ${selectedAssistant.minMemoryGB} گیگابایت حافظه رم نیاز دارد.`
      );
      return;
    }
    setAssistantState("loading");
    setAssistantProgress(null);
    try {
      await prefetchOfflineLLM(settings.assistantModel, (event) => {
        if (typeof event.progress === "number") setAssistantProgress(Math.round(event.progress));
      });
      setAssistantState("ready");
      toast.success(
        isEn
          ? "On-device AI model downloaded and ready!"
          : "مدل هوش مصنوعی محلی دانلود شد و آماده استفاده کاملاً آفلاین است!"
      );
    } catch (error) {
      setAssistantState("error");
      toast.error(
        isEn
          ? "Assistant model download failed. Ensure stable Wi-Fi."
          : "دانلود مدل ناموفق بود؛ اتصال اینترنت پایدار و حافظه را بررسی کنید."
      );
      console.warn("Assistant model download failed", error);
    }
  }, [isEn, selectedAssistant, settings.assistantModel]);

  return (
    <div className="space-y-5">
      {/* 3-Tier Architecture Info Card */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-xs leading-6 text-muted-foreground space-y-2">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Cpu className="w-4 h-4 text-primary shrink-0" />
          {isEn ? "3-Tier Hybrid AI Architecture" : "معماری سه‌لایه هیبریدی هوش مصنوعی"}
        </div>
        <p>
          {isEn
            ? "1. Cloud AI (Gemini Flash) when online · 2. On-Device LLM (Qwen/SmolLM) when offline & downloaded · 3. Smart NLP Engine (0 MB, Instant) as universal baseline."
            : "۱. هوش ابری (Gemini) در زمان اتصال · ۲. مدل زبانی محلی (Qwen/SmolLM) در زمان آفلاین و دانلود · ۳. موتور هوشمند NLP (حجم صفر و فوری) به عنوان پشتیبان همیشگی."}
        </p>
      </div>

      {/* Offline Speech */}
      <div className="space-y-3 border-b pb-5">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Mic className="w-4 h-4 text-primary" />
          {isEn ? "Offline speech" : "تشخیص صوت آفلاین"}
        </div>
        <p className="text-xs text-muted-foreground leading-6">
          {isEn
            ? "System is the fast default. Whisper is multilingual (Persian + English), works after its first download, and processes voice directly on device."
            : "حالت سیستم سریع‌ترین انتخاب است. Whisper چندزبانه است، فارسی و انگلیسی را پس از دانلود اول بدون اینترنت تشخیص می‌دهد و صوت را روی گوشی پردازش می‌کند."}
        </p>
        <Select
          value={settings.speechMode}
          onValueChange={(value) => {
            setSpeechState("idle");
            persist({ ...settings, speechMode: value as OfflineSpeechMode });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">
              {isEn ? "System speech (automatic)" : "موتور گفتار گوشی (خودکار)"}
            </SelectItem>
            {Object.entries(OFFLINE_SPEECH_MODELS).map(([id, model]) => (
              <SelectItem key={id} value={id}>
                {isEn ? model.labelEn : model.labelFa} · {model.estimatedMB} MB
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSpeech && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">
              {isEn
                ? `Download: about ${selectedSpeech.estimatedMB} MB · recommended memory: ${selectedSpeech.minMemoryGB} GB+`
                : `دانلود: حدود ${selectedSpeech.estimatedMB} مگابایت · RAM پیشنهادی: ${selectedSpeech.minMemoryGB} گیگابایت به بالا`}
            </span>
            <Button
              size="sm"
              variant={speechState === "ready" ? "secondary" : "outline"}
              onClick={downloadSpeech}
              disabled={speechState === "loading"}
              className="gap-1.5"
            >
              {speechState === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : speechState === "ready" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {speechState === "loading"
                ? speechProgress !== null
                  ? `${speechProgress}%`
                  : isEn
                  ? "Preparing"
                  : "در حال آماده‌سازی"
                : speechState === "ready"
                ? isEn
                  ? "Ready"
                  : "آماده"
                : isEn
                ? "Download"
                : "دانلود"}
            </Button>
          </div>
        )}
      </div>

      {/* Offline Assistant */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Bot className="w-4 h-4 text-primary" />
              {isEn ? "Offline assistant" : "دستیار هوشمند آفلاین"}
            </div>
            <p className="text-xs text-muted-foreground leading-6">
              {isEn
                ? "Converts natural text to tasks, extracts dates, assigns priorities, generates domain-aware subtasks, and provides intelligent chat offline."
                : "تبدیل متن طبیعی به تسک با تاریخ و اولویت، تولید زیرتسک‌های اختصاصی بر اساس زمینه کار، و چت هوشمند در حالت آفلاین."}
            </p>
          </div>
          <Switch
            checked={settings.assistantEnabled}
            onCheckedChange={(assistantEnabled) => persist({ ...settings, assistantEnabled })}
          />
        </div>

        {settings.assistantEnabled && (
          <div className="rounded-lg border border-primary/20 bg-muted/40 p-3.5 space-y-3 text-xs leading-6 text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {isEn ? "Selected Offline Intelligence Engine" : "انتخاب موتور هوش مصنوعی آفلاین"}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                {selectedAssistant.tier === 2 ? (isEn ? "Tier 2: On-Device LLM" : "لایه ۲: مدل محلی") : (isEn ? "Tier 3: Smart NLP" : "لایه ۳: موتور محلی")}
              </span>
            </div>

            <Select
              value={settings.assistantModel}
              onValueChange={(assistantModel) => {
                const nextId = assistantModel as OfflineAssistantModelId;
                setAssistantState(isOfflineLLMCached(nextId) ? "ready" : "idle");
                persist({ ...settings, assistantModel: nextId });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OFFLINE_ASSISTANT_MODELS).map(([id, model]) => (
                  <SelectItem key={id} value={id}>
                    {isEn ? model.labelEn : model.labelFa}
                    {model.estimatedMB > 0 ? ` · ${model.estimatedMB} MB` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Generative Model Download Widget */}
            {selectedAssistant.isGenerative && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-3 border border-border/70">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {isEn ? "Local Generative Intelligence" : "هوش مصنوعی مولد روی دستگاه"}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {isEn
                      ? `Size: ~${selectedAssistant.estimatedMB} MB · Recommended RAM: ${selectedAssistant.minMemoryGB} GB+`
                      : `حجم: حدود ${selectedAssistant.estimatedMB} مگابایت · رم پیشنهادی: ${selectedAssistant.minMemoryGB} گیگابایت`}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant={assistantState === "ready" ? "secondary" : "default"}
                  onClick={downloadAssistant}
                  disabled={assistantState === "loading"}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  {assistantState === "loading" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : assistantState === "ready" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {assistantState === "loading"
                    ? assistantProgress !== null
                      ? `${assistantProgress}%`
                      : isEn
                      ? "Downloading..."
                      : "در حال دانلود..."
                    : assistantState === "ready"
                    ? isEn
                      ? "Active & Cached"
                      : "آماده و فعال"
                    : isEn
                    ? "Download Model"
                    : "دانلود مدل"}
                </Button>
              </div>
            )}

            {!selectedAssistant.isGenerative && (
              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Smart NLP Engine is active. It requires 0 MB download, responds instantly, and smartly categorizes tasks and domain subtasks offline."
                  : "موتور هوشمند NLP فعال است. نیاز به هیچ دانلودی ندارد، فوری پاسخ می‌دهد و تسک‌ها و زیرتسک‌های تخصصی را به صورت آفلاین تولید می‌کند."}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {memory === null
          ? isEn
            ? "Device memory was not reported by this browser."
            : "مرورگر میزان RAM دستگاه را گزارش نکرد."
          : isEn
          ? `Reported device memory: ${memory} GB.`
          : `RAM گزارش‌شدهٔ دستگاه: ${memory} گیگابایت.`}
      </p>
    </div>
  );
}

