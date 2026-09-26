import { describe, it, expect } from "vitest";
import {
  extractDocumentCheckpoints,
  getCheckpointTextLanguage,
  getCheckpointTextForLanguage,
  getRelatedDocumentSuggestions,
  getRelatedDocuments,
} from "./knowledgeCheckpointHelper";
import type { KnowledgeDocument } from "./knowledgeTypes";

describe("knowledgeCheckpointHelper", () => {
  const sampleOtcDoc: KnowledgeDocument = {
    id: "doc-disease-asthma",
    user_id: "user-1",
    folder_id: "folder-clinical-resp",
    title: "آسم و تنگی نفس حاد (Acute Asthma)",
    title_en: "Acute Asthma",
    content_html: `
      <h2>🎯 داروی خط اول و پروتکل دوزاژ (First-Line Drug & Dosage)</h2>
      <p>اسپری استنشاقی سالبوتامول (Salbutamol 100mcg) ۴ تا ۱۲ پاف با دمیار (Spacer).</p>
      <h2>🚨 علائم هشدار و پرچم قرمز (Red Flags)</h2>
      <ul>
        <li>عدم تکلم با جملات کامل (سختی در تکلم)</li>
        <li>سیانوز مرکزی یا اشباع اکسیژن زیر ۹۲ درصد</li>
      </ul>
      <h2>💡 نکات طلایی بالینی (Clinical Pearls)</h2>
      <p>همیشه کاربرد دمیار را به بیمار آموزش دهید تا رسوب دهانی کاهش یابد.</p>
    `,
    content_en: `
      <h2>🎯 First-line Drug & Standard Dosing</h2>
      <p>Salbutamol 100mcg inhaler 4-12 puffs with spacer every 20 minutes if needed.</p>
      <h2>🚨 Red Flags & Urgent Referral</h2>
      <p>Silent chest, inability to complete sentences in one breath, SpO2 < 92%.</p>
      <h2>💡 Clinical Pearls</h2>
      <p>Always prime and verify spacer technique to minimize oropharyngeal deposition.</p>
    `,
    tags: ["Respiratory", "Asthma", "FirstLine", "OTC"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleRelatedDoc: KnowledgeDocument = {
    id: "doc-mono-salbutamol",
    user_id: "user-1",
    folder_id: "folder-clinical-resp",
    title: "سالبوتامول اینهالر (Ventolin / Asmol)",
    title_en: "Salbutamol Inhaler",
    content_html: "<p>مونوگراف فرآورده سالبوتامول جهت اتساع برونش.</p>",
    tags: ["Respiratory", "Salbutamol"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const unrelatedDoc: KnowledgeDocument = {
    id: "doc-disease-acne",
    user_id: "user-1",
    folder_id: "folder-clinical-derma",
    title: "آکنه ولگاریس (Acne Vulgaris)",
    content_html: "<p>درمان آکنه با بنزوئیل پراکسید.</p>",
    tags: ["Dermatology", "Acne"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("extracts first-line, red flags, and pearl checkpoints from clinical OTC document", () => {
    const checkpoints = extractDocumentCheckpoints(sampleOtcDoc);
    expect(checkpoints.length).toBe(3);

    const firstLine = checkpoints.find((c) => c.type === "firstline");
    expect(firstLine).toBeDefined();
    expect(firstLine?.questionFa).toContain("آسم و تنگی نفس حاد");
    expect(firstLine?.answerFa).toContain("سالبوتامول");
    expect(firstLine?.answerEn).toContain("Salbutamol");

    const redFlags = checkpoints.find((c) => c.type === "redflags");
    expect(redFlags).toBeDefined();
    expect(redFlags?.answerFa).toContain("عدم تکلم");

    const pearls = checkpoints.find((c) => c.type === "pearls");
    expect(pearls).toBeDefined();
    expect(pearls?.answerFa).toContain("دمیار");
  });

  it("selects checkpoint language consistently, including a labeled bilingual card", () => {
    expect(getCheckpointTextForLanguage("پرسش فارسی", "English question", "fa")).toBe("پرسش فارسی");
    expect(getCheckpointTextForLanguage("پرسش فارسی", "English question", "en")).toBe("English question");
    expect(getCheckpointTextForLanguage("پرسش فارسی", "English question", "bilingual")).toBe(
      "فارسی:\nپرسش فارسی\n\nEnglish:\nEnglish question",
    );
    expect(getCheckpointTextForLanguage("پاسخ فارسی", undefined, "en")).toBe("پاسخ فارسی");
  });

  it("does not duplicate text when Persian and English checkpoint texts are identical", () => {
    expect(getCheckpointTextForLanguage("Amoxicillin 500mg", "Amoxicillin 500mg", "bilingual")).toBe("Amoxicillin 500mg");
    expect(getCheckpointTextForLanguage("Amoxicillin 500mg", "Amoxicillin 500mg", "fa")).toBe("Amoxicillin 500mg");
    expect(getCheckpointTextForLanguage("Amoxicillin 500mg", "Amoxicillin 500mg", "en")).toBe("Amoxicillin 500mg");
  });

  it("reports the actual fallback language so checkpoint direction follows the rendered text", () => {
    expect(getCheckpointTextLanguage("", "English text", "fa")).toBe("en");
    expect(getCheckpointTextLanguage("متن فارسی", undefined, "en")).toBe("fa");
    expect(getCheckpointTextLanguage("متن فارسی", "English text", "fa")).toBe("fa");
    expect(getCheckpointTextLanguage("متن فارسی", "English text", "en")).toBe("en");
  });

  it("falls back to general concept checkpoint when no specific markers exist", () => {
    const simpleDoc: KnowledgeDocument = {
      id: "doc-simple-1",
      user_id: "user-1",
      folder_id: "folder-general",
      title: "مقدمه بر قوانین داروخانه",
      content_html: "<p>آشنایی با استانداردهای داروسازی بالینی و آیین‌نامه‌ها.</p>",
      plain_text: "آشنایی با استانداردهای داروسازی بالینی و آیین‌نامه‌ها.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const checkpoints = extractDocumentCheckpoints(simpleDoc);
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints[0].type).toBe("general");
    expect(checkpoints[0].answerFa).toContain("استانداردهای داروسازی");
  });

  it("correctly identifies and ranks related documents", () => {
    const allDocs = [sampleOtcDoc, sampleRelatedDoc, unrelatedDoc];
    const related = getRelatedDocuments(sampleOtcDoc, allDocs, 2);

    expect(related.length).toBe(1);
    expect(related[0].id).toBe("doc-mono-salbutamol");
    expect(
      getRelatedDocumentSuggestions(sampleOtcDoc, allDocs, 2)[0].match
    ).toBe("shared-tag");
  });

  it("labels same-folder fallback as navigation, not a clinical relation", () => {
    const sameFolderOnly: KnowledgeDocument = {
      ...unrelatedDoc,
      id: "doc-same-folder-only",
      folder_id: sampleOtcDoc.folder_id,
      title: "Inventory accounting overview",
      tags: ["Finance"],
    };

    const suggestions = getRelatedDocumentSuggestions(
      sampleOtcDoc,
      [sampleOtcDoc, sameFolderOnly]
    );

    expect(suggestions).toEqual([
      {
        document: sameFolderOnly,
        match: "same-folder",
        matchedTags: [],
        matchedTitleWords: [],
      },
    ]);
  });

  it("ranks a shared tag above an unrelated document in the same folder", () => {
    const folderOnly: KnowledgeDocument = {
      ...unrelatedDoc,
      id: "doc-folder-only",
      folder_id: sampleOtcDoc.folder_id,
      title: "Inventory accounting overview",
      tags: ["Finance"],
    };
    const crossFolderTagMatch: KnowledgeDocument = {
      ...sampleRelatedDoc,
      id: "doc-cross-folder-tag-match",
      folder_id: "folder-other",
    };

    const suggestions = getRelatedDocumentSuggestions(
      sampleOtcDoc,
      [sampleOtcDoc, folderOnly, crossFolderTagMatch],
      2
    );

    expect(suggestions[0]).toEqual({
      document: crossFolderTagMatch,
      match: "shared-tag",
      matchedTags: ["Respiratory"],
      matchedTitleWords: [],
    });
    expect(suggestions[1]).toEqual({
      document: folderOnly,
      match: "same-folder",
      matchedTags: [],
      matchedTitleWords: [],
    });
  });

  it("classifies a frequently reused tag as a broad category rather than a topic", () => {
    const current: KnowledgeDocument = {
      ...sampleOtcDoc,
      title: "Asthma treatment",
      tags: ["Clinical Triage"],
    };
    const sameCategoryDocs = Array.from({ length: 4 }, (_, index) => ({
      ...unrelatedDoc,
      id: `doc-category-${index}`,
      folder_id: `folder-${index}`,
      title: `Inventory topic ${index}`,
      tags: ["Clinical Triage"],
    }));

    const suggestions = getRelatedDocumentSuggestions(
      current,
      [current, ...sameCategoryDocs],
      1
    );

    expect(suggestions[0]).toEqual({
      document: sameCategoryDocs[0],
      match: "shared-category",
      matchedTags: ["Clinical Triage"],
      matchedTitleWords: [],
    });
  });

  it("does not treat repeated title headings as specific subject overlap", () => {
    const current: KnowledgeDocument = {
      ...sampleOtcDoc,
      title: "Clinical Triage: C4",
      tags: ["Clinical Triage"],
    };
    const sameHeadingDocs = Array.from({ length: 4 }, (_, index) => ({
      ...unrelatedDoc,
      id: `doc-heading-${index}`,
      folder_id: `folder-${index}`,
      title: `Clinical Triage Case ${index}`,
      tags: ["Clinical Triage"],
    }));

    const suggestions = getRelatedDocumentSuggestions(
      current,
      [current, ...sameHeadingDocs],
      1
    );

    expect(suggestions[0]).toEqual({
      document: sameHeadingDocs[0],
      match: "shared-category",
      matchedTags: ["Clinical Triage"],
      matchedTitleWords: [],
    });
  });

  it("matches exact, specific title words instead of substrings", () => {
    const current = { ...sampleOtcDoc, title: "Pain relief plan", tags: [] };
    const matching = { ...unrelatedDoc, title: "Pain relief options", tags: [] };
    const substringOnly = {
      ...unrelatedDoc,
      id: "doc-painting",
      title: "Painting overview",
      tags: [],
    };

    const suggestions = getRelatedDocumentSuggestions(
      current,
      [current, matching, substringOnly],
      2
    );

    expect(suggestions[0]).toEqual({
      document: matching,
      match: "title-overlap",
      matchedTags: [],
      matchedTitleWords: ["pain", "relief"],
    });
    expect(suggestions).toHaveLength(1);
  });

  it("does not suggest documents based only on generic medical title terms", () => {
    const current = { ...sampleOtcDoc, title: "Drug guide", tags: [] };
    const unrelatedMedicalDoc = {
      ...unrelatedDoc,
      folder_id: "folder-other",
      title: "Drug protocol",
      tags: [],
    };

    expect(
      getRelatedDocumentSuggestions(current, [current, unrelatedMedicalDoc])
    ).toEqual([]);
  });

  it("does not treat generic red-alert wording as a specific title match", () => {
    const current = { ...sampleOtcDoc, title: "SafeScript red alert", tags: [] };
    const unrelatedRedFlagDoc = {
      ...unrelatedDoc,
      folder_id: "folder-other",
      title: "Red flags in cough",
      tags: [],
    };

    expect(
      getRelatedDocumentSuggestions(current, [current, unrelatedRedFlagDoc])
    ).toEqual([]);
  });
});
