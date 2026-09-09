'use client';

import React from 'react';

// Formatted clinical text component that parses markdown **bold** and highlights clinical terms
export const FormattedClinicalText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={`${className} leading-relaxed select-text cursor-text`}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          return (
            <strong
              key={index}
              className="font-bold text-sky-400 dark:text-sky-300 inline select-text"
            >
              {inner}
            </strong>
          );
        }
        return <span key={index} className="select-text">{part}</span>;
      })}
    </span>
  );
};
