import React, { useState, useEffect, useRef, useCallback } from "react";
import { Copy, Check, Sparkles, X, BookOpen } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

interface TextSelectionFloatingBarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  /** @deprecated Removed per user request — AI Question generation preferred */
  onAddToNote?: (text: string) => void;
  /** @deprecated Removed per user request — AI Question generation preferred */
  onAddToTask?: (text: string) => void;
  onAiAction?: (text: string) => void;
  onGenerateQuestions?: (text: string) => void;
}

export const TextSelectionFloatingBar: React.FC<TextSelectionFloatingBarProps> = ({
  containerRef,
  onAiAction,
  onGenerateQuestions,
}) => {
  const { isEn } = useBilingual();
  const [selectedText, setSelectedText] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

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

    const top = Math.max(12, rect.top - 54);
    const left = Math.max(16, Math.min(window.innerWidth - 320, rect.left + rect.width / 2 - 140));

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
      if (bubbleRef.current && bubbleRef.current.contains(e.target as Node)) {
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

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedText) return;
    navigator.clipboard.writeText(selectedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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

  const wordCount = selectedText.split(/\s+/).filter(Boolean).length;
  const previewSnippet =
    selectedText.length > 40 ? `${selectedText.substring(0, 40)}...` : selectedText;

  const hasAiAction = Boolean(onGenerateQuestions || onAiAction);

  return (
    <>
      {/* 1. Desktop Smart Floating Pill */}
      {coords && (
        <div
          ref={bubbleRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 border border-purple-500/60 shadow-2xl backdrop-blur-xl ring-1 ring-purple-400/20 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Copy Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition cursor-pointer"
            title={isEn ? "Copy text" : "کپی متن"}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{isEn ? "Copied" : "کپی شد"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>{isEn ? "Copy" : "کپی"}</span>
              </>
            )}
          </button>

          {/* AI Flashcard & Question Generation Button */}
          {hasAiAction && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTriggerAiQuestions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold transition cursor-pointer shadow-sm shadow-purple-500/25"
              title={isEn ? "Generate Leitner & Mind Map cards with AI" : "تولید کارت‌های لایتنر و نقشه ذهنی با هوش مصنوعی"}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{isEn ? "Generate Cards (AI)" : "تولید کارت و سوال هوشمند"}</span>
            </button>
          )}

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title={isEn ? "Dismiss" : "بستن"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Responsive Mobile & Touch Dock */}
      <div
        ref={bubbleRef}
        style={{ zIndex: 99998 }}
        className="md:hidden fixed bottom-20 inset-x-3 max-w-lg mx-auto animate-in slide-in-from-bottom-4 fade-in duration-200 select-none"
      >
        <div className="p-3 rounded-2xl bg-slate-900/95 border border-purple-500/60 shadow-2xl backdrop-blur-2xl flex flex-col gap-2 ring-1 ring-purple-400/25">
          {/* Header Row: Word Count & Snippet Preview */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 text-purple-300">
              <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-bold truncate">
                {isEn ? `${wordCount} words selected:` : `${wordCount} کلمه انتخاب شد:`}
              </span>
              <span className="text-[11px] text-slate-300 truncate opacity-90">
                "{previewSnippet}"
              </span>
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
              title={isEn ? "Close" : "بستن"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{isEn ? "Copied" : "کپی شد"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? "Copy" : "کپی"}</span>
                </>
              )}
            </button>

            {hasAiAction && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleTriggerAiQuestions}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-sky-600 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{isEn ? "Generate Cards (AI)" : "تولید سوال هوشمند (AI)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
