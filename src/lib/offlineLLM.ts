import { OFFLINE_ASSISTANT_MODELS, type OfflineAssistantModelId } from "./offlineModels";

type ProgressEvent = { status: string; progress?: number; file?: string };

let worker: Worker | null = null;
let sequence = 0;
const waiting = new Map<
  string,
  {
    resolve: (text: string) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: ProgressEvent) => void;
  }
>();

const CACHE_STATUS_KEY = "arshnaz_offline_llm_ready_";

export function isOfflineLLMCached(modelId: OfflineAssistantModelId): boolean {
  if (modelId === "deterministic-v1") return true;
  try {
    return localStorage.getItem(CACHE_STATUS_KEY + modelId) === "true";
  } catch {
    return false;
  }
}

export function setOfflineLLMCached(modelId: OfflineAssistantModelId, ready: boolean) {
  try {
    if (ready) {
      localStorage.setItem(CACHE_STATUS_KEY + modelId, "true");
    } else {
      localStorage.removeItem(CACHE_STATUS_KEY + modelId);
    }
  } catch {}
}

function workerInstance() {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/offlineAssistant.worker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (
    event: MessageEvent<{
      type: string;
      requestId: string;
      text?: string;
      message?: string;
      status?: string;
      progress?: number;
      file?: string;
    }>
  ) => {
    const message = event.data;
    const pending = waiting.get(message.requestId);
    if (!pending) return;

    if (message.type === "progress") {
      pending.onProgress?.({
        status: message.status || "loading",
        progress: message.progress,
        file: message.file,
      });
    } else if (message.type === "ready") {
      waiting.delete(message.requestId);
      pending.resolve("");
    } else if (message.type === "result") {
      waiting.delete(message.requestId);
      pending.resolve(message.text || "");
    } else if (message.type === "error") {
      waiting.delete(message.requestId);
      pending.reject(new Error(message.message || "Offline LLM request failed"));
    }
  };

  return worker;
}

function request(
  message: Record<string, unknown>,
  onProgress?: (progress: ProgressEvent) => void
): Promise<string> {
  const requestId = `offline-llm-${++sequence}`;
  return new Promise((resolve, reject) => {
    waiting.set(requestId, { resolve, reject, onProgress });
    workerInstance().postMessage({ ...message, requestId });
  });
}

/** Pre-downloads and warms up the selected on-device LLM model. */
export async function prefetchOfflineLLM(
  modelId: OfflineAssistantModelId,
  onProgress?: (progress: ProgressEvent) => void
): Promise<void> {
  const meta = OFFLINE_ASSISTANT_MODELS[modelId];
  if (!meta || !meta.isGenerative) return;

  await request({ type: "warmup", model: meta.model }, onProgress);
  setOfflineLLMCached(modelId, true);
}

/** Runs prompt generation against the local on-device LLM. */
export async function generateOfflineLLM(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  modelId: OfflineAssistantModelId = "qwen-0.5b",
  options?: { maxNewTokens?: number; temperature?: number }
): Promise<string> {
  const meta = OFFLINE_ASSISTANT_MODELS[modelId];
  if (!meta || !meta.isGenerative) {
    throw new Error("Specified model is not a generative model");
  }

  const text = await request({
    type: "generate",
    model: meta.model,
    messages,
    maxNewTokens: options?.maxNewTokens || 256,
    temperature: options?.temperature || 0.3,
  });

  return text;
}
