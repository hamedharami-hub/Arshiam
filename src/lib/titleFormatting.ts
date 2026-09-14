/**
 * Title formatting utilities for Tasks and Notes.
 * Supports bold, named colors, hex codes, highlight, and strip helper.
 */

export interface ColorOption {
  id: string;
  name: string;
  nameEn: string;
  class: string;
  bgHex: string;
}

export const TITLE_COLORS: ColorOption[] = [
  { id: "red", name: "قرمز", nameEn: "Red", class: "text-rose-600 dark:text-rose-400 font-bold", bgHex: "#f43f5e" },
  { id: "blue", name: "آبی", nameEn: "Blue", class: "text-sky-600 dark:text-sky-400 font-bold", bgHex: "#0284c7" },
  { id: "green", name: "سبز", nameEn: "Green", class: "text-emerald-600 dark:text-emerald-400 font-bold", bgHex: "#10b981" },
  { id: "amber", name: "کهربایی / زرد", nameEn: "Amber / Yellow", class: "text-amber-500 dark:text-amber-400 font-bold", bgHex: "#f59e0b" },
  { id: "purple", name: "بنفش", nameEn: "Purple", class: "text-purple-600 dark:text-purple-400 font-bold", bgHex: "#9333ea" },
  { id: "orange", name: "نارنجی", nameEn: "Orange", class: "text-orange-500 dark:text-orange-400 font-bold", bgHex: "#f97316" },
  { id: "pink", name: "صورتی", nameEn: "Pink", class: "text-pink-600 dark:text-pink-400 font-bold", bgHex: "#ec4899" },
  { id: "cyan", name: "فیروزه‌ای", nameEn: "Cyan", class: "text-cyan-600 dark:text-cyan-400 font-bold", bgHex: "#06b6d4" },
];

export const COLOR_CLASSES_MAP: Record<string, string> = {
  red: "text-rose-600 dark:text-rose-400 font-bold",
  rose: "text-rose-600 dark:text-rose-400 font-bold",
  blue: "text-sky-600 dark:text-sky-400 font-bold",
  sky: "text-sky-600 dark:text-sky-400 font-bold",
  green: "text-emerald-600 dark:text-emerald-400 font-bold",
  emerald: "text-emerald-600 dark:text-emerald-400 font-bold",
  yellow: "text-amber-500 dark:text-amber-400 font-bold",
  amber: "text-amber-500 dark:text-amber-400 font-bold",
  gold: "text-amber-500 dark:text-amber-400 font-bold",
  purple: "text-purple-600 dark:text-purple-400 font-bold",
  violet: "text-purple-600 dark:text-purple-400 font-bold",
  orange: "text-orange-500 dark:text-orange-400 font-bold",
  pink: "text-pink-600 dark:text-pink-400 font-bold",
  cyan: "text-cyan-600 dark:text-cyan-400 font-bold",
  teal: "text-teal-600 dark:text-teal-400 font-bold",
  gray: "text-muted-foreground font-bold",
  muted: "text-muted-foreground font-bold",
};

/**
 * Strips all inline formatting tags (bold, colors, highlights, strikethrough, code)
 * to return clean plaintext for search, screen readers, and notifications.
 */
export function stripTitleFormatting(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/\[(?:color:)?([a-zA-Z0-9#_-]+)\]\{([^}\n]+?)\}/g, "$2")
    .replace(/\*\*\*([^*\n]+?)\*\*\*/g, "$1")
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/__([^_\n]+?)__/g, "$1")
    .replace(/==([^=\n]+?)==/g, "$1")
    .replace(/~~([^~\n]+?)~~/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g, "$1")
    .trim();
}

/**
 * Returns true if text contains any inline formatting.
 */
export function hasTitleFormatting(text?: string | null): boolean {
  if (!text) return false;
  return /(\*\*|__|==|~~|`|\[(?:color:)?[a-zA-Z0-9#_-]+\]\{)/.test(text);
}

export type FormatType = "bold" | "color" | "highlight";

/**
 * Applies a format to the currently selected text inside an input or textarea element.
 * If no text is selected, inserts a formatted placeholder and sets the selection range over it.
 */
export function applyFormatting(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  format: FormatType,
  colorId = "red"
): { newText: string; newCursorStart: number; newCursorEnd: number } | null {
  if (!input) return null;

  const original = input.value || "";
  const start = input.selectionStart ?? original.length;
  const end = input.selectionEnd ?? original.length;
  const hasSelection = start < end;
  const selectedText = hasSelection ? original.slice(start, end) : "";

  let prefix = "";
  let suffix = "";
  let placeholder = "کلمه";

  if (format === "bold") {
    prefix = "**";
    suffix = "**";
  } else if (format === "highlight") {
    prefix = "==";
    suffix = "==";
  } else if (format === "color") {
    prefix = `[${colorId}]{`;
    suffix = "}";
  }

  // Toggle bold if already fully wrapped
  if (format === "bold" && hasSelection && selectedText.startsWith("**") && selectedText.endsWith("**") && selectedText.length >= 4) {
    const unwrapped = selectedText.slice(2, -2);
    const newText = original.slice(0, start) + unwrapped + original.slice(end);
    return {
      newText,
      newCursorStart: start,
      newCursorEnd: start + unwrapped.length,
    };
  }

  const innerText = hasSelection ? selectedText : placeholder;
  const formattedSegment = `${prefix}${innerText}${suffix}`;
  const newText = original.slice(0, start) + formattedSegment + original.slice(end);

  const newCursorStart = start + prefix.length;
  const newCursorEnd = newCursorStart + innerText.length;

  return {
    newText,
    newCursorStart,
    newCursorEnd,
  };
}
