import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import i18n from "@/i18n";

export interface BilingualHookResult {
  isEn: boolean;
  lang: "en" | "fa";
  T: (fa: string, en: string) => string;
  t: (key: string, options?: any) => string;
  i18n: typeof i18n;
}

/**
 * Hook to provide easy bilingual text (Persian & English) in React components.
 * Usage:
 *   const { T, isEn } = useBilingual();
 *   return <h1>{T("عنوان", "Title")}</h1>;
 */
export function useBilingual(): BilingualHookResult {
  const { t, i18n: i18nInstance } = useTranslation();
  const currentLang = i18nInstance.language || "fa";
  const isEn = Boolean(currentLang.startsWith("en"));
  const lang: "en" | "fa" = isEn ? "en" : "fa";

  const T = useCallback(
    (fa: string, en: string): string => (isEn ? en : fa),
    [isEn]
  );

  return { isEn, lang, T, t, i18n: i18nInstance };
}

/**
 * Non-hook helper for functions, stores, or outside React components.
 */
export function getBilingualText(fa: string, en: string): string {
  const currentLang = i18n.language || "fa";
  const isEn = Boolean(currentLang.startsWith("en"));
  return isEn ? en : fa;
}
