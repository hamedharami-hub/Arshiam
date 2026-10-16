import { describe, expect, it } from "vitest";
import { inspectMiniAppHtml, unwrapHtmlCodeFence } from "./miniAppsHtml";
import { MAX_MINI_APP_HTML_BYTES } from "./miniAppsStore";

describe("HTML import preparation", () => {
  it("unwraps a complete AI HTML fence without changing the code", () => {
    expect(unwrapHtmlCodeFence("  ```html\n<p>سلام</p>\n```  ")).toBe("<p>سلام</p>");
    expect(unwrapHtmlCodeFence("```HTML\r\n<!doctype html>\r\n``` ")).toBe("<!doctype html>");
    expect(unwrapHtmlCodeFence("```\n<div>Tool</div>\n```")).toBe("<div>Tool</div>");
  });
  it("preserves ordinary source and does not silently delete explanations", () => {
    const html = " \n<pre>```html\nExample\n```</pre>\n ";
    expect(unwrapHtmlCodeFence(html)).toBe(html);
    const explained = "Here is your file:\n```html\n<p>Tool</p>\n```";
    expect(unwrapHtmlCodeFence(explained)).toBe(explained);
  });
  it("rejects empty source and enforces the UTF-8 byte limit", () => {
    expect(inspectMiniAppHtml(" \n ").issue).toBe("empty");
    expect(inspectMiniAppHtml("a".repeat(MAX_MINI_APP_HTML_BYTES)).issue).toBeNull();
    expect(inspectMiniAppHtml("a".repeat(MAX_MINI_APP_HTML_BYTES + 1)).issue).toBe("too-large");
    expect(inspectMiniAppHtml("س".repeat(MAX_MINI_APP_HTML_BYTES / 2 + 1)).issue).toBe("too-large");
  });
  it("allows fragments and reports likely sandbox incompatibilities as hints", () => {
    expect(inspectMiniAppHtml("<p>سلام</p>").warnings).toEqual([]);
    const source = '<script src="https://cdn.example/tool.js"></script><script>fetch("/api");localStorage.setItem("x", "y")</script>';
    expect(inspectMiniAppHtml(source)).toMatchObject({ issue: null, warnings: ["external-assets", "network-api", "storage-api"] });
  });
  it("does not flag embedded assets or ordinary hyperlinks as remote loads", () => {
    expect(inspectMiniAppHtml('<img src="data:image/png;base64,abc"><a href="https://example.com">Link</a>').warnings).toEqual([]);
    expect(inspectMiniAppHtml('<style>@import "https://cdn.example/style.css";</style>').warnings).toContain("external-assets");
    expect(inspectMiniAppHtml('<style>body {background: url(//cdn.example/photo.png)}</style>').warnings).toContain("external-assets");
  });
});
