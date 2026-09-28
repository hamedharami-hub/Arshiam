import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Minimum height in px (default 64). */
  minHeight?: number;
  /** Maximum height in px before it starts to scroll (default 400). */
  maxHeight?: number;
}

/**
 * Auto-resizing textarea. Grows with content up to maxHeight, then scrolls.
 * Defaults to dir="auto" for proper bilingual (Persian + English) handling.
 */
const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minHeight = 64, maxHeight = 400, value, defaultValue, onChange, style, dir, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [minHeight, maxHeight]);

    React.useEffect(() => { resize(); }, [resize, value, defaultValue]);
    React.useEffect(() => {
      // Resize after fonts/layout settle
      const id = requestAnimationFrame(resize);
      return () => cancelAnimationFrame(id);
    }, [resize]);

    return (
      <textarea
        ref={innerRef}
        dir={dir ?? "auto"}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => { onChange?.(e); resize(); }}
        onInput={resize}
        style={{ minHeight, maxHeight, ...style, unicodeBidi: "plaintext" as any }}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-[height]",
          className,
        )}
        {...props}
      />
    );
  },
);
AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };
