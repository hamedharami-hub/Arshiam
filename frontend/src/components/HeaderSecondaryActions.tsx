import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Keeps portal hosts mounted while collapsing secondary mobile actions. */
export function HeaderSecondaryActions({ children, isEn, routeKey }: { children: ReactNode; isEn: boolean; routeKey?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [routeKey]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node) && !(event.target as HTMLElement).closest?.('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]')) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')?.focus());
    const focusOutside = (event: FocusEvent) => {
      if (root.current && !root.current.contains(event.target as Node) && !(event.target as HTMLElement).closest?.('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]')) setOpen(false);
    };
    document.addEventListener("focusin", focusOutside);
    // Page actions can be React portals owned by the page, not this wrapper.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !root.current?.contains(target) || target.closest('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]')) return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("keydown", escape);
    const resize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", focusOutside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", resize); };
  }, [open]);
  return <div ref={root} className="relative shrink-0" onKeyDown={event => {
    if (event.key === "Escape" && open && !event.defaultPrevented) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <Button ref={trigger} size="icon" variant="ghost" className="h-11 w-11 md:hidden" aria-label={isEn ? "More page actions" : "اقدام‌های بیشتر صفحه"} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button>
    <div ref={panel} id={panelId} role="group" aria-label={isEn ? "Page tools" : "ابزارهای صفحه"} className={`${open ? "flex" : "hidden"} absolute end-0 top-full z-50 mt-1 w-max max-h-[70dvh] max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 overflow-y-auto overscroll-contain rounded-xl border bg-card p-2 shadow-lg md:static md:mt-0 md:flex md:max-w-none md:flex-nowrap md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
      {children}
    </div>
  </div>;
}
