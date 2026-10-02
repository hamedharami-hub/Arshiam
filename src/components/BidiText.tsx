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

interface PatternRule {
  re: RegExp;
  render: (m: RegExpMatchArray) => React.ReactNode;
}

/**
 * Minimal inline markdown parser → React nodes.
 * Handles ** **, __ __, == ==, * *, _ _, ` `, ~~ ~~ without pulling a full MD lib.
 */
function parseInlineMarkdown(input: string): React.ReactNode[] {
  if (!input) return [];

  const patterns: PatternRule[] = [
    // Triple asterisk: bold italic
    { re: /\*\*\*([^*\n]+?)\*\*\*/, render: (m) => <strong className="font-extrabold text-foreground"><em>{m[1]}</em></strong> },
    // Double asterisk or double underscore: extra bold
    { re: /\*\*([^*\n]+?)\*\*/, render: (m) => <strong className="font-extrabold text-foreground">{m[1]}</strong> },
    { re: /__([^_\n]+?)__/, render: (m) => <strong className="font-extrabold text-foreground">{m[1]}</strong> },
    // Highlight
    { re: /==([^=\n]+?)==/, render: (m) => <mark className="px-1 py-0.5 rounded bg-amber-400/30 dark:bg-amber-400/20 text-foreground font-semibold">{m[1]}</mark> },
    // Strikethrough
    { re: /~~([^~\n]+?)~~/, render: (m) => <s className="line-through opacity-75">{m[1]}</s> },
    // Inline code
    { re: /`([^`\n]+?)`/, render: (m) => <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.88em] border border-border/50 ltr inline-block">{m[1]}</code> },
    // Single asterisk or underscore: italic
    { re: /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/, render: (m) => <em className="italic">{m[1]}</em> },
    { re: /(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/, render: (m) => <em className="italic">{m[1]}</em> },
  ];

  // Recursive walker
  const walk = (s: string, key = 0): React.ReactNode[] => {
    for (const rule of patterns) {
      const match = s.match(rule.re);
      if (match && match.index !== undefined) {
        const before = s.slice(0, match.index);
        const after = s.slice(match.index + match[0].length);
        return [
          ...walk(before, key * 3 + 1),
          <React.Fragment key={`m-${key}`}>{rule.render(match)}</React.Fragment>,
          ...walk(after, key * 3 + 2),
        ];
      }
    }
    return s ? [s] : [];
  };

  return walk(input);
}
