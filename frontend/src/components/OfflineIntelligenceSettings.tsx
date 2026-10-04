import { useCallback, useMemo, useState } from "react";
import { Bot, CheckCircle2, Cpu, Download, Loader2, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  deviceMemoryGB,
  loadOfflineModelSettings,
  modelDownloadReady,
  OFFLINE_SPEECH_MODELS,
  saveOfflineModelSettings,
  type OfflineSpeechMode,
} from "@/lib/offlineModels";
import { prefetchOfflineSpeech } from "@/lib/offlineSpeech";

type DownloadState = "idle" | "loading" | "ready" | "error";

export function OfflineIntelligenceSettings({ isEn }: { isEn: boolean }) {
  const [settings, setSettings] = useState(() => loadOfflineModelSettings());
  const [speechState, setSpeechState] = useState<DownloadState>("idle");
  const [speechProgress, setSpeechProgress] = useState<number | null>(null);

  const memory = useMemo(() => deviceMemoryGB(), []);
  const selectedSpeech = settings.speechMode === "system" ? null : OFFLINE_SPEECH_MODELS[settings.speechMode];

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

  return (
    <div className="space-y-5">
      {/* Offline capabilities card */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-xs leading-6 text-muted-foreground space-y-2">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Cpu className="w-4 h-4 text-primary shrink-0" />
          {isEn ? "Private offline intelligence" : "هوشمندی خصوصی آفلاین"}
        </div>
        <p>
          {isEn
            ? "Cloud AI remains available when you choose it. Offline requests use ARSHNAZ's built-in private logic: no model download, no hidden network request, and no unsupported model selector."
            : "هوش ابری فقط وقتی انتخابش کنید و اینترنت داشته باشید استفاده می‌شود. درخواست‌های آفلاین با منطق خصوصیِ داخل ARSHNAZ انجام می‌شوند: بدون دانلود مدل، بدون درخواست پنهان اینترنتی و بدون انتخاب‌گرِ مدلِ ناپایدار."}
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
              {isEn ? "Private offline assistant" : "دستیار خصوصی آفلاین"}
            </div>
            <p className="text-xs text-muted-foreground leading-6">
              {isEn
                ? "Turns natural text into tasks, extracts dates and priorities, creates domain-aware subtasks, summarizes notes, and gives structured guidance without a downloaded language model."
                : "متن طبیعی را به تسک تبدیل می‌کند، تاریخ و اولویت را تشخیص می‌دهد، زیرتسک‌های متناسب می‌سازد، یادداشت را خلاصه می‌کند و بدون دانلود مدل زبانی راهنمایی ساختاریافته می‌دهد."}
            </p>
          </div>
          <Switch
            checked={settings.assistantEnabled}
            onCheckedChange={(assistantEnabled) => persist({ ...settings, assistantEnabled })}
          />
        </div>

        {settings.assistantEnabled && (
          <div className="rounded-lg border border-primary/20 bg-muted/40 p-3.5 space-y-2 text-xs leading-6 text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {isEn ? "Built-in smart logic" : "منطق هوشمند داخلی"}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                {isEn ? "Instant · 0 MB" : "فوری · ۰ مگابایت"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Reliable offline features: date and priority extraction, task categorization, domain-specific subtasks, structured notes, concise summaries, suggestions, and CBT reflection prompts. It does not pretend to be a free-form local LLM."
                : "امکانات قابل‌اعتماد آفلاین: تشخیص تاریخ و اولویت، دسته‌بندی تسک، زیرتسک‌های متناسب با موضوع، یادداشت ساختاریافته، خلاصهٔ کوتاه، پیشنهاد و پرسش‌های بازتابی CBT. این بخش خود را یک مدل زبانی مولدِ آزاد جا نمی‌زند."}
            </p>
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

