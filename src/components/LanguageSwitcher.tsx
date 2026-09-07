import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { changeLanguage, type AppLanguage } from "@/i18n";

/**
 * Language switcher card — drop into Settings.
 * Switches between Persian (RTL) and English (LTR).
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.split("-")[0] || "fa") as AppLanguage;

  const set = (lng: AppLanguage) => {
    if (lng === current) return;
    changeLanguage(lng);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          {t("settings.language")}
        </CardTitle>
        <CardDescription>{t("settings.languageDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={current === "fa" ? "default" : "outline"}
            onClick={() => set("fa")}
            size="sm"
          >
            🇮🇷 {t("settings.persian")}
          </Button>
          <Button
            variant={current === "en" ? "default" : "outline"}
            onClick={() => set("en")}
            size="sm"
          >
            🇬🇧 {t("settings.english")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
