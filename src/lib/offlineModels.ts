/**
 * Optional on-device models. They are deliberately not bundled into the APK:
 * each model is fetched only after an explicit user action and cached by the
 * browser/Android WebView for later offline use.
 */
export type OfflineSpeechModelId = "whisper-tiny" | "whisper-base";
export type OfflineSpeechMode = "system" | OfflineSpeechModelId;

export type OfflineModelSettings = {
  speechMode: OfflineSpeechMode;
  assistantEnabled: boolean;
};

const KEY = "arshnaz_offline_models_v1";
const defaults: OfflineModelSettings = {
  speechMode: "system",
  assistantEnabled: false,
};

export const OFFLINE_SPEECH_MODELS: Record<OfflineSpeechModelId, {
  labelFa: string; labelEn: string; model: string; estimatedMB: number; minMemoryGB: number;
}> = {
  "whisper-tiny": { labelFa: "Whisper سبک", labelEn: "Whisper Lite", model: "Xenova/whisper-tiny", estimatedMB: 75, minMemoryGB: 3 },
  "whisper-base": { labelFa: "Whisper متعادل", labelEn: "Whisper Balanced", model: "Xenova/whisper-base", estimatedMB: 142, minMemoryGB: 4 },
};

export function loadOfflineModelSettings(): OfflineModelSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<OfflineModelSettings>;
    return {
      speechMode: raw.speechMode === "whisper-tiny" || raw.speechMode === "whisper-base" ? raw.speechMode : "system",
      assistantEnabled: raw.assistantEnabled === true,
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
