import React from "react";
import {
  FolderTree, Plus, ChevronRight, ChevronDown, Folder as FolderIcon, GripVertical,
} from "lucide-react";
import {
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readItemDrag, moveItemToFolder } from "@/lib/dragToFolder";
import { useLongPress } from "@/lib/useLongPress";

export type Folder = {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  parent_id: string | null;
  color: string;
  position?: number;
};

export function FolderRow({
  folder: f,
  depth,
  hasChildren,
  open,
  collapsed,
  isEn,
  onToggle,
  onLongPress,
  onNav,
}: {
  folder: Folder;
  depth: number;
  hasChildren: boolean;
  open: boolean;
  collapsed: boolean;
  isEn: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  onNav: () => void;
}) {
  const lp = useLongPress({ onLongPress, delay: 420 });

  return (
    <SidebarMenuItem className="mb-1">
      <SidebarMenuButton asChild className="h-auto min-h-[58px] rounded-2xl p-0">
        <div
          className="flex items-center w-full gap-2 rounded-2xl border border-transparent px-2 py-2.5 transition-all duration-150 cursor-pointer select-none group hover:border-sidebar-border hover:bg-sidebar-accent/70 data-[drag-over=true]:bg-primary/15 data-[drag-over=true]:ring-1 data-[drag-over=true]:ring-primary"
          style={{ paddingInlineStart: 8 + depth * 14 }}
          {...lp.handlers}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLongPress();
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("application/x-taskflow-item")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            (e.currentTarget as HTMLElement).dataset.dragOver = "true";
          }}
          onDragLeave={(e) => {
            delete (e.currentTarget as HTMLElement).dataset.dragOver;
          }}
          onDrop={async (e) => {
            delete (e.currentTarget as HTMLElement).dataset.dragOver;
            const payload = readItemDrag(e);
            if (!payload) return;
            e.preventDefault();
            await moveItemToFolder(payload, f.id);
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
              }}
              className="p-1 hover:bg-sidebar-accent rounded-md shrink-0 transition-colors"
              title={open ? (isEn ? "Collapse" : "بستن") : (isEn ? "Expand" : "باز کردن")}
            >
              {open ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          )}
          <NavLink
            to={`/app/folder/${f.id}`}
            onClick={(e) => {
              if (lp.didFire()) {
                e.preventDefault();
                return;
              }
              onNav();
            }}
            className="flex items-center gap-3 flex-1 w-full min-w-0 text-sidebar-foreground"
            activeClassName="text-primary font-bold bg-primary/10 rounded-xl"
          >
            <FolderIcon
              className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110"
              style={{ color: f.color || "hsl(var(--primary))" }}
            />
            {!collapsed && (
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-0.5">
                <span
                  dir="auto"
                  className="w-full whitespace-normal break-words text-start text-sm font-semibold leading-5"
                >
                  {f.name}
                </span>
                {f.description?.trim() && (
                  <span className="w-full whitespace-normal break-words text-start text-[11px] font-normal leading-4 text-muted-foreground">
                    {f.description.trim()}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export interface SidebarFoldersListProps {
  folders: Folder[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  collapsed: boolean;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  sidebarPosition: "left" | "right";
  dragHandle: any;
  onSheetFolder: (f: Folder) => void;
  closeOnMobile: () => void;
  tr: (label: string) => string;
  isEn: boolean;
  openFolderDlg: boolean;
  setOpenFolderDlg: (open: boolean) => void;
  newFolder: string;
  setNewFolder: (v: string) => void;
  createFolder: () => void;
}

export function SidebarFoldersList({
  folders,
  expanded,
  setExpanded,
  collapsed,
  isOpen,
  onToggleOpen,
  sidebarPosition,
  dragHandle,
  onSheetFolder,
  closeOnMobile,
  tr,
  isEn,
  openFolderDlg,
  setOpenFolderDlg,
  newFolder,
  setNewFolder,
  createFolder,
}: SidebarFoldersListProps) {
  const renderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    if (depth > 12) return null;
    const children = folders.filter((f) => f.parent_id === parentId);
    return children.map((f) => {
      const has = folders.some((x) => x.parent_id === f.id);
      const open = expanded[f.id] ?? true;
      return (
        <div key={f.id}>
          <FolderRow
            folder={f}
            depth={depth}
            hasChildren={has}
            open={open}
            collapsed={collapsed}
            isEn={isEn}
            onToggle={() => setExpanded((s) => ({ ...s, [f.id]: !open }))}
            onLongPress={() => onSheetFolder(f)}
            onNav={closeOnMobile}
          />
          {has && open && renderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  if (collapsed) {
    return (
      <SidebarGroup className="p-0.5">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton
                    tooltip={tr("فولدرها")}
                    className="justify-center h-9 w-9 mx-auto rounded-xl hover:bg-sidebar-accent cursor-pointer"
                  >
                    <FolderTree className="w-4 h-4 shrink-0 text-primary" />
                    <span className="sr-only">{tr("فولدرها")}</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent
                  side={sidebarPosition === "left" ? "right" : "left"}
                  align="start"
                  sideOffset={14}
                  className="w-64 p-2 shadow-2xl rounded-2xl border bg-card/95 backdrop-blur-xl z-50"
                >
                  <div className="flex items-center justify-between pb-2 mb-1.5 border-b px-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <FolderTree className="w-4 h-4 text-primary" />
                      <span>{tr("فولدرها")}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-mono">
                        {folders.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => setOpenFolderDlg(true)}
                      title={isEn ? "New Folder" : "فولدر جدید"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {folders.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {isEn ? "No folders yet" : "هنوز فولدری ساخته نشده"}
                      </p>
                    ) : (
                      folders.map((f) => (
                        <NavLink
                          key={f.id}
                          to={`/app/folder/${f.id}`}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs hover:bg-accent transition-colors text-foreground"
                          activeClassName="bg-primary/10 text-primary font-bold"
                          onClick={closeOnMobile}
                        >
                          <FolderIcon
                            className="w-4 h-4 shrink-0"
                            style={{ color: f.color || "hsl(var(--primary))" }}
                          />
                          <span className="truncate flex-1 text-start font-medium">{f.name}</span>
                        </NavLink>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <Collapsible open={isOpen || collapsed} onOpenChange={onToggleOpen}>
        {!collapsed && (
          <SidebarGroupLabel className="flex justify-between items-center pe-1">
            {dragHandle && (
              <button
                {...dragHandle}
                className="cursor-grab active:cursor-grabbing p-0.5 opacity-30 hover:opacity-80 transition"
              >
                <GripVertical className="w-3 h-3" />
              </button>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/50 rounded transition">
              <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{tr("فولدرها")}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 me-auto text-muted-foreground transition-transform ${
                  isOpen ? "" : "-rotate-90"
                }`}
              />
            </CollapsibleTrigger>
            <Dialog open={openFolderDlg} onOpenChange={setOpenFolderDlg}>
              <DialogTrigger asChild>
                <button
                  className="hover:bg-muted rounded p-0.5"
                  title={isEn ? "New Folder" : "فولدر جدید"}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEn ? "New Folder" : "فولدر جدید"}</DialogTitle>
                </DialogHeader>
                <Input
                  placeholder={isEn ? "Folder name" : "نام فولدر"}
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                />
                <DialogFooter>
                  <Button onClick={createFolder}>{isEn ? "Create" : "ایجاد"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
        )}
        <CollapsibleContent forceMount={collapsed ? true : undefined}>
          <SidebarGroupContent>
            <SidebarMenu>{renderTree(null)}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
