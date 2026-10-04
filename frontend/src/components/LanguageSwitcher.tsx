import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Languages } from "lucide-react";
import { changeLanguage, type AppLanguage } from "@/i18n";
import { englishUsesJalali, setEnglishUsesJalali } from "@/lib/localeFormat";

const OPTIONS: Array<{ id: AppLanguage; label: string; hint: string }> = [
  { id: "fa", label: "فارسی", hint: "راست‌به‌چپ · تاریخ شمسی" },
  { id: "en", label: "English", hint: "Left-to-right · Gregorian" },
];

/** Compact segmented language switch (used on the sign-in page and in Settings). */
export function LanguageToggle({ className = "", tone = "default" }: { className?: string; tone?: "default" | "auth" }) {
  const { i18n } = useTranslation();
  const current: AppLanguage = (i18n.language || "fa").startsWith("en") ? "en" : "fa";
  return (
    <div role="radiogroup" aria-label="Language / زبان" className={`inline-flex items-center rounded-full p-0.5 text-xs ${tone === "auth" ? "border border-[hsl(var(--auth-rule))] bg-[hsl(var(--auth-bg))]" : "bg-muted"} ${className}`} data-testid="language-toggle">
      {OPTIONS.map((o) => {
        const active = o.id === current;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={active} lang={o.id} dir={o.id === "fa" ? "rtl" : "ltr"}
            onClick={() => !active && changeLanguage(o.id)}
            className={`h-7 rounded-full px-3 transition-colors ${active
              ? tone === "auth" ? "bg-[hsl(var(--auth-ink))] text-[hsl(var(--auth-bg))]" : "bg-background text-foreground shadow-sm"
              : tone === "auth" ? "text-[hsl(var(--auth-muted))] hover:text-[hsl(var(--auth-ink))]" : "text-muted-foreground hover:text-foreground"}`}
            data-testid={`language-option-${o.id}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Language card for Settings: language + optional Jalali dates in English. */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [jalali, setJalali] = useState(englishUsesJalali());
  useEffect(() => {
    const sync = () => setJalali(englishUsesJalali());
    window.addEventListener("arshnaz:date-format-changed", sync);
    return () => window.removeEventListener("arshnaz:date-format-changed", sync);
  }, []);

  return (
    <Card data-testid="settings-language-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="h-5 w-5" />
          {T("زبان", "Language")}
        </CardTitle>
        <CardDescription>{T("زبان، جهت صفحه و نمایش تاریخ و عدد. برای حسابت ذخیره می‌شود.", "Language, page direction, dates and numbers. Saved to your account.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={T("زبان", "Language")}>
          {OPTIONS.map((o) => {
            const active = (o.id === "en") === isEn;
            return (
              <button key={o.id} type="button" role="radio" aria-checked={active} lang={o.id} dir={o.id === "fa" ? "rtl" : "ltr"}
                onClick={() => !active && changeLanguage(o.id)}
                className={`rounded-lg border px-3 py-2.5 text-start transition-colors ${active ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/60"}`}
                data-testid={`settings-language-${o.id}`}>
                <span className="block text-sm font-medium text-foreground">{o.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
              </button>
            );
          })}
        </div>
        {isEn && (
          <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
            <span>
              <span className="block text-sm text-foreground">Show Persian (Jalali) dates</span>
              <span className="block text-xs text-muted-foreground">Keeps English text, uses the Solar Hijri calendar for dates.</span>
            </span>
            <Switch checked={jalali} onCheckedChange={(v) => { setEnglishUsesJalali(!!v); setJalali(!!v); }} data-testid="settings-en-jalali" />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
