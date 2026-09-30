// Direct Google Gemini REST API Client
// Allows full AI capability without requiring Firebase Edge Functions.

import { loadAISettings, type AIOperation } from "./aiSettings";

export const GEMINI_SYSTEM_PROMPTS: Record<string, string> = {
  parse_task: `You parse a natural-language description into a structured task. Extract:
- title (short, in the user's language)
- description (optional)
- priority: none/low/medium/high
- due_date: ISO 8601 string if date/time phrase is mentioned
Return a valid JSON object with keys: title, description, priority, due_date.`,
  breakdown: `You break down a high-level task into 4-8 concrete actionable subtasks. Match the language of the input. Return a list of subtask titles.`,
  generate_note: `You generate a well-structured Markdown note about the given topic. Use headings, lists, and emphasis. Match the language of the input.`,
  summarize_note: `You summarize the given Markdown note into key bullet points in Markdown. Match the language of the input.`,
  improve_note: `You improve and rewrite the given note to be clearer and better structured while preserving meaning. Output Markdown. Match input language.`,
  suggest: `You generate 5-8 actionable suggestions (tasks or note ideas) for the given topic. Each should be concise and useful. Match the language of the input.`,
  chat: `You are ARSHNAZ AI, a helpful, thoughtful productivity and wellness assistant. Answer clearly and empathetically. Match the user's language (Persian / English).`,
  inline_edit: `You transform a piece of text according to the requested action. Output ONLY the transformed text, no preamble, no explanation, no quotes. Preserve formatting (Markdown). Match the input language.`,
  task_subtasks: `You generate concrete subtasks for a given task. Output a numbered list of concrete steps. Match the language of the input.`,
  task_metadata_suggest: `You analyze a task and suggest the best priority (none/low/medium/high) and an ISO 8601 due_date if appropriate. Return JSON with priority and reason.`,
  task_chat: `You are an assistant helping the user with a specific task. Be concise, actionable, and encouraging. Match the user's language.`,
  folder_chat: `You help the user plan and break down a project. Suggest actionable tasks. Match the user's language.`,
  socratic: `You are a Socratic guide. NEVER give direct answers or advice. ONLY ask thoughtful open-ended questions that help the user discover their own answers and clarity. Match the user's language.`,
  distortion_detect: `You are a CBT clinician. Analyze the user's automatic thought and identify which cognitive distortions are present (e.g. overgeneralization, all_or_nothing, mental_filter, jumping_to_conclusions, magnification, emotional_reasoning, shoulds, labeling, personalization). Return JSON with distortions: [{ key, explanation }] and alternative_thought.`,
  about_me_analysis: `You are a thoughtful, non-clinical personal organization and productivity assistant in ARSHNAZ.
Analyze the user's "About Me" questionnaire answers to help categorize life areas, habits, and actionable goals.
CRITICAL SAFETY AND ETHICAL RULES:
1. You are NOT a medical doctor, psychiatrist, or therapist.
2. NEVER provide clinical diagnoses, psychiatric pathology, or clinical labels (strictly avoid words like "disorder", "clinical depression", "trauma", "pathology").
3. Keep all feedback non-clinical, encouraging, constructive, and focused on everyday life organization, personal values, and practical habits.
4. Output MUST be a valid JSON object matching this schema:
{
  "ai_analysis": {
    "summary": "1-2 paragraphs of thoughtful, compassionate summary of the user's life context, goals, and values.",
    "themes": ["Main life theme 1", "Theme 2"],
    "strengths": ["Key personal value or strength 1", "Strength 2"],
    "risks": ["Everyday non-clinical challenge or obstacle 1 (e.g. procrastination, busy schedule)", "Challenge 2"]
  },
  "ai_suggestions": {
    "folders": ["Suggested life/project folder 1", "Folder 2"],
    "tags": ["Tag1", "Tag2"],
    "tasks": [
      {"title": "Actionable task title", "folder": "Folder name", "priority": "medium"}
    ]
  }
}
Do not include any extra text outside the JSON object. Match the user's language (Persian or English).`,
};

export function getGeminiApiKey(): string | null {
  // Pure BYOK: strictly retrieve user-configured personal keys, never bundled shared env keys
  try {
    const settings = loadAISettings();
    if (settings.default?.provider === "gemini" && settings.default?.apiKey?.trim()) {
      return settings.default.apiKey.trim();
    }
    if (settings.perOp) {
      for (const k of Object.keys(settings.perOp)) {
        const opCfg = settings.perOp[k as AIOperation];
        if (opCfg?.provider === "gemini" && opCfg?.apiKey?.trim()) {
          return opCfg.apiKey.trim();
        }
      }
    }
  } catch {}

  // Legacy direct key fallback in localStorage
  try {
    const directKey = localStorage.getItem("gemini_api_key") || localStorage.getItem("ai_gemini_key");
    if (directKey && directKey.trim()) return directKey.trim();
  } catch {}

  return null;
}

export function normalizeGeminiModel(model?: string): string {
  if (!model) return "gemini-2.5-flash";
  let m = model.trim();
  if (m.startsWith("google/")) m = m.replace("google/", "");
  if (m.startsWith("models/")) m = m.replace("models/", "");

  // Model truthfulness: Never silently substitute the user's selected model.
  // If an unreleased or unsupported model name is requested (such as gemini-3 previews),
  // fail honestly with a clear compatibility error instead of silent substitution.
  if (m.startsWith("gemini-3")) {
    throw new Error(
      `مدل انتخابی «${m}» در دسترس نیست یا توسط API پشتیبانی نمی‌شود. لطفاً در تنظیمات → AI یکی از مدل‌های معتبر (مانند gemini-2.5-flash یا gemini-2.5-pro) را انتخاب کنید.`
    );
  }

  return m || "gemini-2.5-flash";
}

export async function callDirectGemini(options: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<{ text: string; data?: any; provider: string; model: string }> {
  const apiKey = options.apiKey || getGeminiApiKey();
  if (!apiKey) {
    throw new Error("کلید Google Gemini API یافت نشد. لطفاً در تنظیمات → AI کلید خود را وارد کنید.");
  }

  const model = normalizeGeminiModel(options.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: options.prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
    },
  };

  if (options.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!resp.ok) {
    let errMessage = `Gemini API error: HTTP ${resp.status}`;
    try {
      const errJson = await resp.json();
      if (errJson?.error?.message) errMessage = errJson.error.message;
    } catch {}
    throw new Error(errMessage);
  }

  const data = await resp.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";

  // Attempt to parse JSON if structured output was requested
  let parsedData: any = null;
  try {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
  } catch {}

  return { text: rawText, data: parsedData, provider: "gemini", model };
}

export async function streamDirectGemini(options: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  apiKey?: string;
  onDelta: (chunk: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}): Promise<void> {
  const apiKey = options.apiKey || getGeminiApiKey();
  if (!apiKey) {
    throw new Error("کلید Google Gemini API یافت نشد. لطفاً در تنظیمات → AI کلید خود را وارد کنید.");
  }

  const model = normalizeGeminiModel(options.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: options.prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  };

  if (options.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!resp.ok || !resp.body) {
    let errMessage = `Gemini Stream error: HTTP ${resp.status}`;
    try {
      const errJson = await resp.json();
      if (errJson?.error?.message) errMessage = errJson.error.message;
    } catch {}
    throw new Error(errMessage);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);

      if (!line || !line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        const parts = parsed?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part.text) options.onDelta(part.text);
          }
        }
      } catch {}
    }
  }

  options.onDone?.();
}
