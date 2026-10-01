import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Sparkles, X, Copy, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";

interface TextSelectionFloatingBarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  onAddToNote?: (text: string) => void;
  onAddToTask?: (text: string) => void;
  onAiAction?: (text: string) => void;
  onGenerateQuestions?: (text: string) => void;
}

export const TextSelectionFloatingBar: React.FC<TextSelectionFloatingBarProps> = ({
  containerRef,
  onAddToNote,
  onAiAction,
  onGenerateQuestions,
}) => {
  const { isEn } = useBilingual();
  const [selectedText, setSelectedText] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const desktopBubbleRef = useRef<HTMLDivElement>(null);
  const mobileBubbleRef = useRef<HTMLDivElement>(null);

  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setCoords(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setCoords(null);
      setSelectedText("");
      return;
    }

    // Check if selection is inside containerRef if provided
    if (containerRef && containerRef.current) {
      const anchorNode = selection.anchorNode;
      if (anchorNode && !containerRef.current.contains(anchorNode)) {
        setCoords(null);
        setSelectedText("");
        return;
      }
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Avoid offscreen coords
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    const top = Math.max(12, rect.top - 62);
    const left = Math.max(16, Math.min(window.innerWidth - 430, rect.left + rect.width / 2 - 140));

    setSelectedText(text);
    setCoords({ top, left });
  }, [containerRef]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleMouseUp = () => {
      clearTimeout(timer);
      timer = setTimeout(checkSelection, 60);
    };

    const handleTouchEnd = () => {
      clearTimeout(timer);
      timer = setTimeout(checkSelection, 120);
    };

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      const targetNode = e.target as Node;
      if (
        (desktopBubbleRef.current && desktopBubbleRef.current.contains(targetNode)) ||
        (mobileBubbleRef.current && mobileBubbleRef.current.contains(targetNode))
      ) {
        return;
      }
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        setCoords(null);
        setSelectedText("");
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleMouseDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleMouseDown);
    };
  }, [checkSelection]);

  useLayoutEffect(() => {
    if (!selectedText || !desktopBubbleRef.current) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const selectedRect = selection.getRangeAt(0).getBoundingClientRect();
    const toolbar = desktopBubbleRef.current.getBoundingClientRect();
    if (!toolbar.width) return;
    setCoords({
      top: Math.max(8, selectedRect.top - toolbar.height - 8),
      left: Math.max(8, Math.min(window.innerWidth - toolbar.width - 8, selectedRect.left + selectedRect.width / 2 - toolbar.width / 2)),
    });
  }, [selectedText]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoords(null);
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  };

  const handleTriggerAiQuestions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedText) return;
    if (onGenerateQuestions) {
      onGenerateQuestions(selectedText);
    } else if (onAiAction) {
      onAiAction(selectedText);
    }
    handleDismiss(e);
  };

  if (!selectedText) return null;

  const create = Boolean(onGenerateQuestions || onAiAction);
  const actionClass = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const actions = <>
    <button type="button" className={actionClass} onMouseDown={event => event.preventDefault()} onClick={async () => {
      try { await navigator.clipboard.writeText(selectedText); toast.success(isEn ? "Copied" : "کپی شد"); }
      catch { toast.error(isEn ? "Could not copy. Use your browser’s Copy action." : "کپی انجام نشد؛ از گزینهٔ کپی مرورگر استفاده کنید."); }
    }}><Copy className="h-4 w-4" />{isEn ? "Copy" : "کپی"}</button>
    {onAddToNote && <button type="button" className={actionClass} onMouseDown={event => event.preventDefault()} onClick={event => { onAddToNote(selectedText); handleDismiss(event); }}><StickyNote className="h-4 w-4" />{isEn ? "Note" : "یادداشت"}</button>}
    {create && <button type="button" className={`${actionClass} text-primary`} onMouseDown={event => event.preventDefault()} onClick={handleTriggerAiQuestions}><Sparkles className="h-4 w-4" />{isEn ? "Create cards / questions" : "ساخت کارت / سؤال"}</button>}
    <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted" onMouseDown={event => event.preventDefault()} onClick={handleDismiss} aria-label={isEn ? "Dismiss" : "بستن"}><X className="h-4 w-4" /></button>
  </>;
  return <>
    {coords && <div ref={desktopBubbleRef} style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 99999 }} className="hidden md:flex max-w-[min(430px,calc(100vw-2rem))] flex-wrap items-center rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg select-none" role="toolbar" aria-label={isEn ? "Selected text actions" : "ابزارهای متن انتخاب‌شده"}>{actions}</div>}
    <div ref={mobileBubbleRef} className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] inset-x-3 z-[99998] mx-auto flex max-w-lg flex-wrap items-center justify-center rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg select-none" role="toolbar" aria-label={isEn ? "Selected text actions" : "ابزارهای متن انتخاب‌شده"}>{actions}</div>
  </>;
};
