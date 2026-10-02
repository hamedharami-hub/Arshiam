import { useRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { useMascotMode } from "@/lib/mascot";

const SPARKS = [
  [782, 258, 5], [918, 254, 4], [965, 353, 6], [784, 406, 4],
  [931, 443, 4], [731, 329, 3], [885, 201, 3],
];

/** The artwork and its light move together; pointer movement adds a gentle tilt. */
export function AngelLineArt({ className }: { className?: string }) {
  const mode = useMascotMode();
  const scene = useRef<HTMLSpanElement>(null);
  const resetTilt = () => {
    scene.current?.style.setProperty("--angel-tilt-x", "0deg");
    scene.current?.style.setProperty("--angel-tilt-y", "0deg");
  };
  const followPointer = (event: PointerEvent<HTMLSpanElement>) => {
    if (mode !== "full" || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    scene.current?.style.setProperty("--angel-tilt-x", `${-y * 3}deg`);
    scene.current?.style.setProperty("--angel-tilt-y", `${x * 4}deg`);
  };
  return (
    <span
      className={cn("angel-stage", className)}
      role="img"
      aria-label="فرشته‌ای مهربان با بال‌های قلبی که به ستاره‌ای درخشان دست می‌زند"
      data-testid="auth-angel-art"
      data-mode={mode}
      onPointerMove={followPointer}
      onPointerLeave={resetTilt}
    >
      <span ref={scene} className="angel-scene">
        <span className="angel-float-group">
          <span className="angel-aura" aria-hidden="true" />
          <img className="angel-illustration" src="/images/angel-cute.png" alt="" width={1312} height={1199} draggable={false} />
          <svg className="angel-light-layer" viewBox="0 0 1312 1199" aria-hidden="true" focusable="false">
            <g transform="translate(0 -34)">
            <circle className="angel-light-ring" cx="860" cy="338" r="76" />
            <path className="angel-core-light" d="M860 301 Q866 332 891 338 Q866 344 860 375 Q854 344 829 338 Q854 332 860 301Z" />
            {SPARKS.map(([x, y, radius], index) => (
              <g key={index} className="angel-stardust" style={{ animationDelay: `${index * -.8}s` }}>
                <path d={`M${x} ${y - radius * 2} Q${x + radius / 2} ${y - radius / 2} ${x + radius * 2} ${y} Q${x + radius / 2} ${y + radius / 2} ${x} ${y + radius * 2} Q${x - radius / 2} ${y + radius / 2} ${x - radius * 2} ${y} Q${x - radius / 2} ${y - radius / 2} ${x} ${y - radius * 2}Z`} />
              </g>
            ))}
            </g>
          </svg>
        </span>
      </span>
    </span>
  );
}
