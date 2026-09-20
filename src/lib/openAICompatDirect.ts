// Direct Client for OpenAI-compatible and Anthropic APIs
// Allows direct, client-side invocation with system prompt, language, context, and AbortSignal.
// Zero hidden fallbacks: throws exact provider errors.

import type { Provider } from "./aiSettings";

export interface DirectAIRequestOptions {
  provider: Provider;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  signal?: AbortSignal;
}

export interface DirectAIResponse {
  text: string;
  data?: any;
}

function parseJsonFromText(rawText: string): any {
  try {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
  } catch {}
  return null;
}

export async function callDirectOpenAICompat(
  options: DirectAIRequestOptions
): Promise<DirectAIResponse> {
  const { provider, prompt, systemPrompt, model, apiKey, baseUrl, temperature, signal } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(`کلید API برای ${provider} وارد نشده است. لطفاً در تنظیمات → AI کلید خود را وارد کنید.`);
  }

  // 1. Anthropic Claude
  if (provider === "anthropic") {
    return callDirectAnthropic(options);
  }

  // 2. OpenAI-compatible endpoints
  let endpoint = "https://api.openai.com/v1/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (provider === "groq") {
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
  } else if (provider === "openrouter") {
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    headers["HTTP-Referer"] = "https://arshnaz.life";
    headers["X-Title"] = "ARSHNAZ";
  } else if (provider === "custom") {
    const base = (baseUrl || "").trim().replace(/\/+$/, "");
    if (!base) {
      throw new Error("آدرس Base URL برای سرویس سفارشی وارد نشده است.");
    }
    endpoint = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const body = {
    model: model || "gpt-4o-mini",
    messages,
    temperature: temperature ?? 0.7,
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    let errMessage = `${provider} API error: HTTP ${resp.status}`;
    try {
      const errJson = await resp.json();
      if (errJson?.error?.message) errMessage = errJson.error.message;
      else if (typeof errJson?.error === "string") errMessage = errJson.error;
    } catch {}
    throw new Error(errMessage);
  }

  const data = await resp.json();
  const rawText = data?.choices?.[0]?.message?.content || "";
  const parsedData = parseJsonFromText(rawText);

  return { text: rawText, data: parsedData };
}

export async function callDirectAnthropic(
  options: DirectAIRequestOptions
): Promise<DirectAIResponse> {
  const { prompt, systemPrompt, model, apiKey, temperature, signal } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new Error("کلید API برای Anthropic وارد نشده است. لطفاً در تنظیمات → AI کلید خود را وارد کنید.");
  }

  const endpoint = "https://api.anthropic.com/v1/messages";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey.trim(),
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };

  const body: any = {
    model: model || "claude-3-5-sonnet-latest",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    temperature: temperature ?? 0.7,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const resp = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    let errMessage = `Anthropic API error: HTTP ${resp.status}`;
    try {
      const errJson = await resp.json();
      if (errJson?.error?.message) errMessage = errJson.error.message;
      else if (typeof errJson?.error === "string") errMessage = errJson.error;
    } catch {}
    throw new Error(errMessage);
  }

  const data = await resp.json();
  const rawText = data?.content?.[0]?.text || "";
  const parsedData = parseJsonFromText(rawText);

  return { text: rawText, data: parsedData };
}
