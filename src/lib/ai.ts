import { firebaseStore } from "@/lib/firebaseStore";
import { getOpConfig, type AIOperation } from "@/lib/aiSettings";
import { offlineAssistant } from "@/lib/offlineAssistant";

export type AIMode = AIOperation;

function getAISettings(mode: AIMode) {
  const cfg = getOpConfig(mode);
  if (!cfg.provider) return null;
  if (cfg.provider !== "offline" && !cfg.apiKey) return null;
  return cfg;
}

import { getStoredUser } from "./authService";

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
  opts?: { webSearch?: boolean },
) {
  const lang = langOverride ?? getAILanguage();
  const settings = getAISettings(mode);

  if (settings?.provider === "offline") {
    const local = offlineAssistant(mode, input, lang, action, context);
    if (local) return local;
    throw new Error("این عملیات در موتور آفلاین فعلی پشتیبانی نمی‌شود؛ برای آن یک سرویس آنلاین انتخاب کن.");
  }

  // An enabled offline assistant never uploads the current request. It is used
  // automatically while offline and as a private fallback when no API key exists.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = offlineAssistant(mode, input, lang, action, context);
    if (local) return local;
  }
  if (!settings) {
    const local = offlineAssistant(mode, input, lang, action, context);
    if (local) return local;
    throw new Error("برای استفاده از این قابلیت، یک سرویس آنلاین و کلید API شخصی را در تنظیمات → AI وارد کن؛ یا برای عملیات پشتیبانی‌شده، هوش مصنوعی آفلاین را انتخاب کن.");
  }
  const language = lang === "auto" ? undefined : lang;

  // Fetch mental-health profile + about-me for personalization (best-effort)
  let mhProfile: any = null;
  let aboutMe: any = null;
  try {
    const local = getStoredUser();
    let uid = local?.id;
    if (!uid) {
      const { data: { user } } = await firebaseStore.auth.getUser();
      uid = user?.id;
    }
    if (uid) {
      const [{ data: mh }, { data: am }] = await Promise.all([
        firebaseStore.from("mh_profile").select("*").eq("user_id", uid).maybeSingle(),
        firebaseStore.from("about_me" as any).select("answers, free_text, ai_analysis").eq("user_id", uid).maybeSingle(),
      ]);
      if (mh) mhProfile = mh;
      if (am) aboutMe = am;
    }
  } catch { /* ignore */ }

  let timezone = "UTC";
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch {}

  // 1. Direct Google Gemini REST API support
  const { getGeminiApiKey, callDirectGemini, GEMINI_SYSTEM_PROMPTS } = await import("./geminiDirect");
  const geminiKey = (settings?.provider === "gemini" && settings.apiKey) ? settings.apiKey : getGeminiApiKey();
  if (geminiKey) {
    try {
      const systemPrompt = GEMINI_SYSTEM_PROMPTS[mode] || GEMINI_SYSTEM_PROMPTS.chat;
      let promptText = typeof input === "string" ? input : JSON.stringify(input);
      if (context) promptText = `زمینه (Context):\n${context}\n\nورودی:\n${promptText}`;
      if (action) promptText = `دستور (Action): ${action}\n\n${promptText}`;
      const res = await callDirectGemini({
        prompt: promptText,
        systemPrompt,
        model: settings?.model || "gemini-2.5-flash",
        apiKey: geminiKey,
      });
      return res;
    } catch (directErr: any) {
      console.warn("[AI] Direct Gemini call error, attempting firebaseStore edge fallback:", directErr?.message || directErr);
    }
  }

  // 2. firebaseStore Edge Function fallback
  const { data, error } = await firebaseStore.functions.invoke("ai-assistant", {
    body: { mode, input, context, settings, action, language, mhProfile, aboutMe, webSearch: opts?.webSearch === true, timezone },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
