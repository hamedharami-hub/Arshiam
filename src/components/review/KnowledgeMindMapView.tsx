import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Folder,
  FileText,
  Sparkles,
  BookOpen,
  Search,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeFolder, KnowledgeDocument } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { getKnowledgeFolders, getKnowledgeDocuments } from "@/lib/knowledgeService";
import { getLeitnerCards } from "@/lib/leitnerService";

interface KnowledgeMindMapViewProps {
  userId: string;
  onOpenDocument?: (docId: string) => void;
}

interface MapNode {
  id: string;
  type: "root" | "folder" | "doc" | "card";
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string | null;
  color?: string;
  dataId?: string;
}

export const KnowledgeMindMapView: React.FC<KnowledgeMindMapViewProps> = ({
  userId,
  onOpenDocument,
}) => {
  const { isEn } = useBilingual();
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, d, c] = await Promise.all([
          getKnowledgeFolders(userId),
          getKnowledgeDocuments(userId),
          getLeitnerCards(userId),
        ]);
        setFolders(f);
        setDocuments(d);
        setCards(c);
      } catch (e) {
        console.error("Error loading MindMap data", e);
      }
    })();
  }, [userId]);

  // Compute Layout of Tree Nodes
  const { nodes, connections } = useMemo(() => {
    const list: MapNode[] = [];
    const conns: Array<{ from: MapNode; to: MapNode }> = [];

    // Root Node
    const rootNode: MapNode = {
      id: "root-kb",
      type: "root",
      title: isEn ? "Knowledge Base" : "پایگاه دانش و مفاهیم",
      x: 60,
      y: 300,
      width: 170,
      height: 54,
    };
    list.push(rootNode);

    // Level 1: Root Folders
    const rootFolders = folders.filter((f) => !f.parent_id);
    let currentY = 80;

    rootFolders.forEach((rf, rfIdx) => {
      const folderNode: MapNode = {
        id: `folder-${rf.id}`,
        type: "folder",
        title: rf.name,
        x: 320,
        y: currentY,
        width: 180,
        height: 48,
        parentId: rootNode.id,
        color: rf.color || "#10b981",
        dataId: rf.id,
      };
      list.push(folderNode);
      conns.push({ from: rootNode, to: folderNode });

      // Level 2: Subfolders
      const subFolders = folders.filter((f) => f.parent_id === rf.id);
      let subY = currentY;

      subFolders.forEach((sf) => {
        const subNode: MapNode = {
          id: `folder-${sf.id}`,
          type: "folder",
          title: sf.name,
          x: 580,
          y: subY,
          width: 170,
          height: 44,
          parentId: folderNode.id,
          color: sf.color || "#3b82f6",
          dataId: sf.id,
        };
        list.push(subNode);
        conns.push({ from: folderNode, to: subNode });

        // Level 3: Docs inside subfolder
        const subDocs = documents.filter((d) => d.folder_id === sf.id);
        let docY = subY;
        subDocs.forEach((doc) => {
          const docNode: MapNode = {
            id: `doc-${doc.id}`,
            type: "doc",
            title: doc.title,
            x: 820,
            y: docY,
            width: 180,
            height: 44,
            parentId: subNode.id,
            color: "#8b5cf6",
            dataId: doc.id,
          };
          list.push(docNode);
          conns.push({ from: subNode, to: docNode });

          // Level 4: Flashcards attached to doc
          const docCards = cards.filter((c) => c.document_id === doc.id);
          let cardY = docY;
          docCards.slice(0, 3).forEach((card) => {
            const cardNode: MapNode = {
              id: `card-${card.id}`,
              type: "card",
              title: card.front,
              x: 1060,
              y: cardY,
              width: 160,
              height: 40,
              parentId: docNode.id,
              color: "#ec4899",
              dataId: card.id,
            };
            list.push(cardNode);
            conns.push({ from: docNode, to: cardNode });
            cardY += 52;
          });

          docY += Math.max(54, docCards.length * 52);
        });

        subY = Math.max(subY + 60, docY);
      });

      // Level 2 Docs directly in root folder
      const rfDocs = documents.filter((d) => d.folder_id === rf.id);
      let rfDocY = subY;
      rfDocs.forEach((doc) => {
        const docNode: MapNode = {
          id: `doc-${doc.id}`,
          type: "doc",
          title: doc.title,
          x: 580,
          y: rfDocY,
          width: 180,
          height: 44,
          parentId: folderNode.id,
          color: "#8b5cf6",
          dataId: doc.id,
        };
        list.push(docNode);
        conns.push({ from: folderNode, to: docNode });
        rfDocY += 56;
      });

      currentY = Math.max(currentY + 120, subY, rfDocY + 20);
    });

    return { nodes: list, connections: conns };
  }, [folders, documents, cards, isEn]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative select-none">
      {/* Mind Map Floating Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
          title={isEn ? "Zoom In" : "بزرگ‌نمایی"}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
          title={isEn ? "Zoom Out" : "کوچک‌نمایی"}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 40, y: 40 });
          }}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
          title={isEn ? "Reset View" : "بازنشانی نما"}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-800" />
        <span className="text-[11px] font-mono text-purple-400 font-bold px-1.5">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Guide Badge */}
      <div className="absolute bottom-4 right-4 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-slate-400 backdrop-blur-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>
          {isEn
            ? "Click any purple document node to open it in reader mode"
            : "برای مشاهده هر سند در سبک مطالعه، روی گره بنفش‌رنگ آن کلیک کنید"}
        </span>
      </div>

      {/* Interactive Infinite Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-grab active:cursor-grabbing overflow-hidden ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: "3000px",
            height: "2000px",
            position: "relative",
          }}
        >
          {/* SVG Connecting Bezier Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map((conn, i) => {
              const startX = conn.from.x + conn.from.width;
              const startY = conn.from.y + conn.from.height / 2;
              const endX = conn.to.x;
              const endY = conn.to.y + conn.to.height / 2;
              const midX = (startX + endX) / 2;

              return (
                <path
                  key={i}
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke={conn.to.color || "rgba(147, 51, 234, 0.4)"}
                  strokeWidth="2"
                  strokeOpacity="0.5"
                  strokeDasharray={conn.to.type === "card" ? "4 4" : undefined}
                />
              );
            })}
          </svg>

          {/* Render Nodes */}
          {nodes.map((node) => {
            const isDoc = node.type === "doc";
            const isFolder = node.type === "folder";
            const isRoot = node.type === "root";
            const isCard = node.type === "card";

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDoc && node.dataId && onOpenDocument) {
                    onOpenDocument(node.dataId);
                  }
                }}
                style={{
                  position: "absolute",
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  zIndex: 2,
                }}
                className={`p-2.5 rounded-2xl border flex items-center gap-2 shadow-lg backdrop-blur-xl transition duration-200 ${
                  isRoot
                    ? "bg-purple-950/90 border-purple-500/80 text-white font-black shadow-purple-500/20"
                    : isFolder
                    ? "bg-slate-900/90 border-emerald-500/60 text-emerald-300 font-bold hover:scale-105"
                    : isDoc
                    ? "bg-slate-900/95 border-purple-500/60 text-purple-200 font-semibold hover:border-purple-400 hover:scale-105 cursor-pointer shadow-purple-500/10"
                    : "bg-slate-950/90 border-pink-500/40 text-pink-300 text-[11px] font-medium"
                }`}
              >
                {isRoot && <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />}
                {isFolder && <Folder className="w-4 h-4 text-emerald-400 shrink-0" />}
                {isDoc && <FileText className="w-4 h-4 text-purple-400 shrink-0" />}
                {isCard && <Layers className="w-3.5 h-3.5 text-pink-400 shrink-0" />}

                <span className="truncate text-xs">{node.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
