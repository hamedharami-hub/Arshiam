import { callAI, type AIMode } from "@/lib/ai";
import type {
  MindAIContext,
  MindAIResult,
  CbtAnalysisOutput,
  SocraticDialogueOutput,
  SocraticSummaryOutput,
  WorryBrainstormOutput,
  WeeklyInsightOutput,
} from "./types";
import { formatContextForPrompt } from "./contextBuilder";
import { getMindPrompt } from "./prompts";
import {
  validateCbtOutput,
  validateSocraticDialogueOutput,
  validateSocraticSummaryOutput,
  validateWorryBrainstormOutput,
  validateWeeklyInsightOutput,
} from "./schemas";

// In-memory debounce cache
interface CacheEntry {
  timestamp: number;
  promise: Promise<MindAIResult<any>>;
}

const debounceCache = new Map<string, CacheEntry>();
const DEBOUNCE_MS = 2000;

function computeCacheKey(ctx: MindAIContext): string {
  const fields = ctx.currentRecord?.fields || {};
  const fieldsStr = Object.keys(fields)
    .sort()
    .map((k) => `${k}:${JSON.stringify(fields[k]?.value)}`)
    .join("|");
  return `${ctx.operation}:${ctx.language}:${fieldsStr}`;
}

export async function executeMindAI<T = any>(
  ctx: MindAIContext,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<MindAIResult<T>> {
  const cacheKey = computeCacheKey(ctx);
  const now = Date.now();
  const cached = debounceCache.get(cacheKey);

  if (cached && now - cached.timestamp < DEBOUNCE_MS) {
    return cached.promise as Promise<MindAIResult<T>>;
  }

  const timeoutMs = options?.timeoutMs ?? 15000;
  const controller = new AbortController();

  // If external signal fires, abort controller
  if (options?.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  const timeoutTimer = setTimeout(() => {
    controller.abort(new Error(`Mind AI request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const execPromise = (async (): Promise<MindAIResult<T>> => {
    try {
      const { promptVersion, systemPrompt } = getMindPrompt(ctx.operation, ctx.language);
      const promptText = formatContextForPrompt(ctx);

      // Map MindAIOperation to base AIMode
      let baseMode: AIMode = "chat";
      if (ctx.operation === "cbt_analysis") baseMode = "distortion_detect";
      else if (ctx.operation === "socratic_dialogue") baseMode = "socratic";
      else if (ctx.operation === "socratic_summary") baseMode = "chat";
      else if (ctx.operation === "worry_brainstorm") baseMode = "suggest";
      else if (ctx.operation === "weekly_insight") baseMode = "chat";

      const startTime = Date.now();
      const rawRes = await callAI(
        baseMode,
        promptText,
        undefined,
        undefined,
        ctx.language,
        {
          systemPromptOverride: systemPrompt,
          signal: controller.signal,
        }
      );
      const duration = Date.now() - startTime;

      // Safe debug logging: only operation, duration, and version, NEVER sensitive content
      if (process.env.NODE_ENV === "development") {
        console.debug(`[MindAI] Completed ${ctx.operation} in ${duration}ms (ver: ${promptVersion})`);
      }

      const rawText = typeof rawRes === "string" ? rawRes : rawRes?.text || "";
      const rawData = typeof rawRes === "object" ? rawRes?.data : null;

      let validatedData: any;
      switch (ctx.operation) {
        case "cbt_analysis":
          validatedData = validateCbtOutput(rawData, rawText) as CbtAnalysisOutput;
          break;
        case "socratic_dialogue":
          validatedData = validateSocraticDialogueOutput(rawData, rawText) as SocraticDialogueOutput;
          break;
        case "socratic_summary":
          validatedData = validateSocraticSummaryOutput(rawData, rawText) as SocraticSummaryOutput;
          break;
        case "worry_brainstorm":
          validatedData = validateWorryBrainstormOutput(rawData, rawText) as WorryBrainstormOutput;
          break;
        case "weekly_insight":
          validatedData = validateWeeklyInsightOutput(rawData, rawText) as WeeklyInsightOutput;
          break;
        default:
          validatedData = rawData || { text: rawText };
      }

      return {
        data: validatedData as T,
        rawText,
        promptVersion,
        timestamp: new Date().toISOString(),
        provenance: "ai_suggestion",
      };
    } finally {
      clearTimeout(timeoutTimer);
    }
  })();

  debounceCache.set(cacheKey, { timestamp: now, promise: execPromise });

  // Clean cache after debounce window
  setTimeout(() => {
    if (debounceCache.get(cacheKey)?.timestamp === now) {
      debounceCache.delete(cacheKey);
    }
  }, DEBOUNCE_MS);

  return execPromise;
}
