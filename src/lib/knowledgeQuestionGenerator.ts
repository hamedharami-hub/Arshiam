import { callAI } from "./ai";

export interface QuestionGenOptions {
  text: string;
  documentTitle?: string;
  mode?: "auto" | "clinical_pearl" | "mcq" | "warning" | "dosing";
  customPrompt?: string;
  count?: number;
}

export interface GeneratedQuestionItem {
  id: string;
  front: string;
  back: string;
  clue?: string;
  type?: "clinical_pearl" | "mcq" | "warning" | "dosing" | "concept";
  selected: boolean;
}

const SECTION_LABELS: Array<{ type: GeneratedQuestionItem["type"]; labels: string[] }> = [
  { type: "warning", labels: ["هشدارها", "هشدار", "منع مصرف", "احتیاط", "warnings", "contraindications", "cautions"] },
  { type: "clinical_pearl", labels: ["زوج‌های تداخلی پرتکرار", "تداخلات پرتکرار", "زوج‌های تداخلی", "تداخلات", "تداخل", "interacting pairs", "interactions"] },
  { type: "warning", labels: ["مهارکننده‌ها", "مهارکننده", "potent inhibitors", "inhibitors", "inhibitor"] },
  { type: "concept", labels: ["القاکننده‌ها", "القاکننده", "inducers", "inducer"] },
  { type: "concept", labels: ["سوبستراها", "سوبسترا", "substrates", "substrate"] },
  { type: "dosing", labels: ["مقدار مصرف", "دوز", "dosage", "dose"] },
  { type: "clinical_pearl", labels: ["عوارض جانبی", "عوارض", "adverse effects", "side effects"] },
  { type: "clinical_pearl", labels: ["اندیکاسیون‌ها", "اندیکاسیون", "موارد مصرف", "indications", "indication"] },
  { type: "concept", labels: ["مکانیسم اثر", "مکانیسم", "mechanism of action", "mechanism"] },
];
const NON_CARD_LABELS = [
  "مسیر متابولیک و اهمیت بالینی",
  "آنزیم سیتوکروم کبد",
  "hepatic metabolic pathway & clinical significance",
  "cytochrome p450 isoenzyme",
];

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&", nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'",
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|nbsp|lt|gt|quot|apos);/gi, (entity, code: string) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const numeric = code[1]?.toLowerCase() === "x"
      ? Number.parseInt(code.slice(2), 16)
      : Number.parseInt(code.slice(1), 10);
    try {
      return Number.isFinite(numeric) && numeric >= 0 && numeric <= 0x10ffff
        ? String.fromCodePoint(numeric)
        : entity;
    } catch {
      return entity;
    }
  });
}

function normalizeStudyText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForComparison(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "").trim();
}

function getLabelSections(text: string): Array<{ label: string; type: GeneratedQuestionItem["type"]; value: string }> {
  const labelDefinitions = SECTION_LABELS.flatMap((section) =>
    section.labels.map((label) => ({ label, type: section.type }))
  ).sort((a, b) => b.label.length - a.label.length);
  const allLabels = [
    ...labelDefinitions.map((item) => ({ ...item, isCardLabel: true })),
    ...NON_CARD_LABELS.map((label) => ({ label, type: undefined, isCardLabel: false })),
  ].sort((a, b) => b.label.length - a.label.length);
  const alternatives = allLabels.map(({ label }) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const matcher = new RegExp(`(?:[🚫⚡🎯⚠️❗]+\\s*)?(${alternatives.join("|")})(?:\\s*\\([^)]*\\))?\\s*:`, "giu");
  const matches = Array.from(text.matchAll(matcher));

  return matches.flatMap((match, index) => {
    const label = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    const value = text.slice(start, end).replace(/^[\s:–—-]+|[\s;•|]+$/g, "").trim();
    if (!value) return [];
    const definition = allLabels.find((item) => item.label.toLocaleLowerCase() === label.toLocaleLowerCase());
    return definition?.isCardLabel && definition.type ? [{ label, type: definition.type, value }] : [];
  });
}

function makeSectionQuestion(label: string, title: string | undefined, isPersian: boolean): string {
  if (isPersian) return `در بخش «${label}» مربوط به «${title || "این مبحث"}» چه مواردی فهرست شده‌اند؟`;
  return `Which items are listed under "${label}" for "${title || "this topic"}"?`;
}

function isUsefulCandidate(front: string, back: string, sourceText: string): boolean {
  const question = normalizeStudyText(front);
  const answer = normalizeStudyText(back);
  const normalizedAnswer = normalizeForComparison(answer);
  const normalizedSource = normalizeForComparison(sourceText);
  if (question.length < 8 || answer.length < 3 || answer.length > 1000) return false;
  if (normalizedAnswer === normalizedSource) return false;
  if (sourceText.length > 120 && answer.length >= Math.max(300, sourceText.length * 0.7)) return false;
  return true;
}

const SYSTEM_PROMPT = `You are an expert clinical and educational flashcard question generator for a Spaced Repetition (Leitner) and Mind Map system.
Your goal is to extract high-yield, clear, and actionable study flashcards from the provided study text or excerpt.

GUIDELINES:
1. Use only facts explicitly supported by the source text. Do not add outside clinical knowledge or infer missing details.
2. Each card must test one fact. Keep each answer concise (normally one short sentence or a short list); never copy the entire source text into an answer.
3. Target High-Yield Concepts: Formulate questions that test core mechanisms, clinical pearls, definitions, indications, contraindications, dosages, or key exam facts.
4. Structure:
   - "front": Clear, specific question or prompt. (If in Persian, write in fluent Persian; if English, write in English. Match the input text language).
   - "back": Clear, concise, accurate answer or explanation.
   - "clue": (Optional) Short hint, mnemonic, or key takeaway.
   - "type": "clinical_pearl" | "warning" | "dosing" | "concept" | "mcq"
5. Output format: Return ONLY a valid JSON array of objects with keys: front, back, clue, type.
Do NOT include markdown formatting or commentary outside the JSON array.`;

/**
 * Parses raw AI text output into an array of question candidate objects.
 */
export function extractJsonFromResponse(rawText: string): any[] {
  if (!rawText) return [];
  const trimmed = rawText.trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.cards)) return parsed.cards;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {}

  // Try extracting from markdown code block ```json ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.cards)) return parsed.cards;
      if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    } catch {}
  }

  // Try extracting between first '[' and last ']'
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      const slice = trimmed.substring(firstBracket, lastBracket + 1);
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return [];
}

/**
 * Offline / Fallback Question Generator
 * Deterministically extracts high-yield questions from text when offline or when AI is unavailable.
 */
export function generateOfflineQuestions(text: string, title?: string): GeneratedQuestionItem[] {
  const clean = normalizeStudyText(text);

  if (!clean) return [];

  // Prefer explicitly labelled study sections: they keep a question and answer tied
  // to a concrete source heading, even when the source HTML was flattened to one line.
  const isPersian = /[\u0600-\u06FF]/.test(clean);
  const results: GeneratedQuestionItem[] = [];
  const seenAnswers = new Set<string>();
  const labelledSections = getLabelSections(clean);
  for (const section of labelledSections) {
    const answerKey = normalizeForComparison(section.value);
    if (!answerKey || seenAnswers.has(answerKey) || !isUsefulCandidate("A specific question about this labelled section?", section.value, clean)) continue;
    seenAnswers.add(answerKey);
    results.push({
      id: `gen-offline-${Date.now()}-${results.length}`,
      front: makeSectionQuestion(section.label, title, isPersian),
      back: section.value,
      clue: section.label,
      type: section.type,
      selected: true,
    });
    if (results.length >= 5) return results;
  }

  // Add concise sentence/definition cards for useful facts not covered by a labelled section.
  const sentences = clean
    .split(/([.!?؛\n]+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const fallbackResults: GeneratedQuestionItem[] = [];
  const fallbackAnswers = new Set(seenAnswers);

  // Strategy 1: Look for colon/dash definitions "X: Y" or "X – Y"
  for (let i = 0; i < sentences.length && fallbackResults.length < 5; i++) {
    const s = sentences[i];
    const colonMatch = s.match(/^([^:–—\-]+)[:–—\-]\s*(.+)$/);
    const hasColon = colonMatch && colonMatch[1].length < 60 && colonMatch[2].length > 15;
    const subject = hasColon ? colonMatch[1].trim() : title || "";
    const detail = hasColon ? colonMatch[2].trim() : s;

    // Check warning / contraindication keywords
    if (/(هشدار|منع\s*مصرف|احتیاط|تداخل|خطر|warning|contraindicat|caution|adverse|toxic)/i.test(s)) {
      const front = isPersian
        ? `چه هشدار یا منع مصرفی در این متن ذکر شده است؟`
        : `What warning or contraindication is stated in the source?`;
      const answerKey = normalizeForComparison(detail);
      if (!isUsefulCandidate(front, detail, clean) || fallbackAnswers.has(answerKey)) continue;
      fallbackAnswers.add(answerKey);
      fallbackResults.push({
        id: `gen-offline-${Date.now()}-${fallbackResults.length}`,
        front,
        back: detail,
        clue: isPersian ? "نکات ایمنی و منع مصرف" : "Safety warning",
        type: "warning",
        selected: true,
      });
      continue;
    }

    // Check definition via colon/dash
    if (hasColon) {
      const front = isPersian
        ? `ویژگی یا تعریف «${subject}» در متن چیست؟`
        : `What definition or characteristic of "${subject}" is given in the source?`;
      const answerKey = normalizeForComparison(detail);
      if (!isUsefulCandidate(front, detail, clean) || fallbackAnswers.has(answerKey)) continue;
      fallbackAnswers.add(answerKey);
      fallbackResults.push({
        id: `gen-offline-${Date.now()}-${fallbackResults.length}`,
        front,
        back: detail,
        clue: title || subject,
        type: "concept",
        selected: true,
      });
      continue;
    }

    // Check mechanism or clinical pearl
    if (/(مکانیسم|درمان|داروی|اندیکاسیون|علت|سبب|باعث|mechanism|indicated|treat|therapy|cause)/i.test(s)) {
      const front = isPersian
        ? `چه نکتهٔ بالینی مشخصی دربارهٔ «${title || "این مبحث"}» در متن آمده است؟`
        : `What specific clinical point about "${title || "this topic"}" is stated in the source?`;
      const answerKey = normalizeForComparison(s);
      if (!isUsefulCandidate(front, s, clean) || fallbackAnswers.has(answerKey)) continue;
      fallbackAnswers.add(answerKey);
      fallbackResults.push({
        id: `gen-offline-${Date.now()}-${fallbackResults.length}`,
        front,
        back: s,
        clue: title || (isPersian ? "نکته درمانی" : "Clinical Pearl"),
        type: "clinical_pearl",
        selected: true,
      });
      continue;
    }
  }

  return [...results, ...fallbackResults].slice(0, 5);
}

/**
 * Main Question Generator function
 * Calls AI service with fallback to deterministic offline generation.
 */
export async function generateQuestionsFromText(
  options: QuestionGenOptions
): Promise<GeneratedQuestionItem[]> {
  const { text, documentTitle, mode = "auto", customPrompt, count = 4 } = options;

  if (!text || !text.trim()) {
    return [];
  }

  const cleanText = normalizeStudyText(text).replace(/\n+/g, " ");
  const promptParts: string[] = [
    `Context Title: ${documentTitle || "Study Document"}`,
    `Mode: ${mode}`,
    `Desired flashcard count: ${count}`,
  ];

  if (customPrompt?.trim()) {
    promptParts.push(`Custom instructions: ${customPrompt.trim()}`);
  }

  promptParts.push(`\nSource Text to generate flashcards from:\n${cleanText.slice(0, 4000)}`);

  try {
    const aiRes = await callAI(
      "suggest",
      promptParts.join("\n"),
      undefined,
      "generate_flashcards",
      undefined,
      { systemPromptOverride: SYSTEM_PROMPT }
    );

    const rawOutput = typeof aiRes === "string" ? aiRes : aiRes?.text || JSON.stringify(aiRes);
    const parsed = extractJsonFromResponse(rawOutput);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const seenQuestions = new Set<string>();
      const validCards = parsed.reduce<GeneratedQuestionItem[]>((cards, item, idx) => {
        if (!item || typeof item !== "object" || !(item.front || item.question) || !(item.back || item.answer)) return cards;
        const front = normalizeStudyText(String(item.front || item.question));
        const back = normalizeStudyText(String(item.back || item.answer));
        const questionKey = normalizeForComparison(front);
        if (!isUsefulCandidate(front, back, cleanText) || seenQuestions.has(questionKey)) return cards;
        seenQuestions.add(questionKey);
        const rawType = String(item.type || "");
        const type: GeneratedQuestionItem["type"] = ["clinical_pearl", "mcq", "warning", "dosing", "concept"].includes(rawType)
          ? rawType as GeneratedQuestionItem["type"]
          : mode === "clinical_pearl" ? "clinical_pearl" : mode === "warning" ? "warning" : "concept";
        cards.push({
          id: `gen-ai-${Date.now()}-${idx}`,
          front,
          back,
          clue: item.clue || item.pearl || item.hint ? normalizeStudyText(String(item.clue || item.pearl || item.hint)) : undefined,
          type,
          selected: true,
        });
        return cards;
      }, []);

      if (validCards.length > 0) {
        return validCards;
      }
    }
  } catch (err) {
    console.warn("AI generation failed or offline, falling back to deterministic extractor:", err);
  }

  // Fallback to offline heuristic extractor
  return generateOfflineQuestions(cleanText, documentTitle);
}
