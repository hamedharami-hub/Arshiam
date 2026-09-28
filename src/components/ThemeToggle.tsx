import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyTheme, getStoredTheme, getBaseTheme } from "@/lib/theme";
import { useTheme } from "next-themes";

/**
 * Quick day/night switch for the app header.
 * Keeps the active theme *family* (Arshnaz / TickTick / plain) and only flips
 * between its light and dark variant, persisting to localStorage via applyTheme.
 */
export default function ThemeToggle() {
  const { setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  const computeIsDark = () => {
    const stored = getStoredTheme() || "arshnaz-light";
    const base = getBaseTheme(stored);
    if (base === "system") {
      return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return base === "dark";
  };

  useEffect(() => {
    setIsDark(computeIsDark());
  }, []);

  const toggle = () => {
    const stored = getStoredTheme() || "arshnaz-light";
    const isArshnaz = stored.startsWith("arshnaz");
    const goingDark = !computeIsDark();
    let next: string;
    if (isArshnaz) {
      next = goingDark ? "arshnaz-dark" : "arshnaz-light";
    } else {
      next = goingDark ? "dark" : "light";
    }
    applyTheme(next);
    setTheme(getBaseTheme(next));
    setIsDark(goingDark);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-8 w-8 shrink-0"
      title={isDark ? "حالت روشن" : "حالت تیره"}
      data-testid="header-theme-toggle"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
    </Button>
  );
}
