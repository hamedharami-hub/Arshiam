import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useBilingual } from "@/hooks/useBilingual";
import { usePinchZoom } from "@/lib/usePinchZoom";

/** Adds lazy loading and a text alternative to every image in sanitized lesson HTML. */
export function enhanceImagesHtml(html: string): string {
  if (!html.includes("<img")) return html;
  return html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    let next = attrs;
    if (!/\sloading=/i.test(next)) next += ' loading="lazy" decoding="async"';
    if (!/\salt=/i.test(next)) next += ' alt=""';
    return `<img${next}>`;
  });
}

/** Replaces a failed image with a standard placeholder that keeps its alt text. */
export function replaceBrokenImage(img: HTMLImageElement, label: string): void {
  const placeholder = document.createElement("span");
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", img.alt ? `${label}: ${img.alt}` : label);
  placeholder.setAttribute("data-testid", "image-placeholder");
  placeholder.className = "knowledge-image-placeholder";
  placeholder.textContent = img.alt ? `${label} — ${img.alt}` : label;
  img.replaceWith(placeholder);
}

export function PharmacyImageViewer({ image, onClose }: { image: { src: string; alt: string } | null; onClose: () => void }) {
  const { T } = useBilingual();
  const { scale, setScale, handlers } = usePinchZoom({ min: 1, max: 4 });
  const [drag, setDrag] = useState(false);
  const step = (delta: number) => setScale(Math.max(1, Math.min(4, +(scale + delta).toFixed(2))));
  return (
    <Dialog open={!!image} onOpenChange={open => { if (!open) { setScale(1); onClose(); } }}>
      <DialogContent className="max-w-4xl" data-testid="image-viewer">
        <DialogTitle className="text-sm">{image?.alt || T("تصویر", "Image")}</DialogTitle>
        <DialogDescription className="sr-only">{T("نمایش بزرگ تصویر با زوم", "Enlarged image with zoom")}</DialogDescription>
        <div className="max-h-[70vh] overflow-auto rounded border bg-muted/30" style={{ touchAction: scale > 1 || drag ? "pan-x pan-y" : "pan-x pan-y pinch-zoom" }} {...handlers} onPointerDown={() => setDrag(true)} onPointerUp={() => setDrag(false)}>
          {image && <img src={image.src} alt={image.alt} style={{ width: `${scale * 100}%`, maxWidth: "none" }} className="block mx-auto" data-testid="image-viewer-img" />}
        </div>
        <div className="flex items-center justify-center gap-2" role="group" aria-label={T("زوم", "Zoom")}>
          <Button type="button" size="icon" variant="outline" onClick={() => step(-0.5)} disabled={scale <= 1} aria-label={T("کوچک‌نمایی", "Zoom out")} data-testid="image-zoom-out"><Minus className="h-4 w-4" aria-hidden="true" /></Button>
          <span className="w-14 text-center text-sm tabular-nums" data-testid="image-zoom-level" aria-live="polite">{Math.round(scale * 100)}%</span>
          <Button type="button" size="icon" variant="outline" onClick={() => step(0.5)} disabled={scale >= 4} aria-label={T("بزرگ‌نمایی", "Zoom in")} data-testid="image-zoom-in"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => setScale(1)} aria-label={T("بازنشانی زوم", "Reset zoom")}><RotateCcw className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
