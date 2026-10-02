import { showMascotMoment } from "./mascot";
import { getOpConfig, type AIOperation } from "@/lib/aiSettings";
import { offlineAssistant } from "@/lib/offlineAssistant";
import { DISTORTION_LABELS, type Distortion } from "@/lib/distortions";
import { GEMINI_SYSTEM_PROMPTS } from "@/lib/geminiDirect";
import { buildPersonalizationContext } from "@/lib/aiPersonalization";
import { AIProviderError, aiErrorMessage, classifyAIError, fallbackModelFor, getProviderKey } from "@/lib/aiProviders";

export type AIMode = AIOperation;

function getAISettings(mode: AIMode) {
  const cfg = getOpConfig(mode);
  if (!cfg.provider) return null;
  if (cfg.provider === "offline") return cfg;
  const apiKey = cfg.apiKey || getProviderKey(cfg.provider);
  return apiKey ? { ...cfg, apiKey } : null;
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
  showMascotMoment("thinking");

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
  const personalization = await buildPersonalizationContext({
    lang: language === "en" ? "en" : "fa",
  });
  const personalizationContext = personalization.contextText;

  let systemPrompt = opts?.systemPromptOverride || GEMINI_SYSTEM_PROMPTS[mode] || GEMINI_SYSTEM_PROMPTS.chat;
  if (personalizationContext) {
    systemPrompt += `\n${personalizationContext}`;
  }

  let promptText = typeof input === "string" ? input : JSON.stringify(input);
  if (context) promptText = `زمینه (Context):\n${context}\n\nورودی:\n${promptText}`;
  if (action) promptText = `دستور (Action): ${action}\n\n${promptText}`;

  const invoke = async (model: string) => {
    if (settings.provider === "gemini") {
      const { getGeminiApiKey, callDirectGemini } = await import("./geminiDirect");
      const geminiKey = settings.apiKey || getGeminiApiKey();
      if (!geminiKey) throw new AIProviderError(aiErrorMessage("invalid_key", lang === "en" ? "en" : "fa", { provider: "Gemini" }), "invalid_key");
      return callDirectGemini({ prompt: promptText, systemPrompt, model, apiKey: geminiKey, signal: opts?.signal });
    }
    const { callDirectOpenAICompat } = await import("./openAICompatDirect");
    return callDirectOpenAICompat({
      provider: settings.provider as "openai" | "groq" | "openrouter" | "custom" | "anthropic",
      prompt: promptText, systemPrompt, model, apiKey: settings.apiKey, baseUrl: settings.baseUrl, signal: opts?.signal,
    });
  };
  const supported = ["gemini", "openai", "groq", "openrouter", "custom", "anthropic"];
  if (supported.includes(settings.provider)) {
    const primary = settings.model || (settings.provider === "gemini" ? "gemini-3-flash-preview" : "");
    const errLang = lang === "en" ? "en" : "fa";
    const fail = (e: unknown, model: string, fallback: string | null): never => {
      if (e instanceof AIProviderError) throw e;
      if ((e as { name?: string })?.name === "AbortError") throw e;
      const kind = classifyAIError(e);
      if (kind === "unknown") throw e;
      throw new AIProviderError(aiErrorMessage(kind, errLang, { provider: settings.provider, model, fallback, raw: e instanceof Error ? e.message : "" }), kind, fallback);
    };
    try {
      return sanitizeAIResult(mode, await invoke(primary));
    } catch (e) {
      const fallback = primary ? fallbackModelFor(primary) : null;
      if (classifyAIError(e) === "model_unavailable" && fallback) {
        try { return sanitizeAIResult(mode, await invoke(fallback)); } catch (e2) { return fail(e2, fallback, fallbackModelFor(fallback)); }
      }
      return fail(e, primary, fallback);
    }
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

  if (mode === "about_me_analysis") {
    const raw = result?.data || {};
    const rawAnalysis = raw.ai_analysis || raw.analysis || raw;
    const rawSuggestions = raw.ai_suggestions || raw.suggestions || raw;

    const toStringArray = (arr: any, max = 10): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x) => String(x || "").trim())
        .filter((x) => x.length > 0)
        .slice(0, max);
    };

    const validPriorities = new Set(["none", "low", "medium", "high"]);
    const rawTasks = Array.isArray(rawSuggestions.tasks) ? rawSuggestions.tasks : [];
    const sanitizedTasks = rawTasks
      .filter((t: any) => t && (typeof t === "string" || (typeof t === "object" && t.title)))
      .map((t: any) => {
        if (typeof t === "string") return { title: t.trim(), priority: "medium" as const };
        const priority = validPriorities.has(t.priority) ? (t.priority as "none" | "low" | "medium" | "high") : "medium";
        return {
          title: String(t.title || "").trim(),
          folder: t.folder ? String(t.folder).trim() : undefined,
          priority,
        };
      })
      .filter((t: any) => t.title.length > 0)
      .slice(0, 10);

    const sanitizedData = {
      ai_analysis: {
        summary: String(rawAnalysis.summary || result.text || "").trim(),
        themes: toStringArray(rawAnalysis.themes),
        strengths: toStringArray(rawAnalysis.strengths),
        risks: toStringArray(rawAnalysis.risks),
      },
      ai_suggestions: {
        folders: toStringArray(rawSuggestions.folders),
        tags: toStringArray(rawSuggestions.tags, 15),
        tasks: sanitizedTasks,
      },
    };

    result.data = sanitizedData;
  }

  return result;
}
