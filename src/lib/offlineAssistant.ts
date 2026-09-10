import { parseNaturalDate } from "./nlDate";
import type { AIOperation } from "./aiSettings";
import { loadOfflineModelSettings } from "./offlineModels";

type OfflineResult = { text: string; data?: Record<string, unknown>; offline: true };
const highPriority = /\b(urgent|asap|important|critical|فوری|مهم|ضروری|اورژانسی)\b/i;

function textOf(input: unknown) {
  if (typeof input === "string") return input.trim();
  if (input && typeof input === "object") {
    const value = input as Record<string, unknown>;
    return String(value.text || value.title || value.content || value.message || JSON.stringify(input)).trim();
  }
  return String(input || "").trim();
}

/** A private, deterministic fallback for the task workflows when the user enables Offline Assistant. */
export function offlineAssistant(mode: AIOperation, input: unknown, language: "fa" | "en" | "auto" = "fa"): OfflineResult | null {
  if (!loadOfflineModelSettings().assistantEnabled) return null;
  const raw = textOf(input);
  const parsed = parseNaturalDate(raw);
  const priority = highPriority.test(raw) ? "high" : "none";
  const fa = language !== "en";
  if (mode === "parse_task" || mode === "task_metadata_suggest") {
    const data = { title: parsed.cleanedTitle || raw, due_date: parsed.dueDate || null, priority, source: "offline-deterministic" };
    return { offline: true, data, text: JSON.stringify(data) };
  }
  if (mode === "task_subtasks") {
    const title = parsed.cleanedTitle || raw;
    const steps = fa
      ? [`هدف «${title}» را روشن کن`, "اولین اقدام کوچک را انجام بده", "نتیجه را بررسی و ثبت کن"]
      : [`Clarify the goal: ${title}`, "Complete the smallest next action", "Review and record the outcome"];
    return { offline: true, data: { subtasks: steps, source: "offline-deterministic" }, text: steps.map((step, index) => `${index + 1}. ${step}`).join("\n") };
  }
  if (mode === "summarize_note") {
    const sentences = raw.split(/(?<=[.!؟?])\s+/).filter(Boolean).slice(0, 3);
    return { offline: true, data: { source: "offline-deterministic" }, text: sentences.join(" ") || raw };
  }
  if (mode === "chat") {
    return { offline: true, data: { source: "offline-deterministic" }, text: fa
      ? "دستیار آفلاین فعال است. می‌توانم متن را به تسک تبدیل کنم، تاریخ و اولویت را استخراج کنم، یا برای یک کار زیرتسک پیشنهاد بدهم."
      : "Offline Assistant is active. I can turn text into a task, extract a date and priority, or suggest subtasks." };
  }
  return null;
}
