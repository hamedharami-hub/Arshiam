import { supabase } from "@/integrations/supabase/client";
import { getOpConfig, type AIOperation } from "@/lib/aiSettings";

export type AIMode = AIOperation;

function getAISettings(mode: AIMode) {
  const cfg = getOpConfig(mode);
  if (!cfg.provider || cfg.provider === "lovable") return null;
  if (!cfg.apiKey) return null;
  return cfg;
}

import { getStoredUser } from "./authService";

// Check whether the current user is allowed to use the built-in Lovable AI (admin only).
async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const local = getStoredUser();
    let uid = local?.id;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return false;
    const { data } = await (supabase as any)
      .from("user_roles").select("role")
      .eq("user_id", uid).eq("role", "admin").maybeSingle();
    return !!data;
  } catch { return false; }
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
  opts?: { webSearch?: boolean },
) {
  const settings = getAISettings(mode);
  // Enforce per-user API key: if no personal key configured (i.e. provider=lovable),
  // only allow if the current user is admin (the app owner).
  if (!settings) {
    const admin = await isCurrentUserAdmin();
    if (!admin) {
      throw new Error(
        "برای استفاده از قابلیت‌های هوش مصنوعی، باید کلید API شخصی خود را از تنظیمات → AI وارد کنی. این برنامه از کلید مالک استفاده نمی‌کند."
      );
    }
  }
  const lang = langOverride ?? getAILanguage();
  const language = lang === "auto" ? undefined : lang;

  // Fetch mental-health profile + about-me for personalization (best-effort)
  let mhProfile: any = null;
  let aboutMe: any = null;
  try {
    const local = getStoredUser();
    let uid = local?.id;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (uid) {
      const [{ data: mh }, { data: am }] = await Promise.all([
        supabase.from("mh_profile").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("about_me" as any).select("answers, free_text, ai_analysis").eq("user_id", uid).maybeSingle(),
      ]);
      if (mh) mhProfile = mh;
      if (am) aboutMe = am;
    }
  } catch { /* ignore */ }

  let timezone = "UTC";
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch {}

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, input, context, settings, action, language, mhProfile, aboutMe, webSearch: opts?.webSearch === true, timezone },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
