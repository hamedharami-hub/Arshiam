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

const SYSTEM_PROMPT = `You are an expert clinical and educational flashcard question generator for a Spaced Repetition (Leitner) and Mind Map system.
Your goal is to extract high-yield, clear, and actionable study flashcards from the provided study text or excerpt.

GUIDELINES:
1. Target High-Yield Concepts: Formulate questions that test core mechanisms, clinical pearls, definitions, indications, contraindications, dosages, or key exam facts.
2. Structure:
   - "front": Clear, specific question or prompt. (If in Persian, write in fluent Persian; if English, write in English. Match the input text language).
   - "back": Clear, concise, accurate answer or explanation.
   - "clue": (Optional) Short hint, mnemonic, or key takeaway.
   - "type": "clinical_pearl" | "warning" | "dosing" | "concept" | "mcq"
3. Output format: Return ONLY a valid JSON array of objects with keys: front, back, clue, type.
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
  const clean = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return [];

  // Split into sentences or clauses
  const sentences = clean
    .split(/([.!?؛\n]+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const results: GeneratedQuestionItem[] = [];
  const isPersian = /[\u0600-\u06FF]/.test(clean);

  // Strategy 1: Look for colon/dash definitions "X: Y" or "X – Y"
  for (let i = 0; i < sentences.length && results.length < 5; i++) {
    const s = sentences[i];
    const colonMatch = s.match(/^([^:–—\-]+)[:–—\-]\s*(.+)$/);
    const hasColon = colonMatch && colonMatch[1].length < 60 && colonMatch[2].length > 15;
    const subject = hasColon ? colonMatch[1].trim() : title || "";
    const detail = hasColon ? colonMatch[2].trim() : s;

    // Check warning / contraindication keywords
    if (/(هشدار|منع\s*مصرف|احتیاط|تداخل|خطر|warning|contraindicat|caution|adverse|toxic)/i.test(s)) {
      results.push({
        id: `gen-offline-${Date.now()}-${results.length}`,
        front: isPersian
          ? `هشدار یا منع مصرف مهم در مورد «${title || subject || "این دارو/مبحث"}» چیست؟`
          : `What is an important caution or warning regarding "${title || subject || "this topic"}"?`,
        back: detail,
        clue: isPersian ? "نکات ایمنی و منع مصرف" : "Safety warning",
        type: "warning",
        selected: true,
      });
      continue;
    }

    // Check definition via colon/dash
    if (hasColon) {
      results.push({
        id: `gen-offline-${Date.now()}-${results.length}`,
        front: isPersian
          ? `تعریف یا ویژگی اصلی «${subject}» چیست؟`
          : `What is the definition or key characteristic of "${subject}"?`,
        back: detail,
        clue: title || subject,
        type: "concept",
        selected: true,
      });
      continue;
    }

    // Check mechanism or clinical pearl
    if (/(مکانیسم|درمان|داروی|اندیکاسیون|علت|سبب|باعث|mechanism|indicated|treat|therapy|cause)/i.test(s)) {
      results.push({
        id: `gen-offline-${Date.now()}-${results.length}`,
        front: isPersian
          ? `نکته بالینی یا درمانی درباره «${title || s.slice(0, 30)}» چیست؟`
          : `What is the clinical finding or therapeutic implication of "${title || s.slice(0, 30)}"?`,
        back: s,
        clue: title || (isPersian ? "نکته درمانی" : "Clinical Pearl"),
        type: "clinical_pearl",
        selected: true,
      });
      continue;
    }
  }

  // If still fewer than 2, turn remaining sentences into direct study flashcards
  if (results.length < 2 && sentences.length > 0) {
    sentences.slice(0, 3).forEach((sentence, idx) => {
      if (results.some((r) => r.back === sentence)) return;
      results.push({
        id: `gen-offline-${Date.now()}-${results.length}-${idx}`,
        front: isPersian
          ? `نکته کلیدی مرتبط با «${title || `بخش ${idx + 1}`}» چیست؟`
          : `What is the key takeaway regarding "${title || `Section ${idx + 1}`}"?`,
        back: sentence,
        clue: title,
        type: "concept",
        selected: true,
      });
    });
  }

  return results;
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

  const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
      const validCards: GeneratedQuestionItem[] = parsed
        .filter((item) => item && typeof item === "object" && (item.front || item.question) && (item.back || item.answer))
        .map((item, idx) => ({
          id: `gen-ai-${Date.now()}-${idx}`,
          front: String(item.front || item.question).trim(),
          back: String(item.back || item.answer).trim(),
          clue: item.clue || item.pearl || item.hint ? String(item.clue || item.pearl || item.hint).trim() : undefined,
          type: item.type || (mode === "clinical_pearl" ? "clinical_pearl" : mode === "warning" ? "warning" : "concept"),
          selected: true,
        }));

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
