export type Swipe = {
  x: number;
  y: number;
  time: number;
  mode: "open" | "close" | "navigate";
};
export function swipeAction(
  start: Swipe,
  x: number,
  y: number,
  time: number,
): "open" | "close" | "next" | "previous" | null {
  const dx = x - start.x,
    dy = y - start.y;
  if (
    time - start.time > 800 ||
    Math.abs(dx) < 64 ||
    Math.abs(dx) < Math.abs(dy) * 1.8
  )
    return null;
  if (start.mode === "open") return dx < 0 ? "open" : null;
  if (start.mode === "close") return dx > 0 ? "close" : null;
  return dx < 0 ? "next" : "previous";
}
