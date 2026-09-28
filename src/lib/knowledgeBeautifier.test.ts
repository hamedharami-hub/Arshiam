import { describe, it, expect } from "vitest";
import { beautifyKnowledgeContent, sanitizeKnowledgeHtml } from "./knowledgeBeautifier";

describe("knowledgeBeautifier", () => {
  it("converts clinical pearl prefix into callout-pearl", () => {
    const input = "نکته طلایی: فلوکستین نیمه‌عمر طولانی دارد.";
    const result = beautifyKnowledgeContent(input);
    expect(result).toContain('class="callout-pearl"');
    expect(result).toContain("فلوکستین نیمه‌عمر طولانی دارد.");
  });

  it("converts warning prefix into callout-warning", () => {
    const input = "هشدار: خطر سندرم سروتونین در ترکیب با ترامادول.";
    const result = beautifyKnowledgeContent(input);
    expect(result).toContain('class="callout-warning"');
    expect(result).toContain("خطر سندرم سروتونین در ترکیب با ترامادول.");
  });

  it("converts dosing prefix into callout-dosage", () => {
    const input = "دوزینگ: روزانه ۲۰ میلی‌گرم صبح‌ها بعد از صبحانه.";
    const result = beautifyKnowledgeContent(input);
    expect(result).toContain('class="callout-dosage"');
    expect(result).toContain("روزانه ۲۰ میلی‌گرم صبح‌ها بعد از صبحانه.");
  });

  it("converts markdown checklists into interactive checkboxes", () => {
    const input = "- [ ] بررسی سطح الکترولیت\n- [x] سنجش فشار خون بیمار";
    const result = beautifyKnowledgeContent(input);
    expect(result).toContain('class="knowledge-checklist"');
    expect(result).toContain('type="checkbox"');
    expect(result).toContain("checked");
  });

  it("converts markdown table into knowledge-table", () => {
    const input = "| دارو | دوز |\n| --- | --- |\n| سیتالوپرام | 20mg |";
    const result = beautifyKnowledgeContent(input);
    expect(result).toContain('class="knowledge-table"');
    expect(result).toContain("<th>دارو</th>");
    expect(result).toContain("<td>سیتالوپرام</td>");
  });

  it("formats consecutive Persian-numbered prose as a semantic list without changing its items", () => {
    const input = "<p>مراحل: ۱) هویت را بررسی کنید ۲) هشدار را ارزیابی کنید ۳) با پزشک تماس بگیرید</p>";
    const result = sanitizeKnowledgeHtml(input);

    expect(result).toContain("<p>مراحل:</p>");
    expect(result).toContain("<ol>");
    expect(result).toContain("<li>هویت را بررسی کنید</li>");
    expect(result).toContain("<li>هشدار را ارزیابی کنید</li>");
    expect(result).toContain("<li>با پزشک تماس بگیرید</li>");
  });

  it("formats consecutive Arabic-numbered prose in an English document", () => {
    const input = "<p>Protocol: 1. Review the alert 2. Contact the prescriber 3. Document the decision</p>";
    const result = sanitizeKnowledgeHtml(input);

    expect(result).toContain("<p>Protocol:</p>");
    expect(result).toContain("<li>Review the alert</li>");
    expect(result).toContain("<li>Contact the prescriber</li>");
    expect(result).toContain("<li>Document the decision</li>");
  });

  it("does not convert non-consecutive numbering or decimal measurements", () => {
    const input = "<p>Dose 1.5 mg; taper 2.5 mg; section 4) notes</p><p>1) First step 3) Third step</p>";
    const result = sanitizeKnowledgeHtml(input);

    expect(result).toContain("Dose 1.5 mg; taper 2.5 mg; section 4) notes");
    expect(result).toContain("1) First step 3) Third step");
    expect(result).not.toContain("<ol");
  });

  it("preserves pre-formatted callout HTML", () => {
    const input = '<div class="callout-pearl">Already structured</div>';
    const result = beautifyKnowledgeContent(input);
    expect(result).toBe(input);
  });

  it("strips malicious script tags, event handlers, and javascript: links", () => {
    const dangerous = '<p>Safe Text</p><script>alert("xss")</script><img src="x" onerror="alert(1)" /><a href="javascript:doBad()">Link</a>';
    const result = beautifyKnowledgeContent(dangerous);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("Safe Text");
  });

  it("preserves only the explicit delegated interaction attributes", () => {
    const result = sanitizeKnowledgeHtml(
      '<a data-doc-link="doc-cyp-cyp2d6" data-untrusted="x" onclick="alert(1)">Open</a>' +
      '<button data-correct="true" data-answer="answer" data-unknown="x">Check</button>'
    );

    expect(result).toContain('data-doc-link="doc-cyp-cyp2d6"');
    expect(result).toContain('data-correct="true"');
    expect(result).toContain('data-answer="answer"');
    expect(result).not.toContain("data-untrusted");
    expect(result).not.toContain("data-unknown");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("alert");
  });

  it("removes embedded frames and inline styling from imported content", () => {
    const result = sanitizeKnowledgeHtml(
      '<p style="position:fixed">Text</p><iframe src="https://example.com"></iframe>'
    );

    expect(result).toContain("Text");
    expect(result).not.toContain("style=");
    expect(result).not.toContain("iframe");
  });
});
