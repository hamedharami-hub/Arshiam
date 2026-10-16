import type { ReactNode } from "react";
import { Expand, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MiniAppDevice = "fit" | "mobile" | "tablet" | "desktop";
const MINI_APP_DEVICE_WIDTHS: Record<MiniAppDevice, number | null> = { fit: null, mobile: 390, tablet: 768, desktop: 1024 };
type Translate = (fa: string, en: string) => string;

export function MiniAppPreviewControls({ device, onChange, t }: { device: MiniAppDevice; onChange: (device: MiniAppDevice) => void; t: Translate }) {
  const choices = [
    { id: "fit" as const, icon: Expand, label: t("اندازه خودکار", "Fit width") },
    { id: "mobile" as const, icon: Smartphone, label: t("موبایل", "Mobile") },
    { id: "tablet" as const, icon: Tablet, label: t("تبلت", "Tablet") },
    { id: "desktop" as const, icon: Monitor, label: t("دسکتاپ", "Desktop") },
  ];
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div role="group" aria-label={t("اندازه پیش‌نمایش", "Preview device size")} className="flex flex-wrap gap-1">
      {choices.map(({ id, icon: Icon, label }) => <Button key={id} type="button" size="sm" variant={device === id ? "default" : "outline"} aria-pressed={device === id} onClick={() => onChange(id)}><Icon className="me-1 size-4" />{label}</Button>)}
    </div>
    <span className="text-xs text-muted-foreground">{MINI_APP_DEVICE_WIDTHS[device] ? `${MINI_APP_DEVICE_WIDTHS[device]} px` : t("هم‌اندازه فضای موجود", "Available width")} · {t("تغییر اندازه کد را دوباره اجرا نمی‌کند.", "Resizing does not rerun the source.")}</span>
  </div>;
}

export function MiniAppPreviewViewport({ device, children, t }: { device: MiniAppDevice; children: ReactNode; t: Translate }) {
  const width = MINI_APP_DEVICE_WIDTHS[device];
  return <div className="w-full overflow-x-auto rounded-xl border bg-muted/20 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" aria-label={t("قاب قابل‌اسکرول پیش‌نمایش", "Scrollable preview viewport")} tabIndex={0} data-testid="html-preview-viewport">
    <div style={{ width: width ?? "100%", minWidth: width ?? 0 }} data-testid="html-preview-width">{children}</div>
  </div>;
}
