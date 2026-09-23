import { callAI } from "@/lib/ai";

/**
 * Deterministic local beautifier for raw clinical/educational text and HTML.
 * Converts unstructured text, notes, or raw HTML into the native Arshnaz
 * educational layout with interactive callouts, tables, accordions, and badges.
 */
export function beautifyKnowledgeContent(rawInput: string): string {
  if (!rawInput || !rawInput.trim()) return "";

  const trimmed = rawInput.trim();

  // If already structured HTML with our callouts or custom tags, preserve and lightly enhance
  if (
    trimmed.includes("class=\"callout-") ||
    trimmed.includes("class='callout-") ||
    trimmed.includes("class=\"knowledge-")
  ) {
    return trimmed;
  }

  const lines = trimmed.split(/\r?\n/);
  const output: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";
  let inTable = false;
  let tableHeaderParsed = false;
  let inChecklist = false;

  const closeOpenBlocks = () => {
    if (inList) {
      output.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
    }
    if (inTable) {
      output.push("</tbody></table></div>");
      inTable = false;
      tableHeaderParsed = false;
    }
    if (inChecklist) {
      output.push("</div>");
      inChecklist = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      closeOpenBlocks();
      continue;
    }

    // 1. Markdown / HTML Headings
    if (line.startsWith("# ") || line.startsWith("<h1>")) {
      closeOpenBlocks();
      const content = line.replace(/^#\s+/, "").replace(/<\/?h1>/g, "");
      output.push(`<h1>${content}</h1>`);
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("<h2>")) {
      closeOpenBlocks();
      const content = line.replace(/^##\s+/, "").replace(/<\/?h2>/g, "");
      output.push(`<h2>${content}</h2>`);
      continue;
    }
    if (line.startsWith("### ") || line.startsWith("<h3>")) {
      closeOpenBlocks();
      const content = line.replace(/^###\s+/, "").replace(/<\/?h3>/g, "");
      output.push(`<h3>${content}</h3>`);
      continue;
    }
    if (line.startsWith("#### ") || line.startsWith("<h4>")) {
      closeOpenBlocks();
      const content = line.replace(/^####\s+/, "").replace(/<\/?h4>/g, "");
      output.push(`<h4>${content}</h4>`);
      continue;
    }

    // 2. Interactive Checklists (- [ ] or - [x])
    const checkMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (checkMatch) {
      if (inList) {
        output.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
      }
      if (!inChecklist) {
        output.push('<div class="knowledge-checklist">');
        inChecklist = true;
      }
      const isChecked = checkMatch[1].toLowerCase() === "x";
      const itemText = checkMatch[2];
      output.push(
        `<label><input type="checkbox" ${isChecked ? "checked" : ""} /> <span>${itemText}</span></label>`
      );
      continue;
    }

    // 3. Clinical Pearls / Golden Notes
    if (
      line.startsWith("نکته طلایی:") ||
      line.startsWith("نکته بالینی:") ||
      line.startsWith("Clinical Pearl:") ||
      line.startsWith("Pearl:") ||
      line.startsWith("💡")
    ) {
      closeOpenBlocks();
      const content = line
        .replace(/^(نکته طلایی:|نکته بالینی:|Clinical Pearl:|Pearl:|💡)\s*/, "")
        .trim();
      output.push(
        `<div class="callout-pearl"><strong>💡 نکته بالینی طلایی (Clinical Pearl):</strong><p>${content}</p></div>`
      );
      continue;
    }

    // 4. Warnings & Red Flags
    if (
      line.startsWith("هشدار:") ||
      line.startsWith("خط قرمز:") ||
      line.startsWith("پرچم قرمز:") ||
      line.startsWith("Warning:") ||
      line.startsWith("Contraindication:") ||
      line.startsWith("Red Flag:") ||
      line.startsWith("⚠️") ||
      line.startsWith("🚨")
    ) {
      closeOpenBlocks();
      const content = line
        .replace(
          /^(هشدار:|خط قرمز:|پرچم قرمز:|Warning:|Contraindication:|Red Flag:|⚠️|🚨)\s*/,
          ""
        )
        .trim();
      output.push(
        `<div class="callout-warning"><strong>⚠️ پرچم قرمز و هشدار (Red Flag / Warning):</strong><p>${content}</p></div>`
      );
      continue;
    }

    // 5. Dosing & Administration
    if (
      line.startsWith("دوز:") ||
      line.startsWith("دوزینگ:") ||
      line.startsWith("نحوه مصرف:") ||
      line.startsWith("Dosing:") ||
      line.startsWith("Dose:") ||
      line.startsWith("💊")
    ) {
      closeOpenBlocks();
      const content = line
        .replace(/^(دوز:|دوزینگ:|نحوه مصرف:|Dosing:|Dose:|💊)\s*/, "")
        .trim();
      output.push(
        `<div class="callout-dosage"><strong>💊 دوزینگ و نحوه مصرف (Dosing & Administration):</strong><p>${content}</p></div>`
      );
      continue;
    }

    // 6. Markdown Tables (| col 1 | col 2 |)
    if (line.startsWith("|") && line.endsWith("|")) {
      // Divider line (| --- | --- |)
      if (line.match(/^\|[\s\-:|]+\|$/)) {
        tableHeaderParsed = true;
        continue;
      }

      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      if (!inTable) {
        closeOpenBlocks();
        output.push('<div class="overflow-x-auto"><table class="knowledge-table"><thead><tr>');
        cells.forEach((cell) => output.push(`<th>${cell}</th>`));
        output.push("</tr></thead><tbody>");
        inTable = true;
        continue;
      }

      if (inTable && !tableHeaderParsed) {
        tableHeaderParsed = true;
      }

      output.push("<tr>");
      cells.forEach((cell) => output.push(`<td>${cell}</td>`));
      output.push("</tr>");
      continue;
    }

    // 7. Bullet or Ordered Lists
    const ulMatch = line.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (inTable || inChecklist) closeOpenBlocks();
      if (!inList || listType !== "ul") {
        if (inList) output.push(listType === "ul" ? "</ul>" : "</ol>");
        output.push("<ul>");
        inList = true;
        listType = "ul";
      }
      output.push(`<li>${ulMatch[1]}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (inTable || inChecklist) closeOpenBlocks();
      if (!inList || listType !== "ol") {
        if (inList) output.push(listType === "ul" ? "</ul>" : "</ol>");
        output.push("<ol>");
        inList = true;
        listType = "ol";
      }
      output.push(`<li>${olMatch[1]}</li>`);
      continue;
    }

    // 8. Regular paragraph or existing HTML tags
    closeOpenBlocks();
    if (line.startsWith("<") && line.endsWith(">")) {
      output.push(line);
    } else {
      output.push(`<p>${line}</p>`);
    }
  }

  closeOpenBlocks();
  return output.join("\n");
}

/**
 * Intelligent Document Beautification using the application's AI engine.
 * Converts raw unstructured text or messy HTML into a clean, modern,
 * interactive educational document format with callouts, tables, and accordions.
 */
export async function smartAiBeautifyDocument(
  title: string,
  rawContent: string
): Promise<string> {
  const systemPrompt = `You are a medical & educational content structuring expert for the Arshnaz application.
Transform the provided educational text or raw HTML into a beautifully formatted, native HTML document.
Use the following special CSS classes for maximum visual elegance:
- <div class="callout-pearl"><strong>💡 نکته بالینی طلایی:</strong><p>...</p></div> for clinical pearls / gold nuggets.
- <div class="callout-warning"><strong>⚠️ هشدار / پرچم قرمز:</strong><p>...</p></div> for red flags, adverse reactions, contraindications.
- <div class="callout-dosage"><strong>💊 دوز و نحوه مصرف:</strong><p>...</p></div> for dosing rules and administration.
- <details class="knowledge-accordion"><summary>عنوان بخش بازشونده</summary><p>محتوای تکمیلی...</p></details> for detailed expandable sections.
- <table class="knowledge-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table> for comparisons.
- <div class="knowledge-checklist"><label><input type="checkbox"> <span>مرحله...</span></label></div> for step-by-step clinical triage or protocols.
- <span class="knowledge-badge">برچسب</span> for drug classes, mechanisms, or keywords.
Ensure all original facts, medical details, formulas, and references are preserved with zero hallucination. Return ONLY clean HTML (no markdown backticks, no wrap).`;

  try {
    const aiResult = await callAI(
      "note_actions",
      {
        text: rawContent,
        title,
      },
      undefined,
      "auto_format",
      "fa",
      {
        systemPromptOverride: systemPrompt,
      }
    );

    if (aiResult?.text && aiResult.text.trim()) {
      let cleaned = aiResult.text.trim();
      // Remove any ```html ... ``` wrappers
      cleaned = cleaned.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();
      return cleaned;
    }
  } catch (err) {
    console.warn("AI beautify not available, falling back to deterministic local beautifier", err);
  }

  // Fallback to high-fidelity deterministic beautifier
  return beautifyKnowledgeContent(rawContent);
}
