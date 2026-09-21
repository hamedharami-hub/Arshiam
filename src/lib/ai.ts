import { firebaseStore } from "@/lib/firebaseStore";
import { getOpConfig, isAIPersonalizationOptedIn, type AIOperation } from "@/lib/aiSettings";
import { offlineAssistant } from "@/lib/offlineAssistant";
import { getStoredUser } from "@/lib/authService";
import { DISTORTION_LABELS, type Distortion } from "@/lib/distortions";
import { GEMINI_SYSTEM_PROMPTS } from "@/lib/geminiDirect";

export type AIMode = AIOperation;

function getAISettings(mode: AIMode) {
  const cfg = getOpConfig(mode);
  if (!cfg.provider) return null;
  if (cfg.provider !== "offline" && !cfg.apiKey) return null;
  return cfg;
}

export type AILanguage = "fa" | "en" | "auto";

const LANG_KEY = "ai_language_v1";
export function getAILanguage(): AILanguage {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "fa" || v === "en" || v === "auto") return v;
  } catch {}
  return "fa";
}
export function setAILanguage(lang: AILanguage) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}

export async function callAI(
  mode: AIMode,
  input: any,
  context?: string,
  action?: string,
  langOverride?: AILanguage,
  opts?: { webSearch?: boolean; systemPromptOverride?: string; signal?: AbortSignal },
) {
  const lang = langOverride ?? getAILanguage();
  const settings = getAISettings(mode);

  if (settings?.provider === "offline") {
    const local = offlineAssistant(mode, input, lang, action, context);
    if (local) return sanitizeAIResult(mode, { ...local, provider: "offline", model: "deterministic-v1" });
    throw new Error("این عملیات در موتور آفلاین فعلی پشتیبانی نمی‌شود؛ برای آن یک سرویس آنلاین انتخاب کن.");
  }

  // An enabled offline assistant never uploads the current request. It is used
  // automatically while offline and as a private fallback when no API key exists.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = offlineAssistant(mode, input, lang, action, context);
    if (local) return sanitizeAIResult(mode, { ...local, provider: "offline", model: "deterministic-v1" });
  }
  if (!settings) {
    const local = offlineAssistant(mode, input, lang, action, context);
    if (local) return sanitizeAIResult(mode, { ...local, provider: "offline", model: "deterministic-v1" });
    throw new Error("برای استفاده از این قابلیت، یک سرویس آنلاین و کلید API شخصی را در تنظیمات → AI وارد کن؛ یا برای عملیات پشتیبانی‌شده، هوش مصنوعی آفلاین را انتخاب کن.");
  }
  const language = lang === "auto" ? undefined : lang;

  // Personalization: strictly opt-in to protect sensitive user profile and mental health notes
  let personalizationContext = "";
  if (isAIPersonalizationOptedIn()) {
    try {
      const local = getStoredUser();
      let uid = local?.id;
      if (!uid) {
        const { data: { user } } = await firebaseStore.auth.getUser();
        uid = user?.id;
      }
      if (uid) {
        const [{ data: mh }, { data: am }] = await Promise.all([
          firebaseStore.from("mh_profile").select("summary, primary_goals, communication_style").eq("user_id", uid).maybeSingle(),
          firebaseStore.from("about_me" as any).select("answers, free_text, ai_analysis").eq("user_id", uid).maybeSingle(),
        ]);
        const parts: string[] = [];
        if (mh?.summary) parts.push(`پروفایل سلامت ذهن: ${mh.summary}`);
        if (mh?.primary_goals) parts.push(`اهداف اصلی: ${mh.primary_goals}`);
        if (am?.ai_analysis?.summary) parts.push(`خلاصه درباره من: ${am.ai_analysis.summary}`);
        else if (am?.free_text) parts.push(`یادداشت درباره من: ${am.free_text.slice(0, 300)}`);
        if (parts.length > 0) {
          personalizationContext = `\n[Personalization Profile Context / اطلاعات شخصی‌سازی شده با رضایت کاربر]:\n${parts.join("\n")}\n`;
        }
      }
    } catch { /* ignore */ }
  }

  let systemPrompt = opts?.systemPromptOverride || GEMINI_SYSTEM_PROMPTS[mode] || GEMINI_SYSTEM_PROMPTS.chat;
  if (personalizationContext) {
    systemPrompt += `\n${personalizationContext}`;
  }

  let promptText = typeof input === "string" ? input : JSON.stringify(input);
  if (context) promptText = `زمینه (Context):\n${context}\n\nورودی:\n${promptText}`;
  if (action) promptText = `دستور (Action): ${action}\n\n${promptText}`;

  // 1. Direct Google Gemini REST API support
  if (settings.provider === "gemini") {
    const { getGeminiApiKey, callDirectGemini } = await import("./geminiDirect");
    const geminiKey = settings.apiKey || getGeminiApiKey();
    if (!geminiKey) {
      throw new Error("کلید Google Gemini وارد نشده است. لطفاً در تنظیمات → AI کلید خود را وارد کنید.");
    }
    const res = await callDirectGemini({
      prompt: promptText,
      systemPrompt,
      model: settings.model || "gemini-2.5-flash",
      apiKey: geminiKey,
      signal: opts?.signal,
    });
    return sanitizeAIResult(mode, res);
  }

  // 2. OpenAI, Groq, OpenRouter, Custom, Anthropic direct support
  if (
    settings.provider === "openai" ||
    settings.provider === "groq" ||
    settings.provider === "openrouter" ||
    settings.provider === "custom" ||
    settings.provider === "anthropic"
  ) {
    const { callDirectOpenAICompat } = await import("./openAICompatDirect");
    const res = await callDirectOpenAICompat({
      provider: settings.provider,
      prompt: promptText,
      systemPrompt,
      model: settings.model,
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      signal: opts?.signal,
    });
    return sanitizeAIResult(mode, res);
  }

  throw new Error(`سرویس «${settings.provider}» پشتیبانی نمی‌شود یا پیکربندی نشده است.`);
}

function sanitizeAIResult(mode: AIMode, result: any): { text: string; data?: any; provider?: string; model?: string } {
  if (mode === "distortion_detect" && result?.data?.distortions) {
    const validKeys = new Set(Object.keys(DISTORTION_LABELS));
    const rawDistortions = Array.isArray(result.data.distortions) ? result.data.distortions : [];
    const sanitized = rawDistortions
      .filter((d: any) => d && typeof d === "object" && typeof d.key === "string")
      .map((d: any) => {
        let key = d.key.toLowerCase().trim().replace(/[\s-]+/g, "_");
        if (key === "catastrophizing") key = "magnification";
        if (key === "all-or-nothing" || key === "black_and_white") key = "all_or_nothing";
        if (key === "should_statement" || key === "must") key = "shoulds";
        return {
          key: validKeys.has(key) ? (key as Distortion) : "overgeneralization",
          explanation: String(d.explanation || ""),
        };
      });
    result.data.distortions = sanitized;
  }
  return result;
}
