import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { detectSwipe, getGestureSettings, REVIEW_SETTINGS_EVENT, type GestureSettings, type SwipeDir } from "@/lib/reviewSettings";
import type { LeitnerRating } from "@/lib/leitnerTypes";

const RATING_LABEL: Record<LeitnerRating, { fa: string; en: string; cls: string }> = {
  1: { fa: "دوباره", en: "Again", cls: "bg-rose-500 text-white" },
  2: { fa: "سخت", en: "Hard", cls: "bg-amber-500 text-white" },
  3: { fa: "خوب", en: "Good", cls: "bg-emerald-500 text-white" },
  4: { fa: "آسان", en: "Easy", cls: "bg-sky-500 text-white" },
};

const THROW: Record<SwipeDir, { x: number; y: number; rotate: number }> = {
  right: { x: 700, y: 40, rotate: 18 },
  left: { x: -700, y: 40, rotate: -18 },
  up: { x: 0, y: -800, rotate: 0 },
  down: { x: 0, y: 800, rotate: 0 },
};

/**
 * Review card with swipe-to-rate (after the answer is revealed), double-tap flip,
 * long-press edit, page-flip + throw animations. Buttons elsewhere stay available;
 * reduced-motion users get simple fades.
 */
export function ReviewSwipeCard({ flipped, onFlip, onRate, onEdit, isEn, className, children, testId = "flip-card" }: {
  flipped: boolean;
  onFlip: () => void;
  onRate: (r: LeitnerRating) => void;
  onEdit?: () => void;
  isEn: boolean;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  const reduce = useReducedMotion();
  const [g, setG] = useState<GestureSettings>(getGestureSettings);
  useEffect(() => {
    const on = () => setG(getGestureSettings());
    window.addEventListener(REVIEW_SETTINGS_EVENT, on);
    return () => window.removeEventListener(REVIEW_SETTINGS_EVENT, on);
  }, []);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], reduce ? [0, 0] : [-12, 12]);
  const [hint, setHint] = useState<LeitnerRating | null>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const dragging = useRef(false);

  useEffect(() => () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, []);

  const canSwipe = g.enabled && flipped;

  const ratingFor = (dir: SwipeDir | null) => (dir ? g.swipe[dir] : null);

  const clearPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const onDrag = (_: unknown, info: PanInfo) => {
    dragging.current = true;
    clearPress(); // a slow drag must never turn into a long-press edit
    const r = ratingFor(detectSwipe(info.offset.x, info.offset.y));
    if (r !== hint) {
      setHint(r);
      if (r) haptic("selection");
    }
  };

  const onDragEnd = async (_: unknown, info: PanInfo) => {
    const dir = detectSwipe(info.offset.x, info.offset.y, info.velocity.x, info.velocity.y);
    const r = ratingFor(dir);
    setHint(null);
    window.setTimeout(() => { dragging.current = false; }, 50);
    if (!dir || !r) {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 500, damping: 30 });
      return;
    }
    haptic(r === 1 ? "warning" : "success");
    if (!reduce) {
      const t = THROW[dir];
      await Promise.all([animate(x, t.x, { duration: 0.25 }), animate(y, t.y, { duration: 0.25 })]);
    }
    onRate(r);
    x.set(0);
    y.set(0);
  };

  const handlePointerDown = () => {
    longPressed.current = false;
    if (!g.enabled || !g.longPressEdit || !onEdit) return;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      haptic("medium");
      onEdit();
    }, 550);
  };

  const handleClick = () => {
    if (longPressed.current || dragging.current) return;
    const now = Date.now();
    if (g.enabled && g.doubleTapFlip && now - lastTap.current < 280) {
      // second tap of a double-tap: the first tap's pending flip becomes the double-tap flip
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    onFlip();
    haptic("light");
  };

  return (
    <div className="relative" style={{ perspective: 1200 }}>
      <motion.div
        data-testid={testId}
        role="button"
        tabIndex={0}
        aria-label={flipped ? (isEn ? "Answer side" : "روی پاسخ") : (isEn ? "Question side — tap to flip" : "روی پرسش — برای برگرداندن لمس کن")}
        drag={canSwipe}
        dragElastic={0.6}
        dragMomentum={false}
        style={{ x, y, rotate, touchAction: canSwipe ? "none" : "pan-y" }}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onFlip(); } }}
        className={className}
      >
        <motion.div
          key={flipped ? "back" : "front"}
          initial={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0.4 }}
          animate={reduce ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
          transition={{ duration: reduce ? 0.12 : 0.28, ease: "easeOut" }}
          className="w-full flex flex-col items-center justify-center"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
        >
          {children}
        </motion.div>
        {hint && (
          <span className={`pointer-events-none absolute top-3 start-3 rounded-full px-3 py-1 text-xs font-bold shadow ${RATING_LABEL[hint].cls}`} data-testid="swipe-rating-hint">
            {isEn ? RATING_LABEL[hint].en : RATING_LABEL[hint].fa}
          </span>
        )}
      </motion.div>
      {canSwipe && (
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground" data-testid="swipe-help">
          {isEn ? "Swipe → Good · ← Again · ↑ Easy · ↓ Hard (or use the buttons)" : "کشیدن ← دوباره · → خوب · ↑ آسان · ↓ سخت (یا از دکمه‌ها استفاده کن)"}
        </p>
      )}
    </div>
  );
}
