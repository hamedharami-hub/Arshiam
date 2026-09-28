import React, { useState } from "react";
import {
  CalendarDays,
  FolderTree,
  Tag,
  Inbox,
  Sun,
  Calendar,
  LayoutGrid,
  Clock,
  Filter,
  Timer,
  BarChart3,
  Compass,
  Sprout,
  Target,
  FileText,
  BrainCircuit,
  Activity,
  BookOpen,
  Zap,
  MessageCircleQuestion,
  Wind,
  User,
  Sparkles,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sliders,
  PanelLeft,
  Pin,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "./SectionCard";
import { cn } from "@/lib/utils";
import {
  getSidebarQuickLinks,
  setSidebarQuickLinks,
  toggleSidebarQuickLink,
  moveSidebarQuickLink,
  resetSidebarQuickLinks,
  SIDEBAR_QUICK_LINK_OPTIONS,
  GROUP_LABELS,
  type SidebarQuickLinkGroup,
} from "@/lib/sidebarQuickLinks";
import {
  useSidebarWidth,
  SIDEBAR_WIDTH_PRESETS,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from "@/lib/sidebarWidth";

const QUICK_LINK_ICONS: Record<string, any> = {
  "/app/today": CalendarDays,
  __folders: FolderTree,
  __tags: Tag,
  "/app/inbox": Inbox,
  "/app/tomorrow": Sun,
  "/app/next7": CalendarDays,
  "/app/calendar": Calendar,
  "/app/widgets": LayoutGrid,
  "/app/buckets": Clock,
  "/app/smart": Filter,
  "/app/pomodoro": Timer,
  "/app/stats": BarChart3,
  "/app/life-architect": Compass,
  "/app/garden": Sprout,
  "/app/habits": Target,
  "/app/notes": FileText,
  "/app/cycle": Calendar,
  "/app/mind": BrainCircuit,
  "/app/checkin": Activity,
  "/app/thoughts": BookOpen,
  "/app/abc": Zap,
  "/app/socratic": MessageCircleQuestion,
  "/app/breathing": Wind,
  "/app/about-me": User,
  "/app/self": Sparkles,
};

interface SortableShortcutItemProps {
  item: (typeof SIDEBAR_QUICK_LINK_OPTIONS)[number];
  orderIndex: number;
  isEn: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (url: string, dir: "up" | "down") => void;
  onToggle: (url: string, enabled: boolean) => void;
}

function SortableShortcutItem({
  item,
  orderIndex,
  isEn,
  canMoveUp,
  canMoveDown,
  onMove,
  onToggle,
}: SortableShortcutItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.url,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = QUICK_LINK_ICONS[item.url] || LayoutGrid;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors select-none",
        "border-border/80 bg-card/70 hover:bg-card/90",
        isDragging &&
          "opacity-60 scale-[1.02] shadow-lg border-primary z-10 bg-card ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={isEn ? "Drag to reorder" : "بکشید برای تغییر ترتیب"}
          title={
            isEn
              ? "Drag to reorder (hold on touch)"
              : "بکشید برای تغییر ترتیب (روی لمسی نگه دارید)"
          }
          className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Up/Down buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-md hover:bg-accent disabled:opacity-30"
            disabled={!canMoveUp}
            onClick={() => onMove(item.url, "up")}
            title={isEn ? "Move up" : "انتقال به بالا"}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-md hover:bg-accent disabled:opacity-30"
            disabled={!canMoveDown}
            onClick={() => onMove(item.url, "down")}
            title={isEn ? "Move down" : "انتقال به پایین"}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid place-items-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          <span className="text-xs font-semibold truncate">
            {isEn ? item.labelEn : item.labelFa}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 font-normal text-muted-foreground"
          >
            {GROUP_LABELS[item.group][isEn ? "en" : "fa"]}
          </Badge>
        </div>

        <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-full shrink-0">
          #{orderIndex}
        </span>
      </div>

      <Switch
        checked={true}
        onCheckedChange={(checked) => onToggle(item.url, checked)}
        aria-label={isEn ? `Toggle ${item.labelEn}` : `تغییر وضعیت ${item.labelFa}`}
      />
    </div>
  );
}

export function SidebarQuickLinksSettings({ isEn }: { isEn: boolean }) {
  const [selected, setSelected] = useState<string[]>(getSidebarQuickLinks);
  const [sidebarWidth, setWidth] = useSidebarWidth();
  const [activeGroup, setActiveGroup] = useState<"all" | SidebarQuickLinkGroup>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sync = () => {
    setSelected(getSidebarQuickLinks());
  };

  const handleToggle = (url: string, enabled: boolean) => {
    toggleSidebarQuickLink(url, enabled);
    sync();
  };

  const handleMove = (url: string, dir: "up" | "down") => {
    moveSidebarQuickLink(url, dir);
    sync();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeUrl = String(active.id);
    const overUrl = String(over.id);

    const oldIndex = selected.indexOf(activeUrl);
    const newIndex = selected.indexOf(overUrl);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(selected, oldIndex, newIndex);
    const sanitized = ["/app/today", ...next.filter((u) => u !== "/app/today")];
    setSidebarQuickLinks(sanitized);
    setSelected(sanitized);
    toast.success(isEn ? "Sidebar order updated" : "ترتیب آیکن‌های نوار کناری به‌روز شد");
  };

  const handleReset = () => {
    resetSidebarQuickLinks();
    setWidth(SIDEBAR_WIDTH_PRESETS.standard);
    sync();
    toast.success(
      isEn
        ? "Sidebar settings reset to default"
        : "تنظیمات نوار کناری به حالت پیش‌فرض بازگشت",
    );
  };

  // Selectable options (excluding /app/today since it is pinned)
  const selectableOptions = SIDEBAR_QUICK_LINK_OPTIONS.filter((o) => o.url !== "/app/today");

  // Active items in custom order (excluding /app/today)
  const activeItems = selected
    .filter((url) => url !== "/app/today")
    .map((url) => SIDEBAR_QUICK_LINK_OPTIONS.find((o) => o.url === url))
    .filter((item): item is (typeof SIDEBAR_QUICK_LINK_OPTIONS)[number] => Boolean(item));

  // Catalog items filtered by group and search query
  const catalogItems = selectableOptions.filter((item) => {
    if (activeGroup !== "all" && item.group !== activeGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchFa = item.labelFa.toLowerCase().includes(q);
      const matchEn = item.labelEn.toLowerCase().includes(q);
      const matchUrl = item.url.toLowerCase().includes(q);
      return matchFa || matchEn || matchUrl;
    }
    return true;
  });

  const totalActive = selected.length;

  return (
    <SectionCard
      icon={Sliders}
      title={isEn ? "Sidebar & Icons Settings" : "تنظیمات نوار کناری و آیکن‌ها"}
      description={
        isEn
          ? "Configure sidebar width, choose which shortcuts appear in the collapsed icon rail, and change their order by dragging or tapping."
          : "تنظیم عرض سایدبار در حالت باز، انتخاب میان‌برهای نمایش‌داده‌شده در حالت جمع‌شده و تغییر ترتیب آن‌ها با کشیدن یا کلیک."
      }
    >
      {/* 1. Sidebar Width in Expanded Mode */}
      <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-card/40">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <PanelLeft className="w-4 h-4 text-primary" />
              {isEn ? "Sidebar Width (Expanded Mode)" : "عرض سایدبار (در حالت باز)"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isEn
                ? "Adjust width of the expanded sidebar alongside content."
                : "تنظیم عرض سایدبار وقتی باز است تا فضای میانی صفحه متناسب باشد."}
            </p>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg">
            {sidebarWidth} px
          </span>
        </div>

        <div className="pt-2">
          <Slider
            value={[sidebarWidth]}
            min={SIDEBAR_MIN_WIDTH}
            max={SIDEBAR_MAX_WIDTH}
            step={10}
            onValueChange={([val]) => setWidth(val)}
            className="w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={sidebarWidth === SIDEBAR_WIDTH_PRESETS.narrow ? "default" : "outline"}
            className="h-7 text-xs rounded-lg"
            onClick={() => setWidth(SIDEBAR_WIDTH_PRESETS.narrow)}
          >
            {isEn ? "Narrow (220px)" : "باریک (۲۲۰px)"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sidebarWidth === SIDEBAR_WIDTH_PRESETS.standard ? "default" : "outline"}
            className="h-7 text-xs rounded-lg"
            onClick={() => setWidth(SIDEBAR_WIDTH_PRESETS.standard)}
          >
            {isEn ? "Standard (260px)" : "استاندارد (۲۶۰px)"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sidebarWidth === SIDEBAR_WIDTH_PRESETS.wide ? "default" : "outline"}
            className="h-7 text-xs rounded-lg"
            onClick={() => setWidth(SIDEBAR_WIDTH_PRESETS.wide)}
          >
            {isEn ? "Wide (340px)" : "عریض (۳۴۰px)"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sidebarWidth === SIDEBAR_WIDTH_PRESETS.extraWide ? "default" : "outline"}
            className="h-7 text-xs rounded-lg"
            onClick={() => setWidth(SIDEBAR_WIDTH_PRESETS.extraWide)}
          >
            {isEn ? "Extra Wide (420px)" : "خیلی عریض (۴۲۰px)"}
          </Button>
        </div>
      </div>

      {/* 2. Pinned Items Info */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Pin className="w-3.5 h-3.5 text-primary" />
          {isEn ? "Pinned Defaults" : "میان‌برهای ثابت و اصلی"}
        </Label>
        <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span>{isEn ? "Today's Tasks (/app/today)" : "کارهای امروز (/app/today)"}</span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-background/80">
            {isEn ? "Always first & active" : "همواره در بالای لیست"}
          </Badge>
        </div>
      </div>

      {/* 3. Drag-and-Drop Active Shortcuts */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isEn ? "Active Shortcuts (Reorder)" : "میان‌برهای فعال نوار کناری (تغییر ترتیب)"}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Drag with handle or tap arrows to reorder items. Changes apply immediately."
                : "با دستگیره بکشید یا فلش‌ها را برای جابجایی بزنید. تغییرات فوری اعمال می‌شوند."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {totalActive} {isEn ? "active" : "فعال"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              title={isEn ? "Reset to default order" : "بازنشانی به حالت پیش‌فرض"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? "Reset" : "پیش‌فرض"}</span>
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeItems.map((i) => i.url)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {activeItems.map((item, idx) => (
                <SortableShortcutItem
                  key={item.url}
                  item={item}
                  orderIndex={idx + 2}
                  isEn={isEn}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < activeItems.length - 1}
                  onMove={handleMove}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 4. Catalog / Add & Remove Shortcuts */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isEn ? "All Available Shortcuts & Categories" : "تمام میان‌برها و دسته‌بندی‌ها"}
        </Label>

        {/* Group Filter Tabs & Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEn
                  ? "Search items (e.g. folders, tags, notes)..."
                  : "جستجوی موارد (مانند فولدرها، تگ‌ها، نوت‌ها)..."
              }
              className="ps-8 h-8 text-xs bg-card/60"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {(
              [
                { key: "all", labelFa: "همه", labelEn: "All" },
                { key: "core", labelFa: GROUP_LABELS.core.fa, labelEn: GROUP_LABELS.core.en },
                { key: "do", labelFa: GROUP_LABELS.do.fa, labelEn: GROUP_LABELS.do.en },
                { key: "grow", labelFa: GROUP_LABELS.grow.fa, labelEn: GROUP_LABELS.grow.en },
                { key: "mind", labelFa: GROUP_LABELS.mind.fa, labelEn: GROUP_LABELS.mind.en },
                { key: "me", labelFa: GROUP_LABELS.me.fa, labelEn: GROUP_LABELS.me.en },
              ] as const
            ).map((grp) => {
              const count =
                grp.key === "all"
                  ? selectableOptions.filter((o) => selected.includes(o.url)).length
                  : selectableOptions.filter(
                      (o) => o.group === grp.key && selected.includes(o.url),
                    ).length;
              const isCurrent = activeGroup === grp.key;
              return (
                <Button
                  key={grp.key}
                  type="button"
                  size="sm"
                  variant={isCurrent ? "default" : "outline"}
                  className="h-6 text-[11px] px-2 rounded-lg gap-1"
                  onClick={() => setActiveGroup(grp.key)}
                >
                  <span>{isEn ? grp.labelEn : grp.labelFa}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1 rounded-full",
                      isCurrent
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Catalog List */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pe-1">
          {catalogItems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              {isEn ? "No items match your search." : "موردی مطابق جستجوی شما یافت نشد."}
            </div>
          ) : (
            catalogItems.map((item) => {
              const isEnabled = selected.includes(item.url);
              const orderIndex = selected.indexOf(item.url);
              const Icon = QUICK_LINK_ICONS[item.url] || LayoutGrid;

              return (
                <div
                  key={item.url}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors",
                    isEnabled
                      ? "border-border/80 bg-card/60"
                      : "border-border/30 bg-muted/20 opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="grid place-items-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                      <span className="text-xs font-semibold truncate">
                        {isEn ? item.labelEn : item.labelFa}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 font-normal text-muted-foreground"
                      >
                        {GROUP_LABELS[item.group][isEn ? "en" : "fa"]}
                      </Badge>
                    </div>

                    {isEnabled && (
                      <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-full shrink-0">
                        #{orderIndex}
                      </span>
                    )}
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(item.url, checked)}
                    aria-label={isEn ? `Toggle ${item.labelEn}` : `تغییر وضعیت ${item.labelFa}`}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </SectionCard>
  );
}
