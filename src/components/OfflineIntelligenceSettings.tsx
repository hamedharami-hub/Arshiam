import { useCallback, useMemo, useState } from "react";
import { Bot, CheckCircle2, Download, Loader2, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  deviceMemoryGB, loadOfflineModelSettings, modelDownloadReady, OFFLINE_ASSISTANT_MODELS,
  OFFLINE_SPEECH_MODELS, saveOfflineModelSettings, type OfflineSpeechMode,
} from "@/lib/offlineModels";
import { prefetchOfflineSpeech } from "@/lib/offlineSpeech";

type DownloadState = "idle" | "loading" | "ready" | "error";

export function OfflineIntelligenceSettings({ isEn }: { isEn: boolean }) {
  const [settings, setSettings] = useState(() => loadOfflineModelSettings());
  const [speechState, setSpeechState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const memory = useMemo(() => deviceMemoryGB(), []);
  const selectedSpeech = settings.speechMode === "system" ? null : OFFLINE_SPEECH_MODELS[settings.speechMode];

  const persist = useCallback((next: typeof settings) => {
    setSettings(next);
    saveOfflineModelSettings(next);
  }, []);

  const downloadSpeech = useCallback(async () => {
    if (!selectedSpeech || settings.speechMode === "system") return;
    const check = modelDownloadReady(selectedSpeech.minMemoryGB);
    if (!check.ready) { toast.error(isEn ? check.reason : "برای دانلود مدل به اینترنت و حافظهٔ کافی گوشی نیاز است."); return; }
    setSpeechState("loading"); setProgress(null);
    try {
      await prefetchOfflineSpeech(settings.speechMode, (event) => {
        if (typeof event.progress === "number") setProgress(Math.round(event.progress));
      });
      setSpeechState("ready");
      toast.success(isEn ? "Offline speech model is ready." : "مدل تشخیص صوت آفلاین آماده است.");
    } catch (error) {
      setSpeechState("error");
      toast.error(isEn ? "Model download failed. Check your connection and storage." : "دانلود مدل ناموفق بود؛ اینترنت و فضای دستگاه را بررسی کنید.");
      console.warn("Offline speech model download failed", error);
    }
  }, [isEn, selectedSpeech, settings.speechMode]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-xs leading-6 text-muted-foreground">
        <div className="flex gap-2 text-foreground font-medium"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          {isEn ? "Private by design" : "حریم خصوصی در طراحی"}
        </div>
        <p className="mt-1">{isEn
          ? "Optional models download only after you choose them. Once cached, speech is processed on this device and no recording is sent to ARSHNAZ."
          : "مدل‌ها فقط با انتخاب شما دانلود می‌شوند. پس از آماده‌شدن مدل، صوت روی همین دستگاه پردازش می‌شود و هیچ فایل صوتی به ARSHNAZ ارسال نمی‌شود."}</p>
      </div>

      <div className="space-y-3 border-b pb-5">
        <div className="flex items-center gap-2 font-medium text-sm"><Mic className="w-4 h-4 text-primary" />{isEn ? "Offline speech" : "تشخیص صوت آفلاین"}</div>
        <p className="text-xs text-muted-foreground leading-6">{isEn
          ? "System is the fast default. Whisper is multilingual (Persian + English), works after its first download, and may be slower on older phones."
          : "حالت سیستم سریع‌ترین انتخاب است. Whisper چندزبانه است، فارسی و انگلیسی را پس از دانلود اول بدون اینترنت تشخیص می‌دهد و روی گوشی‌های قدیمی ممکن است کندتر باشد."}</p>
        <Select value={settings.speechMode} onValueChange={(value) => {
          setSpeechState("idle");
          persist({ ...settings, speechMode: value as OfflineSpeechMode });
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{isEn ? "System speech (automatic)" : "موتور گفتار گوشی (خودکار)"}</SelectItem>
            {Object.entries(OFFLINE_SPEECH_MODELS).map(([id, model]) => (
              <SelectItem key={id} value={id}>{isEn ? model.labelEn : model.labelFa} · {model.estimatedMB} MB</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSpeech && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">{isEn
              ? `Download: about ${selectedSpeech.estimatedMB} MB · recommended memory: ${selectedSpeech.minMemoryGB} GB+`
              : `دانلود: حدود ${selectedSpeech.estimatedMB} مگابایت · RAM پیشنهادی: ${selectedSpeech.minMemoryGB} گیگابایت به بالا`}</span>
            <Button size="sm" variant={speechState === "ready" ? "secondary" : "outline"} onClick={downloadSpeech} disabled={speechState === "loading"} className="gap-1.5">
              {speechState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : speechState === "ready" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {speechState === "loading" ? (progress !== null ? `${progress}%` : (isEn ? "Preparing" : "در حال آماده‌سازی")) : speechState === "ready" ? (isEn ? "Ready" : "آماده") : (isEn ? "Download" : "دانلود")}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1"><div className="flex items-center gap-2 font-medium text-sm"><Bot className="w-4 h-4 text-primary" />{isEn ? "Offline assistant" : "دستیار آفلاین"}</div>
            <p className="text-xs text-muted-foreground leading-6">{isEn
              ? "Uses an optional small model for suggestions. It never changes or deletes tasks without your confirmation."
              : "برای پیشنهادها از مدل کوچک اختیاری استفاده می‌کند و هیچ تسکی را بدون تأیید شما تغییر یا حذف نمی‌کند."}</p></div>
          <Switch checked={settings.assistantEnabled} onCheckedChange={(assistantEnabled) => persist({ ...settings, assistantEnabled })} />
        </div>
        {settings.assistantEnabled && <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-xs leading-6 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-foreground font-medium"><Sparkles className="w-3.5 h-3.5 text-amber-600" />{isEn ? "Assistant model preparation" : "آماده‌سازی مدل دستیار"}</div>
          <p className="mt-1">{isEn
            ? `The selected local assistant needs an optional download of about ${OFFLINE_ASSISTANT_MODELS[settings.assistantModel].estimatedMB} MB and works best with ${OFFLINE_ASSISTANT_MODELS[settings.assistantModel].minMemoryGB} GB+ RAM. The first ARSHNAZ release keeps task parsing deterministic; the conversational local model is introduced only after device benchmarking.`
            : `مدل دستیار انتخاب‌شده حدود ${OFFLINE_ASSISTANT_MODELS[settings.assistantModel].estimatedMB} مگابایت دانلود اختیاری دارد و با RAM حداقل ${OFFLINE_ASSISTANT_MODELS[settings.assistantModel].minMemoryGB} گیگابایت بهتر کار می‌کند. در نسخهٔ فعلی، تبدیل متن به تسک به‌صورت قطعی و قابل‌اعتماد انجام می‌شود؛ مدل گفت‌وگویی پس از سنجش واقعی روی گوشی فعال می‌شود.`}</p>
        </div>}
      </div>

      <p className="text-[11px] text-muted-foreground">{memory === null
        ? (isEn ? "Device memory was not reported by this browser." : "مرورگر میزان RAM دستگاه را گزارش نکرد.")
        : (isEn ? `Reported device memory: ${memory} GB.` : `RAM گزارش‌شدهٔ دستگاه: ${memory} گیگابایت.`)}</p>
    </div>
  );
}
