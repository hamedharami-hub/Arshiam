import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { KnowledgeDocumentReader } from "./KnowledgeDocumentReader";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

describe("KnowledgeDocumentReader", { timeout: 15000 }, () => {
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
    expect(screen.getByText(/ترجمهٔ فارسی این سند قدیمی کامل نیست/)).toBeInTheDocument();
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

    expect(screen.getByText("Reader")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /original html|سند اصلی/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy content|کپی محتوا/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open in browser|باز کردن در تب مرورگر/i })).not.toBeInTheDocument();
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByText("داروی ضد افسردگی SSRI")).toBeInTheDocument();
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

  it("4. renders Active Recall Checkpoints and reveals answer on click", () => {
    const otcDoc: KnowledgeDocument = {
      id: "doc-otc-asthma",
      user_id: "user-1",
      folder_id: "folder-1",
      title: "آسم حاد",
      content_html: `
        <h2>🎯 داروی خط اول و پروتکل دوزاژ</h2>
        <p>سالبوتامول ۴ پاف با دمیار</p>
      `,
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

    // Should render the Active Recall section
    expect(screen.getByText(/خودآزمایی سریع و نکات کلیدی/i)).toBeInTheDocument();
    expect(screen.getAllByText(/داروی خط اول/i).length).toBeGreaterThan(0);

    // Add to Leitner button is hidden initially
    expect(screen.queryByText(/افزودن به جعبه لایتنر/i)).not.toBeInTheDocument();

    // Click "مشاهده پاسخ"
    const showBtn = screen.getByRole("button", { name: /مشاهده پاسخ/i });
    fireEvent.click(showBtn);

    // Answer and Add to Leitner button are now visible
    expect(screen.getByText(/افزودن به جعبه لایتنر/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /مخفی‌سازی/i })).toBeInTheDocument();
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
    expect(screen.getByText("برچسب مشترک")).toBeInTheDocument();

    // Click related card
    fireEvent.click(screen.getByText("سرترالین ۵۰ میلی‌گرم"));
    expect(handleSelect).toHaveBeenCalledWith("doc-related-sertraline");
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
});
