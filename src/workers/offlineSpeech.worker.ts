/// <reference lib="webworker" />
import { env, pipeline } from "@huggingface/transformers";

type Request =
  | { type: "warmup"; requestId: string; model: string }
  | { type: "transcribe"; requestId: string; model: string; audio: Float32Array; language: "fa" | "en" };

const pipelines = new Map<string, any>();
env.useBrowserCache = true;
env.useWasmCache = true;

async function getTranscriber(model: string, requestId: string) {
  const existing = pipelines.get(model);
  if (existing) return existing;
  const transcriber = await pipeline("automatic-speech-recognition", model, {
    progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
      self.postMessage({ type: "progress", requestId, status: event.status || "loading", progress: event.progress, file: event.file });
    },
  });
  pipelines.set(model, transcriber);
  return transcriber;
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    const transcriber = await getTranscriber(request.model, request.requestId);
    if (request.type === "warmup") {
      self.postMessage({ type: "ready", requestId: request.requestId });
      return;
    }
    const result = await transcriber(request.audio, {
      language: request.language,
      task: "transcribe",
    });
    self.postMessage({ type: "result", requestId: request.requestId, text: String(result.text || "").trim() });
  } catch (error) {
    self.postMessage({ type: "error", requestId: request.requestId, message: error instanceof Error ? error.message : "Offline speech failed" });
  }
};
