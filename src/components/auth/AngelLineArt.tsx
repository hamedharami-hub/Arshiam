import { cn } from "@/lib/utils";

/** Friendly heart-wing angel. The illustration floats gently while its star twinkles. */
export function AngelLineArt({ className }: { className?: string }) {
  return (
    <span
      className={cn("angel-stage", className)}
      role="img"
      aria-label="فرشته‌ای مهربان با بال‌های قلبی که به ستاره‌ای درخشان دست می‌زند"
      data-testid="auth-angel-art"
    >
      <img className="angel-illustration" src="/images/angel-cute.png" alt="" />
      <span className="angel-star-sparkle" aria-hidden="true">✦</span>
    </span>
  );
}
