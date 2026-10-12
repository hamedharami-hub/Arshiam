import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarFoldersList, FolderRow } from "./SidebarFoldersList";
import { SidebarTagsList, TagRow } from "./SidebarTagsList";

vi.mock("./SidebarNavSections", () => ({ NavCount: () => null, SECTION_HEADER_CLASS: "", SECTION_TRIGGER_CLASS: "", SECTION_CHEVRON_CLASS: "" }));

function Creation({ kind }: { kind: "folder" | "tag" }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const common = { collapsed: true, isOpen: true, onToggleOpen: () => {}, sidebarPosition: "right" as const, dragHandle: null, closeOnMobile: () => {}, tr: (v: string) => v, isEn: true };
  return kind === "folder"
    ? <SidebarFoldersList {...common} folders={[]} expanded={{}} setExpanded={() => {}} onSheetFolder={() => {}} openFolderDlg={open} setOpenFolderDlg={setOpen} newFolder={name} setNewFolder={setName} createFolder={() => {}} />
    : <SidebarTagsList {...common} tags={[]} onSheetTag={() => {}} openTagDlg={open} setOpenTagDlg={setOpen} newTag={name} setNewTag={setName} createTag={() => {}} />;
}
const wrap = (node: React.ReactNode) => <MemoryRouter><TooltipProvider><SidebarProvider>{node}</SidebarProvider></TooltipProvider></MemoryRouter>;

describe("sidebar creation and discoverable management", () => {
  it.each(["folder", "tag"] as const)("opens %s creation from the collapsed empty sidebar", async (kind) => {
    render(wrap(<Creation kind={kind} />));
    fireEvent.click(screen.getByRole("button", { name: kind === "folder" ? "فولدرها" : "تگ‌ها" }));
    fireEvent.click(await screen.findByRole("button", { name: kind === "folder" ? "New Folder" : "New Tag" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByRole("textbox", { name: kind === "folder" ? "Folder name" : "Tag name" })).toBeVisible();
  });
  it("exposes separate folder and tag management buttons without navigation", () => {
    const folder = vi.fn(); const tag = vi.fn(); const navigate = vi.fn();
    render(wrap(<><FolderRow folder={{ id: "f", name: "Work", parent_id: null, color: "" }} depth={0} hasChildren={false} open collapsed={false} isEn onToggle={() => {}} onLongPress={folder} onNav={navigate} /><TagRow tag={{ id: "t", name: "Focus", color: "" }} collapsed={false} onLongPress={tag} onNav={navigate} /></>));
    fireEvent.click(screen.getByRole("button", { name: "Manage folder Work" }));
    fireEvent.click(screen.getByRole("button", { name: /Manage tag.*Focus/ }));
    expect(folder).toHaveBeenCalledTimes(1); expect(tag).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
