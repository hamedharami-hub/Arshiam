export type StreamChatOptions = {
  mode: string;
  input: unknown;
  language?: "fa" | "en";
  onDelta: (chunk: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
};

export async function streamAI(opts: StreamChatOptions): Promise<void> {
  try {
    const { getGeminiApiKey, streamDirectGemini, GEMINI_SYSTEM_PROMPTS } = await import("./geminiDirect");
    const geminiKey = getGeminiApiKey();
    if (geminiKey) {
      const promptText = typeof opts.input === "string" ? opts.input : JSON.stringify(opts.input);
      const systemPrompt = GEMINI_SYSTEM_PROMPTS[opts.mode] || GEMINI_SYSTEM_PROMPTS.chat;
      await streamDirectGemini({
        prompt: promptText,
        systemPrompt,
        apiKey: geminiKey,
        onDelta: opts.onDelta,
        onDone: opts.onDone,
        signal: opts.signal,
      });
      return;
    }
  } catch (directErr: any) {
    throw new Error(directErr?.message || "پاسخ هوش مصنوعی دریافت نشد. کلید Gemini را در تنظیمات بررسی کنید.");
  }
  throw new Error("برای استفاده از هوش مصنوعی، کلید Gemini را در تنظیمات وارد کنید.");
}
