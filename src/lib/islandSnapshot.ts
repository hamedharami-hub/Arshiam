import type { DayPhase } from "@/lib/island";

const SEA: Record<DayPhase, [string, string]> = {
  morning: ["#a9dfee", "#e9b48f"],
  day: ["#8fd3ea", "#3f8fb8"],
  sunset: ["#6f98bd", "#d9784f"],
  night: ["#2c4468", "#101a33"],
};

/** Renders the live island SVG into a shareable PNG "postcard". */
export async function captureIsland(svg: SVGSVGElement, opts: { title: string; subtitle: string; phase: DayPhase; rtl: boolean }): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const scale = 2;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll(".island-ghost, .island-select-ring").forEach((n) => n.remove());
  clone.querySelectorAll(".island-tile").forEach((n) => { n.setAttribute("stroke", "rgba(255,255,255,0.18)"); });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(vb.width * scale));
  clone.setAttribute("height", String(vb.height * scale));
  clone.removeAttribute("class");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("snapshot render failed"));
      el.src = url;
    });
    const footer = 64 * scale;
    const canvas = document.createElement("canvas");
    canvas.width = vb.width * scale;
    canvas.height = vb.height * scale + footer;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    const [a, b] = SEA[opts.phase];
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(0, canvas.height - footer, canvas.width, footer);
    const font = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.direction = opts.rtl ? "rtl" : "ltr";
    ctx.textAlign = opts.rtl ? "right" : "left";
    const x = opts.rtl ? canvas.width - 24 * scale : 24 * scale;
    ctx.fillStyle = "#2b2233";
    ctx.font = `600 ${20 * scale}px ${font}`;
    ctx.fillText(opts.title, x, canvas.height - footer + 28 * scale);
    ctx.fillStyle = "#6b6274";
    ctx.font = `${13 * scale}px ${font}`;
    ctx.fillText(opts.subtitle, x, canvas.height - footer + 50 * scale);

    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareBlob(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); return true; } catch { return false; }
  }
  return false;
}
