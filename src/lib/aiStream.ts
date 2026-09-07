// Helper: stream SSE tokens from the ai-stream edge function.
const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stream`;

export type StreamChatOptions = {
  mode: string;
  input: unknown;
  language?: "fa" | "en";
  onDelta: (chunk: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
};

export async function streamAI(opts: StreamChatOptions): Promise<void> {
  const resp = await fetch(STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      mode: opts.mode,
      input: opts.input,
      language: opts.language ?? "fa",
    }),
    signal: opts.signal,
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) throw new Error("محدودیت سرعت — کمی صبر کنید.");
    if (resp.status === 402) throw new Error("اعتبار AI تمام شده.");
    let msg = "خطا در دریافت پاسخ";
    try {
      const j = await resp.json();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) opts.onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  // flush leftovers
  if (buf.trim()) {
    for (let raw of buf.split("\n")) {
      if (!raw || raw.startsWith(":")) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) opts.onDelta(c);
      } catch { /* ignore */ }
    }
  }

  opts.onDone?.();
}
