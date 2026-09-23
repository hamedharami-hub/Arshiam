import { callAI } from "./ai";

/**
 * Checks whether the given text contains Persian/Arabic characters.
 */
export function isPersianText(text: string | null | undefined): boolean {
  if (!text) return false;
  // Match Persian/Arabic unicode range
  return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Determines reading direction ("rtl" or "ltr") based on content.
 * If text contains Persian/Arabic characters, returns "rtl", otherwise "ltr".
 */
export function detectDirection(text: string | null | undefined): "rtl" | "ltr" {
  return isPersianText(text) ? "rtl" : "ltr";
}

/**
 * Returns CSS classes for text alignment and direction.
 */
export function getTextDirClasses(text: string | null | undefined): {
  dir: "rtl" | "ltr";
  textAlign: "text-right" | "text-left";
  className: string;
} {
  const dir = detectDirection(text);
  const textAlign = dir === "rtl" ? "text-right" : "text-left";
  return {
    dir,
    textAlign,
    className: `${textAlign} ${dir === "rtl" ? "dir-rtl" : "dir-ltr"}`,
  };
}

/**
 * AI Service to generate a bilingual (English <-> Persian) version of an educational lesson.
 */
export async function generateBilingualLesson(params: {
  title: string;
  content: string;
  targetLang?: "en" | "fa";
}): Promise<{
  title_en: string;
  content_en: string;
}> {
  const { title, content, targetLang = "en" } = params;

  if (!content || !content.trim()) {
    throw new Error("Content cannot be empty");
  }

  const systemPrompt = `You are a bilingual medical, clinical, and scientific translator and educator for the Arshnaz application.
Your goal is to translate and structure the given educational document into its professional ${
    targetLang === "en" ? "English" : "Persian"
  } version.

CRITICAL INSTRUCTIONS:
1. Preserve all clinical facts, drug dosages, indications, mechanisms, and contraindications accurately.
2. Format the output in clean, native HTML:
   - Use <h1>, <h2>, <h3> for headings.
   - Use <p> for paragraphs.
   - Use <div class="callout-pearl"><strong>💡 Clinical Pearl:</strong><p>...</p></div> for golden notes.
   - Use <div class="callout-warning"><strong>⚠️ Warning / Red Flag:</strong><p>...</p></div> for contraindications.
   - Use <div class="callout-dosage"><strong>💊 Dosing & Administration:</strong><p>...</p></div> for dosages.
   - Use <table class="knowledge-table"> for comparison tables.
3. Return output as a valid JSON object with keys:
   - "title_en": (string, English title)
   - "content_en": (string, formatted English HTML content)
Do NOT include any extra text outside the JSON object.`;

  try {
    const aiResult = await callAI(
      "note_actions",
      {
        title,
        content: content.slice(0, 4000),
      },
      undefined,
      "translate_educational_lesson",
      "auto",
      { systemPromptOverride: systemPrompt }
    );

    const rawText = typeof aiResult === "string" ? aiResult : aiResult?.text || JSON.stringify(aiResult);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.content_en) {
        return {
          title_en: parsed.title_en || title,
          content_en: parsed.content_en,
        };
      }
    }
  } catch (err) {
    console.warn("AI translation failed, using fallback bilingual generator:", err);
  }

  // Fallback: Wrap existing content with clean English/Bilingual metadata placeholder
  return {
    title_en: `${title} (English Reference)`,
    content_en: `<div class="callout-note"><strong>📘 English Summary & Reference:</strong><p>${title}</p></div><div class="dir-ltr text-left">${content}</div>`,
  };
}
