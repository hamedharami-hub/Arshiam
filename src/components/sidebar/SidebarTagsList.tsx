import React from "react";
import {
  Tag, Plus, ChevronDown, GripVertical,
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
import { useLongPress } from "@/lib/useLongPress";

export type TagT = {
  id: string;
  user_id?: string;
  name: string;
  color: string;
};

export function TagRow({
  tag: tagItem,
  collapsed,
  onLongPress,
  onNav,
}: {
  tag: TagT;
  collapsed: boolean;
  onLongPress: () => void;
  onNav: () => void;
}) {
  const lp = useLongPress({ onLongPress, delay: 420 });
  return (
    <SidebarMenuItem>
      <div
        className="flex items-center group w-full cursor-pointer select-none"
        {...lp.handlers}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLongPress();
        }}
      >
        <SidebarMenuButton asChild className="flex-1">
          <NavLink
            to={`/app/tag/${tagItem.id}`}
            onClick={(e) => {
              if (lp.didFire()) {
                e.preventDefault();
                return;
              }
              onNav();
            }}
            className="flex items-center justify-center gap-1.5 w-full truncate"
            activeClassName="bg-accent text-accent-foreground font-bold"
          >
            <Tag className="w-3.5 h-3.5 shrink-0" style={{ color: tagItem.color }} />
            {!collapsed && <span className="truncate text-xs">{tagItem.name}</span>}
          </NavLink>
        </SidebarMenuButton>
      </div>
    </SidebarMenuItem>
  );
}

export interface SidebarTagsListProps {
  tags: TagT[];
  collapsed: boolean;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  sidebarPosition: "left" | "right";
  dragHandle: any;
  onSheetTag: (t: TagT) => void;
  closeOnMobile: () => void;
  tr: (label: string) => string;
  isEn: boolean;
  openTagDlg: boolean;
  setOpenTagDlg: (open: boolean) => void;
  newTag: string;
  setNewTag: (v: string) => void;
  createTag: () => void;
}

export function SidebarTagsList({
  tags,
  collapsed,
  isOpen,
  onToggleOpen,
  sidebarPosition,
  dragHandle,
  onSheetTag,
  closeOnMobile,
  tr,
  isEn,
  openTagDlg,
  setOpenTagDlg,
  newTag,
  setNewTag,
  createTag,
}: SidebarTagsListProps) {
  if (collapsed) {
    if (tags.length === 0) return null;
    return (
      <SidebarGroup className="p-0.5">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton
                    tooltip={tr("تگ‌ها")}
                    className="justify-center h-9 w-9 mx-auto rounded-xl hover:bg-sidebar-accent cursor-pointer"
                  >
                    <Tag className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="sr-only">{tr("تگ‌ها")}</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent
                  side={sidebarPosition === "left" ? "right" : "left"}
                  align="start"
                  sideOffset={14}
                  className="w-56 p-2 shadow-2xl rounded-2xl border bg-card/95 backdrop-blur-xl z-50"
                >
                  <div className="flex items-center justify-between pb-2 mb-1.5 border-b px-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      <span>{tr("تگ‌ها")}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => setOpenTagDlg(true)}
                      title={isEn ? "New Tag" : "تگ جدید"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {tags.map((t) => (
                      <NavLink
                        key={t.id}
                        to={`/app/tag/${t.id}`}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent transition-colors"
                        activeClassName="bg-primary/10 text-primary font-bold"
                        onClick={closeOnMobile}
                      >
                        <Tag className="w-3.5 h-3.5 shrink-0" style={{ color: t.color }} />
                        <span className="truncate flex-1 text-start font-medium">{t.name}</span>
                      </NavLink>
                    ))}
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
                title={isEn ? "Drag to reorder" : "جابجا کن"}
              >
                <GripVertical className="w-3 h-3" />
              </button>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/50 rounded transition">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{tr("تگ‌ها")}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 me-auto text-muted-foreground transition-transform ${
                  isOpen ? "" : "-rotate-90"
                }`}
              />
            </CollapsibleTrigger>
            <Dialog open={openTagDlg} onOpenChange={setOpenTagDlg}>
              <DialogTrigger asChild>
                <button
                  className="hover:bg-muted rounded p-0.5"
                  title={isEn ? "New Tag" : "تگ جدید"}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEn ? "New Tag" : "تگ جدید"}</DialogTitle>
                </DialogHeader>
                <Input
                  placeholder={isEn ? "Tag name" : "نام تگ"}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTag()}
                />
                <DialogFooter>
                  <Button onClick={createTag}>{isEn ? "Create" : "ایجاد"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
        )}
        <CollapsibleContent forceMount={collapsed ? true : undefined}>
          <SidebarGroupContent>
            <SidebarMenu>
              {tags.map((t) => (
                <TagRow
                  key={t.id}
                  tag={t}
                  collapsed={collapsed}
                  onLongPress={() => onSheetTag(t)}
                  onNav={closeOnMobile}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
