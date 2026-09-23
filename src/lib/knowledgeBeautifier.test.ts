import { describe, it, expect } from "vitest";
import { beautifyKnowledgeContent } from "./knowledgeBeautifier";

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

  it("preserves pre-formatted callout HTML", () => {
    const input = '<div class="callout-pearl">Already structured</div>';
    const result = beautifyKnowledgeContent(input);
    expect(result).toBe(input);
  });
});
