// Persian digits helper — language-aware.
// In English mode, returns Latin digits unchanged so numbers in EN UI stay readable.
import i18n from "@/i18n";

const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function isFaActive(): boolean {
  const lang = (i18n.language || "fa").split("-")[0];
  return lang === "fa";
}

export function toPersianDigits(input: string | number | null | undefined): string {
  if (input == null) return "";
  if (!isFaActive()) return String(input);
  return String(input).replace(/[0-9]/g, (d) => FA[parseInt(d, 10)]);
}

export function fa(n: number | string | null | undefined): string {
  return toPersianDigits(n);
}

// Force Persian digits regardless of language (useful for FA-only labels).
export function toPersianDigitsForce(input: string | number | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/[0-9]/g, (d) => FA[parseInt(d, 10)]);
}
