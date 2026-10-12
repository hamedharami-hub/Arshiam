import { beforeEach, describe, expect, it, vi } from "vitest";

const { ai } = vi.hoisted(() => ({ ai: vi.fn() }));
vi.mock("@/lib/ai", () => ({ callAI: ai }));
import { createMindAIContext, formatContextForPrompt } from "./contextBuilder";
import { executeMindAI } from "./executor";

describe("Mind AI declared context", () => {
  beforeEach(() => ai.mockReset().mockResolvedValue({ text: "{}", data: {} }));

  it("sends exactly the supplied context without personalization enrichment", async () => {
    const ctx = createMindAIContext({ operation: "weekly_insight", promptVersion: "weekly_insight_v1.0", tool: "weekly", fields: { count: { value: 3 } } });
    await executeMindAI(ctx, { cacheScope: "owner-1" });
    expect(ai).toHaveBeenCalledWith("chat", formatContextForPrompt(ctx), undefined, undefined, "fa", expect.objectContaining({ skipPersonalization: true }));
  });

  it("does not reuse another account's cached result", async () => {
    const ctx = createMindAIContext({ operation: "weekly_insight", promptVersion: "weekly_insight_v1.0", tool: "weekly", fields: { count: { value: 99 } } });
    await executeMindAI(ctx, { cacheScope: "owner-a" });
    await executeMindAI(ctx, { cacheScope: "owner-b" });
    expect(ai).toHaveBeenCalledTimes(2);
  });
});
