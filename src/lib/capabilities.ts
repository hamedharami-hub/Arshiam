export type FeatureKey =
  | "sharing"
  | "admin_panel"
  | "about_me_ai"
  | "backend_holiday_sync";

export interface FeatureCapability {
  key: FeatureKey;
  enabled: boolean;
  name: string;
  name_en: string;
  reason: string;
  reason_en: string;
}

export const CAPABILITIES: Record<FeatureKey, FeatureCapability> = {
  sharing: {
    key: "sharing",
    enabled: false,
    name: "اشتراک‌گذاری بین‌کاربری",
    name_en: "Cross-User Sharing",
    reason: "قابلیت اشتراک‌گذاری تا استقرار معماری امن و رمزنگاری‌شده سمت سرور در فایربیس موقتاً غیرفعال است.",
    reason_en: "Cross-user resource sharing is disabled until secure server-side authorization and indexing are implemented in Firebase.",
  },
  admin_panel: {
    key: "admin_panel",
    enabled: false,
    name: "پنل مدیریت",
    name_en: "Admin Panel",
    reason: "پنل مدیریت نیازمند دسترسی سروری و Firebase Auth Custom Claims تأییدشده است و به صورت کلاینت‌محور فعال نمی‌باشد.",
    reason_en: "Admin panel is restricted and requires verified Firebase Auth custom claims and server authorization.",
  },
  about_me_ai: {
    key: "about_me_ai",
    enabled: false,
    name: "تحلیل هوش مصنوعی درباره من",
    name_en: "About Me AI Analysis",
    reason: "تحلیل هوش مصنوعی این بخش در حال بازسازی با مدل BYOK کلاینت است و در این نسخه غیرفعال می‌باشد.",
    reason_en: "AI analysis for this section is temporarily disabled while being rebuilt with client-side BYOK.",
  },
  backend_holiday_sync: {
    key: "backend_holiday_sync",
    enabled: false,
    name: "همگام‌سازی ابری تعطیلات",
    name_en: "Backend Holiday Sync",
    reason: "سرویس ابری پیشین متوقف شده است و تعطیلات از حافظه و داده‌های محلی تأمین می‌شوند.",
    reason_en: "Legacy edge function invocation has been retired; local and offline data is used.",
  },
};

/**
 * Check whether a feature capability is currently enabled.
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return CAPABILITIES[key]?.enabled ?? false;
}

/**
 * Get detailed capability status and explanation for a feature.
 */
export function getFeatureCapability(key: FeatureKey): FeatureCapability {
  return CAPABILITIES[key];
}
