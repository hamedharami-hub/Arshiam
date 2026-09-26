import { beforeEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KnowledgeDocumentReader } from "./KnowledgeDocumentReader";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";

const mockCreateLeitnerCard = vi.hoisted(() => vi.fn());
const mockUpdateKnowledgeDocument = vi.hoisted(() => vi.fn());
const mockInteractiveLearningModal = vi.hoisted(() => vi.fn());

vi.mock("@/lib/leitnerService", () => ({
  createLeitnerCard: mockCreateLeitnerCard,
}));

vi.mock("@/lib/knowledgeService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/knowledgeService")>("@/lib/knowledgeService");
  return {
    ...actual,
    updateKnowledgeDocument: mockUpdateKnowledgeDocument,
  };
});

vi.mock("./InteractiveLearningModal", () => ({
  InteractiveLearningModal: (props: any) => {
    mockInteractiveLearningModal(props);
    return props.open ? (
      <div data-testid="interactive-modal">
        <button
          onClick={() =>
            props.onInsertContent(
              '<div class="interactive-learning-block"><p>Generated widget</p></div>',
              "append",
            )
          }
        >
          Insert Append
        </button>
      </div>
    ) : null;
  },
}));

let mockIsEn = false;
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: mockIsEn }),
}));

describe("KnowledgeDocumentReader", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockIsEn = false;
    mockCreateLeitnerCard.mockReset().mockResolvedValue(undefined);
    mockUpdateKnowledgeDocument.mockReset().mockImplementation(async (_u, _id, patch) => ({
      ...dummyDoc,
      ...patch,
    }));
    mockInteractiveLearningModal.mockReset();
  });

  const dummyDoc: KnowledgeDocument = {
    id: "doc-1",
    user_id: "user-1",
    folder_id: "folder-1",
    title: "راهنمای فلوکستین",
    content_html: "<h1>فلوکستین</h1><p>داروی ضد افسردگی SSRI</p>",
    preferred_language: "fa",
    plain_text: "فلوکستین داروی ضد افسردگی SSRI",
    tags: ["SSRI"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const dummyFolder: KnowledgeFolder = {
    id: "folder-1",
    user_id: "user-1",
    parent_id: null,
    name: "ضد افسردگی‌ها",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("1. renders empty state when no document is selected", () => {
    render(
      <KnowledgeDocumentReader
        document={null}
        folder={null}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/یک سند را انتخاب یا اضافه کنید/i)).toBeInTheDocument();
  });

  it("2. renders document in Reader Mode with typography and tags", () => {
    render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ }));

    expect(screen.getAllByText("راهنمای فلوکستین").length).toBeGreaterThan(0);
    expect(screen.getByText("ضد افسردگی‌ها")).toBeInTheDocument();
    expect(screen.getByText("SSRI")).toBeInTheDocument();
    expect(screen.getByText("داروی ضد افسردگی SSRI")).toBeInTheDocument();
  });

  it("warns when a legacy Persian view still contains mostly English body text", () => {
    const mixedDoc: KnowledgeDocument = {
      ...dummyDoc,
      preferred_language: "fa",
      content_html: "<h3>علائم بالینی</h3><p>Dry, itchy and inflamed skin with persistent symptoms that require professional assessment.</p>",
      content_en: "<p>Dry, itchy and inflamed skin with persistent symptoms that require professional assessment.</p>",
    };
    render(<KnowledgeDocumentReader document={mixedDoc} folder={dummyFolder} onEdit={() => {}} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ }));
    expect(screen.getByText(/ترجمهٔ فارسی این سند قدیمی کامل نیست/)).toBeInTheDocument();
  });

  it("warns in English mode when the English field contains substantial Persian passages", () => {
    const englishWithPersian = "Review the patient's medication history and assess reported symptoms. ".repeat(10);
    const persianPassage = "ارزیابی بیمار و بررسی سابقه دارویی در داروخانه ".repeat(10);
    render(<KnowledgeDocumentReader
      document={{
        ...dummyDoc,
        preferred_language: "en",
        content_en: `<p>${englishWithPersian}</p><p dir="rtl">${persianPassage}</p>`,
      }}
      folder={dummyFolder}
      onEdit={() => {}}
      onDelete={() => {}}
    />);
    expect(screen.getByText(/نسخهٔ انگلیسی این سند بخش‌های فارسی/)).toBeInTheDocument();
  });

  it("does not let a bare reviewed flag suppress the imported Pharmacy safety notice", () => {
    const importedDoc: KnowledgeDocument = {
      ...dummyDoc,
      source_url: "https://github.com/hamedharami-hub/pharmacy/blob/abc123/data/scenarios/example.ts",
      content_review_status: "reviewed",
    };
    render(<KnowledgeDocumentReader document={importedDoc} folder={dummyFolder} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("note")).toHaveTextContent(/برچسب بازبینی‌شده ثبت شده/);
    expect(screen.queryByText("شواهد بازبینی ثبت‌شده")).not.toBeInTheDocument();
  });

  it("keeps a warning on a legacy Pharmacy seed document without review metadata", () => {
    const legacyImportedDoc: KnowledgeDocument = {
      ...dummyDoc,
      id: "doc-scenario-clinical-safescript-early-refill-s8",
      source_url: undefined,
      content_review_status: undefined,
      content_review_evidence: undefined,
    };
    render(<KnowledgeDocumentReader document={legacyImportedDoc} folder={dummyFolder} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("note")).toHaveTextContent(/محتوای آموزشیِ واردشده/);
    expect(screen.getByRole("note")).toHaveTextContent(/منبع اولیهٔ روز را بررسی کنید/);
  });

  it("uses accurate wording for user-authored unreviewed documents", () => {
    const unreviewedDoc: KnowledgeDocument = {
      ...dummyDoc,
      content_review_status: "unreviewed",
    };
    render(<KnowledgeDocumentReader document={unreviewedDoc} folder={dummyFolder} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("note")).toHaveTextContent(/این سند بازبینی‌نشده است/);
    expect(screen.queryByText(/محتوای آموزشیِ واردشده/)).not.toBeInTheDocument();
  });

  it("shows recorded review sources without claiming that ARSHNAZ certifies them", () => {
    const reviewedDoc: KnowledgeDocument = {
      ...dummyDoc,
      source_url: "https://github.com/hamedharami-hub/pharmacy/blob/abc123/data/scenarios/example.ts",
      content_review_status: "reviewed",
      content_review_evidence: {
        reviewer_role: "Registered pharmacist",
        jurisdiction: "NSW, Australia",
        scope: "Clinical triage",
        reviewed_at: "2026-09-20",
        references: [{
          title: "NSW Health clinical guidance",
          url: "https://health.example.gov.au/clinical-guidance",
          accessed_at: "2026-09-19",
        }],
      },
    };
    render(<KnowledgeDocumentReader document={reviewedDoc} folder={dummyFolder} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByText("شواهد بازبینی ثبت‌شده")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NSW Health clinical guidance" })).toHaveAttribute(
      "href",
      "https://health.example.gov.au/clinical-guidance",
    );
    expect(screen.getByText(/صلاحیت بازبین یا اعتبار مرجع را مستقلاً تأیید نمی‌کند/)).toBeInTheDocument();
  });

  it("renders consecutive inline numbered advice as a readable list without editing the source", () => {
    const sourceMarkup =
      '<p dir="ltr">Protocol: 1) Communicate calmly 2) Check the alert 3) Contact the prescriber</p>';
    const docWithInlineSteps: KnowledgeDocument = {
      ...dummyDoc,
      content_html: sourceMarkup,
      preferred_language: "fa",
    };

    const { container } = render(
      <KnowledgeDocumentReader
        document={docWithInlineSteps}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ }));

    const orderedList = container.querySelector(".knowledge-html-content ol");
    expect(orderedList).toBeInTheDocument();
    expect(orderedList?.querySelectorAll("li")).toHaveLength(3);
    expect(orderedList?.textContent).toBe(
      "Communicate calmlyCheck the alertContact the prescriber"
    );
    expect(docWithInlineSteps.content_html).toBe(sourceMarkup);
  });

  it("keeps one Reader view and removes raw HTML and export actions", () => {
    const { container } = render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ }));

    expect(screen.getByText("Reader")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /original html|سند اصلی/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy content|کپی محتوا/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open in browser|باز کردن در تب مرورگر/i })).not.toBeInTheDocument();
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByText("داروی ضد افسردگی SSRI")).toBeInTheDocument();
  });

  it("renders imported lesson HTML only after removing active content and unsafe links", () => {
    const hostileMarkup = '<p>Safe lesson text</p>' +
      '<script>window.__arshnazReaderXss = true</script>' +
      '<img src="x" onerror="window.__arshnazReaderXss = true">' +
      '<a href="javascript:window.__arshnazReaderXss=true" onclick="alert(1)">Unsafe link</a>' +
      '<iframe src="https://example.invalid"></iframe>';
    const { container } = render(
      <KnowledgeDocumentReader
        document={{ ...dummyDoc, content_en: hostileMarkup }}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const renderedLesson = container.querySelector(".knowledge-html-content");
    expect(renderedLesson?.textContent).toContain("Safe lesson text");
    expect(renderedLesson?.querySelector("script, iframe, form, svg")).not.toBeInTheDocument();
    expect(renderedLesson?.querySelector("[onclick], [onerror], [srcdoc]")).not.toBeInTheDocument();
    const renderedLink = renderedLesson?.querySelector("a");
    expect(renderedLink).toBeInTheDocument();
    expect(renderedLink?.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
    expect((window as Window & { __arshnazReaderXss?: boolean }).__arshnazReaderXss).toBeUndefined();
  });

  it("defaults to English and cycles the compact language control", () => {
    const bilingualDoc: KnowledgeDocument = {
      ...dummyDoc,
      preferred_language: undefined,
      title_en: "Fluoxetine guide",
      content_html: "<p>توضیح فارسی</p>",
      content_en: "<p>English lesson text</p>",
    };
    render(
      <KnowledgeDocumentReader
        document={bilingualDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const languageButton = screen.getByRole("button", { name: "زبان مطالعه: انگلیسی" });
    expect(screen.getByText("English lesson text")).toBeInTheDocument();
    fireEvent.click(languageButton);
    expect(screen.getByRole("button", { name: "زبان مطالعه: فارسی" })).toBeInTheDocument();
    expect(screen.getByText("توضیح فارسی")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "زبان مطالعه: فارسی" }));
    expect(screen.getByRole("button", { name: "زبان مطالعه: دوزبانه" })).toBeInTheDocument();
    expect(screen.getByText("English lesson text")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "زبان مطالعه: دوزبانه" }));
    expect(screen.getByRole("button", { name: "زبان مطالعه: انگلیسی" })).toBeInTheDocument();
  });

  it("keeps the original Persian lesson visible when its English translation is missing", () => {
    const { container } = render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText(/ترجمهٔ انگلیسی موجود نیست/)).toBeInTheDocument();
    expect(screen.getByText("داروی ضد افسردگی SSRI")).toBeInTheDocument();
    expect(container.querySelector(".knowledge-html-content")?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("button", { name: "تولید نسخه انگلیسی با هوش مصنوعی" })).toBeInTheDocument();
  });

  it("shows existing English source text without an empty-translation prompt", () => {
    const { container } = render(
      <KnowledgeDocumentReader
        document={{
          ...dummyDoc,
          content_html: "<p>Original English lesson text</p>",
          plain_text: "Original English lesson text",
        }}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText(/نسخهٔ انگلیسیِ جداگانه موجود نیست/)).toBeInTheDocument();
    expect(screen.getByText("Original English lesson text")).toBeInTheDocument();
    expect(container.querySelector(".knowledge-html-content")?.getAttribute("dir")).toBe("ltr");
    expect(screen.queryByRole("button", { name: "تولید نسخه انگلیسی با هوش مصنوعی" })).not.toBeInTheDocument();
  });

  it("keeps English-only source content in the English column in bilingual mode", () => {
    const { container } = render(
      <KnowledgeDocumentReader
        document={{
          ...dummyDoc,
          content_html: "<p>Original English lesson text</p>",
          plain_text: "Original English lesson text",
        }}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "زبان مطالعه: انگلیسی" }));
    fireEvent.click(screen.getByRole("button", { name: "زبان مطالعه: فارسی" }));

    expect(screen.getByText(/نسخهٔ فارسی موجود نیست/)).toBeInTheDocument();
    expect(screen.getByText("Original English lesson text")).toBeInTheDocument();
    expect(container.querySelector(".bilingual-col-en .knowledge-html-content")?.getAttribute("dir")).toBe("ltr");
    expect(container.querySelector(".bilingual-col-fa .knowledge-html-content")).not.toBeInTheDocument();
  });

  it("keeps long reader titles and section headings intact instead of truncating them", () => {
    const longTitle = "A comprehensive pharmacy practice guide for long-term learning and review";
    const longHeading = "A detailed section heading that should wrap naturally across narrow reader widths";
    const { container } = render(
      <KnowledgeDocumentReader
        document={{
          ...dummyDoc,
          title_en: longTitle,
          content_en: `<h2>${longHeading}</h2><p>Reading content</p>`,
        }}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const title = screen.getByRole("heading", { name: longTitle, level: 1 });
    const sectionHeading = container.querySelector(".knowledge-html-content h2");
    expect(title).toHaveClass("break-words");
    expect(title).toHaveTextContent(longTitle);
    expect(sectionHeading).toHaveTextContent(longHeading);
    expect(sectionHeading).not.toHaveClass("truncate");
  });

  it("opens documents marked bilingual in the English reading mode by default", () => {
    const bilingualDoc: KnowledgeDocument = {
      ...dummyDoc,
      preferred_language: "bilingual",
      title_en: "Fluoxetine guide",
      content_html: "<p>Persian source text</p>",
      content_en: "<p>English lesson text</p>",
    };

    render(
      <KnowledgeDocumentReader
        document={bilingualDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "زبان مطالعه: انگلیسی" })).toBeInTheDocument();
    expect(screen.getByText("English lesson text")).toBeInTheDocument();
    expect(screen.queryByText("Persian source text")).not.toBeInTheDocument();
    expect(bilingualDoc.preferred_language).toBe("bilingual");
  });

  it("changes the reader font-size setting when the larger-text control is used", () => {
    const { container } = render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    const reader = container.querySelector(".knowledge-reader-prose");
    expect(reader?.getAttribute("style")).toContain("--knowledge-reader-font-size: 15px");

    fireEvent.click(screen.getByRole("button", { name: "بزرگ‌تر کردن متن" }));
    expect(reader?.getAttribute("style")).toContain("--knowledge-reader-font-size: 16px");
  });

  it("follows reader language for Active Recall and Leitner cards", async () => {
    const otcDoc: KnowledgeDocument = {
      id: "doc-otc-asthma",
      user_id: "user-1",
      folder_id: "folder-1",
      title: "آسم حاد",
      title_en: "Acute asthma",
      content_html: `
        <h2>🎯 داروی خط اول و پروتکل دوزاژ</h2>
        <p>سالبوتامول ۴ پاف با دمیار</p>
      `,
      content_en: "<h2>🎯 First-Line Treatment and Dosing</h2><p>English display-only answer text.</p>",
      tags: ["Respiratory"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <KnowledgeDocumentReader
        document={otcDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText(/خودآزمایی سریع و نکات کلیدی/i)).toBeInTheDocument();
    expect(screen.getByText(/What is the first-line medication and standard dosing for/)).toBeInTheDocument();
    expect(screen.getByText("First-Line Dosing")).toBeInTheDocument();

    expect(screen.queryByText(/افزودن به جعبه لایتنر/i)).not.toBeInTheDocument();

    const showBtn = screen.getByRole("button", { name: /مشاهده پاسخ/i });
    fireEvent.click(showBtn);

    expect(screen.getAllByText("English display-only answer text.").length).toBeGreaterThan(1);
    expect(screen.getByText(/افزودن به جعبه لایتنر/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /مخفی‌سازی/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ }));
    expect(screen.getByText(/داروی خط اول و دستور مصرف استاندارد برای/)).toBeInTheDocument();
    expect(screen.getByText("خط اول درمان")).toBeInTheDocument();
    expect(screen.getAllByText(/سالبوتامول ۴ پاف با دمیار/).length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: /زبان مطالعه: فارسی/ }));
    expect(screen.getByText(/What is the first-line medication and standard dosing for/)).toBeInTheDocument();
    expect(screen.getAllByText(/English display-only answer text/).length).toBeGreaterThan(1);
    expect(screen.getByText(/داروی خط اول و دستور مصرف استاندارد برای/)).toBeInTheDocument();
    expect(screen.getAllByText(/سالبوتامول ۴ پاف با دمیار/).length).toBeGreaterThan(1);
    expect(screen.getByText(/خط اول درمان/)).toBeInTheDocument();
    expect(screen.getByText(/First-Line Dosing/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /افزودن به جعبه لایتنر/i }));
    await waitFor(() => expect(mockCreateLeitnerCard).toHaveBeenCalledTimes(1));
    expect(mockCreateLeitnerCard).toHaveBeenCalledWith("guest", expect.objectContaining({
      front: expect.stringMatching(/[\u0600-\u06ff]/),
      back: expect.stringMatching(/[\u0600-\u06ff]/),
      front_fa: expect.stringMatching(/[\u0600-\u06ff]/),
      front_en: expect.stringMatching(/[a-z]/i),
      back_fa: expect.stringMatching(/[\u0600-\u06ff]/),
      back_en: expect.stringMatching(/[a-z]/i),
      clue: expect.stringContaining("English:"),
      document_id: otcDoc.id,
      folder_id: otcDoc.folder_id,
    }));
  });

  it("5. renders suggested further reading with its match basis and opens the selected document", () => {
    const relatedDoc: KnowledgeDocument = {
      id: "doc-related-sertraline",
      user_id: "user-1",
      folder_id: "folder-1",
      title: "سرترالین ۵۰ میلی‌گرم",
      content_html: "<p>ضد افسردگی مرتبط</p>",
      tags: ["SSRI"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const handleSelect = vi.fn();

    render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        allDocuments={[dummyDoc, relatedDoc]}
        onSelectDocument={handleSelect}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText("پیشنهاد برای مطالعهٔ بیشتر")).toBeInTheDocument();
    expect(screen.getByText("سرترالین ۵۰ میلی‌گرم")).toBeInTheDocument();
    expect(screen.getByText("برچسب موضوعی: SSRI")).toBeInTheDocument();

    // Click related card
    fireEvent.click(screen.getByText("سرترالین ۵۰ میلی‌گرم"));
    expect(handleSelect).toHaveBeenCalledWith("doc-related-sertraline");
  });

  it("keeps the bilingual layout scoped to the reader panel", () => {
    mockIsEn = true;
    const { container } = render(
      <KnowledgeDocumentReader
        document={{
          ...dummyDoc,
          content_html: "<p>Persian lesson</p>",
          content_en: "<p>English lesson</p>",
        }}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reading language: English" }));
    fireEvent.click(screen.getByRole("button", { name: "Reading language: Persian" }));

    expect(container.querySelector(".knowledge-reader-shell")).toBeInTheDocument();
    expect(container.querySelectorAll(".bilingual-dual-grid > .bilingual-col-fa, .bilingual-dual-grid > .bilingual-col-en"))
      .toHaveLength(2);
  });

  it("labels same-folder suggestions without implying a clinical relationship", () => {
    const folderNeighbor: KnowledgeDocument = {
      ...dummyDoc,
      id: "doc-folder-neighbor",
      title: "Inventory accounting overview",
      tags: ["Finance"],
    };

    render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        allDocuments={[dummyDoc, folderNeighbor]}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText("Inventory accounting overview")).toBeInTheDocument();
    expect(screen.getByText("همین پوشه")).toBeInTheDocument();
  });

  it("saves and restores scroll position during round-trip inter-document navigation", () => {
    const scrollMap = new Map<string, number>();
    const docA: KnowledgeDocument = {
      ...dummyDoc,
      id: "doc-alpha",
      title: "درس اول الفا",
      content_html: '<p data-doc-link="doc-beta">برو به درس بتا</p><p>' + 'محتوای طولانی... '.repeat(100) + '</p>',
    };
    const docB: KnowledgeDocument = {
      ...dummyDoc,
      id: "doc-beta",
      title: "درس دوم بتا",
      content_html: '<p>محتوای درس دوم</p>',
    };

    const handleSelect = vi.fn();
    const { rerender, container } = render(
      <KnowledgeDocumentReader
        document={docA}
        folder={dummyFolder}
        allDocuments={[docA, docB]}
        onSelectDocument={handleSelect}
        scrollPositionsMap={scrollMap}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const scrollContainer = container.querySelector(".overflow-y-auto") as HTMLDivElement;
    expect(scrollContainer).toBeInTheDocument();

    // User scrolls to 450px in docA
    Object.defineProperty(scrollContainer, "scrollTop", { value: 450, writable: true });
    fireEvent.scroll(scrollContainer);

    // Verify scroll position was recorded for docA
    expect(scrollMap.get("doc-alpha")).toBe(450);

    // User clicks inter-document link
    const link = container.querySelector('[data-doc-link="doc-beta"]')!;
    fireEvent.click(link);
    expect(handleSelect).toHaveBeenCalledWith("doc-beta");

    // Host app switches document to docB
    rerender(
      <KnowledgeDocumentReader
        document={docB}
        folder={dummyFolder}
        allDocuments={[docA, docB]}
        onSelectDocument={handleSelect}
        scrollPositionsMap={scrollMap}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // DocB has no saved scroll; defaults to 0
    expect(scrollContainer.scrollTop).toBe(0);

    // Host app navigates back to docA
    rerender(
      <KnowledgeDocumentReader
        document={docA}
        folder={dummyFolder}
        allDocuments={[docA, docB]}
        onSelectDocument={handleSelect}
        scrollPositionsMap={scrollMap}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // DocA's scroll position (450) is restored
    expect(scrollContainer.scrollTop).toBe(450);
  });

  it("renders checkpoint with identical Persian and English text once with dir=auto and no missing-translation warning", () => {
    const docWithIdenticalCheckpoint: KnowledgeDocument = {
      ...dummyDoc,
      preferred_language: "bilingual",
      title: "پروتکل آموکسی‌سیلین",
      content_html: `
        <h2>🎯 داروی خط اول و پروتکل دوزاژ (First-Line Drug & Dosage)</h2>
        <p>Amoxicillin 500mg TDS</p>
      `,
      content_en: `
        <h2>🎯 First-line Drug & Standard Dosing</h2>
        <p>Amoxicillin 500mg TDS</p>
      `,
    };

    render(
      <KnowledgeDocumentReader
        document={docWithIdenticalCheckpoint}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Click show answer on the checkpoint
    const showAnswerBtn = screen.getByRole("button", { name: /مشاهده پاسخ|show answer/i });
    fireEvent.click(showAnswerBtn);

    // Answer text "Amoxicillin 500mg TDS" is rendered
    const answerElements = screen.getAllByText("Amoxicillin 500mg TDS");
    // Should not render missing translation alerts
    expect(screen.queryByText(/نسخهٔ انگلیسی موجود نیست/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/English version is not available/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/نسخهٔ فارسی موجود نیست/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Persian version is not available/i)).not.toBeInTheDocument();

    // Verify the rendered answer in the checkpoint has dir="auto"
    const checkpointAnswerNode = answerElements.find((el) => el.getAttribute("dir") === "auto");
    expect(checkpointAnswerNode).toBeDefined();
    expect(checkpointAnswerNode?.getAttribute("dir")).toBe("auto");
  });

  describe("Interactive Learning bilingual connection", () => {
    const bilingualDoc: KnowledgeDocument = {
      ...dummyDoc,
      title: "راهنمای فلوکستین",
      title_en: "Fluoxetine Guide",
      content_html: "<p>متن فارسی فلوکستین</p>",
      content_en: "<p>English Fluoxetine text</p>",
      preferred_language: "bilingual",
    };

    it("passes English content to modal in English reading mode and saves to content_en only", async () => {
      render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={bilingualDoc}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Reader defaults to EN mode when documentId is present
      const studioBtn = screen.getByRole("button", { name: /آموزش تعاملی|interactive learning/i });
      fireEvent.click(studioBtn);

      await waitFor(() => {
        expect(mockInteractiveLearningModal).toHaveBeenCalledWith(
          expect.objectContaining({
            open: true,
            languageOverride: "en",
            documentTitle: "Fluoxetine Guide",
            documentContent: "<p>English Fluoxetine text</p>",
            documentTitleEn: "Fluoxetine Guide",
            documentContentEn: "<p>English Fluoxetine text</p>",
          })
        );
      });

      // Insert content via modal
      const insertBtn = await screen.findByRole("button", { name: "Insert Append" });
      fireEvent.click(insertBtn);

      await waitFor(() => {
        expect(mockUpdateKnowledgeDocument).toHaveBeenCalledWith(
          "user-1",
          "doc-1",
          expect.objectContaining({
            content_en: expect.stringContaining("Generated widget"),
          })
        );
      });

      // Crucial: content_html must NOT be in the patch
      const patch = mockUpdateKnowledgeDocument.mock.calls[0][2];
      expect(patch.content_html).toBeUndefined();
    });

    it("passes Persian content to modal in Persian reading mode and saves to content_html only", async () => {
      render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={bilingualDoc}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Cycle language from EN to FA
      const langToggle = screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ });
      fireEvent.click(langToggle); // cycles to fa

      const studioBtn = screen.getByRole("button", { name: /آموزش تعاملی|interactive learning/i });
      fireEvent.click(studioBtn);

      await waitFor(() => {
        expect(mockInteractiveLearningModal).toHaveBeenCalledWith(
          expect.objectContaining({
            open: true,
            languageOverride: "fa",
            documentTitle: "راهنمای فلوکستین",
            documentContent: "<p>متن فارسی فلوکستین</p>",
          })
        );
      });

      const insertBtn = await screen.findByRole("button", { name: "Insert Append" });
      fireEvent.click(insertBtn);

      await waitFor(() => {
        expect(mockUpdateKnowledgeDocument).toHaveBeenCalledWith(
          "user-1",
          "doc-1",
          expect.objectContaining({
            content_html: expect.stringContaining("Generated widget"),
          })
        );
      });

      // Crucial: content_en must NOT be in the patch
      const patch = mockUpdateKnowledgeDocument.mock.calls[0][2];
      expect(patch.content_en).toBeUndefined();
    });

    it("passes both languages to modal in bilingual mode and writes to both content_html and content_en with shared block ID", async () => {
      render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={bilingualDoc}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Cycle EN -> FA -> bilingual
      const langToggle = screen.getByRole("button", { name: /زبان مطالعه: انگلیسی/ });
      fireEvent.click(langToggle); // to fa
      fireEvent.click(langToggle); // to bilingual

      const studioBtn = screen.getByRole("button", { name: /آموزش تعاملی|interactive learning/i });
      fireEvent.click(studioBtn);

      await waitFor(() => {
        expect(mockInteractiveLearningModal).toHaveBeenCalledWith(
          expect.objectContaining({
            open: true,
            languageOverride: "bilingual",
            documentTitle: "راهنمای فلوکستین",
            documentContent: "<p>متن فارسی فلوکستین</p>",
            documentTitleEn: "Fluoxetine Guide",
            documentContentEn: "<p>English Fluoxetine text</p>",
          })
        );
      });

      const insertBtn = await screen.findByRole("button", { name: "Insert Append" });
      fireEvent.click(insertBtn);

      await waitFor(() => {
        expect(mockUpdateKnowledgeDocument).toHaveBeenCalledWith(
          "user-1",
          "doc-1",
          expect.objectContaining({
            content_html: expect.stringContaining("Generated widget"),
            content_en: expect.stringContaining('data-bilingual-mirror="true"'),
          })
        );
      });

      const patch = mockUpdateKnowledgeDocument.mock.calls[0][2];
      const htmlBlockIdMatch = patch.content_html.match(/data-bilingual-block-id="([^"]+)"/);
      const enBlockIdMatch = patch.content_en.match(/data-bilingual-block-id="([^"]+)"/);
      expect(htmlBlockIdMatch).not.toBeNull();
      expect(enBlockIdMatch).not.toBeNull();
      expect(htmlBlockIdMatch![1]).toBe(enBlockIdMatch![1]);
    });

    it("renders mirror interactive widget in single English view, but suppresses it in bilingual side-by-side view to avoid duplication", () => {
      const docWithMirror: KnowledgeDocument = {
        ...bilingualDoc,
        id: "doc-mirror",
        content_html:
          '<p>متن فارسی درس</p><div class="interactive-learning-block" data-bilingual-block-id="pair-block-1"><p>Interactive Module Widget</p></div>',
        content_en:
          '<p>English lesson text</p><hr class="my-6 border-border/60" /><div class="interactive-learning-block bilingual-mirror-block" data-bilingual-mirror="true" data-bilingual-block-id="pair-block-1"><p>Interactive Module Widget</p></div>',
      };

      const { container } = render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={docWithMirror}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Default opens in English mode
      expect(screen.getByText("English lesson text")).toBeInTheDocument();
      expect(screen.getByText("Interactive Module Widget")).toBeInTheDocument();

      // Cycle to Persian mode
      const langToggle = screen.getByRole("button", { name: /reading language: english|زبان مطالعه: انگلیسی/i });
      fireEvent.click(langToggle);
      expect(screen.getByText("متن فارسی درس")).toBeInTheDocument();
      expect(screen.getByText("Interactive Module Widget")).toBeInTheDocument();

      // Cycle to Bilingual mode
      const faLangToggle = screen.getByRole("button", { name: /reading language: persian|زبان مطالعه: فارسی/i });
      fireEvent.click(faLangToggle);

      // In bilingual mode, Persian column has the widget and English column has the English text without the duplicate mirror
      const widgets = screen.getAllByText("Interactive Module Widget");
      expect(widgets).toHaveLength(1);

      const colFa = container.querySelector(".bilingual-col-fa");
      const colEn = container.querySelector(".bilingual-col-en");
      expect(colFa).toContainElement(widgets[0]);
      expect(colEn).not.toContainElement(widgets[0]);
      expect(colEn?.textContent).toContain("English lesson text");
    });

    it("preserves orphan or unpaired mirror interactive widgets in the English column in bilingual view", () => {
      const docWithOrphanMirror: KnowledgeDocument = {
        ...bilingualDoc,
        id: "doc-orphan-mirror",
        content_html: '<p>متن فارسی درس</p>',
        content_en:
          '<p>English lesson text</p><div class="interactive-learning-block bilingual-mirror-block" data-bilingual-mirror="true" data-bilingual-block-id="orphan-block-99"><p>Orphan Mirror Widget</p></div>',
      };

      const { container } = render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={docWithOrphanMirror}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Cycle to Bilingual mode: default EN -> FA -> bilingual
      const langToggle = screen.getByRole("button", { name: /reading language: english|زبان مطالعه: انگلیسی/i });
      fireEvent.click(langToggle);
      const faLangToggle = screen.getByRole("button", { name: /reading language: persian|زبان مطالعه: فارسی/i });
      fireEvent.click(faLangToggle);

      // In bilingual mode, since content_html lacks "orphan-block-99", the mirror is NOT stripped and remains in the English column!
      const colEn = container.querySelector(".bilingual-col-en");
      expect(colEn?.textContent).toContain("Orphan Mirror Widget");
    });

    it("does not strip pre-existing non-mirror interactive widgets in bilingual mode", () => {
      const docWithRegularWidget: KnowledgeDocument = {
        ...bilingualDoc,
        id: "doc-reg",
        content_html:
          '<p>متن فارسی</p><div class="interactive-learning-block"><p>Persian Module</p></div>',
        content_en:
          '<p>English text</p><div class="interactive-learning-block"><p>English Standalone Module</p></div>',
      };

      const { container } = render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={docWithRegularWidget}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Cycle to bilingual mode: EN -> FA -> bilingual
      const langToggle = screen.getByRole("button", { name: /reading language: english|زبان مطالعه: انگلیسی/i });
      fireEvent.click(langToggle);
      const faLangToggle = screen.getByRole("button", { name: /reading language: persian|زبان مطالعه: فارسی/i });
      fireEvent.click(faLangToggle);

      const colEn = container.querySelector(".bilingual-col-en");
      expect(colEn?.textContent).toContain("English Standalone Module");
    });

    it("propagates save rejection from updateKnowledgeDocument to caller without swallowing", async () => {
      mockUpdateKnowledgeDocument.mockRejectedValueOnce(new Error("Database disconnected"));

      render(
        <KnowledgeDocumentReader
          userId="user-1"
          document={bilingualDoc}
          folder={dummyFolder}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      const studioBtn = screen.getByRole("button", { name: /آموزش تعاملی|interactive learning/i });
      fireEvent.click(studioBtn);

      await waitFor(() => {
        expect(mockInteractiveLearningModal).toHaveBeenCalled();
      });

      const modalProps = mockInteractiveLearningModal.mock.calls.at(-1)[0];
      await expect(
        modalProps.onInsertContent('<div class="interactive-learning-block"><p>Widget</p></div>', "append")
      ).rejects.toThrow("Database disconnected");
    });
  });
});
