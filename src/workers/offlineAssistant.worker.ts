/// <reference lib="webworker" />
import { env, pipeline } from "@huggingface/transformers";

type AssistantRequest =
  | { type: "warmup"; requestId: string; model: string }
  | {
      type: "generate";
      requestId: string;
      model: string;
      messages: { role: "system" | "user" | "assistant"; content: string }[];
      maxNewTokens?: number;
      temperature?: number;
    };

const pipelines = new Map<string, any>();
env.useBrowserCache = true;
env.useWasmCache = true;

async function getGenerator(model: string, requestId: string) {
  const existing = pipelines.get(model);
  if (existing) return existing;

  const generator = await pipeline("text-generation", model, {
    dtype: "q4",
    device: "wasm",
    progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
      self.postMessage({
        type: "progress",
        requestId,
        status: event.status || "loading",
        progress: typeof event.progress === "number" ? Math.round(event.progress) : undefined,
        file: event.file,
      });
    },
  });

  pipelines.set(model, generator);
  return generator;
}

self.onmessage = async (event: MessageEvent<AssistantRequest>) => {
  const req = event.data;
  try {
    const generator = await getGenerator(req.model, req.requestId);

    if (req.type === "warmup") {
      self.postMessage({ type: "ready", requestId: req.requestId });
      return;
    }

    if (req.type === "generate") {
      const output = await generator(req.messages, {
        max_new_tokens: req.maxNewTokens || 256,
        temperature: req.temperature || 0.3,
        do_sample: false,
      });

      let generatedText = "";
      if (Array.isArray(output) && output.length > 0) {
        const lastMsg = output[0]?.generated_text;
        if (Array.isArray(lastMsg)) {
          const assistantReply = lastMsg[lastMsg.length - 1];
          generatedText = assistantReply?.content || "";
        } else if (typeof lastMsg === "string") {
          generatedText = lastMsg;
        } else if (typeof output[0]?.text === "string") {
          generatedText = output[0].text;
        }
      }

      self.postMessage({
        type: "result",
        requestId: req.requestId,
        text: generatedText.trim(),
      });
    }
  } catch (err: any) {
    self.postMessage({
      type: "error",
      requestId: req.requestId,
      message: err instanceof Error ? err.message : "On-device LLM generation failed",
    });
  }
};
