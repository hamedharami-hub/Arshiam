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

  it("3. switches between Reader Mode and Original HTML mode", () => {
    render(
      <KnowledgeDocumentReader
        document={dummyDoc}
        folder={dummyFolder}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const originalModeBtn = screen.getByRole("button", { name: /سند اصلی/i });
    fireEvent.click(originalModeBtn);

    // In original HTML mode, an iframe should be present
    expect(screen.getByTitle("راهنمای فلوکستین")).toBeInTheDocument();
  });
});
