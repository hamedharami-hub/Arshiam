'use client';

import React from 'react';

/**
 * Unicode Control Characters & Bidi Handling
 * Auto-isolates English medical terms, acronyms, and parenthesized phrases inside RTL Persian text.
 */

// Regex patterns to detect parenthesized English phrases or Latin alphanumeric words
const MIXED_BIDI_REGEX = /(\((?:[a-zA-Z0-9\s_\-\/\.,:;%&+]+)\)|\[(?:[a-zA-Z0-9\s_\-\/\.,:;%&+]+)\]|\b[a-zA-Z0-9][a-zA-Z0-9\-_./%]*\b)/g;

/**
 * formatBidiText:
 * Parses a string and automatically wraps English words, acronyms, and parenthesized English terms
 * inside <bdi dir="ltr">...</bdi> so that the surrounding Persian (RTL) text and punctuation
 * maintain 100% natural, correct reading order without jumping or reversed parentheses.
 */
export function formatBidiText(text?: string | null, isPersianContext = true): React.ReactNode {
  if (!text) return '';

  // Split by markdown bold first if present: **bold text**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);

  return boldParts.map((boldChunk, bIdx) => {
    if (boldChunk.startsWith('**') && boldChunk.endsWith('**') && boldChunk.length > 4) {
      const inner = boldChunk.slice(2, -2);
      return (
        <strong key={`b-${bIdx}`} className="font-extrabold text-amber-400 dark:text-amber-300">
          {renderFormattedBidiChunk(inner, isPersianContext)}
        </strong>
      );
    }
    return renderFormattedBidiChunk(boldChunk, isPersianContext, bIdx);
  });
}

function renderFormattedBidiChunk(text: string, isPersianContext: boolean, baseKey: number | string = 0): React.ReactNode {
  if (!isPersianContext || !text) return text;

  // Check if text has both Persian and English characters
  const hasFa = /[\u0600-\u06FF]/.test(text);
  const hasEn = /[a-zA-Z]/.test(text);

  // If pure English or pure Persian without Latin characters, return as is
  if (!hasFa || !hasEn) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(MIXED_BIDI_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    // Push preceding Persian text
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    const matchedStr = match[0];

    // If the matched string contains English letters
    if (/[a-zA-Z]/.test(matchedStr)) {
      parts.push(
        <bdi
          key={`bidi-${baseKey}-${matchStart}`}
          dir="ltr"
          className="inline-block font-sans font-medium [unicode-bidi:isolate] mx-0.5 select-text"
        >
          {matchedStr}
        </bdi>
      );
    } else {
      parts.push(matchedStr);
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * BidiText:
 * High-performance UI component for rendering bidirectional clinical and pharmacy text.
 */
export const BidiText: React.FC<{
  text?: string | null;
  dir?: 'rtl' | 'ltr' | 'auto';
  className?: string;
  as?: 'div' | 'p' | 'span';
}> = ({ text, dir, className = '', as: Component = 'span' }) => {
  if (!text) return null;

  const enCharCount = (text.match(/[a-zA-Z]/g) || []).length;
  const faCharCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const detectedDir = dir || (enCharCount > faCharCount ? 'ltr' : 'rtl');
  const isPersian = detectedDir === 'rtl';

  return (
    <Component
      dir={detectedDir}
      className={`[unicode-bidi:isolate] ${isPersian ? 'text-right leading-relaxed font-normal' : 'text-left font-sans'} ${className}`}
    >
      {formatBidiText(text, isPersian)}
    </Component>
  );
};
