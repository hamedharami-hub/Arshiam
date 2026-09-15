import TurndownService from "turndown";
import { marked } from "marked";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

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
  let html = marked.parse(md, { async: false }) as string;
  // Convert standard markdown task items to TipTap-compatible task items
  html = html.replace(
    /<li(?:\s+class="task-list-item")?>\s*(<input[^>]*type="checkbox"[^>]*>)?([\s\S]*?)<\/li>/gi,
    (match, input, text) => {
      if (!input && !match.includes("task-list-item")) return match;
      const isChecked = Boolean(input && input.includes("checked"));
      const clean = (text || "").trim();
      return `<li data-type="taskItem" data-checked="${isChecked ? "true" : "false"}"><label><input type="checkbox" ${isChecked ? 'checked="checked"' : ''}><span></span></label><div>${clean}</div></li>`;
    }
  );
  if (html.includes('data-type="taskItem"')) {
    html = html.replace(/<ul>(\s*<li data-type="taskItem")/gi, '<ul data-type="taskList">$1');
  }
  return html;
}
