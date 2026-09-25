import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { KnowledgeSidebarTree } from "./KnowledgeSidebarTree";
import { buildFolderTree } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false }),
}));

describe("KnowledgeSidebarTree integrity", () => {
  it("expands a cyclic ancestry safely and keeps orphaned documents visible", async () => {
    const folders: KnowledgeFolder[] = [
      {
        id: "folder-a", user_id: "test-user", parent_id: "folder-b", name: "Folder A",
        created_at: "2026-09-01", updated_at: "2026-09-01",
      },
      {
        id: "folder-b", user_id: "test-user", parent_id: "folder-a", name: "Folder B",
        created_at: "2026-09-01", updated_at: "2026-09-01",
      },
    ];
    const documents: KnowledgeDocument[] = [
      {
        id: "doc-cycle", user_id: "test-user", folder_id: "folder-b", title: "Cycle lesson",
        content_html: "<p>Kept</p>", created_at: "2026-09-01", updated_at: "2026-09-01",
      },
      {
        id: "doc-orphan", user_id: "test-user", folder_id: "missing-folder", title: "Orphan lesson",
        content_html: "<p>Kept too</p>", created_at: "2026-09-01", updated_at: "2026-09-01",
      },
    ];
    const tree = buildFolderTree(folders, documents);

    render(
      <MemoryRouter>
        <KnowledgeSidebarTree
          tree={tree}
          allFolders={folders}
          documents={documents}
          selectedDocId="doc-cycle"
          selectedFolderId="folder-b"
          onSelectDocument={vi.fn()}
          onSelectFolder={vi.fn()}
          onCreateFolder={vi.fn()}
          onDeleteFolder={vi.fn()}
          onCreateDocument={vi.fn()}
          onDeleteDocument={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Cycle lesson")).toBeInTheDocument();
    expect(screen.getByText("Folder A")).toBeInTheDocument();
    expect(screen.getByText("Folder B")).toBeInTheDocument();
    expect(screen.getByText("اسناد بدون فولدر یا با فولدر ناموجود")).toBeInTheDocument();
    expect(screen.getByText("Orphan lesson")).toBeInTheDocument();
  });
});
