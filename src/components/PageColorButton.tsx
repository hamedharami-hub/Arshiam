import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBilingual } from "@/hooks/useBilingual";
import { PAGE_COLORS, type PageColorChoice, type PageColorId } from "@/lib/pageBackground";

export function PageColorButton({ color, isDefault, onChange }: { color: PageColorId | null; isDefault: boolean; onChange: (c: PageColorChoice | null) => void }) {
  const { T, isEn } = useBilingual();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label={T("رنگ صفحه", "Page color")} title={T("رنگ صفحه", "Page color")} data-testid="header-page-color-button">
          <Palette className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3" dir={isEn ? "ltr" : "rtl"} data-testid="page-color-popover">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{T("رنگ پس‌زمینهٔ این صفحه", "This page's background")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onChange("none")} aria-label={T("بدون رنگ", "No color")} data-testid="page-color-none"
            className={`grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-[11px] ${color === null && !isDefault ? "ring-2 ring-primary ring-offset-1" : ""}`}>×</button>
          {PAGE_COLORS.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange(c.id)} aria-label={isEn ? c.en : c.fa} title={isEn ? c.en : c.fa} data-testid={`page-color-${c.id}`}
              className={`grid h-9 w-9 place-items-center rounded-full border border-border/60 text-white ${color === c.id && !isDefault ? "ring-2 ring-primary ring-offset-1" : ""}`}
              style={{ backgroundColor: c.accent }}>
              {color === c.id && !isDefault && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
        {!isDefault && (
          <button type="button" onClick={() => onChange(null)} className="mt-3 text-xs font-medium text-primary hover:underline" data-testid="page-color-default">
            {T("بازگشت به رنگ پیشنهادی", "Use suggested color")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
