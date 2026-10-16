import { MAX_MINI_APP_HTML_BYTES, measureHtmlBytes } from "@/lib/miniAppsStore";

export type HtmlIssue = "empty" | "too-large";
export type HtmlWarning = "external-assets" | "network-api" | "storage-api" | "native-forms";

/** Only unwrap a fence around the entire input; never rewrite the user's HTML. */
export function unwrapHtmlCodeFence(source: string): string {
  const match = source.trim().match(/^```(?:html?)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```$/i);
  return match ? match[1] : source;
}

/** Static hints, not an HTML/JavaScript parser or a security boundary.
 * Never parse untrusted markup in the parent document: parsers may fetch assets.
 * The iframe's sandbox and CSP remain responsible for isolation.
 */
export function inspectMiniAppHtml(html: string): { issue: HtmlIssue | null; warnings: HtmlWarning[]; bytes: number } {
  const bytes = measureHtmlBytes(html);
  const issue = !html.trim() ? "empty" : bytes > MAX_MINI_APP_HTML_BYTES ? "too-large" : null;
  const warnings: HtmlWarning[] = [];
  if (/<(?:script|img|link|iframe|audio|video|source)\b[^>]*\b(?:src|href)\s*=\s*["']?\s*(?:https?:|\/\/)/i.test(html) || /(?:@import\s*["']|url\(\s*["']?)\s*(?:https?:|\/\/)/i.test(html)) warnings.push("external-assets");
  if (/\b(?:fetch\s*\(|XMLHttpRequest\b|WebSocket\s*\(|EventSource\s*\()/i.test(html)) warnings.push("network-api");
  if (/\b(?:localStorage|sessionStorage|indexedDB)\b|document\s*\.\s*cookie\b/i.test(html)) warnings.push("storage-api");
  if (/<form\b/i.test(html)) warnings.push("native-forms");
  return { issue, warnings, bytes };
}
