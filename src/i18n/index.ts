import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fa from "./locales/fa";
import en from "./locales/en";

export const SUPPORTED_LANGUAGES = ["fa", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "arshnaz_app_language";

const RTL_LANGUAGES: AppLanguage[] = ["fa"];

export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as AppLanguage);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fa: { translation: fa },
      en: { translation: en },
    },
    fallbackLng: "fa",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Apply dir/lang to <html> on language change
function applyDocumentDirection(lang: string) {
  const dir = isRTL(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

applyDocumentDirection(i18n.language || "fa");
i18n.on("languageChanged", applyDocumentDirection);

export function changeLanguage(lang: AppLanguage) {
  i18n.changeLanguage(lang);
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch {}
}

export default i18n;
