import { describe, expect, it } from "vitest";
import { sanitizeKnowledgeHtml } from "./knowledgeHtmlSanitizer";

describe("sanitizeKnowledgeHtml", () => {
  it("removes executable markup, event handlers, and unsafe links", () => {
    const sanitized = sanitizeKnowledgeHtml(
      '<p onclick="alert(1)">Lesson</p><script>alert(2)</script><img src="x" onerror="alert(3)"><a href="javascript:alert(4)">open</a>',
    );
    const parsed = new DOMParser().parseFromString(sanitized, "text/html");

    expect(parsed.querySelector("script")).toBeNull();
    expect(parsed.querySelector("[onclick], [onerror]")).toBeNull();
    expect(parsed.querySelector("a")?.getAttribute("href") ?? "").not.toMatch(/^\s*javascript:/i);
    expect(parsed.body.textContent).toContain("Lesson");
  });

  it("removes embedded active content and inline styles while retaining lesson formatting", () => {
    const sanitized = sanitizeKnowledgeHtml(
      '<p style="position:fixed">Important</p><iframe src="https://example.test"></iframe><form>Form content</form><strong>Keep emphasis</strong>',
    );
    const parsed = new DOMParser().parseFromString(sanitized, "text/html");

    expect(parsed.querySelector("iframe, form, style, [style]")).toBeNull();
    expect(parsed.querySelector("strong")?.textContent).toBe("Keep emphasis");
    expect(parsed.querySelector("p")?.textContent).toBe("Important");
  });

  it("keeps only app-supported data attributes needed by interactive lessons", () => {
    const sanitized = sanitizeKnowledgeHtml(
      '<button data-correct="true" data-next-step="2" data-untrusted="x">Answer</button>',
    );
    const button = new DOMParser().parseFromString(sanitized, "text/html").querySelector("button");

    expect(button?.getAttribute("data-correct")).toBe("true");
    expect(button?.getAttribute("data-next-step")).toBe("2");
    expect(button?.hasAttribute("data-untrusted")).toBe(false);
  });
});
