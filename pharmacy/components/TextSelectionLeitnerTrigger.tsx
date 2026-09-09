'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Copy, Check, X, BookOpen, Layers, GraduationCap } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface TextSelectionLeitnerTriggerProps {
  language: Language;
  onOpenLeitnerModal: (
    text: string,
    defaultModule?: 1 | 2 | 3 | 4,
    category?: string,
    topic?: string,
    initialTab?: 'ai' | 'manual'
  ) => void;
}

export const TextSelectionLeitnerTrigger: React.FC<TextSelectionLeitnerTriggerProps> = ({
  language,
  onOpenLeitnerModal,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isFa = language === 'fa';

  const [detectedContext, setDetectedContext] = useState<{
    module?: 1 | 2 | 3 | 4;
    category?: string;
    topic?: string;
  }>({});

  const inspectSelection = useCallback(() => {
    if (typeof window === 'undefined') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const text = selection.toString().trim();
    // Valid educational snippet: at least 5 characters and at least 2 words, up to 3500 chars
    const words = text.split(/\s+/).filter(Boolean);
    if (text.length < 5 || words.length < 2 || text.length > 3500) {
      setCoords(null);
      setSelectedText('');
      setDetectedContext({});
      return;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode) return;

    const anchorElement =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as Element)
        : anchorNode.parentElement;
    const focusElement =
      focusNode?.nodeType === Node.ELEMENT_NODE
        ? (focusNode as Element)
        : focusNode?.parentElement;

    const targetElement = anchorElement || focusElement;
    if (!targetElement) return;

    // 1. STRICT EXCLUSIONS: Ignore selection in navigation, headers, footers, toolbars, buttons, modals & inputs
    const isExcluded = targetElement.closest(
      [
        'nav',
        'header',
        'footer',
        'button',
        'input',
        'textarea',
        'select',
        '[role="navigation"]',
        '[role="menu"]',
        '[role="menubar"]',
        '[role="toolbar"]',
        '[role="tablist"]',
        '[contenteditable="true"]',
        '.app-glass-header',
        '.app-glass-bottom-nav',
        '.sidebar-nav',
        '.settings-modal',
        '.auth-modal',
        '.edit-modal',
        '.command-palette',
        '.no-leitner-trigger',
        '.no-text-select-ai',
        '.leitner-selection-bubble',
        '.leitner-selection-bar',
        '.status-bar',
        '.badge',
      ].join(', ')
    );

    if (isExcluded) {
      setCoords(null);
      setSelectedText('');
      setDetectedContext({});
      return;
    }

    // 2. STRICT INCLUSIONS: Selection MUST be within an educational/clinical study text container
    const isStudyContent = targetElement.closest(
      [
        'article',
        'p',
        'li',
        'td',
        'th',
        'dd',
        'dt',
        'blockquote',
        '.prose',
        '.study-card',
        '.shelf-drug-card',
        '.formatted-clinical-text',
        '.clinical-content',
        '.study-text',
        '.study-content',
        '[data-module]',
        '[data-topic]',
        '[data-category]',
        '[data-clinical-topic]',
        '[data-study-content]',
        '.app-card',
        '.triage-chat-feed',
        '.scenario-card',
        '.protocol-content',
        '.matrix-content',
        '.handbook-viewer',
        '.leitner-card-content',
      ].join(', ')
    );

    if (!isStudyContent) {
      setCoords(null);
      setSelectedText('');
      setDetectedContext({});
      return;
    }

    // 3. Extract contextual module, category, and clinical topic
    let foundModule: 1 | 2 | 3 | 4 | undefined = undefined;
    let foundCategory: string | undefined = undefined;
    let foundTopic: string | undefined = undefined;

    const contextualEl = targetElement.closest(
      '[data-module], [data-topic], [data-category], [data-clinical-topic], article, .app-card'
    );

    if (contextualEl) {
      const modAttr = contextualEl.getAttribute('data-module');
      if (modAttr) {
        const modNum = parseInt(modAttr, 10);
        if (modNum >= 1 && modNum <= 4) {
          foundModule = modNum as 1 | 2 | 3 | 4;
        }
      }

      foundCategory =
        contextualEl.getAttribute('data-category') ||
        contextualEl.getAttribute('data-clinical-topic') ||
        undefined;

      foundTopic = contextualEl.getAttribute('data-topic') || undefined;
    }

    setDetectedContext({
      module: foundModule,
      category: foundCategory,
      topic: foundTopic,
    });

    setSelectedText(text);

    // 4. Calculate floating bubble coordinates
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const bubbleWidth = 260;
    const bubbleHeight = 44;
    const padding = 12;

    let top = rect.top - bubbleHeight - 10;
    let left = rect.left + rect.width / 2 - bubbleWidth / 2;

    if (top < padding) {
      top = rect.bottom + 10;
    }

    if (left < padding) {
      left = padding;
    } else if (left + bubbleWidth > window.innerWidth - padding) {
      left = window.innerWidth - bubbleWidth - padding;
    }

    setCoords({ top, left });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelectionDebounced = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        inspectSelection();
      }, 100);
    };

    const handlePointerUp = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        inspectSelection();
      }, 50);
    };

    const handleDocumentMouseDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        !target?.closest('.leitner-selection-bubble') &&
        !target?.closest('.leitner-selection-bar')
      ) {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed) {
          setCoords(null);
          setSelectedText('');
          setDetectedContext({});
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionDebounced);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('touchstart', handleDocumentMouseDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelectionDebounced);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('touchstart', handleDocumentMouseDown);
    };
  }, [inspectSelection]);

  const handleLaunchModal = (tab: 'ai' | 'manual') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedText) return;

    onOpenLeitnerModal(
      selectedText,
      detectedContext.module || 2,
      detectedContext.category,
      detectedContext.topic,
      tab
    );
    setCoords(null);
    setSelectedText('');
    setDetectedContext({});
  };

  const handleCopyText = (e: React.MouseEvent) => {
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
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  if (!selectedText) return null;

  const wordCount = selectedText.split(/\s+/).filter(Boolean).length;
  const previewSnippet =
    selectedText.length > 50 ? `${selectedText.substring(0, 50)}...` : selectedText;

  return (
    <>
      {/* 1. Desktop Smart Floating Pill (Rendered directly near selected text) */}
      {coords && (
        <div
          ref={triggerRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="leitner-selection-bubble animate-in fade-in zoom-in-95 duration-150 hidden md:block"
        >
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/95 border border-purple-500/60 shadow-2xl backdrop-blur-xl ring-1 ring-purple-400/20">
            {/* AI Generate Button */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLaunchModal('ai')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{isFa ? 'تولید هوشمند (AI)' : 'AI Generate'}</span>
            </button>

            {/* Manual Create Button */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLaunchModal('manual')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs shadow-md hover:scale-[1.02] active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              <span>{isFa ? '✍️ ثبت دستی' : '✍️ Manual'}</span>
            </button>

            <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCopyText}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isFa ? 'کپی متن انتخابی' : 'Copy selected text'}
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
              title={isFa ? 'بستن' : 'Dismiss'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Responsive Mobile & Touch Dock (Docked cleanly above mobile bottom navigation bar) */}
      <div
        style={{ zIndex: 99998 }}
        className="leitner-selection-bar md:hidden fixed bottom-20 inset-x-3 max-w-lg mx-auto animate-in slide-in-from-bottom-4 fade-in duration-200"
      >
        <div className="p-3 rounded-3xl bg-slate-900/95 border border-purple-500/60 shadow-2xl backdrop-blur-2xl flex flex-col gap-2.5 ring-1 ring-purple-400/25">
          {/* Header Row: Word Count & Snippet Preview */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 text-purple-300">
              <GraduationCap className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-bold truncate">
                {isFa ? `${wordCount} کلمه از متن درسی:` : `${wordCount} study words:`}
              </span>
              <span className="text-[11px] text-slate-300 truncate opacity-90">
                «{previewSnippet}»
              </span>
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
              title={isFa ? 'بستن' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLaunchModal('ai')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-sky-600 text-white font-bold text-xs shadow-lg hover:shadow-purple-500/40 active:scale-98 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{isFa ? 'تولید هوش مصنوعی' : 'AI Generate'}</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLaunchModal('manual')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md active:scale-98 transition cursor-pointer"
            >
              <span>{isFa ? '✍️ ثبت دستی' : '✍️ Manual'}</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCopyText}
              className="p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer shrink-0"
              title={isFa ? 'کپی متن' : 'Copy'}
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
