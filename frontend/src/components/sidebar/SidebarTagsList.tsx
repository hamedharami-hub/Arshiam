import React from "react";
import {
  Tag, Plus, ChevronDown, GripVertical,
} from "lucide-react";
import { SECTION_CHEVRON_CLASS, SECTION_HEADER_CLASS, SECTION_TRIGGER_CLASS } from "./SidebarNavSections";
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
        <SidebarMenuButton asChild className="h-10 flex-1 rounded-md">
          <NavLink
            to={`/app/tag/${tagItem.id}`}
            onClick={(e) => {
              if (lp.didFire()) {
                e.preventDefault();
                return;
              }
              onNav();
            }}
            className="flex items-center justify-start gap-2 w-full truncate px-2 text-[13px]"
            activeClassName="bg-accent text-accent-foreground font-bold"
          >
            <Tag className="w-4 h-4 shrink-0 text-muted-foreground" style={tagItem.color ? { color: tagItem.color } : undefined} />
            {!collapsed && <span className="truncate" title={tagItem.name}>{tagItem.name}</span>}
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
    <SidebarGroup className="py-0.5">
      <Collapsible open={isOpen || collapsed} onOpenChange={onToggleOpen}>
        {!collapsed && (
          <SidebarGroupLabel className={SECTION_HEADER_CLASS} data-testid="sidebar-section-tags">
            {dragHandle && (
              <button
                {...dragHandle}
                className="cursor-grab active:cursor-grabbing grid h-8 w-8 shrink-0 place-items-center rounded-md opacity-40 hover:opacity-100 group-hover/section:opacity-100 transition touch-none"
                title={isEn ? "Drag to reorder" : "جابجا کن"}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            )}
            <CollapsibleTrigger className={SECTION_TRIGGER_CLASS}>
              <span className="min-w-0 flex-1 truncate text-start">{tr("تگ‌ها")}</span>
              <ChevronDown className={`${SECTION_CHEVRON_CLASS} ${isOpen ? "" : "-rotate-90"}`} />
            </CollapsibleTrigger>
            <Dialog open={openTagDlg} onOpenChange={setOpenTagDlg}>
              <DialogTrigger asChild>
                <button
                  className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-sidebar-accent hover:text-foreground hover:opacity-100"
                  title={isEn ? "New Tag" : "تگ جدید"}
                >
                  <Plus className="w-3.5 h-3.5" />
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
