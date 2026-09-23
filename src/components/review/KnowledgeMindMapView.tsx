import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Folder,
  FileText,
  Sparkles,
  Search,
  Layers,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeFolder, KnowledgeDocument } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { getKnowledgeFolders, getKnowledgeDocuments } from "@/lib/knowledgeService";
import { getLeitnerCards } from "@/lib/leitnerService";
import { TaskKnowledgeReaderDialog } from "@/components/task-detail/TaskKnowledgeReaderDialog";

interface KnowledgeMindMapViewProps {
  userId: string;
  onOpenDocument?: (docId: string) => void;
}

interface MindMapNode {
  id: string;
  type: "root" | "folder" | "subfolder" | "doc" | "card";
  title: string;
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
  onOpenPreview: (doc: KnowledgeDocument) => void;
  onToggleExpand: (nodeId: string) => void;
}

const MindMapNodeItem = React.memo<MindMapNodeItemProps>(
  ({ node, isHighlighted, isEn, onOpenPreview, onToggleExpand }) => {
    const isDoc = node.type === "doc";
    const isFolder = node.type === "folder" || node.type === "subfolder";
    const isRoot = node.type === "root";
    const isCard = node.type === "card";

    return (
      <div
        style={{
          position: "absolute",
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          zIndex: 2,
        }}
        className={`mindmap-interactive-node p-2.5 rounded-2xl border flex items-center justify-between gap-2 shadow-xs backdrop-blur-xl transition-all duration-150 cursor-pointer ${
          isHighlighted ? "ring-2 ring-amber-400 shadow-md shadow-amber-400/25 scale-105" : ""
        } ${
          isRoot
            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold"
            : isFolder
            ? "bg-card text-card-foreground border-emerald-500/40 hover:border-emerald-500 hover:shadow-sm"
            : isDoc
            ? "bg-card text-card-foreground border-primary/40 hover:border-primary hover:shadow-sm hover:bg-primary/5"
            : "bg-card text-card-foreground border-pink-500/30 hover:border-pink-500 hover:shadow-xs"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (isDoc && node.docRef) {
            onOpenPreview(node.docRef);
          } else if (node.hasChildren) {
            onToggleExpand(node.id);
          }
        }}
      >
        {/* Node Icon & Labels */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0">
            {isRoot && <Sparkles className="w-4 h-4 text-amber-300" />}
            {isFolder && <Folder className="w-4 h-4 text-emerald-500" />}
            {isDoc && <FileText className="w-4 h-4 text-primary" />}
            {isCard && <Layers className="w-3.5 h-3.5 text-pink-500" />}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div
              className={`truncate text-xs font-semibold ${
                isRoot ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {node.title}
            </div>
            {node.subtitle && (
              <div
                className={`truncate text-[10px] ${
                  isRoot ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {node.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Node Actions / Badges */}
        <div className="flex items-center gap-1 shrink-0">
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

          {/* Expand / Collapse Button if has children */}
          {node.hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isRoot
                  ? "hover:bg-primary-foreground/20 text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {node.isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }
);

MindMapNodeItem.displayName = "MindMapNodeItem";

export const KnowledgeMindMapView: React.FC<KnowledgeMindMapViewProps> = ({
  userId,
  onOpenDocument,
}) => {
  const { isEn } = useBilingual();
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({
    "root-kb": true,
  });

  // Canvas Viewport State
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 60, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasInitializedViewRef = useRef(false);

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
    try {
      const [f, d, c] = await Promise.all([
        getKnowledgeFolders(userId),
        getKnowledgeDocuments(userId),
        getLeitnerCards(userId),
      ]);
      setFolders(f);
      setDocuments(d);
      setCards(c);

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
      console.error("Error loading MindMap data", e);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-expand branches when searching
  useEffect(() => {
    if (!debouncedSearch.trim()) return;
    const q = debouncedSearch.toLowerCase();
    const autoExpand: Record<string, boolean> = { "root-kb": true };

    for (let i = 0; i < documents.length; i++) {
      const d = documents[i];
      if (d.title.toLowerCase().includes(q)) {
        if (d.folder_id) {
          autoExpand[`folder-${d.folder_id}`] = true;
          const parentF = folders.find((f) => f.id === d.folder_id);
          if (parentF?.parent_id) {
            autoExpand[`folder-${parentF.parent_id}`] = true;
          }
        }
      }
    }

    setExpandedNodeIds((prev) => ({ ...prev, ...autoExpand }));
  }, [debouncedSearch, documents, folders]);

  // Toggle expand / collapse node
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  }, []);

  // Expand All
  const handleExpandAll = useCallback(() => {
    const allExpanded: Record<string, boolean> = { "root-kb": true };
    folders.forEach((f) => {
      allExpanded[`folder-${f.id}`] = true;
    });
    documents.forEach((d) => {
      allExpanded[`doc-${d.id}`] = true;
    });
    setExpandedNodeIds(allExpanded);
  }, [folders, documents]);

  // Collapse All
  const handleCollapseAll = useCallback(() => {
    setExpandedNodeIds({ "root-kb": true });
  }, []);

  // Compute Tree Layout (Pharmacy layout algorithm: Center parent to children and prevent subtree overlap)
  const { nodes, links, bounds } = useMemo(() => {
    const items: MindMapNode[] = [];
    const linkList: MindMapLink[] = [];

    // Calculate dimensions
    const getNodeDimensions = (type: MindMapNode["type"]) => {
      switch (type) {
        case "root":
          return { width: 220, height: 58 };
        case "folder":
        case "subfolder":
          return { width: 200, height: 50 };
        case "doc":
          return { width: 220, height: 54 };
        case "card":
          return { width: 190, height: 44 };
      }
    };

    const colSpacing = 300;
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
      childrenData: Array<() => { y: number; height: number }> = []
    ): { y: number; height: number } {
      const isExpanded = !!expandedNodeIds[id];
      const { width, height } = getNodeDimensions(type);
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

    // Build hierarchical child functions
    const rootFolders = folders.filter((f) => !f.parent_id);
    const unfiledDocs = documents.filter((d) => !d.folder_id);

    const rootChildrenFns: Array<() => { y: number; height: number }> = [];

    // Root Folders
    rootFolders.forEach((rf) => {
      rootChildrenFns.push(() => {
        const folderId = `folder-${rf.id}`;
        const subFolders = folders.filter((f) => f.parent_id === rf.id);
        const rfDocs = documents.filter((d) => d.folder_id === rf.id);

        const folderChildrenFns: Array<() => { y: number; height: number }> = [];

        // Subfolders
        subFolders.forEach((sf) => {
          folderChildrenFns.push(() => {
            const subFolderId = `folder-${sf.id}`;
            const sfDocs = documents.filter((d) => d.folder_id === sf.id);

            const subChildrenFns: Array<() => { y: number; height: number }> = [];
            sfDocs.forEach((doc) => {
              subChildrenFns.push(() => {
                const docId = `doc-${doc.id}`;
                const docCards = cards.filter((c) => c.document_id === doc.id);

                const cardFns: Array<() => { y: number; height: number }> = [];
                docCards.slice(0, 15).forEach((card) => {
                  cardFns.push(() => {
                    return layoutNode(
                      `card-${card.id}`,
                      "card",
                      card.front,
                      4,
                      60 + colSpacing * 4,
                      docId,
                      "var(--primary)",
                      "#ec4899",
                      card.id,
                      undefined,
                      isEn ? `Box ${card.box}` : `جعبه ${card.box}`
                    );
                  });
                });

                return layoutNode(
                  docId,
                  "doc",
                  doc.title,
                  3,
                  60 + colSpacing * 3,
                  subFolderId,
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
              });
            });

            return layoutNode(
              subFolderId,
              "subfolder",
              sf.name,
              2,
              60 + colSpacing * 2,
              folderId,
              sf.color || "#06b6d4",
              "#22d3ee",
              sf.id,
              undefined,
              `${sfDocs.length} ${isEn ? "docs" : "سند"}`,
              subChildrenFns
            );
          });
        });

        // Docs directly in Root Folder
        rfDocs.forEach((doc) => {
          folderChildrenFns.push(() => {
            const docId = `doc-${doc.id}`;
            const docCards = cards.filter((c) => c.document_id === doc.id);

            const cardFns: Array<() => { y: number; height: number }> = [];
            docCards.slice(0, 15).forEach((card) => {
              cardFns.push(() => {
                return layoutNode(
                  `card-${card.id}`,
                  "card",
                  card.front,
                  3,
                  60 + colSpacing * 3,
                  docId,
                  "var(--primary)",
                  "#ec4899",
                  card.id,
                  undefined,
                  isEn ? `Box ${card.box}` : `جعبه ${card.box}`
                );
              });
            });

            return layoutNode(
              docId,
              "doc",
              doc.title,
              2,
              60 + colSpacing * 2,
              folderId,
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
          });
        });

        return layoutNode(
          folderId,
          "folder",
          rf.name,
          1,
          60 + colSpacing,
          "root-kb",
          rf.color || "#10b981",
          "#34d399",
          rf.id,
          undefined,
          `${subFolders.length + rfDocs.length} ${isEn ? "items" : "مورد"}`,
          folderChildrenFns
        );
      });
    });

    // Unfiled Docs
    unfiledDocs.forEach((doc) => {
      rootChildrenFns.push(() => {
        const docId = `doc-${doc.id}`;
        const docCards = cards.filter((c) => c.document_id === doc.id);

        const cardFns: Array<() => { y: number; height: number }> = [];
        docCards.slice(0, 15).forEach((card) => {
          cardFns.push(() => {
            return layoutNode(
              `card-${card.id}`,
              "card",
              card.front,
              2,
              60 + colSpacing * 2,
              docId,
              "var(--primary)",
              "#ec4899",
              card.id,
              undefined,
              isEn ? `Box ${card.box}` : `جعبه ${card.box}`
            );
          });
        });

        return layoutNode(
          docId,
          "doc",
          doc.title,
          1,
          60 + colSpacing,
          "root-kb",
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
      });
    });

    // Run layout for root
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

    // Normalize vertical coordinates if any negative offset
    const minYCoord = Math.min(...items.map((it) => it.y), 40);
    if (minYCoord < 40) {
      const shiftY = 40 - minYCoord;
      items.forEach((it) => (it.y += shiftY));
    }

    // Build lookup map for fast link generation
    const itemMap = new Map<string, MindMapNode>();
    items.forEach((it) => itemMap.set(it.id, it));

    // Generate Links
    items.forEach((item) => {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          const startX = parent.x + parent.width;
          const startY = parent.y + parent.height / 2;
          const endX = item.x;
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
  }, [folders, documents, cards, expandedNodeIds, isEn]);

  // Fit View To Container
  const fitViewToContainer = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 900;
    const ch = containerRef.current.clientHeight || 650;

    const bWidth = Math.max(bounds.width, 300);
    const bHeight = Math.max(bounds.height, 240);

    const scaleX = (cw - 80) / bWidth;
    const scaleY = (ch - 80) / bHeight;
    const optimalScale = Math.min(1.1, Math.max(0.35, Math.min(scaleX, scaleY)));
    const finalZoom = +optimalScale.toFixed(2);

    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;

    const targetPanX = Math.round(cw / 2 - contentCenterX * finalZoom);
    const targetPanY = Math.round(ch / 2 - contentCenterY * finalZoom);

    setZoomLevel(finalZoom);
    setPanOffset({ x: targetPanX, y: targetPanY });
  }, [bounds]);

  // Auto-center on initial load
  useEffect(() => {
    if (nodes.length > 0 && containerRef.current && !hasInitializedViewRef.current) {
      fitViewToContainer();
      hasInitializedViewRef.current = true;
    }
  }, [nodes.length, fitViewToContainer]);

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
    () => setZoomLevel((z) => Math.max(0.3, +(z - 0.15).toFixed(2))),
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
      const nextZoom = Math.min(2.5, Math.max(0.3, +(prevZoom * zoomMultiplier).toFixed(3)));
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
        Math.max(0.35, +(touchGestureRef.current.startZoom * scaleMultiplier).toFixed(3))
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

          <span className="text-[11px] font-mono font-bold text-primary px-1.5">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Right: Expand/Collapse & Quick Search */}
        <div className="flex items-center gap-2 pointer-events-auto">
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

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search map..." : "جستجو در نقشه..."}
              className="pl-8 pr-3 py-1.5 w-36 sm:w-52 rounded-2xl bg-card/90 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 backdrop-blur-xl shadow-lg"
            />
          </div>
        </div>
      </div>

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
            width: "4000px",
            height: "3000px",
            position: "relative",
            willChange: isDragging ? "transform" : "auto",
          }}
        >
          {/* SVG Connecting Bezier Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {links.map((link) => {
              const { startX, startY, endX, endY } = link;
              const dx = Math.max(30, (endX - startX) * 0.5);
              const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

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
          {nodes.map((node) => {
            const isHighlighted =
              debouncedSearch.trim() !== "" &&
              node.title.toLowerCase().includes(debouncedSearch.toLowerCase());

            return (
              <MindMapNodeItem
                key={node.id}
                node={node}
                isHighlighted={isHighlighted}
                isEn={isEn}
                onOpenPreview={setPreviewDoc}
                onToggleExpand={handleToggleExpand}
              />
            );
          })}
        </div>
      </div>

      {/* Embedded Document Reader Modal */}
      {previewDoc && (
        <TaskKnowledgeReaderDialog
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          document={previewDoc}
        />
      )}
    </div>
  );
};

export default KnowledgeMindMapView;
