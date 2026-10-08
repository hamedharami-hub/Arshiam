import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarFoldersList, type Folder } from "./SidebarFoldersList";

const folders: Folder[] = [
  { id: "root-a", name: "Root A", parent_id: null, color: "#000" },
  { id: "child", name: "Nested folder", parent_id: "root-a", color: "#000" },
  { id: "root-b", name: "Root B", parent_id: null, color: "#000" },
];

describe("SidebarFoldersList", () => {
  it("renders nested folders from the indexed parent tree", () => {
    render(
      <MemoryRouter>
        <SidebarProvider defaultOpen>
          <SidebarFoldersList
            folders={folders}
            expanded={{}}
            setExpanded={vi.fn()}
            collapsed={false}
            isOpen
            onToggleOpen={vi.fn()}
            sidebarPosition="right"
            dragHandle={null}
            onSheetFolder={vi.fn()}
            closeOnMobile={vi.fn()}
            tr={(label) => label}
            isEn
            openFolderDlg={false}
            setOpenFolderDlg={vi.fn()}
            newFolder=""
            setNewFolder={vi.fn()}
            createFolder={vi.fn()}
          />
        </SidebarProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Root A" })).toHaveAttribute("href", "/app/folder/root-a");
    expect(screen.getByRole("link", { name: "Nested folder" })).toHaveAttribute("href", "/app/folder/child");
    expect(screen.getByRole("link", { name: "Root B" })).toHaveAttribute("href", "/app/folder/root-b");
  });
});
