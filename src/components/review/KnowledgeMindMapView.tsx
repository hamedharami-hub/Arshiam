import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Circle,
  Maximize2,
  Minimize2,
  Folder,
  FolderTree,
  FileText,
  Sparkles,
  Search,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  Eye,
  ArrowRightLeft,
  GitBranch,
  LayoutGrid,
  X,
  Check,
  CalendarPlus,
  ListTree,
  MoreHorizontal,
  Palette,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBilingual } from "@/hooks/useBilingual";
import { useLongPress } from "@/lib/useLongPress";
import { isPersianText } from "@/lib/bilingualHelper";
import { resolveLeitnerCardText, type StudyContentLanguage } from "@/lib/leitnerCardLanguage";
import type { KnowledgeFolder, KnowledgeDocument } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { getKnowledgeFolders, getKnowledgeDocuments } from "@/lib/knowledgeService";
import { getLeitnerCards } from "@/lib/leitnerService";
import { TaskKnowledgeReaderDialog } from "@/components/task-detail/TaskKnowledgeReaderDialog";
import { StudyTaskScheduleModal } from "@/components/knowledge/StudyTaskScheduleModal";
import { buildKnowledgeMindMapSearch, mindMapNodeMatchesSearch } from "@/lib/knowledgeMindMapSearch";
import {
  buildMindMapOutline,
  buildMindMapRootCenterByNodeId,
  getKnowledgeMindMapConnectorPath,
  getMindMapNodeDimensions,
  layoutKnowledgeMindMapMatrix,
  layoutKnowledgeMindMapRadial,
  layoutKnowledgeMindMapVertical,
  type KnowledgeMindMapConnectorStyle,
  type KnowledgeMindMapCanvasLayoutMode,
  type KnowledgeMindMapNodeDensity,
  type MindMapOutlineEntry,
} from "@/lib/knowledgeMindMapLayout";
import {
  KNOWLEDGE_MIND_MAP_COLORS,
  KNOWLEDGE_MIND_MAP_SHAPES,
  loadKnowledgeMindMapNodeStyles,
  saveKnowledgeMindMapNodeStyles,
  type KnowledgeMindMapColor,
  type KnowledgeMindMapNodeStyle,
  type KnowledgeMindMapNodeStyles,
  type KnowledgeMindMapShape,
} from "@/lib/knowledgeMindMapAppearance";
import { toast } from "sonner";

const MIN_MIND_MAP_ZOOM = 0.02;

interface KnowledgeMindMapViewProps {
  userId: string;
  cardLanguage?: StudyContentLanguage;
  onOpenDocument?: (docId: string) => void;
  initialFolderId?: string;
  initialDocId?: string;
}

interface MindMapNode {
  id: string;
  type: "root" | "folder" | "subfolder" | "doc" | "card";
  title: string;
  secondaryTitle?: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
  hasChildren: boolean;
  isExpanded: boolean;
  childCount: number;
  color: string;
  accentColor: string;
  appearance?: KnowledgeMindMapNodeStyle;
  dataId?: string;
  docRef?: KnowledgeDocument;
}

interface MindMapLink {
  id: string;
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  isDashed?: boolean;
}

// Highly optimized memoized node card to avoid unnecessary re-renders during canvas pan/zoom
interface MindMapNodeItemProps {
  node: MindMapNode;
  isHighlighted: boolean;
  isEn: boolean;
  compactLabels: boolean;
  treeDirection?: "rtl" | "ltr";
  isCurrentScopeRoot?: boolean;
  onOpenPreview: (doc: KnowledgeDocument) => void;
  onToggleExpand: (nodeId: string) => void;
  onFocusScope?: (scopeId: string) => void;
  onScheduleTask?: (node: MindMapNode) => void;
  canScheduleTask?: boolean;
  onCustomizeAppearance: (nodeId: string) => void;
}

interface MindMapNodeActionsProps {
  node: MindMapNode;
  isEn: boolean;
  canFocus: boolean;
  canSchedule: boolean;
  onOpenPreview: (doc: KnowledgeDocument) => void;
  onFocusScope: (scopeId: string) => void;
  onScheduleTask: (node: MindMapNode) => void;
  canCustomize: boolean;
  onCustomizeAppearance: (nodeId: string) => void;
}

const MIND_MAP_COLOR_LABELS: Record<KnowledgeMindMapColor, { en: string; fa: string; swatch: string; node: string; title: string }> = {
  default: { en: "Default", fa: "پیش‌فرض", swatch: "bg-primary", node: "", title: "" },
  violet: { en: "Violet", fa: "بنفش", swatch: "bg-violet-500", node: "border-violet-500/50 bg-violet-500/10", title: "text-violet-700 dark:text-violet-300" },
  blue: { en: "Blue", fa: "آبی", swatch: "bg-blue-500", node: "border-blue-500/50 bg-blue-500/10", title: "text-blue-700 dark:text-blue-300" },
  emerald: { en: "Emerald", fa: "سبز", swatch: "bg-emerald-500", node: "border-emerald-500/50 bg-emerald-500/10", title: "text-emerald-700 dark:text-emerald-300" },
  amber: { en: "Amber", fa: "کهربایی", swatch: "bg-amber-500", node: "border-amber-500/50 bg-amber-500/10", title: "text-amber-800 dark:text-amber-300" },
  rose: { en: "Rose", fa: "صورتی", swatch: "bg-rose-500", node: "border-rose-500/50 bg-rose-500/10", title: "text-rose-700 dark:text-rose-300" },
};

const MIND_MAP_SHAPE_LABELS: Record<KnowledgeMindMapShape, { en: string; fa: string; preview: string }> = {
  rounded: { en: "Rounded", fa: "گرد", preview: "rounded-xl" },
  "soft-square": { en: "Soft square", fa: "گوشه‌ملایم", preview: "rounded-md" },
  square: { en: "Square", fa: "مربع", preview: "rounded-sm" },
};

const DEFAULT_NODE_STYLE: KnowledgeMindMapNodeStyle = { color: "default", shape: "rounded" };
const EMPTY_NODE_STYLES: KnowledgeMindMapNodeStyles = Object.freeze({});

const MindMapNodeActions = React.memo<MindMapNodeActionsProps>(({
  node,
  isEn,
  canFocus,
  canSchedule,
  onOpenPreview,
  onFocusScope,
  onScheduleTask,
  canCustomize,
  onCustomizeAppearance,
}) => {
  const hasReadAction = node.type === "doc" && Boolean(node.docRef);
  if (!hasReadAction && !canFocus && !canSchedule && !canCustomize) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={isEn ? `Actions for ${node.title}` : `گزینه‌های ${node.title}`}
            title={isEn ? "More actions" : "گزینه‌های بیشتر"}
            data-no-longpress
            onClick={(event) => event.stopPropagation()}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {hasReadAction && (
            <DropdownMenuItem onSelect={() => node.docRef && onOpenPreview(node.docRef)}>
              <Eye className="me-2 h-4 w-4 text-primary" />
              {isEn ? "Open in Reader" : "باز کردن در مطالعه"}
            </DropdownMenuItem>
          )}
          {canFocus && (
            <DropdownMenuItem onSelect={() => onFocusScope(node.id)}>
              <GitBranch className="me-2 h-4 w-4 text-primary" />
              {isEn ? "Focus on this branch" : "تمرکز روی این شاخه"}
            </DropdownMenuItem>
          )}
          {canSchedule && (
            <DropdownMenuItem onSelect={() => onScheduleTask(node)}>
              <CalendarPlus className="me-2 h-4 w-4 text-indigo-500" />
              {node.type === "card"
                ? isEn ? "Schedule source lesson" : "زمان‌بندی مرور درس مادر"
                : isEn ? "Schedule a review task" : "زمان‌بندی تسک مرور"}
            </DropdownMenuItem>
          )}
          {canCustomize && (
            <>
              {(hasReadAction || canFocus || canSchedule) && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => onCustomizeAppearance(node.id)}>
                <Palette className="me-2 h-4 w-4 text-primary" />
                {isEn ? "Customize appearance" : "تغییر ظاهر گره"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
});

MindMapNodeActions.displayName = "MindMapNodeActions";

interface MindMapNodeAppearanceDialogProps {
  node: MindMapNode | null;
  isEn: boolean;
  onOpenChange: (open: boolean) => void;
  onAppearanceChange: (nodeId: string, patch: Partial<KnowledgeMindMapNodeStyle>) => void;
}

const MindMapNodeAppearanceDialog = React.memo<MindMapNodeAppearanceDialogProps>(({
  node,
  isEn,
  onOpenChange,
  onAppearanceChange,
}) => (
  <Dialog open={Boolean(node)} onOpenChange={onOpenChange}>
    {node && (
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEn ? "Customize node appearance" : "تنظیم ظاهر گره"}</DialogTitle>
          <DialogDescription className="break-words">
            {node.title} · {isEn ? "Saved on this device only." : "فقط روی همین دستگاه ذخیره می‌شود."}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{isEn ? "Color" : "رنگ"}</legend>
          <div className="grid grid-cols-2 gap-2">
            {KNOWLEDGE_MIND_MAP_COLORS.map((color) => {
              const label = isEn ? MIND_MAP_COLOR_LABELS[color].en : MIND_MAP_COLOR_LABELS[color].fa;
              return (
                <label key={color} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name={`mind-map-color-${node.id}`}
                    value={color}
                    checked={(node.appearance?.color ?? "default") === color}
                    onChange={() => onAppearanceChange(node.id, { color })}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${MIND_MAP_COLOR_LABELS[color].swatch}`} />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{isEn ? "Shape" : "شکل"}</legend>
          <div className="grid grid-cols-3 gap-2">
            {KNOWLEDGE_MIND_MAP_SHAPES.map((shape) => {
              const label = isEn ? MIND_MAP_SHAPE_LABELS[shape].en : MIND_MAP_SHAPE_LABELS[shape].fa;
              const selected = (node.appearance?.shape ?? "rounded") === shape;
              return (
                <button
                  key={shape}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAppearanceChange(node.id, { shape })}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 border px-2 py-1.5 text-xs transition ${MIND_MAP_SHAPE_LABELS[shape].preview} ${selected ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  <span aria-hidden="true" className={`h-3 w-7 border border-current ${MIND_MAP_SHAPE_LABELS[shape].preview}`} />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </DialogContent>
    )}
  </Dialog>
));

MindMapNodeAppearanceDialog.displayName = "MindMapNodeAppearanceDialog";

interface MindMapOutlineItemProps {
  entry: MindMapOutlineEntry<MindMapNode>;
  depth: number;
  isEn: boolean;
  isCurrentScopeRoot: boolean;
  canScheduleNode: (node: MindMapNode) => boolean;
  onOpenPreview: (doc: KnowledgeDocument) => void;
  onToggleExpand: (nodeId: string) => void;
  onFocusScope: (scopeId: string) => void;
  onScheduleTask: (node: MindMapNode) => void;
  onCustomizeAppearance: (nodeId: string) => void;
}

const MindMapOutlineItem = React.memo<MindMapOutlineItemProps>(({
  entry,
  depth,
  isEn,
  isCurrentScopeRoot,
  canScheduleNode,
  onOpenPreview,
  onToggleExpand,
  onFocusScope,
  onScheduleTask,
  onCustomizeAppearance,
}) => {
  const { node } = entry;
  const titleDirection = isPersianText(node.title) ? "rtl" : "ltr";
  const secondaryTitleDirection = node.secondaryTitle && isPersianText(node.secondaryTitle) ? "rtl" : "ltr";
  const isFolder = node.type === "folder" || node.type === "subfolder" || node.type === "root";
  const isDoc = node.type === "doc";
  const itemIsScopeRoot = isCurrentScopeRoot || node.type === "root";
  const Icon = node.type === "root" ? Sparkles : isFolder ? Folder : isDoc ? FileText : Layers;
  const canFocus = node.type !== "root" && !isCurrentScopeRoot && (isFolder || isDoc);
  const nodeColor = node.appearance?.color ?? "default";
  const nodeShape = node.appearance?.shape ?? "rounded";
  const customColor = nodeColor === "default" ? "" : MIND_MAP_COLOR_LABELS[nodeColor].node;
  const customTitleColor = nodeColor === "default" ? "" : MIND_MAP_COLOR_LABELS[nodeColor].title;

  const openOrExpand = () => {
    if (isDoc && node.docRef) onOpenPreview(node.docRef);
    else if (node.hasChildren) onToggleExpand(node.id);
  };

  return (
    <li className="min-w-0 list-none" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 68px" }}>
      <div
        className={`group flex min-w-0 items-start gap-2 border px-3 py-2.5 shadow-sm transition-colors ${MIND_MAP_SHAPE_LABELS[nodeShape].preview} ${
          customColor || (itemIsScopeRoot
            ? "border-primary/35 bg-primary/8"
            : isFolder
              ? "border-emerald-500/20 bg-card hover:border-emerald-500/45"
              : isDoc
                ? "border-primary/20 bg-card hover:border-primary/40"
                : "border-pink-500/20 bg-card hover:border-pink-500/40")
        }`}
        style={{ marginInlineStart: depth ? Math.min(depth, 8) * 18 : 0 }}
      >
        <button
          type="button"
          aria-label={node.hasChildren
            ? node.isExpanded
              ? isEn ? `Collapse ${node.title}` : `بستن ${node.title}`
              : isEn ? `Expand ${node.title}` : `باز کردن ${node.title}`
            : isDoc
              ? isEn ? `Read ${node.title}` : `مطالعه ${node.title}`
              : node.title}
          aria-expanded={node.hasChildren ? node.isExpanded : undefined}
          onClick={() => node.hasChildren ? onToggleExpand(node.id) : openOrExpand()}
          className="mt-0.5 flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {node.hasChildren
            ? node.isExpanded
              ? <ChevronDown className="h-4 w-4" />
              : titleDirection === "rtl"
                ? <ChevronLeft className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />
            : <span className="h-1.5 w-1.5 rounded-full bg-border" />}
        </button>
        <Icon className={`mt-1 h-4 w-4 shrink-0 ${
          node.type === "root" ? "text-amber-500" : isFolder ? "text-emerald-600" : isDoc ? "text-primary" : "text-pink-500"
        }`} aria-hidden="true" />
        <button
          type="button"
          dir={titleDirection}
          aria-label={isDoc
            ? isEn ? `Read document ${node.title}` : `مطالعه سند ${node.title}`
            : node.title}
          onClick={openOrExpand}
          className={`min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${customTitleColor || "text-foreground"} ${
            titleDirection === "rtl" ? "text-right" : "text-left"
          }`}
          style={{ overflowWrap: "anywhere" }}
        >
          {node.title}
          {node.secondaryTitle && (
            <span
              dir={secondaryTitleDirection}
              className={`mt-0.5 block whitespace-normal break-words text-xs font-normal leading-5 text-muted-foreground ${
                secondaryTitleDirection === "rtl" ? "text-right" : "text-left"
              }`}
              style={{ overflowWrap: "anywhere" }}
            >
              {node.secondaryTitle}
            </span>
          )}
          {node.subtitle && (
            <span className="mt-0.5 block whitespace-normal text-xs font-normal leading-5 text-muted-foreground">
              {node.subtitle}
            </span>
          )}
        </button>
        <MindMapNodeActions
          node={node}
          isEn={isEn}
          canFocus={canFocus}
          canSchedule={canScheduleNode(node)}
          onOpenPreview={onOpenPreview}
          onFocusScope={onFocusScope}
          onScheduleTask={onScheduleTask}
          canCustomize={node.id !== "root-kb"}
          onCustomizeAppearance={onCustomizeAppearance}
        />
      </div>
      {entry.children.length > 0 && (
        <ul className="mt-2 space-y-2 border-s border-border/70 ps-3">
          {entry.children.map((child) => (
            <MindMapOutlineItem
              key={child.node.id}
              entry={child}
              depth={depth + 1}
              isEn={isEn}
              isCurrentScopeRoot={isCurrentScopeRoot}
              canScheduleNode={canScheduleNode}
              onOpenPreview={onOpenPreview}
              onToggleExpand={onToggleExpand}
              onFocusScope={onFocusScope}
              onScheduleTask={onScheduleTask}
              onCustomizeAppearance={onCustomizeAppearance}
            />
          ))}
        </ul>
      )}
    </li>
  );
});

MindMapOutlineItem.displayName = "MindMapOutlineItem";

const MindMapNodeItem = React.memo<MindMapNodeItemProps>(
  ({
    node,
    isHighlighted,
    isEn,
    compactLabels,
    treeDirection = "ltr",
    isCurrentScopeRoot = false,
    onOpenPreview,
    onToggleExpand,
    onFocusScope,
    onScheduleTask,
    canScheduleTask = false,
    onCustomizeAppearance,
  }) => {
    const isDoc = node.type === "doc";
    const isFolder = node.type === "folder" || node.type === "subfolder";
    const isRoot = node.type === "root";
    const isCard = node.type === "card";

    const isTitlePersian = isPersianText(node.title);
    const isSecondaryTitlePersian = node.secondaryTitle ? isPersianText(node.secondaryTitle) : false;
    const isSubtitlePersian = node.subtitle ? isPersianText(node.subtitle) : isTitlePersian;
    const isTreeRtl = treeDirection === "rtl";
    const nodeColor = node.appearance?.color ?? "default";
    const nodeShape = node.appearance?.shape ?? "rounded";
    const customColor = nodeColor === "default" ? "" : MIND_MAP_COLOR_LABELS[nodeColor].node;
    const customTitleColor = nodeColor === "default" ? "" : MIND_MAP_COLOR_LABELS[nodeColor].title;

    const longPress = useLongPress({
      onLongPress: () => {
        if (canScheduleTask) onScheduleTask?.(node);
      },
      delay: 500,
    });

    return (
      <div
        {...longPress.handlers}
        style={{
          position: "absolute",
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          zIndex: 2,
        }}
        className={`mindmap-interactive-node p-2.5 ${MIND_MAP_SHAPE_LABELS[nodeShape].preview} border flex items-start justify-between gap-2 shadow-xs backdrop-blur-xl transition-all duration-150 cursor-pointer ${
          isHighlighted ? "ring-2 ring-amber-400 shadow-md shadow-amber-400/25 scale-105" : ""
        } ${
          node.id === "root-kb"
            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold ring-2 ring-primary/30"
            : customColor
              ? `${customColor} text-card-foreground`
              : isCurrentScopeRoot || isRoot
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold ring-2 ring-primary/30"
                : isFolder
                  ? "bg-card text-card-foreground border-emerald-500/40 hover:border-emerald-500 hover:shadow-sm"
                  : isDoc
                    ? "bg-card text-card-foreground border-primary/40 hover:border-primary hover:shadow-sm hover:bg-primary/5"
                    : "bg-card text-card-foreground border-pink-500/30 hover:border-pink-500 hover:shadow-xs"
        }`}
        onClick={(e) => {
          if (longPress.didFire()) return;
          e.stopPropagation();
          if (isDoc && node.docRef) {
            onOpenPreview(node.docRef);
          } else if (node.hasChildren) {
            onToggleExpand(node.id);
          }
        }}
      >
        {/* Node Icon & Labels */}
        <div
          dir={isTitlePersian ? "rtl" : "ltr"}
          className="flex items-start gap-2 min-w-0 flex-1"
        >
          <div className="shrink-0">
            {isRoot && <Sparkles className="w-4 h-4 text-amber-300" />}
            {isFolder && <Folder className="w-4 h-4 text-emerald-500" />}
            {isDoc && <FileText className="w-4 h-4 text-primary" />}
            {isCard && <Layers className="w-3.5 h-3.5 text-pink-500" />}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div
              dir={isTitlePersian ? "rtl" : "ltr"}
              className={`whitespace-normal break-words text-xs font-semibold leading-4 ${
                isTitlePersian ? "text-right" : "text-left"
              } ${
                customTitleColor || (isRoot || isCurrentScopeRoot ? "text-primary-foreground" : "text-foreground")
              }`}
              style={{ overflowWrap: "anywhere" }}
            >
              {node.title}
            </div>
            {node.secondaryTitle && (
              <div
                dir={isSecondaryTitlePersian ? "rtl" : "ltr"}
                className={`whitespace-normal break-words text-[10px] leading-3 ${
                  isSecondaryTitlePersian ? "text-right" : "text-left"
                } text-muted-foreground`}
                style={{ overflowWrap: "anywhere" }}
              >
                {node.secondaryTitle}
              </div>
            )}
            {node.subtitle && !compactLabels && (
              <div
                dir={isSubtitlePersian ? "rtl" : "ltr"}
                className={`whitespace-normal break-words text-[10px] leading-3 ${
                  isSubtitlePersian ? "text-right" : "text-left"
                } ${
                  isRoot || isCurrentScopeRoot ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
                style={{ overflowWrap: "anywhere" }}
              >
                {node.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Keep canvas nodes quiet; the compact action menu holds secondary actions. */}
        <div className="flex items-start gap-1 shrink-0">
          <MindMapNodeActions
            node={node}
            isEn={isEn}
            canFocus={!isRoot && !isCurrentScopeRoot && Boolean(onFocusScope) && (isFolder || isDoc)}
            canSchedule={canScheduleTask}
            onOpenPreview={onOpenPreview}
            onFocusScope={(scopeId) => onFocusScope?.(scopeId)}
            onScheduleTask={(target) => onScheduleTask?.(target)}
            canCustomize={node.id !== "root-kb"}
            onCustomizeAppearance={onCustomizeAppearance}
          />
          {node.hasChildren && (
            <button
              type="button"
              aria-label={node.isExpanded
                ? isEn ? `Collapse ${node.title}` : `بستن ${node.title}`
                : isEn ? `Expand ${node.title}` : `باز کردن ${node.title}`}
              aria-expanded={node.isExpanded}
              data-no-longpress
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand(node.id);
              }}
              className={`rounded-lg p-1 transition ${
                isRoot || isCurrentScopeRoot
                  ? "text-primary-foreground hover:bg-primary-foreground/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {node.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : isTreeRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
          <div className="hidden">
          {/* For Document: Direct Read Button */}
          {isDoc && (
            <button
              type="button"
              title={isEn ? "Open in Reader" : "مطالعه سند"}
              onClick={(e) => {
                e.stopPropagation();
                if (node.docRef) {
                  onOpenPreview(node.docRef);
                }
              }}
              className="p-1 rounded-lg text-primary hover:bg-primary/10 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Focus on this branch button */}
          {!isRoot && !isCurrentScopeRoot && onFocusScope && (isFolder || isDoc) && (
            <button
              type="button"
              title={isEn ? "Focus on this branch" : "تمرکز روی این شاخه"}
              onClick={(e) => {
                e.stopPropagation();
                onFocusScope(node.id);
              }}
              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Schedule Mind Map Review Task button */}
          {onScheduleTask && (
            <button
              type="button"
              title={
                isEn
                  ? "Schedule Mind Map Review Task"
                  : "برنامه‌ریزی مرور در نقشه ذهنی (تسک)"
              }
              onClick={(e) => {
                e.stopPropagation();
                onScheduleTask(node);
              }}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isRoot || isCurrentScopeRoot
                  ? "hover:bg-primary-foreground/20 text-primary-foreground/90"
                  : "hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-500"
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Expand / Collapse Button if has children */}
          {node.hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isRoot || isCurrentScopeRoot
                  ? "hover:bg-primary-foreground/20 text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {node.isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : isTreeRtl ? (
                <ChevronLeft className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          </div>
        </div>
      </div>
    );
  }
);

MindMapNodeItem.displayName = "MindMapNodeItem";

export const KnowledgeMindMapView: React.FC<KnowledgeMindMapViewProps> = ({
  userId,
  cardLanguage = "fa",
  onOpenDocument,
  initialFolderId,
  initialDocId,
}) => {
  const { isEn } = useBilingual();
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [selectedScopeId, setSelectedScopeId] = useState<string>(() => {
    if (initialFolderId) return `folder-${initialFolderId}`;
    if (initialDocId) return `doc-${initialDocId}`;
    return "all";
  });
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({
    "root-kb": true,
  });

  useEffect(() => {
    if (initialFolderId) {
      setSelectedScopeId(`folder-${initialFolderId}`);
    } else if (initialDocId) {
      setSelectedScopeId(`doc-${initialDocId}`);
    }
  }, [initialFolderId, initialDocId]);

  // Canvas Viewport State
  const [treeDirection, setTreeDirection] = useState<"rtl" | "ltr">("ltr");
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 60, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "outline">("canvas");
  const [canvasLayout, setCanvasLayout] = useState<KnowledgeMindMapCanvasLayoutMode>("horizontal");
  const [connectorStyle, setConnectorStyle] = useState<KnowledgeMindMapConnectorStyle>("auto");
  const [compactLabels, setCompactLabels] = useState(false);
  const [nodeAppearanceState, setNodeAppearanceState] = useState(() => ({
    ownerId: userId,
    styles: loadKnowledgeMindMapNodeStyles(userId),
  }));
  const nodeStyles = nodeAppearanceState.ownerId === userId
    ? nodeAppearanceState.styles
    : EMPTY_NODE_STYLES;
  const [appearanceNodeId, setAppearanceNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (nodeAppearanceState.ownerId !== userId) {
      setNodeAppearanceState({ ownerId: userId, styles: loadKnowledgeMindMapNodeStyles(userId) });
    }
  }, [nodeAppearanceState.ownerId, userId]);

  const handleAppearanceChange = useCallback((nodeId: string, patch: Partial<KnowledgeMindMapNodeStyle>) => {
    const currentStyles = nodeAppearanceState.ownerId === userId
      ? nodeAppearanceState.styles
      : loadKnowledgeMindMapNodeStyles(userId);
    const currentStyle = currentStyles[nodeId] ?? DEFAULT_NODE_STYLE;
    const nextStyles = {
      ...currentStyles,
      [nodeId]: { ...currentStyle, ...patch },
    };
    if (!saveKnowledgeMindMapNodeStyles(userId, nextStyles)) {
      toast.error(isEn
        ? "Appearance could not be saved on this device."
        : "تنظیم ظاهری روی این دستگاه ذخیره نشد.");
    }
    setNodeAppearanceState({ ownerId: userId, styles: nextStyles });
  }, [isEn, nodeAppearanceState, userId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasInitializedViewRef = useRef(false);
  const lastCenteredSearchRef = useRef("");
  const lastFittedScopeRef = useRef<string | null>(null);
  const loadRequestRef = useRef(0);

  // RAF Scheduler for 60fps/120fps hardware-composited panning
  const rafIdRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  const schedulePanUpdate = useCallback((x: number, y: number) => {
    pendingPanRef.current = { x, y };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (pendingPanRef.current) {
          setPanOffset(pendingPanRef.current);
        }
      });
    }
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Debounce search query to prevent unnecessary recalculations on rapid typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Mobile Touch Gesture Ref
  const touchGestureRef = useRef<{
    mode: "none" | "pan" | "pinch";
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startDist: number;
    startZoom: number;
    startMidX: number;
    startMidY: number;
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDist: 0,
    startZoom: 1,
    startMidX: 0,
    startMidY: 0,
  });

  // Load Data
  const loadData = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    hasInitializedViewRef.current = false;
    setHasLoadedData(false);

    try {
      const [f, d, c] = await Promise.all([
        getKnowledgeFolders(userId),
        getKnowledgeDocuments(userId),
        getLeitnerCards(userId),
      ]);
      if (loadRequestRef.current !== requestId) return;

      setFolders(f);
      setDocuments(d);
      setCards(c);
      setHasLoadedData(true);

      // Default expand root and first 3 top-level folders
      setExpandedNodeIds((prev) => {
        const next = { ...prev, "root-kb": true };
        const rootFolders = f.filter((folder) => !folder.parent_id);
        rootFolders.forEach((rf) => {
          next[`folder-${rf.id}`] = true;
        });
        return next;
      });
    } catch (e) {
      if (loadRequestRef.current !== requestId) return;
      console.error("Error loading MindMap data", e);
      setFolders([]);
      setDocuments([]);
      setCards([]);
      setHasLoadedData(true);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const searchResult = useMemo(
    () => buildKnowledgeMindMapSearch(debouncedSearch, folders, documents, cards),
    [debouncedSearch, folders, documents, cards],
  );

  // Auto-expand every ancestor needed to reveal folder, document-content, and card matches.
  useEffect(() => {
    if (!debouncedSearch.trim()) return;
    setExpandedNodeIds((prev) => ({ ...prev, ...searchResult.expandedNodeIds }));
  }, [debouncedSearch, searchResult]);

  // Toggle expand / collapse node
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  }, []);

  // Expand All
  const handleExpandAll = useCallback(() => {
    const allExpanded: Record<string, boolean> = { [selectedScopeId]: true, "root-kb": true };
    folders.forEach((f) => {
      allExpanded[`folder-${f.id}`] = true;
    });
    documents.forEach((d) => {
      allExpanded[`doc-${d.id}`] = true;
    });
    setExpandedNodeIds(allExpanded);
  }, [folders, documents, selectedScopeId]);

  // Collapse All
  const handleCollapseAll = useCallback(() => {
    const scopeRootId = selectedScopeId === "all" ? "root-kb" : selectedScopeId;
    setExpandedNodeIds({ [scopeRootId]: true });
  }, [selectedScopeId]);

  // Current scope title for toolbar
  const currentScopeTitle = useMemo(() => {
    if (selectedScopeId === "all") {
      return isEn ? "All Knowledge Base" : "همه پایگاه دانش";
    }
    if (selectedScopeId.startsWith("folder-")) {
      const f = folders.find((item) => item.id === selectedScopeId.replace("folder-", ""));
      return f ? f.name : isEn ? "Folder" : "فولدر";
    }
    if (selectedScopeId.startsWith("doc-")) {
      const d = documents.find((item) => item.id === selectedScopeId.replace("doc-", ""));
      return d ? d.title : isEn ? "Document" : "سند";
    }
    return isEn ? "Scope" : "شاخه";
  }, [selectedScopeId, folders, documents, isEn]);

  // Breadcrumb trail for focused navigation
  const breadcrumbTrail = useMemo(() => {
    if (selectedScopeId === "all") {
      return [{ id: "all", label: isEn ? "All Knowledge Base" : "کل پایگاه دانش" }];
    }

    if (selectedScopeId.startsWith("folder-")) {
      const targetFolderId = selectedScopeId.replace("folder-", "");
      const trail: Array<{ id: string; label: string }> = [];
      let curr = folders.find((f) => f.id === targetFolderId);
      while (curr) {
        trail.unshift({ id: `folder-${curr.id}`, label: curr.name });
        curr = curr.parent_id ? folders.find((f) => f.id === curr!.parent_id) : undefined;
      }
      return [{ id: "all", label: isEn ? "All" : "همه" }, ...trail];
    }

    if (selectedScopeId.startsWith("doc-")) {
      const targetDocId = selectedScopeId.replace("doc-", "");
      const doc = documents.find((d) => d.id === targetDocId);
      if (!doc) return [{ id: "all", label: isEn ? "All" : "همه" }];
      const trail: Array<{ id: string; label: string }> = [];
      if (doc.folder_id) {
        let curr = folders.find((f) => f.id === doc.folder_id);
        while (curr) {
          trail.unshift({ id: `folder-${curr.id}`, label: curr.name });
          curr = curr.parent_id ? folders.find((f) => f.id === curr!.parent_id) : undefined;
        }
      }
      return [
        { id: "all", label: isEn ? "All" : "همه" },
        ...trail,
        { id: selectedScopeId, label: doc.title },
      ];
    }

    return [{ id: "all", label: isEn ? "All Knowledge Base" : "کل پایگاه دانش" }];
  }, [selectedScopeId, folders, documents, isEn]);

  // Study task scheduling modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{
    targetType: "mindmap_folder" | "mindmap_doc" | "mindmap_all";
    targetId: string;
    targetTitle: string;
    folderBreadcrumb?: string;
  } | null>(null);

  const handleScheduleNodeTask = useCallback(
    (node: MindMapNode) => {
      if (node.type === "root") {
        setScheduleTarget({
          targetType: "mindmap_all",
          targetId: "all",
          targetTitle: isEn ? "All Knowledge Base" : "کل پایگاه دانش",
        });
      } else if (node.type === "folder" || node.type === "subfolder") {
        const cleanId = node.id.replace(/^folder-/, "");
        const folder = folders.find((f) => f.id === cleanId);
        setScheduleTarget({
          targetType: "mindmap_folder",
          targetId: cleanId,
          targetTitle: folder?.name || node.title,
        });
      } else if (node.type === "doc") {
        const cleanId = node.id.replace(/^doc-/, "");
        const doc = documents.find((d) => d.id === cleanId);
        const parent = folders.find((f) => f.id === doc?.folder_id);
        setScheduleTarget({
          targetType: "mindmap_doc",
          targetId: cleanId,
          targetTitle: doc?.title || node.title,
          folderBreadcrumb: parent?.name,
        });
      } else if (node.type === "card" && node.parentId?.startsWith("doc-")) {
        const sourceDocId = node.parentId.slice("doc-".length);
        const sourceDoc = documents.find((doc) => doc.id === sourceDocId);
        if (!sourceDoc) return;
        const parent = folders.find((folder) => folder.id === sourceDoc.folder_id);
        setScheduleTarget({
          targetType: "mindmap_doc",
          targetId: sourceDoc.id,
          targetTitle: sourceDoc.title,
          folderBreadcrumb: parent?.name,
        });
      } else {
        return;
      }
      setScheduleModalOpen(true);
    },
    [folders, documents, isEn]
  );

  const canScheduleNode = useCallback((node: MindMapNode) => {
    if (node.type !== "card") return true;
    if (!node.parentId?.startsWith("doc-")) return false;
    const sourceDocId = node.parentId.slice("doc-".length);
    return documents.some((document) => document.id === sourceDocId);
  }, [documents]);

  const handleScheduleCurrentScope = useCallback(() => {
    if (selectedScopeId === "all") {
      setScheduleTarget({
        targetType: "mindmap_all",
        targetId: "all",
        targetTitle: isEn ? "All Knowledge Base" : "کل پایگاه دانش",
      });
    } else if (selectedScopeId.startsWith("folder-")) {
      const fId = selectedScopeId.replace("folder-", "");
      const folder = folders.find((f) => f.id === fId);
      setScheduleTarget({
        targetType: "mindmap_folder",
        targetId: fId,
        targetTitle: folder?.name || currentScopeTitle,
      });
    } else if (selectedScopeId.startsWith("doc-")) {
      const dId = selectedScopeId.replace("doc-", "");
      const doc = documents.find((d) => d.id === dId);
      const parent = folders.find((f) => f.id === doc?.folder_id);
      setScheduleTarget({
        targetType: "mindmap_doc",
        targetId: dId,
        targetTitle: doc?.title || currentScopeTitle,
        folderBreadcrumb: parent?.name,
      });
    }
    setScheduleModalOpen(true);
  }, [selectedScopeId, folders, documents, currentScopeTitle, isEn]);

  const rootFoldersList = useMemo(() => folders.filter((f) => !f.parent_id), [folders]);
  const unfiledDocsCount = useMemo(() => documents.filter((d) => !d.folder_id).length, [documents]);

  // Compute Tree Layout (Pharmacy layout algorithm: Center parent to children and prevent subtree overlap)
  const baseLayout = useMemo(() => {
    const items: MindMapNode[] = [];
    const linkList: MindMapLink[] = [];

    const colSpacing = 340;
    let currentY = 60;

    // Recursively layout tree
    function layoutNode(
      id: string,
      type: MindMapNode["type"],
      title: string,
      depth: number,
      x: number,
      parentId?: string,
      color = "#8b5cf6",
      accentColor = "#a855f7",
      dataId?: string,
      docRef?: KnowledgeDocument,
      subtitle?: string,
      childrenData: Array<() => { y: number; height: number }> = [],
      secondaryTitle?: string,
    ): { y: number; height: number } {
      const isExpanded = !!expandedNodeIds[id];
      const density: KnowledgeMindMapNodeDensity = compactLabels ? "compact" : "detailed";
      const { width, height } = getMindMapNodeDimensions(type, title, subtitle, secondaryTitle, density);
      const hasChildren = childrenData.length > 0;
      const visibleChildren = isExpanded ? childrenData : [];

      let nodeY: number;

      if (visibleChildren.length === 0) {
        nodeY = currentY;
        currentY += height + (type === "card" ? 14 : 22);
      } else {
        const childCenters: number[] = [];
        visibleChildren.forEach((childFn) => {
          const res = childFn();
          childCenters.push(res.y + res.height / 2);
        });

        if (childCenters.length === 1) {
          nodeY = childCenters[0] - height / 2;
        } else {
          const first = childCenters[0];
          const last = childCenters[childCenters.length - 1];
          nodeY = (first + last) / 2 - height / 2;
        }
      }

      const item: MindMapNode = {
        id,
        type,
        title,
        secondaryTitle,
        subtitle,
        x,
        y: nodeY,
        width,
        height,
        parentId,
        hasChildren,
        isExpanded,
        childCount: childrenData.length,
        color,
        accentColor,
        dataId,
        docRef,
      };

      items.push(item);
      return { y: nodeY, height };
    }

    // Helper to build a document node and its flashcards
    const buildDocNode = (
      doc: KnowledgeDocument,
      depth: number,
      x: number,
      parentId?: string
    ): { y: number; height: number } => {
      const docId = `doc-${doc.id}`;
      const docCards = cards.filter((c) => c.document_id === doc.id);

      const cardFns: Array<() => { y: number; height: number }> = [];
      docCards.slice(0, 15).forEach((card) => {
        cardFns.push(() => {
          const cardText = resolveLeitnerCardText(card, "front", cardLanguage);
          return layoutNode(
            `card-${card.id}`,
            "card",
            cardText.text,
            depth + 1,
            x + colSpacing,
            docId,
            "var(--primary)",
            "#ec4899",
            card.id,
            undefined,
            isEn ? `Box ${card.box}` : `جعبه ${card.box}`,
            [],
            cardText.secondaryText,
          );
        });
      });

      return layoutNode(
        docId,
        "doc",
        doc.title,
        depth,
        x,
        parentId,
        "#6366f1",
        "#818cf8",
        doc.id,
        doc,
        docCards.length > 0
          ? isEn
            ? `${docCards.length} Cards`
            : `${docCards.length} کارت`
          : undefined,
        cardFns
      );
    };

    // Helper to recursively build a folder subtree (its subfolders and documents)
    const buildFolderSubtree = (
      folder: KnowledgeFolder,
      depth: number,
      x: number,
      parentId?: string,
      isScopeRoot = false
    ): { y: number; height: number } => {
      const folderId = `folder-${folder.id}`;
      const subFolders = folders.filter((f) => f.parent_id === folder.id);
      const folderDocs = documents.filter((d) => d.folder_id === folder.id);

      const childrenFns: Array<() => { y: number; height: number }> = [];

      // Subfolders first
      subFolders.forEach((sf) => {
        childrenFns.push(() => {
          return buildFolderSubtree(sf, depth + 1, x + colSpacing, folderId, false);
        });
      });

      // Documents in this folder
      folderDocs.forEach((doc) => {
        childrenFns.push(() => {
          return buildDocNode(doc, depth + 1, x + colSpacing, folderId);
        });
      });

      const totalItems = subFolders.length + folderDocs.length;
      const subtitle = `${totalItems} ${isEn ? "items" : "مورد"}`;

      return layoutNode(
        folderId,
        isScopeRoot ? "root" : folder.parent_id ? "subfolder" : "folder",
        folder.name,
        depth,
        x,
        parentId,
        folder.color || (isScopeRoot ? "hsl(var(--primary))" : "#10b981"),
        "#34d399",
        folder.id,
        undefined,
        subtitle,
        childrenFns
      );
    };

    if (selectedScopeId === "all") {
      const rootFolders = folders.filter((f) => !f.parent_id);
      const unfiledDocs = documents.filter((d) => !d.folder_id);

      const rootChildrenFns: Array<() => { y: number; height: number }> = [];

      rootFolders.forEach((rf) => {
        rootChildrenFns.push(() => buildFolderSubtree(rf, 1, 60 + colSpacing, "root-kb", false));
      });

      unfiledDocs.forEach((doc) => {
        rootChildrenFns.push(() => buildDocNode(doc, 1, 60 + colSpacing, "root-kb"));
      });

      layoutNode(
        "root-kb",
        "root",
        isEn ? "Knowledge Base" : "پایگاه دانش جامع",
        0,
        60,
        undefined,
        "hsl(var(--primary))",
        "hsl(var(--primary))",
        undefined,
        undefined,
        `${documents.length} ${isEn ? "docs" : "سند"}`,
        rootChildrenFns
      );
    } else if (selectedScopeId.startsWith("folder-")) {
      const targetFolderId = selectedScopeId.replace("folder-", "");
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      if (targetFolder) {
        buildFolderSubtree(targetFolder, 0, 60, undefined, true);
      } else {
        layoutNode(
          "root-kb",
          "root",
          isEn ? "Knowledge Base" : "پایگاه دانش جامع",
          0,
          60,
          undefined,
          "hsl(var(--primary))",
          "hsl(var(--primary))",
          undefined,
          undefined,
          `${documents.length} ${isEn ? "docs" : "سند"}`
        );
      }
    } else if (selectedScopeId.startsWith("doc-")) {
      const targetDocId = selectedScopeId.replace("doc-", "");
      const targetDoc = documents.find((d) => d.id === targetDocId);
      if (targetDoc) {
        buildDocNode(targetDoc, 0, 60, undefined);
      }
    }

    // Normalize vertical coordinates if any negative offset
    const minYCoord = Math.min(...items.map((it) => it.y), 40);
    if (minYCoord < 40) {
      const shiftY = 40 - minYCoord;
      items.forEach((it) => (it.y += shiftY));
    }

    // If RTL tree direction, flip horizontal coordinate so branches flow right-to-left
    if (treeDirection === "rtl") {
      const maxXCoord = Math.max(...items.map((it) => it.x + it.width), 300);
      items.forEach((it) => {
        it.x = maxXCoord - (it.x - 60) - it.width;
      });
    }

    // Build lookup map for fast link generation
    const itemMap = new Map<string, MindMapNode>();
    items.forEach((it) => itemMap.set(it.id, it));

    // Generate Links
    items.forEach((item) => {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          const isTreeRtl = treeDirection === "rtl";
          const startX = isTreeRtl ? parent.x : parent.x + parent.width;
          const startY = parent.y + parent.height / 2;
          const endX = isTreeRtl ? item.x + item.width : item.x;
          const endY = item.y + item.height / 2;

          linkList.push({
            id: `link-${parent.id}-${item.id}`,
            sourceId: parent.id,
            targetId: item.id,
            startX,
            startY,
            endX,
            endY,
            color: item.color,
            isDashed: item.type === "card",
          });
        }
      }
    });

    // Bounding Box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    items.forEach((it) => {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + it.width);
      maxY = Math.max(maxY, it.y + it.height);
    });

    if (items.length === 0) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    return {
      nodes: items,
      links: linkList,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX + 160,
        height: maxY - minY + 160,
      },
    };
  }, [folders, documents, cards, expandedNodeIds, isEn, treeDirection, selectedScopeId, cardLanguage, compactLabels]);

  const canvasLayoutResult = useMemo(
    () => {
      if (canvasLayout === "vertical") return layoutKnowledgeMindMapVertical(baseLayout.nodes, treeDirection);
      if (canvasLayout === "radial") return layoutKnowledgeMindMapRadial(baseLayout.nodes, treeDirection);
      if (canvasLayout === "matrix") return layoutKnowledgeMindMapMatrix(baseLayout.nodes, treeDirection);
      return baseLayout;
    },
    [baseLayout, canvasLayout, treeDirection],
  );
  const { nodes, links, bounds } = canvasLayoutResult;
  const radialRootCenters = useMemo(() => buildMindMapRootCenterByNodeId(nodes), [nodes]);

  const displayNodes = useMemo(
    () => nodes.map((node) => ({
      ...node,
      appearance: nodeStyles[node.id] ?? DEFAULT_NODE_STYLE,
    })),
    [nodeStyles, nodes],
  );
  const appearanceNode = displayNodes.find((node) => node.id === appearanceNodeId) ?? null;
  const outlineEntries = useMemo(() => buildMindMapOutline(displayNodes), [displayNodes]);

  // Fit View To Container
  const fitViewToContainer = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 900;
    const ch = containerRef.current.clientHeight || 650;

    const bWidth = Math.max(bounds.width, 300);
    const bHeight = Math.max(bounds.height, 240);

    const scaleX = (cw - 80) / bWidth;
    const scaleY = (ch - 80) / bHeight;
    const optimalScale = Math.min(1.1, Math.max(MIN_MIND_MAP_ZOOM, Math.min(scaleX, scaleY)));
    const finalZoom = +optimalScale.toFixed(2);

    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;

    const targetPanX = Math.round(cw / 2 - contentCenterX * finalZoom);
    const targetPanY = Math.round(ch / 2 - contentCenterY * finalZoom);

    setZoomLevel(finalZoom);
    setPanOffset({ x: targetPanX, y: targetPanY });
  }, [bounds]);

  const previousCanvasViewRef = useRef({ canvasLayout, viewMode, compactLabels });
  useEffect(() => {
    const previous = previousCanvasViewRef.current;
    previousCanvasViewRef.current = { canvasLayout, viewMode, compactLabels };
    const viewChanged = previous.canvasLayout !== canvasLayout || previous.viewMode !== viewMode || previous.compactLabels !== compactLabels;
    if (viewChanged && viewMode === "canvas" && hasLoadedData) fitViewToContainer();
  }, [canvasLayout, compactLabels, fitViewToContainer, hasLoadedData, viewMode]);

  // Auto-center on initial load
  useEffect(() => {
    if (
      hasLoadedData &&
      nodes.length > 0 &&
      containerRef.current &&
      !hasInitializedViewRef.current
    ) {
      fitViewToContainer();
      hasInitializedViewRef.current = true;
    }
  }, [hasLoadedData, nodes.length, fitViewToContainer]);

  // Expanding a deep search result changes the canvas bounds but used to leave
  // the viewport parked on empty space. Center the first revealed match once
  // per query, while preserving the user's current zoom level.
  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      lastCenteredSearchRef.current = "";
      return;
    }
    if (lastCenteredSearchRef.current === query || !containerRef.current) return;

    // Prefer the most specific visible result. A card answer can also appear in
    // its parent document content; centering the parent first would leave the
    // highlighted card at the edge of (or outside) the viewport.
    const matchTypePriority: MindMapNode["type"][] = ["card", "doc", "subfolder", "folder"];
    const firstMatch = matchTypePriority
      .map((type) =>
        nodes.find((node) => node.type === type && mindMapNodeMatchesSearch(node, searchResult)),
      )
      .find((node): node is MindMapNode => Boolean(node));
    if (!firstMatch) return;

    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const width = container.clientWidth || 900;
      const height = container.clientHeight || 650;
      const centerX = firstMatch.x + firstMatch.width / 2;
      const centerY = firstMatch.y + firstMatch.height / 2;
      setPanOffset({
        x: Math.round(width / 2 - centerX * zoomLevel),
        y: Math.round(height / 2 - centerY * zoomLevel),
      });
      lastCenteredSearchRef.current = query;
    }, 120);

    return () => clearTimeout(timer);
  }, [debouncedSearch, nodes, searchResult, zoomLevel]);

  // Auto re-center when selected scope changes
  useEffect(() => {
    // fitViewToContainer changes whenever the calculated bounds change. Without
    // this guard, expanding search results re-runs this effect and overwrites
    // the more precise search-result centering scheduled just above.
    if (lastFittedScopeRef.current === selectedScopeId) return;
    lastFittedScopeRef.current = selectedScopeId;

    setExpandedNodeIds((prev) => ({
      ...prev,
      [selectedScopeId]: true,
      "root-kb": true,
    }));
    const timer = setTimeout(() => {
      fitViewToContainer();
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedScopeId, fitViewToContainer]);

  // Fullscreen support
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        containerRef.current.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {
      // Ignore unsupported browser environments
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(
    () => setZoomLevel((z) => Math.min(2.5, +(z + 0.15).toFixed(2))),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoomLevel((z) => Math.max(MIN_MIND_MAP_ZOOM, +(z - 0.15).toFixed(2))),
    []
  );

  // Mouse wheel zoom centered at cursor position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomMultiplier = e.deltaY < 0 ? 1.12 : 0.88;

    setZoomLevel((prevZoom) => {
      const nextZoom = Math.min(2.5, Math.max(MIN_MIND_MAP_ZOOM, +(prevZoom * zoomMultiplier).toFixed(3)));
      if (nextZoom === prevZoom) return prevZoom;

      setPanOffset((prevPan) => {
        const contentX = (mouseX - prevPan.x) / prevZoom;
        const contentY = (mouseY - prevPan.y) / prevZoom;
        return {
          x: Math.round(mouseX - contentX * nextZoom),
          y: Math.round(mouseY - contentY * nextZoom),
        };
      });

      return nextZoom;
    });
  }, []);

  // Mouse pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".mindmap-interactive-node") || target.closest("button")) {
      return;
    }
    setIsDragging(true);
    dragStartPosRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    schedulePanUpdate(
      e.clientX - dragStartPosRef.current.x,
      e.clientY - dragStartPosRef.current.y
    );
  }, [isDragging, schedulePanUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (pendingPanRef.current) {
      setPanOffset(pendingPanRef.current);
    }
  }, []);

  // Mobile Touch Pan & Pinch-to-Zoom handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    if (e.touches.length === 1) {
      setIsDragging(true);
      const t = e.touches[0];
      touchGestureRef.current = {
        mode: "pan",
        startX: t.clientX,
        startY: t.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
        startDist: 0,
        startZoom: zoomLevel,
        startMidX: t.clientX,
        startMidY: t.clientY,
      };
    } else if (e.touches.length >= 2) {
      setIsDragging(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      touchGestureRef.current = {
        mode: "pinch",
        startX: midX,
        startY: midY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
        startDist: Math.max(dist, 1),
        startZoom: zoomLevel,
        startMidX: midX,
        startMidY: midY,
      };
    }
  }, [panOffset, zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    if (e.touches.length === 1 && touchGestureRef.current.mode === "pan") {
      const t = e.touches[0];
      const dx = t.clientX - touchGestureRef.current.startX;
      const dy = t.clientY - touchGestureRef.current.startY;
      schedulePanUpdate(
        touchGestureRef.current.startPanX + dx,
        touchGestureRef.current.startPanY + dy
      );
    } else if (e.touches.length >= 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      if (touchGestureRef.current.mode !== "pinch" || touchGestureRef.current.startDist <= 0) {
        touchGestureRef.current = {
          mode: "pinch",
          startX: currentMidX,
          startY: currentMidY,
          startPanX: panOffset.x,
          startPanY: panOffset.y,
          startDist: Math.max(currentDist, 1),
          startZoom: zoomLevel,
          startMidX: currentMidX,
          startMidY: currentMidY,
        };
        return;
      }

      const scaleMultiplier = currentDist / touchGestureRef.current.startDist;
      const newZoom = Math.min(
        2.5,
        Math.max(MIN_MIND_MAP_ZOOM, +(touchGestureRef.current.startZoom * scaleMultiplier).toFixed(3))
      );

      const stageRect = containerRef.current?.getBoundingClientRect();
      const originX = stageRect ? currentMidX - stageRect.left : currentMidX;
      const originY = stageRect ? currentMidY - stageRect.top : currentMidY;

      const contentX = (originX - touchGestureRef.current.startPanX) / touchGestureRef.current.startZoom;
      const contentY = (originY - touchGestureRef.current.startPanY) / touchGestureRef.current.startZoom;

      setZoomLevel(newZoom);
      schedulePanUpdate(
        Math.round(originX - contentX * newZoom),
        Math.round(originY - contentY * newZoom)
      );
    }
  }, [isDragging, panOffset, zoomLevel, schedulePanUpdate]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchGestureRef.current.mode = "none";
    if (pendingPanRef.current) {
      setPanOffset(pendingPanRef.current);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background overflow-hidden relative select-none font-sans">
      {/* Top Floating Glass Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Zoom & View Controls */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/90 border border-border backdrop-blur-xl shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title={isEn ? "Zoom In" : "بزرگ‌نمایی"}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title={isEn ? "Zoom Out" : "کوچک‌نمایی"}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fitViewToContainer}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title={isEn ? "Fit to View" : "تطبیق نما"}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title={isEn ? "Fullscreen" : "تمام صفحه"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onClick={() => setTreeDirection((d) => (d === "rtl" ? "ltr" : "rtl"))}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer text-xs font-medium"
            title={
              isEn
                ? treeDirection === "rtl"
                  ? "Layout: Right-to-Left (Click to switch)"
                  : "Layout: Left-to-Right (Click to switch)"
                : treeDirection === "rtl"
                ? "جهت شاخه‌ها: راست‌به‌چپ (کلیک برای تغییر)"
                : "جهت شاخه‌ها: چپ‌به‌راست (کلیک برای تغییر)"
            }
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold">
              {treeDirection === "rtl" ? "RTL" : "LTR"}
            </span>
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <span className="text-[11px] font-mono font-bold text-primary px-1.5">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Center: Scope / Folder Branch Selector */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/90 border border-border backdrop-blur-xl shadow-lg pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-muted text-foreground transition cursor-pointer text-xs font-semibold"
                title={isEn ? "Select Mind Map Branch" : "انتخاب شاخه یا فولدر نقشه ذهنی"}
              >
                <FolderTree className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{currentScopeTitle}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-72 max-h-80 overflow-y-auto text-xs p-1">
              <DropdownMenuItem
                onClick={() => setSelectedScopeId("all")}
                className={`cursor-pointer gap-2 ${selectedScopeId === "all" ? "bg-primary/10 text-primary font-bold" : ""}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="flex-1">{isEn ? "All Knowledge Base (Full Tree)" : "همه پایگاه دانش (نمایش کامل)"}</span>
                {selectedScopeId === "all" && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase px-2 py-1">
                {isEn ? "Folders & Subtrees" : "فولدرها و زیرشاخه‌ها"}
              </DropdownMenuLabel>

              {rootFoldersList.map((rf) => {
                const subF = folders.filter((f) => f.parent_id === rf.id);
                const rfDocs = documents.filter((d) => d.folder_id === rf.id);
                const isRfSelected = selectedScopeId === `folder-${rf.id}`;

                return (
                  <React.Fragment key={rf.id}>
                    <DropdownMenuItem
                      onClick={() => setSelectedScopeId(`folder-${rf.id}`)}
                      className={`cursor-pointer gap-2 font-medium ${isRfSelected ? "bg-primary/10 text-primary font-bold" : ""}`}
                    >
                      <Folder className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="flex-1 truncate">{rf.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {subF.length > 0 ? `${subF.length} زیرشاخه • ` : ""}{rfDocs.length} سند
                      </span>
                      {isRfSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>

                    {subF.map((sf) => {
                      const sfDocs = documents.filter((d) => d.folder_id === sf.id);
                      const isSfSelected = selectedScopeId === `folder-${sf.id}`;
                      return (
                        <DropdownMenuItem
                          key={sf.id}
                          onClick={() => setSelectedScopeId(`folder-${sf.id}`)}
                          className={`cursor-pointer gap-2 ps-6 text-xs ${isSfSelected ? "bg-primary/10 text-primary font-bold" : ""}`}
                        >
                          <span className="text-muted-foreground font-mono">↳</span>
                          <Folder className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span className="flex-1 truncate">{sf.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{sfDocs.length} سند</span>
                          {isSfSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {unfiledDocsCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase px-2 py-1">
                    {isEn ? "Other Documents" : "سایر اسناد"}
                  </DropdownMenuLabel>
                  {documents
                    .filter((d) => !d.folder_id)
                    .map((doc) => {
                      const isDocSelected = selectedScopeId === `doc-${doc.id}`;
                      return (
                        <DropdownMenuItem
                          key={doc.id}
                          onClick={() => setSelectedScopeId(`doc-${doc.id}`)}
                          className={`cursor-pointer gap-2 ${isDocSelected ? "bg-primary/10 text-primary font-bold" : ""}`}
                        >
                          <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="flex-1 truncate">{doc.title}</span>
                          {isDocSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset to All quick button */}
          {selectedScopeId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedScopeId("all")}
              className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title={isEn ? "Show all knowledge base" : "نمایش کل پایگاه دانش"}
            >
              <X className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">{isEn ? "All" : "همه"}</span>
            </button>
          )}

          {/* Schedule Review Task for current scope */}
          <button
            type="button"
            onClick={handleScheduleCurrentScope}
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 transition cursor-pointer font-medium"
            title={
              isEn
                ? "Schedule Mind Map Review Task for this branch"
                : "برنامه‌ریزی تسک مرور برای این شاخه در نقشه ذهنی"
            }
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">
              {isEn ? "Task" : "تسک مرور"}
            </span>
          </button>
        </div>

        {/* Right: Expand/Collapse & Quick Search */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {viewMode === "canvas" && (
            <div role="group" aria-label={isEn ? "Canvas layout" : "چیدمان نقشه"} className="flex items-center gap-0.5 rounded-xl border border-border bg-card/90 p-1 shadow-lg backdrop-blur-xl">
              <button
                type="button"
                aria-label={isEn ? "Horizontal tree layout" : "چیدمان درخت افقی"}
                aria-pressed={canvasLayout === "horizontal"}
                title={isEn ? "Horizontal tree" : "درخت افقی"}
                onClick={() => setCanvasLayout("horizontal")}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition ${canvasLayout === "horizontal" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <GitBranch className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline text-[11px] font-medium">{isEn ? "Horizontal" : "افقی"}</span>
              </button>
              <button
                type="button"
                aria-label={isEn ? "Vertical tree layout" : "چیدمان درخت عمودی"}
                aria-pressed={canvasLayout === "vertical"}
                title={isEn ? "Vertical tree" : "درخت عمودی"}
                onClick={() => setCanvasLayout("vertical")}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition ${canvasLayout === "vertical" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline text-[11px] font-medium">{isEn ? "Vertical" : "عمودی"}</span>
              </button>
              <button
                type="button"
                aria-label={isEn ? "Radial tree layout" : "چیدمان درخت شعاعی"}
                aria-pressed={canvasLayout === "radial"}
                title={isEn ? "Radial tree" : "درخت شعاعی"}
                onClick={() => setCanvasLayout("radial")}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition ${canvasLayout === "radial" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Circle className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline text-[11px] font-medium">{isEn ? "Radial" : "شعاعی"}</span>
              </button>
              <button
                type="button"
                aria-label={isEn ? "Matrix grid layout" : "چیدمان شبکه‌ای ماتریسی"}
                aria-pressed={canvasLayout === "matrix"}
                title={isEn ? "Matrix grid" : "شبکهٔ ماتریسی"}
                onClick={() => setCanvasLayout("matrix")}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition ${canvasLayout === "matrix" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline text-[11px] font-medium">{isEn ? "Matrix" : "ماتریسی"}</span>
              </button>
            </div>
          )}
          {viewMode === "canvas" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={isEn ? "Connection line style" : "سبک خطوط اتصال"}
                  title={isEn ? "Connection line style" : "سبک خطوط اتصال"}
                  className="rounded-xl border border-border bg-card/90 p-2 text-muted-foreground shadow-lg backdrop-blur-xl transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuLabel>{isEn ? "Connection line style" : "سبک خطوط اتصال"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {([
                  ["auto", isEn ? "Automatic (layout default)" : "خودکار (پیش‌فرض چیدمان)"],
                  ["smooth_bezier", isEn ? "Smooth curves" : "منحنی نرم"],
                  ["orthogonal_step", isEn ? "Orthogonal steps" : "پله‌ای و راست‌گوشه"],
                  ["straight", isEn ? "Straight lines" : "خط مستقیم"],
                  ["polar_radial", isEn ? "Polar radial curves" : "منحنی قطبی شعاعی"],
                ] as const).map(([style, label]) => (
                  <DropdownMenuItem
                    key={style}
                    onSelect={() => setConnectorStyle(style)}
                    className="cursor-pointer gap-2"
                  >
                    <span className="flex-1">{label}</span>
                    {connectorStyle === style && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {viewMode === "canvas" && (
            <button
              type="button"
              aria-label={isEn ? "Compact node labels" : "نمایش فشرده گره‌ها"}
              aria-pressed={compactLabels}
              title={compactLabels
                ? isEn ? "Show full node details" : "نمایش جزئیات کامل گره‌ها"
                : isEn ? "Show compact node labels" : "نمایش فشرده گره‌ها"}
              onClick={() => setCompactLabels((current) => !current)}
              className={`hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-card/90 px-2 py-1.5 text-xs shadow-lg backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${compactLabels ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <span aria-hidden="true" className="font-semibold leading-none">Aa</span>
              <span>{compactLabels ? isEn ? "Compact" : "فشرده" : isEn ? "Full" : "کامل"}</span>
            </button>
          )}
          <div role="group" aria-label={isEn ? "Mind map view" : "حالت نمایش نقشه ذهنی"} className="flex items-center gap-1 rounded-2xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur-xl">
            <button
              type="button"
              aria-label={isEn ? "Canvas view" : "نمای نقشه‌ای"}
              aria-pressed={viewMode === "canvas"}
              onClick={() => setViewMode("canvas")}
              className={`rounded-xl p-1.5 transition ${viewMode === "canvas" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={isEn ? "Outline view" : "نمای فهرستی"}
              aria-pressed={viewMode === "outline"}
              onClick={() => setViewMode("outline")}
              className={`rounded-xl p-1.5 transition ${viewMode === "outline" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              <ListTree className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/90 border border-border backdrop-blur-xl shadow-lg">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              {isEn ? "Expand All" : "گسترش همه"}
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              {isEn ? "Collapse All" : "جمع کردن همه"}
            </button>
          </div>
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={isEn ? "Mind map actions" : "گزینه‌های نقشه ذهنی"}
                  title={isEn ? "Mind map actions" : "گزینه‌های نقشه ذهنی"}
                  className="rounded-xl border border-border bg-card/90 p-2 text-muted-foreground shadow-lg backdrop-blur-xl transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={handleExpandAll}>
                    {isEn ? "Expand All" : "گسترش همه"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleCollapseAll}>
                    {isEn ? "Collapse All" : "جمع کردن همه"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setCompactLabels((current) => !current)} className="gap-2">
                    <span className="flex-1">{isEn ? "Compact node labels" : "نمایش فشرده گره‌ها"}</span>
                    {compactLabels && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search map..." : "جستجو در نقشه..."}
              className="pl-8 pr-3 py-1.5 w-28 sm:w-52 rounded-2xl bg-card/90 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 backdrop-blur-xl shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Strip when focused on a branch */}
      {selectedScopeId !== "all" && (
        <div className="absolute top-28 sm:top-16 start-3 z-20 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-card/90 border border-primary/25 backdrop-blur-xl shadow-md text-xs pointer-events-auto max-w-[92vw] overflow-x-auto">
          <span className="text-[10px] font-bold text-muted-foreground uppercase me-1 shrink-0">
            {isEn ? "Branch:" : "شاخه:"}
          </span>
          {breadcrumbTrail.map((crumb, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 rtl:rotate-180" />}
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => setSelectedScopeId(crumb.id)}
                  className={`truncate max-w-[130px] transition cursor-pointer shrink-0 ${
                    isLast
                      ? "font-bold text-primary pointer-events-none"
                      : "text-muted-foreground hover:text-foreground hover:underline"
                  }`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            );
          })}

          <button
            type="button"
            onClick={handleScheduleCurrentScope}
            className="ms-1.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 transition cursor-pointer shrink-0 font-medium"
            title={isEn ? "Schedule task for this branch" : "برنامه‌ریزی تسک برای این شاخه"}
          >
            <CalendarPlus className="w-3 h-3" />
            <span>{isEn ? "Task" : "تسک"}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedScopeId("all")}
            className="ms-1 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition cursor-pointer shrink-0"
            title={isEn ? "Reset to full tree" : "بازگشت به نمایش کل نقشه"}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {viewMode === "canvas" ? (
      <>
      {/* Bottom Info Badge */}
      <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card/80 border border-border text-xs text-muted-foreground backdrop-blur-md shadow-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        <span>
          {isEn
            ? "Drag canvas to pan • Pinch or wheel to zoom • Click document to read"
            : "برای جابه‌جایی بوم را بکشید • دو انگشت برای زوم • کلیک روی سند برای مطالعه"}
        </span>
      </div>

      {/* Interactive Infinite Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          touchAction: "none",
          backgroundImage: "radial-gradient(hsl(var(--border)) 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
        className={`w-full h-full cursor-grab overflow-hidden relative select-none ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        <div
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
            transformOrigin: "0 0",
            width: `${Math.max(4500, bounds.width + 1200)}px`,
            height: `${Math.max(3500, bounds.height + 1200)}px`,
            position: "absolute",
            inset: 0,
            willChange: isDragging ? "transform" : "auto",
          }}
        >
          {/* SVG Connecting Bezier Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {links.map((link) => {
              const pathData = getKnowledgeMindMapConnectorPath(
                link,
                canvasLayout,
                connectorStyle,
                radialRootCenters.get(link.sourceId),
              );

              return (
                <path
                  key={link.id}
                  d={pathData}
                  fill="none"
                  stroke={link.color}
                  strokeWidth="2.2"
                  strokeOpacity="0.45"
                  strokeDasharray={link.isDashed ? "5 5" : undefined}
                />
              );
            })}
          </svg>

          {/* Render Memoized Nodes */}
          {displayNodes.map((node) => {
            const isHighlighted =
              debouncedSearch.trim() !== "" &&
              mindMapNodeMatchesSearch(node, searchResult);
            const isCurrentScopeRoot = selectedScopeId !== "all" && node.id === selectedScopeId;

            return (
              <MindMapNodeItem
                key={node.id}
                node={node}
                isHighlighted={isHighlighted}
                isEn={isEn}
                compactLabels={compactLabels}
                treeDirection={treeDirection}
                isCurrentScopeRoot={isCurrentScopeRoot}
                onOpenPreview={setPreviewDoc}
                onToggleExpand={handleToggleExpand}
                onFocusScope={setSelectedScopeId}
                onScheduleTask={handleScheduleNodeTask}
                canScheduleTask={canScheduleNode(node)}
                onCustomizeAppearance={setAppearanceNodeId}
              />
            );
          })}
        </div>
      </div>
      </>
      ) : (
        <div
          aria-label={isEn ? "Knowledge mind map outline" : "فهرست نقشه ذهنی پایگاه دانش"}
          className="absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-24 pt-32 sm:px-6 sm:pt-28"
        >
          {outlineEntries.length > 0 ? (
            <ul className="mx-auto max-w-4xl space-y-3" aria-label={isEn ? "Knowledge hierarchy" : "ساختار مطالب"}>
              {outlineEntries.map((entry) => (
                <MindMapOutlineItem
                  key={entry.node.id}
                  entry={entry}
                  depth={0}
                  isEn={isEn}
                  isCurrentScopeRoot={entry.node.id === selectedScopeId}
                  canScheduleNode={canScheduleNode}
                  onOpenPreview={setPreviewDoc}
                  onToggleExpand={handleToggleExpand}
                  onFocusScope={setSelectedScopeId}
                  onScheduleTask={handleScheduleNodeTask}
                  onCustomizeAppearance={setAppearanceNodeId}
                />
              ))}
            </ul>
          ) : (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
              {isEn ? "No visible items in this branch." : "در این شاخه مورد قابل‌نمایشی نیست."}
            </div>
          )}
        </div>
      )}

      <MindMapNodeAppearanceDialog
        node={appearanceNode}
        isEn={isEn}
        onOpenChange={(open) => !open && setAppearanceNodeId(null)}
        onAppearanceChange={handleAppearanceChange}
      />

      {/* Embedded Document Reader Modal */}
      {previewDoc && (
        <TaskKnowledgeReaderDialog
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          document={previewDoc}
        />
      )}

      {/* Study Task Schedule Modal */}
      {scheduleTarget && (
        <StudyTaskScheduleModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          targetType={scheduleTarget.targetType}
          targetId={scheduleTarget.targetId}
          targetTitle={scheduleTarget.targetTitle}
          folderBreadcrumb={scheduleTarget.folderBreadcrumb}
        />
      )}
    </div>
  );
};

export default KnowledgeMindMapView;
