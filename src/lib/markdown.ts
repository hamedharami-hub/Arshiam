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

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return turndown.turndown(html);
}

export function markdownToHtml(md: string): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}
