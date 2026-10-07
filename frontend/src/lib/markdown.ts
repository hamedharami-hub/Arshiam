import TurndownService from "turndown";
import { marked } from "marked";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

const LEGACY_FORMAT_TAGS = new Set([
  "a", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "mark", "ol", "p", "pre", "s", "span", "strong", "sub", "sup", "table",
  "tbody", "td", "th", "thead", "tr", "u", "ul",
]);

/** Recover older notes that saved formatted HTML as escaped text. */
export function normalizeNoteMarkup(source: string): string {
  if (!source) return "";
  // Only decode when a note starts with an escaped block tag. This avoids
  // turning intentional inline examples such as `&lt;strong&gt;` into markup.
  if (!/^\s*&lt;\/?(?:p|div|h[1-6]|ul|ol|blockquote|pre|table)\b/i.test(source)) return source;

  return source.replace(/&lt;(\/?)((?:[a-z][a-z0-9-]*))([\s\S]*?)&gt;/gi, (raw, closing: string, name: string, attributes: string) => {
    const tag = name.toLowerCase();
    if (!LEGACY_FORMAT_TAGS.has(tag)) return raw;
    const decodedAttributes = attributes
      .replace(/&quot;|&#34;|&#x22;/gi, '"')
      .replace(/&#39;|&#x27;/gi, "'");
    return `<${closing}${tag}${decodedAttributes}>`;
  });
}

// Markdown has no underline/highlight syntax; retain semantic HTML for round trips.
for (const tag of ["u", "mark"] as const) {
  turndown.addRule(tag, { filter: tag, replacement: (content) => `<${tag}>${content}</${tag}>` });
}
turndown.addRule("textColor", {
  filter: (node: HTMLElement) => ["SPAN", "MARK"].includes(node.nodeName) && Boolean(node.style.color || node.style.backgroundColor),
  replacement: (content, node: HTMLElement) => {
    const styles = [node.style.color && `color: ${node.style.color}`, node.style.backgroundColor && `background-color: ${node.style.backgroundColor}`].filter(Boolean).join("; ");
    const tag = node.nodeName.toLowerCase();
    return `<${tag} style="${styles}">${content}</${tag}>`;
  },
});
turndown.addRule("textAlignment", {
  filter: (node: HTMLElement) => /^(P|H[1-3])$/.test(node.nodeName) && /^(left|center|right|justify)$/.test(node.style.textAlign),
  replacement: (_content, node: HTMLElement) => `\n\n<${node.nodeName.toLowerCase()} style="text-align: ${node.style.textAlign}">${node.innerHTML}</${node.nodeName.toLowerCase()}>\n\n`,
});

turndown.addRule("img", {
  filter: "img",
  replacement: (_c, node: any) => `![${node.getAttribute("alt") || ""}](${node.getAttribute("src") || ""})`,
});

turndown.addRule("video", {
  filter: "video",
  replacement: (_c, node: any) => `\n[video](${node.getAttribute("src") || ""})\n`,
});

turndown.addRule("audio", {
  filter: "audio",
  replacement: (_c, node: any) => `\n[audio](${node.getAttribute("src") || ""})\n`,
});

turndown.addRule("taskItem", {
  filter: (node: HTMLElement) => {
    return node.nodeName === "LI" && (node.getAttribute("data-type") === "taskItem" || node.classList?.contains("task-list-item"));
  },
  replacement: (content: string, node: any) => {
    const isChecked = node.getAttribute("data-checked") === "true" || Boolean(node.querySelector?.("input[type='checkbox']")?.checked);
    const cleanContent = (content || "").trim().replace(/^\[[ xX]\]\s*/, "");
    return `- [${isChecked ? "x" : " "}] ${cleanContent}\n`;
  },
});

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return turndown.turndown(html);
}

export function markdownToHtml(md: string): string {
  if (!md) return "";
  let html = marked.parse(normalizeNoteMarkup(md), { async: false }) as string;
  // Convert standard markdown task items to TipTap-compatible task items
  // Already serialized TipTap checklists must pass through unchanged. Rewrapping
  // their existing labels/items creates invalid nested list markup in old notes.
  if (!/data-type=["']taskItem["']/i.test(html)) {
    html = html.replace(
      /<li(?:\s+class="task-list-item")?>\s*(<input[^>]*type="checkbox"[^>]*>)?([\s\S]*?)<\/li>/gi,
      (match, input, text) => {
        if (!input && !match.includes("task-list-item")) return match;
        const isChecked = Boolean(input && input.includes("checked"));
        const clean = (text || "").trim();
        return `<li data-type="taskItem" data-checked="${isChecked ? "true" : "false"}"><label><input type="checkbox" ${isChecked ? 'checked="checked"' : ''}><span></span></label><div>${clean}</div></li>`;
      }
    );
  }
  if (html.includes('data-type="taskItem"')) {
    html = html.replace(/<ul>(\s*<li data-type="taskItem")/gi, '<ul data-type="taskList">$1');
  }
  return html;
}
