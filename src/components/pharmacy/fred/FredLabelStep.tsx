import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBilingual } from "@/hooks/useBilingual";
import type { PharmacyFredPracticeEntry } from "@/lib/pharmacyFredPractice";
import { compareCalSelection, findProductForScript, type FredLabelDraft } from "@/lib/pharmacyFredWorkflow";
import { PHARMACY_CAL_LABELS, PHARMACY_PRODUCT_CAL_LABELS } from "@/lib/pharmacyCalLabelData";
import { PHARMACY_PRODUCT_CATALOG } from "@/lib/pharmacyProductCatalogData";

interface FredLabelStepProps {
  script: PharmacyFredPracticeEntry;
  label: FredLabelDraft;
  onChange: (label: FredLabelDraft) => void;
  onNext: () => void;
}

export function FredLabelStep({ script, label, onChange, onNext }: FredLabelStepProps) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [checked, setChecked] = useState(false);
  const product = findProductForScript(script, PHARMACY_PRODUCT_CATALOG);
  const sourceCalLabels = product ? PHARMACY_PRODUCT_CAL_LABELS[product.id] : undefined;
  const comparison = sourceCalLabels ? compareCalSelection(label.calCodes, sourceCalLabels) : null;
  const toggleCal = (code: string) => {
    setChecked(false);
    onChange({ ...label, calCodes: label.calCodes.includes(code) ? label.calCodes.filter((item) => item !== code) : [...label.calCodes, code] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="fred-label-directions">{T("دستور مصرف روی برچسب", "Label directions")}</Label>
          <Textarea id="fred-label-directions" dir="ltr" rows={2} value={label.directions} onChange={(event) => onChange({ ...label, directions: event.target.value })} placeholder="Take ONE tablet…" data-testid="fred-label-directions" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fred-label-qty">{T("تعداد", "Quantity")}</Label>
            <Input id="fred-label-qty" type="number" min={0} value={label.quantity || ""} onChange={(event) => onChange({ ...label, quantity: Number(event.target.value) })} data-testid="fred-label-quantity" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fred-label-rpt">{T("تکرار", "Repeats")}</Label>
            <Input id="fred-label-rpt" type="number" min={0} value={label.repeats || ""} onChange={(event) => onChange({ ...label, repeats: Number(event.target.value) })} data-testid="fred-label-repeats" />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{T("برچسب‌های هشدار CAL (APF)", "Cautionary advisory labels (APF)")}</legend>
          <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
            {PHARMACY_CAL_LABELS.map((cal) => (
              <button key={cal.code} type="button" aria-pressed={label.calCodes.includes(cal.code)} onClick={() => toggleCal(cal.code)} title={isEn ? cal.nameEn : cal.nameFa}
                className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground" data-testid={`fred-cal-${cal.code.replace(/\s+/g, "-")}`}>
                <span className="font-mono font-semibold">{cal.code}</span> <span className="hidden sm:inline">{isEn ? cal.nameEn : cal.nameFa}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setChecked(true)} data-testid="fred-label-check-btn">{T("مقایسه با CAL منبع", "Compare with source CALs")}</Button>
          <Button type="button" onClick={onNext} data-testid="fred-label-next-btn">{T("رفتن به بررسی نهایی", "Go to final check")}</Button>
        </div>
        {checked && (
          <Card className="space-y-1.5 p-3 text-sm" data-testid="fred-label-feedback">
            {!product || !comparison ? (
              <p>{T("برای این نسخه محصول متناظری در قفسهٔ منبع نیست؛ مرجع CAL منبع در دسترس نیست.", "No matching shelf product in the source; no source CAL reference is available.")}</p>
            ) : !comparison.missing.length && !comparison.extra.length ? (
              <p className="text-emerald-700 dark:text-emerald-300">{T("انتخاب تو با CALهای منبع برای ", "Your selection matches the source CALs for ")}{product.brandName}.</p>
            ) : (
              <>
                {comparison.missing.length > 0 && <p>{T("در منبع هست ولی انتخاب نکردی: ", "In the source but not selected: ")}<span className="font-mono">{comparison.missing.join(", ")}</span></p>}
                {comparison.extra.length > 0 && <p>{T("انتخاب کردی ولی در منبع نیست: ", "Selected but not in the source: ")}<span className="font-mono">{comparison.extra.join(", ")}</span></p>}
              </>
            )}
            <Badge variant="outline" className="text-amber-700 dark:text-amber-300">{T("برچسب منبع، بازبینی‌نشده", "Source labels, unreviewed")}</Badge>
          </Card>
        )}
      </div>
      <LabelPreview script={script} label={label} />
    </div>
  );
}

function LabelPreview({ script, label }: { script: PharmacyFredPracticeEntry; label: FredLabelDraft }) {
  const { T } = useBilingual();
  return (
    <Card className="h-fit space-y-2 border-2 border-dashed p-4 font-mono text-xs" dir="ltr" aria-label={T("پیش‌نمایش برچسب", "Label preview")} data-testid="fred-label-preview">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Training only — not a real label</p>
      <p className="text-sm font-bold">{script.prescribedDrug}</p>
      <p className="min-h-8 whitespace-pre-wrap">{label.directions || "—"}</p>
      <p>Qty: {label.quantity || "—"} · Rpt: {label.repeats || "—"}</p>
      <div className="flex flex-wrap gap-1">
        {label.calCodes.map((code) => <span key={code} className="rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5">{code}</span>)}
      </div>
      <p className="text-muted-foreground">TRAINING PATIENT · {script.scriptDate}</p>
    </Card>
  );
}
