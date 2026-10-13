import { useEffect, useRef } from "react";

const slots = new Map<string, { element: HTMLElement; order: number }>();
function layoutSlots() {
  const nav = document.querySelector<HTMLElement>('[data-bottom-bar="true"]');
  const viewport = window.visualViewport;
  const keyboardInset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  const navRect = nav?.getBoundingClientRect();
  const navTop = navRect && navRect.height > 0 ? navRect.top : undefined;
  let bottom = Math.max(keyboardInset + 16, navTop != null ? window.innerHeight - navTop + 12 : 16);
  const ordered = [...slots.values()].sort((a, b) => a.order - b.order);
  const budget = Math.max(44, ((viewport?.height ?? window.innerHeight) - (bottom - keyboardInset) - 96 - ordered.length * 12) / Math.max(1, ordered.length));
  for (const { element } of ordered) {
    element.style.maxHeight = `${budget}px`;
    element.style.overflowY = "auto";
  }
  const heights = ordered.map(({ element }) => element.getBoundingClientRect().height);
  for (const [{ element }, height] of ordered.map((slot, index) => [slot, heights[index]] as const)) {
    element.style.setProperty("--overlay-bottom", `${bottom}px`);
    element.style.bottom = `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
    bottom += height + 12;
  }
  document.documentElement.style.setProperty("--floating-overlay-space", `${slots.size ? bottom : 0}px`);
}

/** Shared measured stack: focus, sync, then optional install. No overlapping fixed offsets. */
export function useOverlaySlot(id: string, order: number, visible: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!visible || !element) return;
    slots.set(id, { element, order });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layoutSlots) : undefined;
    observer?.observe(element);
    const nav = document.querySelector<HTMLElement>('[data-bottom-bar="true"]');
    if (nav) observer?.observe(nav);
    window.addEventListener("resize", layoutSlots);
    window.visualViewport?.addEventListener("resize", layoutSlots);
    window.visualViewport?.addEventListener("scroll", layoutSlots);
    const mutations = new MutationObserver(records => {
      const navigationChanged = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof HTMLElement && (node.matches('[data-bottom-bar="true"]') || node.querySelector('[data-bottom-bar="true"]'))));
      if (navigationChanged) layoutSlots();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    layoutSlots();
    return () => { slots.delete(id); observer?.disconnect(); mutations.disconnect(); window.removeEventListener("resize", layoutSlots); window.visualViewport?.removeEventListener("resize", layoutSlots); window.visualViewport?.removeEventListener("scroll", layoutSlots); layoutSlots(); };
  }, [id, order, visible]);
  return ref;
}
