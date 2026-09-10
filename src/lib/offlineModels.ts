/**
 * Optional on-device models. They are deliberately not bundled into the APK:
 * each model is fetched only after an explicit user action and cached by the
 * browser/Android WebView for later offline use.
 */
export type OfflineSpeechModelId = "whisper-tiny" | "whisper-base";
export type OfflineAssistantModelId = "deterministic-v1" | "qwen-0.5b" | "smollm-135m";
export type OfflineSpeechMode = "system" | OfflineSpeechModelId;

export type OfflineModelSettings = {
  speechMode: OfflineSpeechMode;
  assistantEnabled: boolean;
  assistantModel: OfflineAssistantModelId;
};

const KEY = "arshnaz_offline_models_v1";
const defaults: OfflineModelSettings = {
  speechMode: "system",
  assistantEnabled: false,
  assistantModel: "deterministic-v1",
};

export const OFFLINE_SPEECH_MODELS: Record<OfflineSpeechModelId, {
  labelFa: string; labelEn: string; model: string; estimatedMB: number; minMemoryGB: number;
}> = {
  "whisper-tiny": { labelFa: "Whisper سبک", labelEn: "Whisper Lite", model: "Xenova/whisper-tiny", estimatedMB: 75, minMemoryGB: 3 },
  "whisper-base": { labelFa: "Whisper متعادل", labelEn: "Whisper Balanced", model: "Xenova/whisper-base", estimatedMB: 142, minMemoryGB: 4 },
};

export const OFFLINE_ASSISTANT_MODELS: Record<OfflineAssistantModelId, {
  labelFa: string;
  labelEn: string;
  model: string;
  estimatedMB: number;
  minMemoryGB: number;
  isGenerative: boolean;
  tier: 2 | 3;
}> = {
  "deterministic-v1": {
    labelFa: "موتور هوشمند محلی NLP (حجم صفر، بدون دانلود)",
    labelEn: "Smart Local NLP Engine (0 MB, Instant)",
    model: "built-in",
    estimatedMB: 0,
    minMemoryGB: 0,
    isGenerative: false,
    tier: 3,
  },
  "qwen-0.5b": {
    labelFa: "مدل هوشمند Qwen 2.5 (فهم عمیق فارسی و انگلیسی)",
    labelEn: "Qwen 2.5 0.5B (Deep Persian & English comprehension)",
    model: "onnx-community/Qwen2.5-0.5B-Instruct",
    estimatedMB: 380,
    minMemoryGB: 3,
    isGenerative: true,
    tier: 2,
  },
  "smollm-135m": {
    labelFa: "مدل فوق‌سبک SmolLM2 (بسیار سریع)",
    labelEn: "SmolLM2 135M (Ultra Fast & Lightweight)",
    model: "HuggingFaceTB/SmolLM2-135M-Instruct",
    estimatedMB: 140,
    minMemoryGB: 2,
    isGenerative: true,
    tier: 2,
  },
};

export function isGenerativeAssistantModel(id: OfflineAssistantModelId): boolean {
  return OFFLINE_ASSISTANT_MODELS[id]?.isGenerative === true;
}

export function loadOfflineModelSettings(): OfflineModelSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<OfflineModelSettings>;
    const model = raw.assistantModel;
    const validModel = model && model in OFFLINE_ASSISTANT_MODELS ? model : "deterministic-v1";
    return {
      speechMode: raw.speechMode === "whisper-tiny" || raw.speechMode === "whisper-base" ? raw.speechMode : "system",
      assistantEnabled: raw.assistantEnabled === true,
      assistantModel: validModel,
    };
  } catch { return { ...defaults }; }
}

export function saveOfflineModelSettings(settings: OfflineModelSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("arshnaz-offline-model-settings"));
}

export function deviceMemoryGB(): number | null {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" && memory > 0 ? memory : null;
}

export function modelDownloadReady(minMemoryGB: number): { ready: boolean; reason?: string } {
  const memory = deviceMemoryGB();
  if (memory !== null && memory < minMemoryGB) {
    return { ready: false, reason: `This model needs about ${minMemoryGB} GB of device memory.` };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ready: false, reason: "Connect to the internet once to download the model." };
  }
  return { ready: true };
}
