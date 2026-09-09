'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  MindMapNode,
  MindMapLayoutItem,
  MindMapLink,
  MindMapTextDisplay,
  MindMapLineStyle,
  MindMapViewMode,
  NodeCustomImage,
} from '@/types/mindmap';
import { MINDMAP_THEMES, generateLinkPathData } from '@/lib/mindmapLayout';
import { LeitnerCard } from '@/types/leitner';
import { Language } from '@/types/pharmacy';
import { FLAG_OPTIONS, FlagColor } from '@/components/LeitnerMindMapPanel';
import { haptic } from '@/lib/haptics';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Flag,
  Sparkles,
  BookOpen,
  Folder,
  FolderTree,
  Stethoscope,
  Pill,
  Zap,
  RotateCcw,
  Eye,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Globe,
  Activity,
  Brain,
  Bot,
  Workflow,
  Check,
  Layers,
  ChevronsUpDown,
  GitFork,
  Network,
  ListTree,
  Grid,
  Image as ImageIcon,
} from 'lucide-react';

export interface MindMapCanvasProps {
  language: Language;
  layoutItems: MindMapLayoutItem[];
  layoutLinks: MindMapLink[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  expandedNodeIds: Record<string, boolean>;
  onToggleNode: (nodeId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent | React.TouchEvent, node: MindMapNode) => void;
  onSelectQuestionCard: (card: LeitnerCard) => void;
  onStartStudyBranch: (node: MindMapNode) => void;
  getNodeDisplayTitle: (node: MindMapNode) => string;
  cardFlags: Record<string, FlagColor>;
  cardLangMode: 'fa' | 'en' | 'bilingual';
  onSetCardLangMode?: (mode: 'fa' | 'en' | 'bilingual') => void;
  textDisplayMode: MindMapTextDisplay;
  onSetTextDisplayMode?: (mode: MindMapTextDisplay) => void;
  lineStyle: MindMapLineStyle;
  onSetLineStyle?: (style: MindMapLineStyle) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  viewMode?: MindMapViewMode;
  onSetViewMode?: (mode: MindMapViewMode) => void;
  isDarkTheme?: boolean;
  onOpenSettings?: () => void;
  onViewImage?: (image: NodeCustomImage, title: string) => void;
  children?: React.ReactNode;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  language,
  layoutItems,
  layoutLinks,
  bounds,
  expandedNodeIds,
  onToggleNode,
  onOpenContextMenu,
  onSelectQuestionCard,
  onStartStudyBranch,
  getNodeDisplayTitle,
  cardFlags,
  cardLangMode,
  onSetCardLangMode,
  textDisplayMode,
  onSetTextDisplayMode,
  lineStyle,
  onSetLineStyle,
  onExpandAll,
  onCollapseAll,
  viewMode,
  onSetViewMode,
  isDarkTheme = true,
  onOpenSettings,
  onViewImage,
  children,
}) => {
  const isFa = language === 'fa';
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const popoverContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [openPopover, setOpenPopover] = useState<'lang' | 'lines' | 'viewMode' | null>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (popoverContainerRef.current && !popoverContainerRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };

    if (openPopover) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPopover]);

  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasInitializedViewRef = useRef(false);

  // Advanced Mobile Touch & Multi-touch Gesture Ref
  const touchGestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startDist: number;
    startZoom: number;
    startMidX: number;
    startMidY: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDist: 0,
    startZoom: 1,
    startMidX: 0,
    startMidY: 0,
  });

  // Touch-hold long-press detection for mobile context menu
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressMovedRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleNodeTouchStart = (e: React.TouchEvent, node: MindMapNode) => {
    longPressMovedRef.current = false;
    if (e.touches.length === 1) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (!longPressMovedRef.current) {
          haptic.heavy();
          onOpenContextMenu(e, node);
        }
      }, 450);
    }
  };

  const handleNodeTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (dx > 8 || dy > 8) {
        longPressMovedRef.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handleNodeTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Compute optimal scale and pan offset to perfectly center mind map content
  const fitViewToContainer = useCallback((customBounds = bounds) => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 900;
    const ch = containerRef.current.clientHeight || 650;

    const bWidth = Math.max(customBounds.width, customBounds.maxX - customBounds.minX, 200);
    const bHeight = Math.max(customBounds.height, customBounds.maxY - customBounds.minY, 200);

    const scaleX = (cw - 80) / bWidth;
    const scaleY = (ch - 80) / bHeight;
    const optimalScale = Math.min(1.15, Math.max(0.3, Math.min(scaleX, scaleY)));
    const finalZoom = +optimalScale.toFixed(2);

    const contentCenterX = (customBounds.minX + customBounds.maxX) / 2;
    const contentCenterY = (customBounds.minY + customBounds.maxY) / 2;

    const targetPanX = Math.round(cw / 2 - contentCenterX * finalZoom);
    const targetPanY = Math.round(ch / 2 - contentCenterY * finalZoom);

    setZoomLevel(finalZoom);
    setPanOffset({ x: targetPanX, y: targetPanY });
  }, [bounds]);

  // Center canvas on first load and automatically re-center when switching viewMode
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (bounds.width > 0 && containerRef.current) {
      if (!hasInitializedViewRef.current) {
        fitViewToContainer();
        hasInitializedViewRef.current = true;
      } else if (prevViewModeRef.current !== viewMode) {
        prevViewModeRef.current = viewMode;
        fitViewToContainer();
      }
    }
  }, [bounds.width, viewMode, fitViewToContainer]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement && !isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.3, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 900;
    const ch = containerRef.current.clientHeight || 650;
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;
    setZoomLevel(1);
    setPanOffset({
      x: Math.round(cw / 2 - contentCenterX * 1),
      y: Math.round(ch / 2 - contentCenterY * 1),
    });
  };
  const handleFitView = () => {
    fitViewToContainer();
  };

  // Mouse wheel: Directly zoom in/out centered at mouse cursor position
  const handleWheel = (e: React.WheelEvent) => {
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
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.mindmap-interactive-node') || target.closest('button')) {
      return;
    }
    setIsDragging(true);
    dragStartPosRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartPosRef.current.x,
      y: e.clientY - dragStartPosRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // -------------------------------------------------------------------------
  // HIGH-PERFORMANCE MOBILE TOUCH & PINCH GESTURE HANDLERS
  // -------------------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const target = e.target as HTMLElement;
      // If tapping directly on buttons, let button click handler respond
      if (target.closest('button')) {
        return;
      }
      setIsDragging(true);
      const t = e.touches[0];
      touchGestureRef.current = {
        mode: 'pan',
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
        mode: 'pinch',
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    if (e.touches.length === 1 && touchGestureRef.current.mode === 'pan') {
      const t = e.touches[0];
      const dx = t.clientX - touchGestureRef.current.startX;
      const dy = t.clientY - touchGestureRef.current.startY;
      setPanOffset({
        x: touchGestureRef.current.startPanX + dx,
        y: touchGestureRef.current.startPanY + dy,
      });
    } else if (e.touches.length >= 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      if (touchGestureRef.current.mode !== 'pinch' || touchGestureRef.current.startDist <= 0) {
        touchGestureRef.current = {
          mode: 'pinch',
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

      // Smooth zoom centered around the pinch focal point
      const stageRect = containerRef.current?.getBoundingClientRect();
      const originX = stageRect ? currentMidX - stageRect.left : currentMidX;
      const originY = stageRect ? currentMidY - stageRect.top : currentMidY;

      const startOriginX = stageRect
        ? touchGestureRef.current.startMidX - stageRect.left
        : touchGestureRef.current.startMidX;
      const startOriginY = stageRect
        ? touchGestureRef.current.startMidY - stageRect.top
        : touchGestureRef.current.startMidY;

      const contentX =
        (startOriginX - touchGestureRef.current.startPanX) / touchGestureRef.current.startZoom;
      const contentY =
        (startOriginY - touchGestureRef.current.startPanY) / touchGestureRef.current.startZoom;

      const newPanX = originX - contentX * newZoom;
      const newPanY = originY - contentY * newZoom;

      setZoomLevel(newZoom);
      setPanOffset({
        x: Math.round(newPanX),
        y: Math.round(newPanY),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      touchGestureRef.current.mode = 'none';
    } else if (e.touches.length === 1) {
      // Transition from pinch to single-finger pan smoothly
      const t = e.touches[0];
      touchGestureRef.current = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
        startDist: 0,
        startZoom: zoomLevel,
        startMidX: t.clientX,
        startMidY: t.clientY,
      };
    }
  };

  // Prevent browser default gesture zoom/pull-to-refresh on canvas container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    el.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    return () => {
      el.removeEventListener('touchstart', preventDefaultTouch);
      el.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, []);

  // Helper for Level Icon
  const getNodeLevelIcon = (level: number) => {
    switch (level) {
      case 0:
        return <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />;
      case 1:
        return <Folder className="w-4 h-4 text-purple-400 shrink-0" />;
      case 2:
        return <Stethoscope className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 3:
        return <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 4:
        return <Pill className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 5:
        return <Zap className="w-3 h-3 text-rose-400 shrink-0" />;
      default:
        return <HelpCircle className="w-3 h-3 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative w-full h-[62vh] min-h-[460px] sm:h-[720px] rounded-3xl border border-slate-800/90 overflow-hidden select-none transition-all duration-300 bg-slate-950 text-slate-100 touch-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none p-4' : ''
      }`}
      style={{
        backgroundColor: '#020617',
        backgroundImage: isDarkTheme
          ? 'radial-gradient(circle, rgba(148, 163, 184, 0.12) 1.5px, transparent 1.5px)'
          : 'radial-gradient(circle, rgba(100, 116, 139, 0.18) 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
        touchAction: 'none',
      }}
    >
      {/* Click-away backdrop for popovers */}
      {openPopover && (
        <div
          className="fixed inset-0 z-20 bg-black/10 sm:bg-transparent"
          onClick={() => setOpenPopover(null)}
        />
      )}

      {/* Floating Canvas Controls & Settings Multi-Toolbar */}
      <div
        ref={popoverContainerRef}
        className="absolute top-4 start-4 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] overflow-visible flex-wrap sm:flex-nowrap"
      >
        {/* 1. Zoom Controls (Desktop / Windows only - hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-purple-600 text-slate-200 hover:text-white transition shadow-sm cursor-pointer"
            title={isFa ? 'بزرگ‌نمایی (+)' : 'Zoom In (+)'}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-purple-600 text-slate-200 hover:text-white transition shadow-sm cursor-pointer"
            title={isFa ? 'کوچک‌نمایی (-)' : 'Zoom Out (-)'}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition cursor-pointer"
            title={isFa ? 'بزرگ‌نمایی ۱۰۰٪' : 'Reset to 100%'}
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            type="button"
            onClick={handleFitView}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-purple-600 text-slate-200 hover:text-white transition shadow-sm cursor-pointer"
            title={isFa ? 'تراز و چیدمان کامل در صفحه' : 'Fit Entire Mind Map to Screen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl transition shadow-sm cursor-pointer ${
              isFullscreen
                ? 'bg-purple-600 text-white ring-2 ring-purple-400/50'
                : 'bg-slate-800/90 hover:bg-purple-600 text-slate-200 hover:text-white'
            }`}
            title={
              isFullscreen
                ? isFa
                  ? 'خروج از تمام‌صفحه (ESC)'
                  : 'Exit Fullscreen (ESC)'
                : isFa
                ? 'تمام‌صفحه واقعی نقشه ذهنی'
                : 'True Fullscreen'
            }
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-purple-400" />}
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-700/80 mx-0.5 hidden sm:block" />

        {/* 2. Expand / Collapse All Branches Toggle */}
        {(onExpandAll || onCollapseAll) && (
          <button
            type="button"
            onClick={() => {
              const totalExpanded = Object.values(expandedNodeIds).filter(Boolean).length;
              if (totalExpanded > 3) {
                onCollapseAll?.();
              } else {
                onExpandAll?.();
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            title={isFa ? 'باز کردن / بستن همه شاخه‌های نقشه ذهنی' : 'Expand / Collapse All Branches'}
          >
            <FolderTree className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {Object.values(expandedNodeIds).filter(Boolean).length > 3
                ? isFa
                  ? 'بستن همه'
                  : 'Collapse'
                : isFa
                ? 'باز کردن همه'
                : 'Expand All'}
            </span>
          </button>
        )}

        {/* 3. 🌐 Language Switcher Popover (3 Modes: Farsi, English, Bilingual) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenPopover(openPopover === 'lang' ? null : 'lang')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
              openPopover === 'lang'
                ? 'bg-purple-600 text-white ring-1 ring-purple-400/50'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={isFa ? 'تغییر زبان گره‌های نقشه ذهنی (فارسی / انگلیسی / دوزبانه)' : 'Change Language Mode'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {cardLangMode === 'bilingual'
                ? isFa ? 'دوزبانه' : 'Bilingual'
                : cardLangMode === 'fa'
                ? 'فارسی'
                : 'English'}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${openPopover === 'lang' ? 'rotate-180' : ''}`} />
          </button>

          {openPopover === 'lang' && (
            <div
              className="absolute top-full start-0 mt-2 z-50 w-52 max-w-[calc(100vw-2rem)] p-1.5 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-1 animate-in fade-in zoom-in-95 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isFa ? 'زبان نمایش گره‌ها' : 'Language Mode'}
              </div>
              {[
                {
                  id: 'bilingual',
                  label: isFa ? '🌐 دوزبانه (Fa + En)' : '🌐 Bilingual (Fa + En)',
                  desc: isFa ? 'فارسی به همراه متن انگلیسی' : 'Both languages shown',
                },
                {
                  id: 'fa',
                  label: isFa ? '🇮🇷 فقط فارسی' : '🇮🇷 Farsi Only',
                  desc: isFa ? 'تمرکز روی ترجمه فارسی' : 'Farsi focused text',
                },
                {
                  id: 'en',
                  label: isFa ? '🇬🇧 فقط انگلیسی' : '🇬🇧 English Only',
                  desc: isFa ? 'اصطلاحات تخصصی داروسازی' : 'Medical English focus',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSetCardLangMode?.(opt.id as any);
                    setOpenPopover(null);
                  }}
                  className={`w-full p-2 rounded-xl text-start transition cursor-pointer flex items-center justify-between text-xs font-bold ${
                    cardLangMode === opt.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div>
                    <div>{opt.label}</div>
                    <div className={`text-[10px] ${cardLangMode === opt.id ? 'text-purple-200' : 'text-slate-500'}`}>
                      {opt.desc}
                    </div>
                  </div>
                  {cardLangMode === opt.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. 🗜️ Compact / Detailed Display Toggle Button */}
        {onSetTextDisplayMode && (
          <button
            type="button"
            onClick={() => onSetTextDisplayMode(textDisplayMode === 'compact' ? 'full_detailed' : 'compact')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
              textDisplayMode === 'compact'
                ? 'bg-indigo-600 text-white ring-1 ring-indigo-400/50 shadow-md'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={
              isFa
                ? textDisplayMode === 'compact'
                  ? 'تغییر به نمایش کامل و تفصیلی گره‌ها'
                  : 'تغییر به نمایش فشرده و خلاصه گره‌ها'
                : textDisplayMode === 'compact'
                ? 'Switch to Full Detailed Mode'
                : 'Switch to Compact Display Mode'
            }
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {textDisplayMode === 'compact'
                ? isFa ? 'نمایش فشرده' : 'Compact'
                : isFa ? 'نمایش جامع' : 'Detailed'}
            </span>
          </button>
        )}

        {/* 4. 〰️ Connector Line Style Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenPopover(openPopover === 'lines' ? null : 'lines')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
              openPopover === 'lines'
                ? 'bg-purple-600 text-white ring-1 ring-purple-400/50'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={isFa ? 'سبک و انحنای خطوط اتصال بین گره‌ها' : 'Connector Line Style'}
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            <ChevronDown className={`w-3 h-3 transition-transform ${openPopover === 'lines' ? 'rotate-180' : ''}`} />
          </button>

          {openPopover === 'lines' && (
            <div
              className="absolute top-full end-0 mt-2 z-50 w-60 max-w-[calc(100vw-2rem)] p-1.5 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-1 animate-in fade-in zoom-in-95 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isFa ? 'سبک خطوط اتصال بین گره‌ها' : 'Line Connector Style'}
              </div>
              {[
                {
                  id: 'smooth_bezier' as MindMapLineStyle,
                  label: isFa ? '🌊 منحنی روان (Bezier)' : '🌊 Smooth Bezier',
                  desc: isFa ? 'طبیعی و ارگانیک ترین حالت' : 'Natural curved connections',
                },
                {
                  id: 'straight' as MindMapLineStyle,
                  label: isFa ? '📏 خطوط مستقیم' : '📏 Straight Direct',
                  desc: isFa ? 'مستقیم، تمیز و سریع' : 'Clean direct lines',
                },
                {
                  id: 'orthogonal_step' as MindMapLineStyle,
                  label: isFa ? '📐 مستطیلی پله‌ای' : '📐 Orthogonal Stepped',
                  desc: isFa ? 'چارت‌های سازمانی و مهندسی' : 'Right-angle stepped branches',
                },
                {
                  id: 'polar_radial' as MindMapLineStyle,
                  label: isFa ? '🌐 اتصالات شعاعی (Radial)' : '🌐 Polar Radial',
                  desc: isFa ? 'پخش مدور و شعاعی' : 'Radial curved projection',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSetLineStyle?.(opt.id);
                    setOpenPopover(null);
                  }}
                  className={`w-full p-2 rounded-xl text-start transition cursor-pointer flex items-center justify-between text-xs font-bold ${
                    lineStyle === opt.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div>
                    <div>{opt.label}</div>
                    <div className={`text-[10px] ${lineStyle === opt.id ? 'text-purple-200' : 'text-slate-500'}`}>
                      {opt.desc}
                    </div>
                  </div>
                  {lineStyle === opt.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. 🌳 Mind Map View Mode Selector Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenPopover(openPopover === 'viewMode' ? null : 'viewMode')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
              openPopover === 'viewMode'
                ? 'bg-purple-600 text-white ring-1 ring-purple-400/50'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={isFa ? 'انتخاب ساختار و چیدمان نقشه ذهنی (افقی، درختی، دایره‌ای، متنی و ماتریسی)' : 'Mind Map View Mode'}
          >
            {viewMode === 'vertical_tree' ? (
              <GitFork className="w-3.5 h-3.5 text-amber-400 rotate-180" />
            ) : viewMode === 'radial_circle' ? (
              <Network className="w-3.5 h-3.5 text-cyan-400" />
            ) : viewMode === 'outliner_tree' ? (
              <ListTree className="w-3.5 h-3.5 text-emerald-400" />
            ) : viewMode === 'matrix_grid' ? (
              <Grid className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Workflow className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {viewMode === 'vertical_tree'
                ? isFa ? 'درختی عمودی' : 'Vertical Tree'
                : viewMode === 'radial_circle'
                ? isFa ? 'مدور شعاعی' : 'Radial Circle'
                : viewMode === 'outliner_tree'
                ? isFa ? 'نمای فهرستی' : 'Outliner'
                : viewMode === 'matrix_grid'
                ? isFa ? 'ماتریس بالینی' : 'Clinical Matrix'
                : isFa ? 'بوم افقی' : 'Canvas'}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${openPopover === 'viewMode' ? 'rotate-180' : ''}`} />
          </button>

          {openPopover === 'viewMode' && (
            <div
              className="absolute top-full end-0 mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] p-1.5 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-1 animate-in fade-in zoom-in-95 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isFa ? 'چیدمان و ساختار نقشه ذهنی' : 'Mind Map View Mode'}
              </div>
              {[
                {
                  id: 'interactive_canvas' as MindMapViewMode,
                  name: isFa ? '🌐 بوم افقی تعاملی' : '🌐 Interactive Canvas',
                  desc: isFa ? 'انشعاب افقی استاندارد از چپ به راست' : 'Standard horizontal branching',
                },
                {
                  id: 'vertical_tree' as MindMapViewMode,
                  name: isFa ? '🌳 ساختار درختی عمودی' : '🌳 Vertical Hierarchy Tree',
                  desc: isFa ? 'چارت سلسله‌مراتبی از بالا به پایین' : 'Top-down hierarchical tree',
                },
                {
                  id: 'radial_circle' as MindMapViewMode,
                  name: isFa ? '🌀 نقشه مدور و شعاعی' : '🌀 Radial Circle Mind Map',
                  desc: isFa ? 'چیدمان دایره‌ای ۳۶۰ درجه حول ریشه' : '360° radial mind map',
                },
                {
                  id: 'outliner_tree' as MindMapViewMode,
                  name: isFa ? '📑 نمای متنی اوت‌لاینر' : '📑 Collapsible Outliner',
                  desc: isFa ? 'فهرست متنی با قابلیت باز و بسته‌شدن' : 'Structured text list outline',
                },
                {
                  id: 'matrix_grid' as MindMapViewMode,
                  name: isFa ? '📊 ماتریس بالینی شبکه‌ای' : '📊 Clinical Matrix Grid',
                  desc: isFa ? 'جدول دسته‌بندی و سطوح سیستم‌ها' : '2D clinical matrix grid',
                },
              ].map((m) => {
                const isSelected = (viewMode || 'interactive_canvas') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSetViewMode?.(m.id);
                      setOpenPopover(null);
                    }}
                    className={`w-full p-2.5 rounded-xl text-start transition cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{m.name}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                        {m.desc}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Canvas Status & Touch Guidance Helper Bar */}
      <div className="absolute bottom-4 start-4 z-20 flex items-center gap-2">
        <div className="text-[11px] text-slate-300 bg-slate-900/95 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-purple-400" />
          <span>
            {isFa
              ? 'درگ ماوس یا لمس: جابجایی در بوم | اسکرول یا پینچ: زوم | کلیک‌راست روی گره: منوی امکانات'
              : 'Drag to pan | Scroll/Pinch to zoom | Right-click/Hold for options'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INFINITE DRAGGABLE & ZOOMABLE GRAPH STAGE                                 */}
      {/* ========================================================================= */}
      <div
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`w-full h-full ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } overflow-hidden touch-none`}
        style={{ touchAction: 'none' }}
      >
        <div
          className="origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* ========================================================================= */}
          {/* 1. SVG HIGH-CONTRAST CONNECTING PATHS (BETWEEN NODES)                     */}
          {/* ========================================================================= */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: `${Math.max(6000, bounds.width + 1000)}px`,
              height: `${Math.max(6000, bounds.height + 1000)}px`,
              overflow: 'visible',
            }}
          >
            <defs>
              <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {layoutLinks.map((link) => {
              const pathData = generateLinkPathData(link, lineStyle, viewMode);
              const isLinkActive = hoveredNodeId === link.sourceId || hoveredNodeId === link.targetId;

              return (
                <g key={link.id} className="transition-all duration-200">
                  <path
                    d={pathData}
                    fill="none"
                    stroke={link.color}
                    strokeWidth={isLinkActive ? 6 : link.strokeWidth + 3}
                    strokeOpacity={isLinkActive ? 0.45 : 0.22}
                    strokeLinecap="round"
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke={link.color}
                    strokeWidth={isLinkActive ? 3 : link.strokeWidth}
                    strokeOpacity={isLinkActive ? 1 : 0.85}
                    strokeLinecap="round"
                  />
                  <circle cx={link.startX} cy={link.startY} r={isLinkActive ? 4 : 3} fill={link.color} />
                  <circle cx={link.endX} cy={link.endY} r={isLinkActive ? 4 : 3} fill={link.color} />
                </g>
              );
            })}
          </svg>

          {layoutItems.map((item) => {
            const node = item.node;
            const theme = MINDMAP_THEMES[item.colorTheme] || MINDMAP_THEMES.purple;
            const isLeafQuestion = node.level === 6 && !!node.card;

            if (isLeafQuestion && node.card) {
              const card = node.card;
              const flag = cardFlags[card.id];
              const flagInfo = flag ? FLAG_OPTIONS[flag] : null;
              const qFa = typeof card.question === 'object' ? card.question.fa || card.question.en : card.question;
              const qEn = typeof card.question === 'object' ? card.question.en || card.question.fa : card.question;

              return (
                <div
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); onSelectQuestionCard(card); }}
                  onContextMenu={(e) => onOpenContextMenu(e, node)}
                  onTouchStart={(e) => handleNodeTouchStart(e, node)}
                  onTouchMove={handleNodeTouchMove}
                  onTouchEnd={handleNodeTouchEnd}
                  onTouchCancel={handleNodeTouchEnd}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    position: 'absolute',
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    width: `${item.width}px`,
                    minHeight: `${item.height}px`,
                  }}
                  className={`mindmap-interactive-node group p-3 rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between gap-2.5 ${
                    flagInfo
                      ? `${flagInfo.badge} ring-1 ring-white/10`
                      : 'bg-slate-900/95 hover:bg-slate-850 border-slate-700/80 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {flagInfo ? (
                        <Flag className={`w-3.5 h-3.5 shrink-0 fill-current ${flagInfo.iconColor}`} />
                      ) : (
                        <HelpCircle className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                      )}
                      <span className="text-[10px] font-bold text-slate-400 truncate">{card.topic || 'Clinical Item'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {node.customImage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewImage?.(node.customImage!, node.title.fa || node.title.en || 'Card');
                          }}
                          className="text-[11px] px-1 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/60 text-purple-200 border border-purple-500/40 cursor-pointer transition"
                          title={isFa ? 'مشاهده تصویر پیوست' : 'View Image'}
                        >
                          🖼️
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenContextMenu(e, node);
                        }}
                        className="px-1 py-0.5 rounded-md bg-slate-800/80 hover:bg-purple-600/40 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer text-[11px] font-bold"
                        title={isFa ? 'امکانات شاخه (پیوست تصویر، کپی AI، رنگ و...)' : 'Actions & Image'}
                      >
                        ⋮
                      </button>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">B{card.box}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    {cardLangMode === 'bilingual' ? (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-100 leading-relaxed" dir="rtl">{qFa || qEn}</div>
                        {qEn && qEn !== qFa && <div className="text-[11px] font-medium text-purple-300 leading-normal border-t border-slate-800/80 pt-1" dir="ltr">{qEn}</div>}
                      </div>
                    ) : cardLangMode === 'fa' ? (
                      <div className="text-xs font-bold text-slate-100" dir="rtl">{qFa || qEn}</div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-100" dir="ltr">{qEn || qFa}</div>
                    )}
                  </div>

                  {node.customImage && (
                    <div
                      onClick={(e) => { e.stopPropagation(); onViewImage?.(node.customImage!, node.title.fa || node.title.en || 'Node'); }}
                      className="relative rounded-xl overflow-hidden border border-purple-500/40 bg-black/50 max-h-20 flex items-center justify-center cursor-zoom-in group/img"
                    >
                      <Image src={node.customImage.url} alt="Attachment" fill unoptimized sizes="320px" className="object-cover group-hover/img:scale-105 transition" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end justify-between p-1 text-[9px] text-white">
                        <span className="truncate max-w-[85%]">{node.customImage.caption || 'Image'}</span>
                        <ZoomIn className="w-3 h-3 text-cyan-300" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                    <span className="font-mono text-emerald-400 font-semibold">{isFa ? 'برای مشاهده پاسخ کلیک کنید' : 'Click to reveal'}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={node.id}
                onClick={(e) => { e.stopPropagation(); onToggleNode(node.id); }}
                onContextMenu={(e) => onOpenContextMenu(e, node)}
                onTouchStart={(e) => handleNodeTouchStart(e, node)}
                onTouchMove={handleNodeTouchMove}
                onTouchEnd={handleNodeTouchEnd}
                onTouchCancel={handleNodeTouchEnd}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                  minHeight: `${item.height}px`,
                }}
                className={`mindmap-interactive-node group p-3 rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl flex flex-col gap-1.5 ${
                  node.level === 0 ? 'bg-slate-900/95 border-purple-500/80' : `${theme.bg} ${theme.border} ${theme.glow}`
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {cardLangMode === 'bilingual' ? (
                      <>
                        <div className={`font-extrabold text-xs sm:text-sm ${node.level === 0 ? 'text-purple-200' : theme.text}`} dir="rtl">{node.title.fa || node.title.en}</div>
                        {node.title.en && node.title.en !== node.title.fa && <div className="text-[10.5px] text-slate-300 opacity-90" dir="ltr">{node.title.en}</div>}
                      </>
                    ) : cardLangMode === 'fa' ? (
                      <div className={`font-extrabold text-xs sm:text-sm ${node.level === 0 ? 'text-purple-200' : theme.text}`} dir="rtl">{node.title.fa || node.title.en}</div>
                    ) : (
                      <div className={`font-extrabold text-xs sm:text-sm ${node.level === 0 ? 'text-purple-200' : theme.text}`} dir="ltr">{node.title.en || node.title.fa}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                     {node.customImage && (
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           onViewImage?.(node.customImage!, node.title.fa || node.title.en || 'Node');
                         }}
                         className="text-[11px] px-1 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/60 text-purple-200 border border-purple-500/40 cursor-pointer transition"
                         title={isFa ? 'مشاهده تصویر پیوست' : 'View Image'}
                       >
                         🖼️
                       </button>
                     )}
                     <button
                       type="button"
                       onClick={(e) => {
                         e.stopPropagation();
                         onOpenContextMenu(e, node);
                       }}
                       className="px-1 py-0.5 rounded-md bg-slate-800/80 hover:bg-purple-600/40 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer text-[11px] font-bold"
                       title={isFa ? 'امکانات شاخه (پیوست تصویر، کپی AI، رنگ و...)' : 'Actions & Image'}
                     >
                       ⋮
                     </button>
                     {node.cardCount > 0 && <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-slate-300 text-[10px] font-mono font-bold">{node.cardCount}</span>}
                  </div>
                </div>
                {node.customImage && (
                  <div
                    onClick={(e) => { e.stopPropagation(); onViewImage?.(node.customImage!, node.title.fa || node.title.en || 'Node'); }}
                    className="relative rounded-xl overflow-hidden border border-purple-500/40 bg-black/50 max-h-24 flex items-center justify-center cursor-zoom-in group/img mt-1"
                  >
                    <Image src={node.customImage.url} alt="Attachment" fill unoptimized sizes="320px" className="object-cover group-hover/img:scale-105 transition" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end justify-between p-1 text-[9.5px] text-white">
                      <span className="truncate max-w-[85%] font-medium">{node.customImage.caption || 'Image'}</span>
                      <ZoomIn className="w-3 h-3 text-cyan-300" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals & Portals rendered inside canvas container so they are visible during Fullscreen */}
      {children}
    </div>
  );
};
