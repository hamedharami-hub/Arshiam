import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/lib/voiceInput";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

type VoiceLang = "fa-IR" | "en-US";
const LS_KEY = "voice_input_lang";

function loadVoiceLang(fallback: VoiceLang): VoiceLang {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "fa-IR" || v === "en-US") return v;
  } catch { /* ignore */ }
  return fallback;
}

type VoiceInputButtonProps = {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  continuous?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  size?: "icon" | "sm" | "default";
  /** hide the FA/EN language switch chip */
  hideLangToggle?: boolean;
  /** show listening badge next to button */
  showStatusBadge?: boolean;
};

export function VoiceInputButton({
  onTranscript,
  onInterim,
  continuous = false,
  disabled = false,
  className = "",
  title,
  size = "icon",
  hideLangToggle = false,
  showStatusBadge = false,
}: VoiceInputButtonProps) {
  const { i18n, t } = useTranslation();
  const [listening, setListening] = useState(false);
  const voiceRef = useRef<VoiceInput | null>(null);
  const callbacksRef = useRef({ onTranscript, onInterim });

  // Default to Persian; the app is primarily Persian and browsers default to en-US otherwise.
  const [lang, setLang] = useState<VoiceLang>(() =>
    loadVoiceLang((i18n.language || "fa").startsWith("en") ? "en-US" : "fa-IR"),
  );

  useEffect(() => {
    callbacksRef.current = { onTranscript, onInterim };
  }, [onTranscript, onInterim]);

  useEffect(() => {
    const voice = new VoiceInput({
      onTranscript: (text) => {
        haptic("success");
        callbacksRef.current.onTranscript(text);
      },
      onInterim: (text) => callbacksRef.current.onInterim?.(text),
      onError: (error) => {
        console.warn("Voice input error:", error);
        const messages: Record<string, string> = {
          "Microphone permission denied": t("اجازهٔ میکروفون داده نشده است", "Microphone permission was denied"),
          "No speech detected": t("صدایی تشخیص داده نشد؛ دوباره تلاش کنید", "No speech was detected; please try again"),
          "Speech service needs internet or an installed offline language pack": t("برای تشخیص آفلاین، بستهٔ زبان فارسی یا انگلیسی را در تنظیمات گفتار گوشی نصب کنید", "Install the English/Persian offline speech pack or connect to the internet"),
          "Speech recognition service unavailable": t("سرویس تشخیص گفتار روی این گوشی در دسترس نیست", "Speech recognition is unavailable on this device"),
          "Speech recognition is busy; please try again": t("میکروفون مشغول است؛ چند لحظهٔ دیگر تلاش کنید", "Speech recognition is busy; please try again"),
        };
        toast.error(messages[error] || t("دریافت صوت ناموفق بود؛ دوباره تلاش کنید", "Voice input failed; please try again"));
      },
      onListeningChange: (isListening) => {
        setListening(isListening);
        haptic(isListening ? "medium" : "light");
      },
      continuous,
    });
    voiceRef.current = voice;
    return () => {
      voice.stop();
    };
  }, [continuous, t]);

  const handleClick = () => {
    haptic("light");
    voiceRef.current?.toggle(lang);
  };

  const switchLang = () => {
    haptic("selection");
    const next: VoiceLang = lang === "fa-IR" ? "en-US" : "fa-IR";
    setLang(next);
    try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
    // restart with the new language if currently recording
    if (listening) {
      voiceRef.current?.stop();
      setTimeout(() => voiceRef.current?.start(next), 250);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        size={size}
        variant={listening ? "default" : "ghost"}
        disabled={disabled}
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()}
        title={title || (listening ? t("توقف ضبط (حرف من)", "Stop recording") : t("ضبط صوتی (حرف من)", "Voice input"))}
        className={`relative transition-all duration-200 ${
          listening
            ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400 ring-offset-1 animate-pulse"
            : ""
        } ${className}`}
      >
        {listening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
      </Button>

      {listening && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 animate-pulse px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span>{t("گوش دادن...", "Listening...")}</span>
        </span>
      )}

      {!hideLangToggle && (
        <button
          type="button"
          onClick={switchLang}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          title={lang === "fa-IR" ? "زبان تشخیص: فارسی (برای تغییر بزنید)" : "Recognition language: English (tap to switch)"}
          className="h-5 px-1.5 rounded-full border text-[10px] font-medium leading-none text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {lang === "fa-IR" ? "FA" : "EN"}
        </button>
      )}
    </span>
  );
}
