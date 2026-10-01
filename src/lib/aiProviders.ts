// Per-provider BYOK key store, key testing, error classification and fallback models.
// Keys stay in localStorage on this device (accepted risk).
import type { Provider } from "./aiSettings";

export type KeyedProvider = Exclude<Provider, "offline" | "custom">;
export const KEYED_PROVIDERS: readonly KeyedProvider[] = ["gemini", "openai", "anthropic", "groq", "openrouter"];

// IDs verified against provider docs (Gemini 3 / 3.1 preview, GPT-5.4 family, Claude 4.x) on 2026-10-01.
export const CURRENT_MODELS: Record<"gemini" | "openai" | "anthropic", { id: string; fa: string; en: string }[]> = {
  gemini: [
    { id: "gemini-3-flash-preview", fa: "Gemini 3 Flash — سریع و متعادل", en: "Gemini 3 Flash — fast and balanced" },
    { id: "gemini-3.1-pro-preview", fa: "Gemini 3.1 Pro — استدلال عمیق", en: "Gemini 3.1 Pro — deep reasoning" },
  ],
  openai: [
    { id: "gpt-5.4", fa: "GPT-5.4 — دقت بالا", en: "GPT-5.4 — high accuracy" },
    { id: "gpt-5.4-mini", fa: "GPT-5.4 Mini — سبک و ارزان", en: "GPT-5.4 Mini — light and cheap" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-6", fa: "Claude Sonnet 4.6 — متعادل", en: "Claude Sonnet 4.6 — balanced" },
    { id: "claude-haiku-4-5", fa: "Claude Haiku 4.5 — سریع", en: "Claude Haiku 4.5 — fast" },
  ],
};

export const FALLBACK_MODELS: Record<string, string> = {
  "gemini-3.1-pro-preview": "gemini-3-flash-preview",
  "gemini-3-flash-preview": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-flash",
  "gpt-5.4": "gpt-5.4-mini",
  "gpt-5.4-mini": "gpt-5-mini",
  "claude-sonnet-4-6": "claude-haiku-4-5",
  "claude-haiku-4-5": "claude-sonnet-4-6",
};
export const fallbackModelFor = (model: string): string | null => FALLBACK_MODELS[model] ?? null;

export type AIErrorKind = "invalid_key" | "quota" | "model_unavailable" | "network" | "unknown";

export class AIProviderError extends Error {
  constructor(message: string, readonly kind: AIErrorKind, readonly fallbackModel: string | null = null) {
    super(message);
    this.name = "AIProviderError";
  }
}

export function classifyAIError(input: unknown, status?: number): AIErrorKind {
  const text = (input instanceof Error ? input.message : String(input ?? "")).toLowerCase();
  if (status === 401 || status === 403 || /api key not valid|invalid api key|incorrect api key|invalid x-api-key|unauthorized|authentication|permission denied|invalid_api_key/.test(text)) return "invalid_key";
  if (status === 429 || /quota|rate.?limit|resource_exhausted|insufficient_quota|too many requests|billing|credit balance/.test(text)) return "quota";
  if (status === 404 || /model.{0,40}(not found|does not exist|deprecated|decommission|unavailable|no longer|not supported)|not_found_error|is not found for api version/.test(text)) return "model_unavailable";
  if (/failed to fetch|networkerror|network request failed|load failed|timeout/.test(text)) return "network";
  return "unknown";
}

export function aiErrorMessage(kind: AIErrorKind, lang: "fa" | "en", opts: { provider?: string; model?: string; fallback?: string | null; raw?: string } = {}): string {
  const base = aiErrorBase(kind, lang, opts);
  return opts.raw && kind !== "unknown" ? `${base} (${opts.raw})` : base;
}

function aiErrorBase(kind: AIErrorKind, lang: "fa" | "en", opts: { provider?: string; model?: string; fallback?: string | null; raw?: string }): string {
  const p = opts.provider ?? "";
  const fb = opts.fallback;
  const fa: Record<AIErrorKind, string> = {
    invalid_key: `کلید ${p} نامعتبر است یا دسترسی ندارد. کلید را در تنظیمات → AI دوباره وارد و «تست کلید» را بزن.`,
    quota: `سهمیه یا اعتبار ${p} تمام شده (یا محدودیت تعداد درخواست). کمی بعد دوباره تلاش کن یا اعتبار حساب را بررسی کن.`,
    model_unavailable: `مدل «${opts.model ?? ""}» در دسترس نیست یا از رده خارج شده.${fb ? ` مدل جایگزین پیشنهادی: «${fb}».` : " مدل دیگری انتخاب کن."}`,
    network: "اتصال به سرویس برقرار نشد. اینترنت را بررسی و دوباره تلاش کن.",
    unknown: `خطا از سرویس ${p}: ${opts.raw ?? ""}`.trim(),
  };
  const en: Record<AIErrorKind, string> = {
    invalid_key: `The ${p} key is invalid or lacks access. Re-enter it in Settings → AI and press “Test key”.`,
    quota: `${p} quota or credit is exhausted (or rate limited). Try again later or check your account balance.`,
    model_unavailable: `Model “${opts.model ?? ""}” is unavailable or retired.${fb ? ` Suggested replacement: “${fb}”.` : " Choose another model."}`,
    network: "Could not reach the service. Check your connection and try again.",
    unknown: `Error from ${p}: ${opts.raw ?? ""}`.trim(),
  };
  return (lang === "en" ? en : fa)[kind];
}

const STORE_KEY = "ai_provider_keys_v1";
type KeyStore = Partial<Record<KeyedProvider, string>>;

function readStore(): KeyStore {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as KeyStore) : {};
  } catch { return {}; }
}

export function getProviderKey(provider: Provider): string {
  return (KEYED_PROVIDERS as readonly string[]).includes(provider) ? readStore()[provider as KeyedProvider]?.trim() ?? "" : "";
}
export function saveProviderKey(provider: KeyedProvider, key: string): void {
  const store = readStore();
  const clean = key.trim();
  if (clean) store[provider] = clean; else delete store[provider];
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
export function deleteProviderKey(provider: KeyedProvider): void { saveProviderKey(provider, ""); }
export function clearProviderKeys(): void { try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ } }

export function maskKey(key: string): string {
  const k = key.trim();
  if (!k) return "";
  if (k.length <= 8) return "•".repeat(k.length);
  return `${k.slice(0, 3)}${"•".repeat(Math.min(12, k.length - 7))}${k.slice(-4)}`;
}

export interface KeyTestResult {
  ok: boolean;
  kind?: AIErrorKind;
  models?: string[];
  modelAvailable?: boolean;
  fallback?: string | null;
}

function testRequest(provider: KeyedProvider, key: string): { url: string; headers: Record<string, string> } {
  switch (provider) {
    case "gemini": return { url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, headers: {} };
    case "openai": return { url: "https://api.openai.com/v1/models", headers: { Authorization: `Bearer ${key}` } };
    case "groq": return { url: "https://api.groq.com/openai/v1/models", headers: { Authorization: `Bearer ${key}` } };
    case "openrouter": return { url: "https://openrouter.ai/api/v1/auth/key", headers: { Authorization: `Bearer ${key}` } };
    case "anthropic": return { url: "https://api.anthropic.com/v1/models", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } };
  }
}

export async function testProviderKey(provider: KeyedProvider, key: string, model?: string, signal?: AbortSignal): Promise<KeyTestResult> {
  const clean = key.trim();
  if (!clean) return { ok: false, kind: "invalid_key" };
  const { url, headers } = testRequest(provider, clean);
  let resp: Response;
  try { resp = await fetch(url, { headers, signal }); } catch (e) { return { ok: false, kind: classifyAIError(e) === "unknown" ? "network" : classifyAIError(e) }; }
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    const kind = classifyAIError(body, resp.status);
    return { ok: false, kind: kind === "unknown" && resp.status === 400 ? "invalid_key" : kind };
  }
  let models: string[] | undefined;
  try {
    const json: { data?: { id?: string }[]; models?: { name?: string }[] } = await resp.json();
    const raw = (json.data ?? []).map(m => m.id ?? "").concat((json.models ?? []).map(m => (m.name ?? "").replace(/^models\//, "")));
    models = raw.filter(Boolean);
  } catch { models = undefined; }
  const modelAvailable = model && models?.length && provider !== "openrouter" ? models.includes(model) : undefined;
  return { ok: true, models, modelAvailable, fallback: modelAvailable === false && model ? fallbackModelFor(model) : null };
}
