import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { buildMiniAppPreview, type MiniAppContext } from "./miniAppsSandbox";

const context: MiniAppContext = { language: "fa", direction: "rtl", theme: "dark", colors: { background: "0 0% 0%", foreground: "0 0% 100%", surface: "0 0% 5%", primary: "200 50% 50%", muted: "0 0% 20%", border: "0 0% 30%", radius: "1rem" } };
function bridge() {
  const messages = vi.fn();
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const documentListeners = new Map<string, (event: Record<string, unknown>) => void>();
  const window = { parent: { postMessage: messages }, addEventListener: (name: string, listener: (event: Record<string, unknown>) => void) => listeners.set(name, listener) } as unknown as typeof globalThis.window;
  const document = { addEventListener: (name: string, listener: (event: Record<string, unknown>) => void) => documentListeners.set(name, listener) };
  const preview = buildMiniAppPreview("<p>Tool</p>", "token", context);
  const script = preview.match(/<script>([\s\S]*?)<\/script>/)![1];
  runInNewContext(script, { window, document, Error, Element: class {} });
  return { window, messages, listeners, documentListeners, preview };
}

describe("isolated HTML preview bridge", () => {
  it("prepends policy and bridge before source without changing the source", () => {
    const source = '<!doctype html><html><body><script>alert("demo")</script></body></html>';
    const preview = buildMiniAppPreview(source, "token", context);
    expect(preview.indexOf("Content-Security-Policy")).toBeLessThan(preview.indexOf(source));
    expect(preview).toContain("connect-src 'none'");
    expect(preview).toContain("form-action 'none'");
    expect(preview.endsWith(source)).toBe(true);
  });
  it("escapes script-closing input in context", () => {
    expect(buildMiniAppPreview("", "</script><img src=x>", context)).not.toContain("</script><img src=x>");
  });
  it("exposes a frozen API and rejects empty task titles", () => {
    const { window, messages } = bridge();
    const api = (window as unknown as { Arshiam: { createTask(value: unknown): boolean; getContext(): MiniAppContext } }).Arshiam;
    expect(Object.isFrozen(api)).toBe(true);
    expect(api.getContext().language).toBe("fa");
    expect(api.createTask({ title: "  " })).toBe(false);
    expect(messages).not.toHaveBeenCalled();
    expect(api.createTask({ title: "Task" })).toBe(true);
    expect(messages.mock.calls[0][0]).toMatchObject({ channel: "arshiam-mini-app", token: "token", action: "createTask", payload: { title: "Task", description: "" } });
  });
  it("reports JavaScript, promise and policy errors with bounded text and count", () => {
    const { messages, listeners, documentListeners } = bridge();
    listeners.get("error")!({ message: "Broken script", lineno: 7, colno: 2 });
    listeners.get("unhandledrejection")!({ reason: new Error("Promise failed") });
    documentListeners.get("securitypolicyviolation")!({ violatedDirective: "connect-src" });
    expect(messages.mock.calls[0][0]).toMatchObject({ action: "runtimeError", payload: { message: "Broken script", line: 7, column: 2 } });
    expect(messages.mock.calls[1][0].payload.message).toBe("Promise failed");
    expect(messages.mock.calls[2][0].payload.message).toContain("connect-src");
    for (let i = 0; i < 10; i++) listeners.get("error")!({ message: "x".repeat(2000) });
    expect(messages).toHaveBeenCalledTimes(5);
    expect(messages.mock.calls[4][0].payload.message).toHaveLength(1000);
  });
});
