import type { Distortion } from "@/lib/distortions";
import { DISTORTION_LABELS } from "@/lib/distortions";
import type {
  CbtAnalysisOutput,
  SocraticDialogueOutput,
  SocraticSummaryOutput,
  WorryBrainstormOutput,
  WeeklyInsightOutput,
} from "./types";

const VALID_DISTORTIONS = new Set(Object.keys(DISTORTION_LABELS));

export function normalizeDistortionKey(rawKey: string): Distortion | null {
  if (!rawKey || typeof rawKey !== "string") return null;
  let k = rawKey.toLowerCase().trim().replace(/[\s-]+/g, "_");

  // Common aliases
  if (k === "catastrophizing") k = "magnification";
  if (k === "all-or-nothing" || k === "black_and_white" || k === "polarization") k = "all_or_nothing";
  if (k === "should_statement" || k === "should_statements" || k === "must") k = "shoulds";
  if (k === "mind_reading" || k === "fortune_telling") k = "jumping_to_conclusions";
  if (k === "filtering") k = "mental_filter";
  if (k === "disqualifying_the_positive" || k === "discounting_the_positive") k = "discounting_positive";

  return VALID_DISTORTIONS.has(k) ? (k as Distortion) : null;
}

export function parseJsonFromText(text: string): any {
  if (!text || typeof text !== "string") return null;
  try {
    // 1. Check for markdown code block
    const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlock) {
      return JSON.parse(jsonBlock[1].trim());
    }
    // 2. Check for outermost JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0].trim());
    }
    // 3. Direct parse
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

export function validateCbtOutput(raw: any, fallbackText = ""): CbtAnalysisOutput {
  const data = typeof raw === "object" && raw !== null ? raw : parseJsonFromText(fallbackText) || {};

  const summary = typeof data.summary === "string" && data.summary.trim()
    ? data.summary.trim()
    : typeof data.text === "string" && data.text.trim()
    ? data.text.trim()
    : typeof fallbackText === "string" && fallbackText.trim()
    ? fallbackText.trim()
    : "تحلیل افکار ثبت‌شده بدون ادعای تشخیصی.";

  const observations: CbtAnalysisOutput["observations"] = [];
  if (Array.isArray(data.observations)) {
    for (const obs of data.observations) {
      if (obs && typeof obs === "object") {
        const field = ["situation", "automatic_thought", "evidence_for", "evidence_against"].includes(obs.field)
          ? obs.field
          : "automatic_thought";
        observations.push({
          field,
          quoteOrReference: String(obs.quoteOrReference || obs.reference || ""),
          observation: String(obs.observation || ""),
        });
      }
    }
  }

  const possible_patterns: CbtAnalysisOutput["possible_patterns"] = [];
  const rawPatterns = Array.isArray(data.possible_patterns)
    ? data.possible_patterns
    : Array.isArray(data.distortions)
    ? data.distortions
    : [];

  for (const p of rawPatterns) {
    if (p && typeof p === "object") {
      const normKey = normalizeDistortionKey(p.distortionKey || p.key || "");
      if (normKey) {
        possible_patterns.push({
          distortionKey: normKey,
          confidenceExplanation: String(p.confidenceExplanation || p.explanation || ""),
          referencedText: String(p.referencedText || p.quote || ""),
        });
      }
    }
  }

  const alternative_perspective =
    typeof data.alternative_perspective === "string" && data.alternative_perspective.trim()
      ? data.alternative_perspective.trim()
      : typeof data.alternative_thought === "string" && data.alternative_thought.trim()
      ? data.alternative_thought.trim()
      : null;

  const missing_information: string[] = Array.isArray(data.missing_information)
    ? data.missing_information.map(String).filter(Boolean)
    : [];

  const suggested_next_step =
    typeof data.suggested_next_step === "string" && data.suggested_next_step.trim()
      ? data.suggested_next_step.trim()
      : null;

  return {
    summary,
    observations,
    possible_patterns,
    alternative_perspective,
    missing_information,
    suggested_next_step,
  };
}

export function validateSocraticDialogueOutput(raw: any, fallbackText = ""): SocraticDialogueOutput {
  const data = typeof raw === "object" && raw !== null ? raw : parseJsonFromText(fallbackText) || {};

  let question = "";
  let observationOrEmpathy: string | undefined = undefined;
  let focusArea: SocraticDialogueOutput["focusArea"] = "evidence";

  if (typeof data.question === "string" && data.question.trim()) {
    question = data.question.trim();
    observationOrEmpathy = typeof data.observationOrEmpathy === "string" ? data.observationOrEmpathy.trim() : undefined;
    if (["evidence", "perspective", "value", "action", "clarification"].includes(data.focusArea)) {
      focusArea = data.focusArea;
    }
  } else if (typeof fallbackText === "string" && fallbackText.trim()) {
    // If output was plain text rather than JSON, extract the question
    const text = fallbackText.trim();
    // Split sentences
    const sentences = text.split(/(?<=[.!?؟\n])\s+/).filter(Boolean);
    const qSentence = sentences.find((s) => s.includes("?") || s.includes("؟"));
    if (qSentence) {
      question = qSentence.trim();
      const nonQ = sentences.filter((s) => s !== qSentence).join(" ").trim();
      if (nonQ) observationOrEmpathy = nonQ.slice(0, 150);
    } else {
      question = text;
    }
  }

  if (!question) {
    question = "چه شواهد مشخصی از این موقعیت داری که قابل مشاهده برای دیگران هم باشد؟";
  }

  return {
    question,
    observationOrEmpathy,
    focusArea,
  };
}

export function validateSocraticSummaryOutput(raw: any, fallbackText = ""): SocraticSummaryOutput {
  const data = typeof raw === "object" && raw !== null ? raw : parseJsonFromText(fallbackText) || {};

  let key_insights: string[] = [];
  if (Array.isArray(data.key_insights) && data.key_insights.length > 0) {
    key_insights = data.key_insights.map(String).filter(Boolean);
  } else if (typeof fallbackText === "string" && fallbackText.trim()) {
    key_insights = fallbackText
      .split("\n")
      .map((l) => l.replace(/^[\d\-\.\*\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  if (key_insights.length === 0) {
    key_insights = ["بررسی افکار و شواهد در این گفت‌وگو به افزایش وضوح موضوع کمک کرد."];
  }

  return {
    key_insights,
    potential_next_step: typeof data.potential_next_step === "string" ? data.potential_next_step.trim() : null,
    user_agency_note:
      typeof data.user_agency_note === "string"
        ? data.user_agency_note.trim()
        : "انتخاب اقدام و تفسیر نهایی همواره بر عهده خود شماست.",
  };
}

export function validateWorryBrainstormOutput(raw: any, fallbackText = ""): WorryBrainstormOutput {
  const data = typeof raw === "object" && raw !== null ? raw : parseJsonFromText(fallbackText) || {};

  const validControls = ["actionable", "partial", "uncontrollable", "uncertain"] as const;
  const control_level_recognized = validControls.includes(data.control_level_recognized)
    ? data.control_level_recognized
    : "actionable";

  const suggested_options: WorryBrainstormOutput["suggested_options"] = [];
  const rawOpts = Array.isArray(data.suggested_options)
    ? data.suggested_options
    : Array.isArray(data.options)
    ? data.options
    : [];

  for (let i = 0; i < rawOpts.length && suggested_options.length < 3; i++) {
    const opt = rawOpts[i];
    if (typeof opt === "string" && opt.trim()) {
      suggested_options.push({
        id: `opt-${i + 1}`,
        title: opt.trim(),
        isWithinUserControl: true,
      });
    } else if (opt && typeof opt === "object" && typeof opt.title === "string") {
      suggested_options.push({
        id: String(opt.id || `opt-${i + 1}`),
        title: opt.title.trim(),
        isWithinUserControl: opt.isWithinUserControl ?? true,
        estimatedEffort: ["low", "medium", "high"].includes(opt.estimatedEffort) ? opt.estimatedEffort : undefined,
      });
    }
  }

  // Fallback to splitting plain text lines if no options parsed
  if (suggested_options.length === 0 && typeof fallbackText === "string" && fallbackText.trim()) {
    const lines = fallbackText
      .split("\n")
      .map((l) => l.replace(/^[\d\-\.\*\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    lines.forEach((l, idx) => {
      suggested_options.push({
        id: `opt-${idx + 1}`,
        title: l,
        isWithinUserControl: true,
      });
    });
  }

  return {
    control_level_recognized,
    clarifying_question: typeof data.clarifying_question === "string" ? data.clarifying_question.trim() : null,
    suggested_options,
    acceptance_note: typeof data.acceptance_note === "string" ? data.acceptance_note.trim() : null,
  };
}

export function validateWeeklyInsightOutput(raw: any, fallbackText = ""): WeeklyInsightOutput {
  const data = typeof raw === "object" && raw !== null ? raw : parseJsonFromText(fallbackText) || {};

  return {
    logged_days_summary:
      typeof data.logged_days_summary === "string"
        ? data.logged_days_summary.trim()
        : "تعداد روزهای ثبت بازتاب‌دهنده حضور مستمر شما در مسیر خودآگاهی است.",
    action_feedback_summary:
      typeof data.action_feedback_summary === "string"
        ? data.action_feedback_summary.trim()
        : "بررسی اقدامات نشان می‌دهد چه رفتارهایی عملاً برای شما کارآمد بوده‌اند.",
    cautious_observation:
      typeof data.cautious_observation === "string"
        ? data.cautious_observation.trim()
        : "انجام کارها لزوماً به معنی تغییر فوری خلق نیست، اما فرصتی برای کسب تجربه است.",
    suggested_reflection_question:
      typeof data.suggested_reflection_question === "string"
        ? data.suggested_reflection_question.trim()
        : "در هفته آینده کدام اقدام کوچک بیشترین احساس معناداری را به شما می‌دهد؟",
  };
}
