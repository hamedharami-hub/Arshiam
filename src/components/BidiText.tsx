import React from "react";

/**
 * Renders text with proper bidirectional handling for mixed Persian/English.
 * Also parses lightweight markdown inline: **bold**, __bold__, *italic*, _italic_, `code`, ~~strike~~.
 * Use everywhere we display user text that may mix RTL/LTR.
 */
export function BidiText({
  text,
  as: Tag = "span",
  className,
  parseMarkdown = true,
}: {
  text?: string | null;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  parseMarkdown?: boolean;
}) {
  const content = text ?? "";
  const nodes = parseMarkdown ? parseInlineMarkdown(content) : content;
  return (
    // @ts-ignore - generic tag
    <Tag
      dir="auto"
      className={className}
      style={{ unicodeBidi: "plaintext" }}
    >
      {nodes}
    </Tag>
  );
}

/**
 * Minimal inline markdown parser → React nodes.
 * Handles ** **, __ __, * *, _ _, ` `, ~~ ~~ without pulling a full MD lib.
 */
export function parseInlineMarkdown(input: string): React.ReactNode[] {
  if (!input) return [];
  // Order matters: bold (**, __) before italic (*, _)
  const patterns: { re: RegExp; render: (m: string) => React.ReactNode }[] = [
    { re: /\*\*([^*\n]+)\*\*/, render: (m) => <strong>{m}</strong> },
    { re: /__([^_\n]+)__/, render: (m) => <strong>{m}</strong> },
    { re: /~~([^~\n]+)~~/, render: (m) => <s>{m}</s> },
    { re: /`([^`\n]+)`/, render: (m) => <code className="px-1 rounded bg-muted text-[0.9em]">{m}</code> },
    { re: /(?<![*\w])\*([^*\n]+)\*(?!\*)/, render: (m) => <em>{m}</em> },
    { re: /(?<![_\w])_([^_\n]+)_(?!_)/, render: (m) => <em>{m}</em> },
  ];

  // Recursive walker
  const walk = (s: string, key = 0): React.ReactNode[] => {
    for (const { re, render } of patterns) {
      const match = s.match(re);
      if (match && match.index !== undefined) {
        const before = s.slice(0, match.index);
        const after = s.slice(match.index + match[0].length);
        return [
          ...walk(before, key * 3 + 1),
          <React.Fragment key={`m-${key}`}>{render(match[1])}</React.Fragment>,
          ...walk(after, key * 3 + 2),
        ];
      }
    }
    return s ? [s] : [];
  };

  return walk(input);
}
