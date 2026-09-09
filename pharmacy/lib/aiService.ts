import { GoogleGenAI } from '@google/genai';
import { AiModelOption, AiProvider, UserAiConfig } from '@/types/pharmacy';
import { sanitizeAndRepairJson } from '@/lib/robustJsonParser';

export const DEFAULT_AI_MODELS: AiModelOption[] = [];

export const DEFAULT_AI_CONFIG: UserAiConfig = {
  preferredProvider: 'gemini',
  geminiApiKey: '',
  groqApiKey: '',
  xaiApiKey: '',
  flashcardModel: '',
  tutorModel: '',
  temperature: 0.2,
  customModels: [],
};

export interface AiInferenceRequest {
  provider?: AiProvider;
  model?: string;
  userApiKey?: string;
  prompt: string;
  systemInstruction?: string;
  responseFormat?: 'json' | 'text';
  temperature?: number;
}

/**
 * Normalizes model IDs and auto-detects provider if not explicitly given
 */
export function sanitizeModelId(
  modelId?: string,
  provider?: AiProvider
): { effectiveModel: string; effectiveProvider: AiProvider } {
  let model = (modelId || '').trim();
  let prov = provider;

  // Auto-detect provider if model matches known naming conventions
  if (model.startsWith('grok') || model.includes('xai')) {
    prov = 'xai';
  } else if (
    model.startsWith('llama') ||
    model.startsWith('deepseek') ||
    model.startsWith('qwen') ||
    model.startsWith('mixtral') ||
    model.startsWith('gemma') ||
    model.includes('groq')
  ) {
    prov = 'groq';
  } else if (model.startsWith('gemini') || model.startsWith('models/gemini')) {
    prov = 'gemini';
  } else if (!prov) {
    prov = 'gemini';
  }

  if (prov === 'gemini') {
    model = model.replace(/^models\//, '');
    if (!model) {
      model = 'gemini-2.5-flash';
    }
  } else if (prov === 'xai') {
    if (!model) {
      model = 'grok-2-latest';
    }
  } else if (prov === 'groq') {
    if (!model) {
      model = 'llama-3.3-70b-versatile';
    }
  }

  return { effectiveModel: model, effectiveProvider: prov };
}

/**
 * Universal Server-Side AI Executor for Gemini, Groq, and xAI Grok
 */
export async function executeAiInference({
  provider,
  model,
  userApiKey,
  prompt,
  systemInstruction,
  responseFormat = 'text',
  temperature = 0.2,
}: AiInferenceRequest): Promise<string> {
  const { effectiveModel, effectiveProvider } = sanitizeModelId(model, provider);

  // 1. Handle xAI Grok
  if (effectiveProvider === 'xai') {
    const apiKey = (userApiKey || process.env.XAI_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error(
        'کلید xAI Grok تنظیم نشده است. لطفاً در بخش تنظیمات کلید اختصاصی xAI خود را وارد فرمایید.'
      );
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload: Record<string, unknown> = {
      model: effectiveModel,
      messages,
      temperature,
    };

    if (responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`خطای سرور xAI Grok (${response.status}): ${errText}`);
    }

    const json = await response.json();
    let output = json.choices?.[0]?.message?.content || '';
    if (responseFormat === 'json') {
      output = sanitizeAndRepairJson(output);
    }
    return output;
  }

  // 2. Handle Groq Cloud (LPU)
  if (effectiveProvider === 'groq') {
    const apiKey = (userApiKey || process.env.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error(
        'کلید Groq API تنظیم نشده است. لطفاً در بخش تنظیمات کلید Groq خود را وارد فرمایید.'
      );
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // For smaller/weaker models on Groq, strengthen the system instruction to force JSON
    let activeSysInstruction = systemInstruction || '';
    if (responseFormat === 'json') {
      activeSysInstruction = `${activeSysInstruction}\n\nIMPORTANT: You must respond ONLY with valid JSON. No conversational intro, no markdown formatting outside JSON.`.trim();
    }

    if (activeSysInstruction) {
      messages.push({ role: 'system', content: activeSysInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload: Record<string, unknown> = {
      model: effectiveModel,
      messages,
      temperature,
    };

    if (responseFormat === 'json') {
      // Groq supports type: "json_object" for most models
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`خطای پردازشگر Groq (${response.status}): ${errText}`);
    }

    const json = await response.json();
    let output = json.choices?.[0]?.message?.content || '';
    if (responseFormat === 'json') {
      output = sanitizeAndRepairJson(output);
    }
    return output;
  }

  // 3. Default: Google Gemini
  const apiKey = (userApiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error(
      'کلید Google Gemini تنظیم نشده است. لطفاً در بخش تنظیمات کلید اختصاصی خود را وارد فرمایید.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const config: Record<string, unknown> = {
    temperature,
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  if (responseFormat === 'json') {
    config.responseMimeType = 'application/json';
  }

  const fallbackModels = [
    effectiveModel,
    'gemini-2.0-flash',
    'gemini-2.5-flash',
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  let lastError: any = null;
  for (const currentModel of fallbackModels) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: config as any,
      });

      if (response.text) {
        let output = response.text;
        if (responseFormat === 'json') {
          output = sanitizeAndRepairJson(output);
        }
        return output;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${currentModel} failed: ${err?.message || err}`);
      lastError = err;
    }
  }

  throw new Error(`خطای سرویس Google Gemini (${effectiveModel}): ${lastError?.message || 'خطا در تولید پاسخ'}`);
}
