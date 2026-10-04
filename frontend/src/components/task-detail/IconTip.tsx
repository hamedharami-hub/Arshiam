import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IconTipProps {
  /** Short label shown on hover/focus (desktop) or long-press (touch). */
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  testid?: string;
  className?: string;
  children: ReactNode;
  pressed?: boolean;
  expanded?: boolean;
}

/**
 * Icon-only button with a quiet tooltip. On touch devices a long-press reveals the same label
 * (and swallows the click that follows it), so icons stay self-explanatory without text rows.
 */
export function IconTip({ label, onClick, active, disabled, testid, className = "", children, pressed, expanded }: IconTipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const hide = useRef<number | null>(null);
  const longPressed = useRef(false);

  const clearTimers = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => { clearTimers(); if (hide.current) window.clearTimeout(hide.current); }, []);

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            aria-expanded={expanded}
            data-testid={testid}
            data-active={active ? "true" : "false"}
            onPointerDown={(e) => {
              if (e.pointerType !== "touch") return;
              longPressed.current = false;
              clearTimers();
              timer.current = window.setTimeout(() => {
                longPressed.current = true;
                setOpen(true);
                if (hide.current) window.clearTimeout(hide.current);
                hide.current = window.setTimeout(() => setOpen(false), 1600);
              }, 420);
            }}
            onPointerUp={clearTimers}
            onPointerLeave={clearTimers}
            onPointerCancel={clearTimers}
            onContextMenu={(e) => { if (longPressed.current) e.preventDefault(); }}
            onClick={(e) => {
              if (longPressed.current) { longPressed.current = false; e.preventDefault(); return; }
              onClick?.();
            }}
            className={`when-icon-btn ${active ? "when-icon-btn--active" : ""} ${className}`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="px-2 py-1 text-[11px]">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
