import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callAI } from "./ai";
import { saveAISettings, setAIPersonalizationOptedIn, clearAllStoredAIKeys, loadAISettings, type AIPerOpSettings } from "./aiSettings";
import { normalizeGeminiModel } from "./geminiDirect";
import { saveOfflineModelSettings } from "./offlineModels";

describe("callAI multi-provider support", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls Gemini directly with correct system prompt, parameters, and AbortSignal", async () => {
    const settings: AIPerOpSettings = {
      default: { provider: "gemini", apiKey: "test-gemini-key", model: "gemini-2.5-flash" },
      perOp: {},
    };
    saveAISettings(settings);

    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ title: "Task from Gemini", priority: "high" }) }],
              },
            },
          ],
        }),
      };
    });

    const controller = new AbortController();
    const result = await callAI("parse_task", "Buy milk tomorrow", undefined, undefined, "en", {
      signal: controller.signal,
    });

    expect(capturedUrl).toContain("generativelanguage.googleapis.com");
    expect(capturedUrl).toContain("key=test-gemini-key");
    expect(capturedUrl).toContain("gemini-2.5-flash");

    const body = JSON.parse(capturedInit?.body as string);
    expect(body.contents[0].parts[0].text).toContain("Buy milk tomorrow");
    expect(body.systemInstruction.parts[0].text).toBeDefined();
    expect(capturedInit?.signal).toBe(controller.signal);

    expect(result.data?.title).toBe("Task from Gemini");
    expect(result.data?.priority).toBe("high");
  });

  it("calls OpenAI-compatible endpoint (OpenAI) with system prompt and Authorization header", async () => {
    const settings: AIPerOpSettings = {
      default: { provider: "openai", apiKey: "test-openai-key", model: "gpt-4o-mini" },
      perOp: {},
    };
    saveAISettings(settings);

    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```json\n{"distortions": [{"key": "all_or_nothing", "explanation": "Polarized thinking"}]}\n```',
              },
            },
          ],
        }),
      };
    });

    const result = await callAI("distortion_detect", "I always fail at everything", undefined, undefined, "en");

    expect(capturedUrl).toBe("https://api.openai.com/v1/chat/completions");
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-openai-key");

    const body = JSON.parse(capturedInit?.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toContain("I always fail at everything");

    expect(result.data?.distortions).toBeDefined();
    expect(result.data?.distortions[0].key).toBe("all_or_nothing");
  });

  it("calls Groq directly with correct endpoint and Bearer token", async () => {
    const settings: AIPerOpSettings = {
      default: { provider: "groq", apiKey: "gsk_test_groq_key", model: "llama-3.3-70b-versatile" },
      perOp: {},
    };
    saveAISettings(settings);

    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Fast response from Groq" } }],
        }),
      };
    });

    const result = await callAI("chat", "Hello Groq", undefined, undefined, "en");

    expect(capturedUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer gsk_test_groq_key");
    expect(result.text).toBe("Fast response from Groq");
  });

  it("calls Anthropic Claude with correct headers and system prompt", async () => {
    const settings: AIPerOpSettings = {
      default: { provider: "anthropic", apiKey: "sk-ant-test", model: "claude-3-5-sonnet-latest" },
      perOp: {},
    };
    saveAISettings(settings);

    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        json: async () => ({
          content: [{ text: "Hello from Claude" }],
        }),
      };
    });

    const result = await callAI("chat", "Hello Claude", undefined, undefined, "en");

    expect(capturedUrl).toBe("https://api.anthropic.com/v1/messages");
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");

    const body = JSON.parse(capturedInit?.body as string);
    expect(body.model).toBe("claude-3-5-sonnet-latest");
    expect(body.system).toBeDefined();
    expect(result.text).toBe("Hello from Claude");
  });

  it("throws clear error without hidden fallback when provider is unconfigured or has no key", async () => {
    // Save settings with an empty API key for Gemini
    const settings: AIPerOpSettings = {
      default: { provider: "gemini", apiKey: "", model: "gemini-2.5-flash" },
      perOp: {},
    };
    saveAISettings(settings);

    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    // Must throw clear error about missing key / offline choice, and NOT make network calls or fall back silently
    await expect(callAI("chat", "Test without key")).rejects.toThrow(
      /یک سرویس آنلاین و کلید API/
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws provider error directly without hidden fallback if provider API returns an error", async () => {
    const settings: AIPerOpSettings = {
      default: { provider: "openai", apiKey: "invalid-key", model: "gpt-4o" },
      perOp: {},
    };
    saveAISettings(settings);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Incorrect API key provided" } }),
    });

    // Zero hidden fallback: must throw the exact OpenAI error directly
    await expect(callAI("chat", "Test fail")).rejects.toThrow("Incorrect API key provided");
  });

  it("honors AbortSignal and aborts the fetch request", async () => {
    const settings: AIPerOpSettings = {
      default: { provider: "gemini", apiKey: "test-key", model: "gemini-2.5-flash" },
      perOp: {},
    };
    saveAISettings(settings);

    const controller = new AbortController();
    global.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const promise = callAI("chat", "Hello", undefined, undefined, "en", { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow(/Aborted/);
  });

  describe("Model normalization and truthfulness", () => {
    it("normalizes model prefixes without altering supported model name", () => {
      expect(normalizeGeminiModel("models/gemini-2.5-flash")).toBe("gemini-2.5-flash");
      expect(normalizeGeminiModel("google/gemini-2.5-pro")).toBe("gemini-2.5-pro");
      expect(normalizeGeminiModel("gemini-2.5-flash-lite")).toBe("gemini-2.5-flash-lite");
      expect(normalizeGeminiModel(undefined)).toBe("gemini-2.5-flash");
    });

    it("throws clear compatibility error for unsupported gemini-3 preview models rather than silently substituting", () => {
      expect(() => normalizeGeminiModel("gemini-3.1-flash-preview")).toThrow(
        /مدل انتخابی «gemini-3.1-flash-preview» در دسترس نیست یا توسط API پشتیبانی نمی‌شود/
      );
      expect(() => normalizeGeminiModel("google/gemini-3-pro-preview")).toThrow(
        /مدل انتخابی «gemini-3-pro-preview» در دسترس نیست یا توسط API پشتیبانی نمی‌شود/
      );
    });
  });

  describe("Model metadata in responses", () => {
    it("returns provider and actual model in the response for Gemini", async () => {
      saveAISettings({
        default: { provider: "gemini", apiKey: "test-gemini-key", model: "gemini-2.5-pro" },
        perOp: { chat: { provider: "gemini", apiKey: "test-gemini-key", model: "gemini-2.5-pro" } },
        opStrategies: { chat: "custom" },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Response from Gemini Pro" }] } }],
        }),
      });

      const res = await callAI("chat", "Test prompt", undefined, undefined, "en");
      expect(res.text).toBe("Response from Gemini Pro");
      expect(res.provider).toBe("gemini");
      expect(res.model).toBe("gemini-2.5-pro");
    });

    it("returns provider and model in the response for OpenAI-compatible", async () => {
      saveAISettings({
        default: { provider: "groq", apiKey: "test-groq-key", model: "llama-3.3-70b-versatile" },
        perOp: { chat: { provider: "groq", apiKey: "test-groq-key", model: "llama-3.3-70b-versatile" } },
        opStrategies: { chat: "custom" },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Groq response" } }],
        }),
      });

      const res = await callAI("chat", "Test prompt", undefined, undefined, "en");
      expect(res.text).toBe("Groq response");
      expect(res.provider).toBe("groq");
      expect(res.model).toBe("llama-3.3-70b-versatile");
    });

    it("returns provider and model for offline fallback", async () => {
      saveOfflineModelSettings({ speechMode: "system", assistantEnabled: true });
      saveAISettings({
        default: { provider: "offline", apiKey: "", model: "deterministic-v1" },
        perOp: { parse_task: { provider: "offline", apiKey: "", model: "deterministic-v1" } },
        opStrategies: { parse_task: "custom" },
      });

      const res = await callAI("parse_task", "Buy coffee tomorrow at 9am", undefined, undefined, "en");
      expect(res.provider).toBe("offline");
      expect(res.model).toBe("deterministic-v1");
      expect(res.data?.title).toBeDefined();
    });
  });

  describe("Privacy opt-in for personalization", () => {
    it("does not fetch or include personal profile context when personalization opt-in is false", async () => {
      saveAISettings({
        default: { provider: "gemini", apiKey: "test-gemini-key", model: "gemini-2.5-flash" },
        perOp: {},
        personalizationOptIn: false,
      });

      let capturedBody: any = null;
      global.fetch = vi.fn().mockImplementation(async (_url, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Answer without profile" }] } }],
          }),
        };
      });

      await callAI("chat", "Hello", undefined, undefined, "en");
      const systemText = capturedBody.systemInstruction?.parts?.[0]?.text || "";
      expect(systemText).not.toContain("Personalization Profile Context");
    });
  });

  describe("One-click key removal (Privacy BYOK)", () => {
    it("clears all stored AI keys across defaults and per-operation configs", () => {
      localStorage.setItem("gemini_api_key", "standalone-key");
      saveAISettings({
        default: { provider: "gemini", apiKey: "default-key", model: "gemini-2.5-flash" },
        perOp: {
          chat: { provider: "openai", apiKey: "openai-key", model: "gpt-4o" },
          generate_note: { provider: "gemini", apiKey: "gemini-note-key", model: "gemini-2.5-pro" },
        },
      });

      clearAllStoredAIKeys();

      expect(localStorage.getItem("gemini_api_key")).toBeNull();
      const current = loadAISettings();
      expect(current.default.apiKey).toBe("");
      expect(current.perOp.chat?.apiKey).toBe("");
      expect(current.perOp.generate_note?.apiKey).toBe("");
    });
  });

  describe("About Me analysis structured operation", () => {
    it("analyzes questionnaire answers and returns validated structured schema without clinical diagnosis", async () => {
      saveAISettings({
        default: { provider: "gemini", apiKey: "test-gemini-key", model: "gemini-2.5-flash" },
        perOp: {},
      });

      const mockResponseData = {
        ai_analysis: {
          summary: "User is a software engineer focusing on fitness and work-life balance.",
          themes: ["Career Growth", "Physical Health"],
          strengths: ["Persistence", "Curiosity"],
          risks: ["Time management under tight deadlines"],
        },
        ai_suggestions: {
          folders: ["Fitness", "Deep Work"],
          tags: ["Routine", "Coding"],
          tasks: [
            { title: "Plan weekly workout schedule", folder: "Fitness", priority: "high" },
            { title: "Review morning routine", folder: "Deep Work", priority: "medium" },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockResponseData) }],
              },
            },
          ],
        }),
      });

      const input = {
        answers: {
          occupation: "Software Engineer",
          main_goal: "Run 10km and publish open source tool",
        },
        free_text: "Need better routine",
      };

      const res = await callAI("about_me_analysis", input, undefined, undefined, "en");

      expect(res.data).toBeDefined();
      expect(res.data.ai_analysis.summary).toContain("software engineer");
      expect(res.data.ai_analysis.themes).toEqual(["Career Growth", "Physical Health"]);
      expect(res.data.ai_analysis.strengths).toEqual(["Persistence", "Curiosity"]);
      expect(res.data.ai_analysis.risks).toEqual(["Time management under tight deadlines"]);
      expect(res.data.ai_suggestions.folders).toEqual(["Fitness", "Deep Work"]);
      expect(res.data.ai_suggestions.tasks).toHaveLength(2);
      expect(res.data.ai_suggestions.tasks[0].title).toBe("Plan weekly workout schedule");
      expect(res.data.ai_suggestions.tasks[0].priority).toBe("high");
    });
  });
});
