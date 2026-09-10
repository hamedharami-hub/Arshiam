import { OFFLINE_SPEECH_MODELS, type OfflineSpeechModelId } from "./offlineModels";

type Progress = { status: string; progress?: number; file?: string };
type ActiveRecording = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  model: OfflineSpeechModelId;
  language: "fa-IR" | "en-US";
  onProgress?: (progress: Progress) => void;
};

let worker: Worker | null = null;
let active: ActiveRecording | null = null;
let sequence = 0;
const waiting = new Map<string, { resolve: (text: string) => void; reject: (error: Error) => void; onProgress?: (progress: Progress) => void }>();

function workerInstance() {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/offlineSpeech.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<{ type: string; requestId: string; text?: string; message?: string; status?: string; progress?: number; file?: string }>) => {
    const message = event.data;
    const pending = waiting.get(message.requestId);
    if (!pending) return;
    if (message.type === "progress") {
      pending.onProgress?.({ status: message.status || "loading", progress: message.progress, file: message.file });
    } else if (message.type === "ready") {
      waiting.delete(message.requestId); pending.resolve("");
    } else if (message.type === "result") {
      waiting.delete(message.requestId); pending.resolve(message.text || "");
    } else if (message.type === "error") {
      waiting.delete(message.requestId); pending.reject(new Error(message.message || "Offline speech failed"));
    }
  };
  return worker;
}

function request(message: Record<string, unknown>, onProgress?: (progress: Progress) => void): Promise<string> {
  const requestId = `offline-speech-${++sequence}`;
  return new Promise((resolve, reject) => {
    waiting.set(requestId, { resolve, reject, onProgress });
    workerInstance().postMessage({ ...message, requestId });
  });
}

function mono16k(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const source = new Float32Array(buffer.length);
  for (let channel = 0; channel < channels; channel += 1) {
    const input = buffer.getChannelData(channel);
    for (let index = 0; index < input.length; index += 1) source[index] += input[index] / channels;
  }
  if (buffer.sampleRate === 16000) return source;
  const targetLength = Math.max(1, Math.round(source.length * 16000 / buffer.sampleRate));
  const target = new Float32Array(targetLength);
  const ratio = (source.length - 1) / Math.max(1, targetLength - 1);
  for (let index = 0; index < targetLength; index += 1) {
    const position = index * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(source.length - 1, lower + 1);
    target[index] = source[lower] + (source[upper] - source[lower]) * (position - lower);
  }
  return target;
}

export async function prefetchOfflineSpeech(model: OfflineSpeechModelId, onProgress?: (progress: Progress) => void) {
  return request({ type: "warmup", model: OFFLINE_SPEECH_MODELS[model].model }, onProgress);
}

export async function startOfflineSpeech(model: OfflineSpeechModelId, language: "fa-IR" | "en-US", onProgress?: (progress: Progress) => void) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    throw new Error("Offline recording is not supported on this device");
  }
  if (active) throw new Error("Speech recording is already active");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  active = { recorder, stream, chunks, model, language, onProgress };
  recorder.start();
}

export async function stopOfflineSpeech(): Promise<string> {
  const current = active;
  if (!current) return "";
  active = null;
  const blob = await new Promise<Blob>((resolve, reject) => {
    current.recorder.onstop = () => resolve(new Blob(current.chunks, { type: current.recorder.mimeType || "audio/webm" }));
    current.recorder.onerror = () => reject(new Error("Audio recording failed"));
    current.recorder.stop();
  });
  current.stream.getTracks().forEach((track) => track.stop());
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const audio = mono16k(decoded);
    if (audio.length < 1600) throw new Error("No speech detected");
    return await request({
      type: "transcribe", model: OFFLINE_SPEECH_MODELS[current.model].model, audio,
      language: current.language.startsWith("fa") ? "fa" : "en",
    }, current.onProgress);
  } finally { await context.close(); }
}

export function isOfflineSpeechRecording() { return active !== null; }
