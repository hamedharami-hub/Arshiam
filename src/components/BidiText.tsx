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
function parseInlineMarkdown(input: string): React.ReactNode[] {
  if (!input) return [];

  // Order matters: triple asterisk before double, double before single
  const patterns: { re: RegExp; render: (m: string) => React.ReactNode }[] = [
    { re: /\*\*\*([^*\n]+?)\*\*\*/, render: (m) => <strong><em>{m}</em></strong> },
    { re: /\*\*([^*\n]+?)\*\*/, render: (m) => <strong className="font-bold text-foreground">{m}</strong> },
    { re: /__([^_\n]+?)__/, render: (m) => <strong className="font-bold text-foreground">{m}</strong> },
    { re: /==([^=\n]+?)==/, render: (m) => <mark className="px-1 py-0.5 rounded bg-amber-400/30 dark:bg-amber-400/20 text-foreground font-medium">{m}</mark> },
    { re: /~~([^~\n]+?)~~/, render: (m) => <s className="line-through opacity-75">{m}</s> },
    { re: /`([^`\n]+?)`/, render: (m) => <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.88em] border border-border/50 ltr inline-block">{m}</code> },
    { re: /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/, render: (m) => <em className="italic">{m}</em> },
    { re: /(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/, render: (m) => <em className="italic">{m}</em> },
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
