'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { formatBidiText } from '@/lib/bidiFormatter';

export interface FormattedClinicalTextProps {
  text: string;
  language?: Language;
  className?: string;
}

/**
 * FormattedClinicalText:
 * Ensures clean LTR for English, RTL for Persian, and breaks down structured points (1), 2), a), b), etc.)
 * into beautifully readable bullet cards with bold text support, emoji headers, and bidirectional term isolation.
 */
export const FormattedClinicalText: React.FC<FormattedClinicalTextProps> = ({
  text,
  language,
  className = '',
}) => {
  if (!text) return null;

  // Detect if text is mostly English or Persian
  const enCharCount = (text.match(/[a-zA-Z]/g) || []).length;
  const faCharCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const isEn = enCharCount > faCharCount;
  const dir = isEn ? 'ltr' : 'rtl';
  const textAlign = isEn ? 'text-left' : 'text-right';

  // Helper to render bold markdown **text** and isolate BiDi terms
  const renderInlineFormatted = (str: string) => {
    return formatBidiText(str, !isEn);
  };

  // Check if text contains numbered items like "1)", "2)", "3)" or "1.", "2." or "۱)", "۲)"
  const numberedPattern = /(\b(?:[1-9]|۱|۲|۳|۴|۵)[\).\:]\s+)/g;
  const parts = text.split(numberedPattern);

  if (parts.length > 2) {
    const intro = parts[0].trim();
    const items: { number: string; content: string }[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      items.push({
        number: parts[i].trim(),
        content: (parts[i + 1] || '').trim(),
      });
    }

    return (
      <div className={`space-y-2 ${textAlign} ${className}`} dir={dir}>
        {intro && (
          <div className="font-bold app-text text-xs leading-relaxed border-b app-border pb-1.5 mb-1.5 text-sky-400">
            {renderInlineFormatted(intro)}
          </div>
        )}
        <div className="space-y-2">
          {items.map((item, idx) => {
            const colonIdx = item.content.indexOf(':');
            const hasTitle = colonIdx > 0 && colonIdx < 60;
            const title = hasTitle ? item.content.slice(0, colonIdx) : null;
            const body = hasTitle ? item.content.slice(colonIdx + 1).trim() : item.content;

            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 text-xs leading-relaxed shadow-sm transition"
              >
                <span className="shrink-0 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {item.number}
                </span>
                <div className="flex-1 space-y-0.5">
                  {title && (
                    <span className="font-bold text-amber-400 block text-[11.5px] leading-snug">
                      {renderInlineFormatted(title)}:
                    </span>
                  )}
                  <p className="app-text font-normal text-slate-200 leading-relaxed">
                    {renderInlineFormatted(body)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard paragraph text with proper direction and bold markdown support
  return (
    <div className={`${textAlign} ${className}`} dir={dir}>
      <p className="leading-relaxed font-normal whitespace-pre-line text-xs app-text">
        {renderInlineFormatted(text)}
      </p>
    </div>
  );
};
