import type { KnowledgeDocument } from "./knowledgeTypes";

export interface KnowledgeCheckpoint {
  id: string;
  type: "firstline" | "redflags" | "pearls" | "interactions" | "mechanisms" | "general";
  questionFa: string;
  questionEn: string;
  answerFa: string;
  answerEn?: string;
  badgeFa: string;
  badgeEn: string;
  color: string;
}

/**
 * Strips HTML tags and collapses whitespace
 */
function cleanText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a substring between an opening heading/marker and next block in HTML
 */
function extractSection(html: string, regexStart: RegExp): string | null {
  const match = regexStart.exec(html);
  if (!match) return null;
  const startIdx = match.index + match[0].length;
  const rest = html.slice(startIdx);
  // Find next section header or end of container
  const endMatch = /<(?:h2|h3|h4|hr|div class="[^"]*(?:border-t|mt-))/i.exec(rest);
  const sectionContent = endMatch ? rest.slice(0, endMatch.index) : rest.slice(0, 800);
  const text = cleanText(sectionContent);
  return text.length > 10 ? text : null;
}

/**
 * Extracts up to 3 high-yield clinical checkpoints from document content
 */
export function extractDocumentCheckpoints(doc: KnowledgeDocument): KnowledgeCheckpoint[] {
  const checkpoints: KnowledgeCheckpoint[] = [];
  const html = doc.content_html || "";
  const htmlEn = doc.content_en || "";

  // 1. First-line Treatment & Dosing
  if (
    html.includes("داروی خط اول") ||
    html.includes("خط اول درمان") ||
    html.includes("firstLine") ||
    htmlEn.toLowerCase().includes("first-line")
  ) {
    const rawAnswer =
      extractSection(html, /(?:داروی خط اول|خط اول درمان|First-Line|firstLine)[^<]*<\/h[234]>/i) ||
      extractSection(html, /<strong>(?:داروی خط اول|خط اول درمان)<\/strong>/i) ||
      "داروی خط اول توصیه شده طبق پروتکل‌های بالینی دایره‌المعارف دارویی.";

    const rawAnswerEn =
      extractSection(htmlEn, /First-line[^<]*<\/h[234]>/i) ||
      extractSection(htmlEn, /<strong>First-line/i) ||
      undefined;

    checkpoints.push({
      id: `${doc.id}-cp-firstline`,
      type: "firstline",
      questionFa: `داروی خط اول و دستور مصرف استاندارد برای «${doc.title}» چیست؟`,
      questionEn: `What is the first-line medication and standard dosing for "${doc.title_en || doc.title}"?`,
      answerFa: rawAnswer.slice(0, 450),
      answerEn: rawAnswerEn ? rawAnswerEn.slice(0, 450) : undefined,
      badgeFa: "خط اول درمان",
      badgeEn: "First-Line Dosing",
      color: "#10b981",
    });
  }

  // 2. Red Flags & Urgent Referral
  if (
    html.includes("علائم هشدار") ||
    html.includes("پرچم قرمز") ||
    html.includes("Red Flags") ||
    htmlEn.toLowerCase().includes("red flags")
  ) {
    const rawAnswer =
      extractSection(html, /(?:علائم هشدار|پرچم قرمز|Red Flags)[^<]*<\/h[234]>/i) ||
      extractSection(html, /<strong>(?:علائم هشدار|پرچم قرمز|Red Flags)<\/strong>/i) ||
      "موارد ارجاع اورژانسی و علائم هشدار سیستمیک در پروتکل ثبت شده است.";

    const rawAnswerEn =
      extractSection(htmlEn, /Red Flags[^<]*<\/h[234]>/i) ||
      extractSection(htmlEn, /<strong>Red Flags/i) ||
      undefined;

    checkpoints.push({
      id: `${doc.id}-cp-redflags`,
      type: "redflags",
      questionFa: `مهم‌ترین علائم هشدار (Red Flags) و معیارهای ارجاع به پزشک در «${doc.title}» کدامند؟`,
      questionEn: `What are the critical red flags and urgent referral criteria for "${doc.title_en || doc.title}"?`,
      answerFa: rawAnswer.slice(0, 450),
      answerEn: rawAnswerEn ? rawAnswerEn.slice(0, 450) : undefined,
      badgeFa: "علائم هشدار و پرچم قرمز",
      badgeEn: "Red Flags",
      color: "#ef4444",
    });
  }

  // 3. Clinical Pearls & Counseling
  if (
    html.includes("نکات طلایی") ||
    html.includes("مروارید بالینی") ||
    html.includes("Clinical Pearl") ||
    htmlEn.toLowerCase().includes("pearl")
  ) {
    const rawAnswer =
      extractSection(html, /(?:نکات طلایی|مروارید بالینی|Clinical Pearl)[^<]*<\/h[234]>/i) ||
      extractSection(html, /<strong>(?:نکات طلایی|مروارید بالینی)<\/strong>/i) ||
      "نکته طلایی بالینی جهت آموزش و ارتقای ایمنی بیمار ثبت شده است.";

    const rawAnswerEn =
      extractSection(htmlEn, /Clinical Pearls?[^<]*<\/h[234]>/i) ||
      extractSection(htmlEn, /<strong>Clinical Pearls?/i) ||
      undefined;

    checkpoints.push({
      id: `${doc.id}-cp-pearls`,
      type: "pearls",
      questionFa: `کلیدی‌ترین نکته طلایی بالینی (Clinical Pearl) در درمان «${doc.title}» چیست؟`,
      questionEn: `What is the key clinical pearl for managing "${doc.title_en || doc.title}"?`,
      answerFa: rawAnswer.slice(0, 450),
      answerEn: rawAnswerEn ? rawAnswerEn.slice(0, 450) : undefined,
      badgeFa: "نکات طلایی بالینی",
      badgeEn: "Clinical Pearl",
      color: "#f59e0b",
    });
  }

  // 4. CYP Enzymes & Drug Interactions Checkpoint
  if (
    checkpoints.length < 3 &&
    (html.includes("سیتوکروم") ||
      html.includes("CYP") ||
      html.includes("مهارکننده") ||
      html.includes("القاکننده"))
  ) {
    const rawAnswer =
      extractSection(html, /(?:سوبستراها|مهارکننده‌ها|القاکننده‌ها|تداخلات)[^<]*<\/h[234]>/i) ||
      cleanText(html).slice(0, 350);

    checkpoints.push({
      id: `${doc.id}-cp-cyp`,
      type: "interactions",
      questionFa: `مهم‌ترین سوبستراها، مهارکننده‌ها یا تداخلات دارویی مربوط به «${doc.title}» کدامند؟`,
      questionEn: `What are the primary substrates, inhibitors, or interactions associated with "${doc.title_en || doc.title}"?`,
      answerFa: rawAnswer.slice(0, 450),
      badgeFa: "تداخلات و سیتوکروم",
      badgeEn: "CYP & Interactions",
      color: "#8b5cf6",
    });
  }

  // 5. Fallback General Comprehension Checkpoint if fewer than 2 checkpoints
  if (checkpoints.length === 0) {
    const plain = doc.plain_text || cleanText(html);
    const summary = plain.slice(0, 300);

    checkpoints.push({
      id: `${doc.id}-cp-general`,
      type: "general",
      questionFa: `مفاهیم کلیدی و اهداف اصلی مطرح شده در درس «${doc.title}» چیست؟`,
      questionEn: `What are the core concepts and learning outcomes covered in "${doc.title_en || doc.title}"?`,
      answerFa: summary,
      badgeFa: "مرور مفهومی",
      badgeEn: "Core Concept",
      color: "#0284c7",
    });
  }

  return checkpoints.slice(0, 3);
}

export type RelatedDocumentSuggestion = {
  document: KnowledgeDocument;
  match: "shared-tag" | "shared-category" | "title-overlap" | "same-folder";
  matchedTags: string[];
  matchedTitleWords: string[];
};

/**
 * Suggests documents using explicit, displayable matching reasons. A shared
 * folder is a useful navigation fallback, but must not be presented as a
 * clinical or semantic relationship.
 */
export function getRelatedDocumentSuggestions(
  currentDoc: KnowledgeDocument,
  allDocs: KnowledgeDocument[],
  limit = 4
): RelatedDocumentSuggestion[] {
  if (!currentDoc || !allDocs || allDocs.length <= 1) return [];

  const currentTags = new Set((currentDoc.tags || []).map((t) => t.toLowerCase()));
  const tagDocumentCounts = new Map<string, number>();
  for (const doc of allDocs) {
    for (const tag of new Set((doc.tags || []).map((value) => value.toLowerCase()))) {
      tagDocumentCounts.set(tag, (tagDocumentCounts.get(tag) || 0) + 1);
    }
  }
  const commonTagThreshold = Math.max(3, Math.ceil(allDocs.length * 0.05));
  const currentTitleWords = (currentDoc.title || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scoredDocs = allDocs
    .filter((d) => d.id !== currentDoc.id)
    .map((doc) => {
      const matchedTags = Array.from(new Set(doc.tags || [])).filter((tag) =>
        currentTags.has(tag.toLowerCase())
      );
      const specificTagCount = matchedTags.filter(
        (tag) => (tagDocumentCounts.get(tag.toLowerCase()) || 0) <= commonTagThreshold
      ).length;
      const commonTagCount = matchedTags.length - specificTagCount;
      const docTitle = (doc.title || "").toLowerCase();
      const matchedTitleWords: string[] = [];
      for (const w of currentTitleWords) {
        if (docTitle.includes(w)) {
          matchedTitleWords.push(w);
        }
      }
      const titleOverlapCount = matchedTitleWords.length;
      const sameFolder = Boolean(
        doc.folder_id && doc.folder_id === currentDoc.folder_id
      );
      const match: RelatedDocumentSuggestion["match"] =
        specificTagCount > 0
          ? "shared-tag"
          : titleOverlapCount > 0
            ? "title-overlap"
            : sameFolder
              ? "same-folder"
              : "shared-category";
      const score =
        specificTagCount * 3 +
        titleOverlapCount * 2 +
        (sameFolder ? 1 : 0) +
        commonTagCount * 0.25;

      return { document: doc, match, score, matchedTags, matchedTitleWords };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title));

  return scoredDocs
    .slice(0, limit)
    .map(({ document, match, matchedTags, matchedTitleWords }) => ({
      document,
      match,
      matchedTags,
      matchedTitleWords,
    }));
}

/** Computes suggested documents, preserving the legacy document-only API. */
export function getRelatedDocuments(
  currentDoc: KnowledgeDocument,
  allDocs: KnowledgeDocument[],
  limit = 4
): KnowledgeDocument[] {
  return getRelatedDocumentSuggestions(currentDoc, allDocs, limit).map(
    ({ document }) => document
  );
}
