import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { applyTheme, getStoredTheme, getBaseTheme } from "@/lib/theme";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { saveSettings } from "@/lib/reminders";

// Quick day/night switch: paper light ↔ paper dark (keeps OLED when already chosen).
export default function ThemeToggle() {
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(false);

  const computeIsDark = () => {
    const base = getBaseTheme(getStoredTheme() || "paper-light");
    if (base === "system") return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return base === "dark";
  };

  useEffect(() => {
    setIsDark(computeIsDark());
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const goingDark = !computeIsDark();
    const next = goingDark ? (getStoredTheme() === "oled" ? "oled" : "paper-dark") : "paper-light";
    applyTheme(next);
    setTheme(getBaseTheme(next));
    // Persist to cloud settings so entering Settings can't undo this choice
    // (best effort — offline is fine, saveSettings queues it).
    if (user) void saveSettings(user.id, { theme: next }).catch(() => {});
    setIsDark(goingDark);
  };

  const label = isDark ? t("ui.themePaperLight") : t("ui.themePaperDark");
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-10 w-10 shrink-0 text-muted-foreground"
      title={label}
      aria-label={label}
      data-testid="header-theme-toggle"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}
