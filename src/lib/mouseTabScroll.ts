/** Mouse drag/wheel support for short horizontal tab and chip rows. Touch stays native. */
export function installMouseTabScroll(root: Document = document): () => void {
  let drag: { row: HTMLElement; x: number; left: number; moved: boolean } | null = null;
  let suppressClickUntil = 0;
  const rowAt = (target: EventTarget | null) => {
    if (!(target instanceof Element) || target.closest('input, textarea, [contenteditable="true"], [data-drag-handle]')) return null;
    const row = target.closest<HTMLElement>('[role="tablist"], .overflow-x-auto');
    return row && row.scrollWidth > row.clientWidth && row.clientHeight <= 120 && row.querySelector('button, [role="tab"]') ? row : null;
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const row = rowAt(event.target);
    if (row) drag = { row, x: event.clientX, left: row.scrollLeft, moved: false };
  };
  const move = (event: PointerEvent) => {
    if (!drag) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 6) return;
    drag.moved = true;
    event.preventDefault();
    drag.row.scrollLeft = drag.left - delta;
  };
  const end = () => {
    if (drag?.moved) suppressClickUntil = Date.now() + 150;
    drag = null;
  };
  const click = (event: MouseEvent) => {
    if (Date.now() < suppressClickUntil && rowAt(event.target)) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressClickUntil = 0;
    }
  };
  const wheel = (event: WheelEvent) => {
    const row = rowAt(event.target);
    if (!row || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const before = row.scrollLeft;
    const direction = getComputedStyle(row).direction === "rtl" ? -1 : 1;
    row.scrollLeft += direction * event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? row.clientWidth : 1);
    if (row.scrollLeft !== before) event.preventDefault();
  };
  root.addEventListener("pointerdown", down);
  root.addEventListener("pointermove", move, { passive: false });
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  root.addEventListener("click", click, true);
  root.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("blur", end);
  return () => {
    root.removeEventListener("pointerdown", down); root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerup", end); root.removeEventListener("pointercancel", end);
    root.removeEventListener("click", click, true); root.removeEventListener("wheel", wheel);
    window.removeEventListener("blur", end);
  };
}
