import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Renders PDF pages to canvases with pdf.js — works where inline PDF iframes don't
 * (Chrome on Android, Capacitor WebView).
 */
export function PdfPreview({ url, maxPages = 15, isEn }: { url: string; maxPages?: number; isEn: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let doc: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const pdf = await pdfjs.getDocument({ url }).promise;
        doc = pdf;
        if (cancelled || !host.current) return;
        host.current.innerHTML = "";
        const width = host.current.clientWidth || 320;
        const count = Math.min(pdf.numPages, maxPages);
        setPages(pdf.numPages);
        for (let i = 1; i <= count && !cancelled; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const ratio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.className = "rounded border bg-white mb-2";
          canvas.setAttribute("data-testid", `pdf-page-${i}`);
          host.current?.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          if (i === 1 && !cancelled) setState("ready");
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      void doc?.destroy();
    };
  }, [url, maxPages]);

  return (
    <div className="max-h-[72vh] overflow-y-auto" data-testid="attachment-preview-pdf">
      {state === "loading" && (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
      )}
      {state === "error" && (
        <p className="text-xs text-destructive py-6 text-center">{isEn ? "Could not render this PDF — use Download / open." : "نمایش این PDF ممکن نشد — از «دانلود / باز کردن» استفاده کن."}</p>
      )}
      <div ref={host} />
      {state === "ready" && pages > maxPages && (
        <p className="text-[11px] text-muted-foreground text-center py-2">{isEn ? `Showing ${maxPages} of ${pages} pages` : `نمایش ${maxPages} صفحه از ${pages}`}</p>
      )}
    </div>
  );
}
