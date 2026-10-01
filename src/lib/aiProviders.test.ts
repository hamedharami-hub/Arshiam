import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyAIError, aiErrorMessage, deleteProviderKey, fallbackModelFor, getProviderKey, maskKey, saveProviderKey, testProviderKey } from "./aiProviders";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("provider key store", () => {
  it("saves, masks and deletes a key per provider independently", () => {
    saveProviderKey("openai", "sk-abcdefghijklmnop1234");
    saveProviderKey("gemini", "AIza-gemini-key-9999");
    expect(getProviderKey("openai")).toBe("sk-abcdefghijklmnop1234");
    expect(maskKey(getProviderKey("openai"))).toMatch(/^sk-•+1234$/);
    expect(maskKey(getProviderKey("openai"))).not.toContain("abcdefgh");
    deleteProviderKey("openai");
    expect(getProviderKey("openai")).toBe("");
    expect(getProviderKey("gemini")).toBe("AIza-gemini-key-9999");
  });
});

describe("error classification", () => {
  it.each([
    ["API key not valid. Please pass a valid API key.", 400, "invalid_key"],
    ["Incorrect API key provided", 401, "invalid_key"],
    ["You exceeded your current quota", 429, "quota"],
    ["RESOURCE_EXHAUSTED", undefined, "quota"],
    ["The model `gpt-9` does not exist", 404, "model_unavailable"],
    ["models/gemini-3-pro-preview is not found for API version v1beta", undefined, "model_unavailable"],
    ["Failed to fetch", undefined, "network"],
    ["something odd", undefined, "unknown"],
  ] as const)("%s -> %s", (msg, status, kind) => expect(classifyAIError(msg, status)).toBe(kind));

  it("names the replacement model in both languages", () => {
    expect(fallbackModelFor("gpt-5.4")).toBe("gpt-5.4-mini");
    expect(aiErrorMessage("model_unavailable", "en", { model: "gpt-5.4", fallback: "gpt-5.4-mini" })).toContain("gpt-5.4-mini");
    expect(aiErrorMessage("model_unavailable", "fa", { model: "gpt-5.4", fallback: "gpt-5.4-mini" })).toContain("gpt-5.4-mini");
  });
});

describe("testProviderKey", () => {
  it("reports an invalid key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "bad" }));
    expect(await testProviderKey("openai", "sk-x")).toEqual({ ok: false, kind: "invalid_key" });
  });
  it("reports exhausted quota", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "quota" }));
    expect((await testProviderKey("anthropic", "k")).kind).toBe("quota");
  });
  it("flags a retired model and suggests the replacement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [{ id: "gpt-5.4-mini" }] }) }));
    const r = await testProviderKey("openai", "sk-x", "gpt-5.4");
    expect(r).toMatchObject({ ok: true, modelAvailable: false, fallback: "gpt-5.4-mini" });
  });
  it("accepts a valid key whose model exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ models: [{ name: "models/gemini-3-flash-preview" }] }) }));
    expect(await testProviderKey("gemini", "k", "gemini-3-flash-preview")).toMatchObject({ ok: true, modelAvailable: true });
  });
  it("maps a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect((await testProviderKey("groq", "k")).kind).toBe("network");
  });
});
