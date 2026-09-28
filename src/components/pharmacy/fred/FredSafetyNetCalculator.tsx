import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBilingual } from "@/hooks/useBilingual";
import { PBS_2026_RATES, calculateSafetyNet, type PbsRates, type SafetyNetInput } from "@/lib/pharmacyFredWorkflow";

const money = (value: number) => `$${value.toFixed(2)}`;

export function FredSafetyNetCalculator() {
  const { T } = useBilingual();
  const [input, setInput] = useState<SafetyNetInput>({ category: "general", runningTotal: 1725.3, entitlementHeld: false, dispensedPrice: 42.5, premium: 0 });
  const [rates, setRates] = useState<PbsRates>({ generalCopay: PBS_2026_RATES.generalCopay, concessionCopay: PBS_2026_RATES.concessionCopay, generalThreshold: PBS_2026_RATES.generalThreshold, concessionThreshold: PBS_2026_RATES.concessionThreshold });
  const result = calculateSafetyNet(input, rates);
  const numberField = (id: string, label: string, value: number, onChange: (value: number) => void) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" step="0.01" min={0} value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} data-testid={id} dir="ltr" />
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm font-semibold">{T("نوع بیمار", "Patient type")}</legend>
          {(["general", "concessional"] as const).map((category) => (
            <button key={category} type="button" aria-pressed={input.category === category} onClick={() => setInput({ ...input, category })} data-testid={`fred-sn-${category}`}
              className="rounded-lg border p-2 text-sm transition-colors hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold">
              {category === "general" ? T("عمومی (General)", "General") : T("دارای کارت (Concessional)", "Concessional")}
            </button>
          ))}
        </fieldset>
        {numberField("fred-sn-running-total", T("مجموع ثبت‌شده تا امروز (AUD)", "Running total this year (AUD)"), input.runningTotal, (value) => setInput({ ...input, runningTotal: value }))}
        {numberField("fred-sn-price", T("قیمت دارو برای این نسخه (AUD)", "Dispensed price for this script (AUD)"), input.dispensedPrice, (value) => setInput({ ...input, dispensedPrice: value }))}
        {numberField("fred-sn-premium", T("premium برند/گروه درمانی (AUD)", "Brand / therapeutic premium (AUD)"), input.premium, (value) => setInput({ ...input, premium: value }))}
        <div className="flex items-center gap-2">
          <Checkbox id="fred-sn-entitlement" checked={input.entitlementHeld} onCheckedChange={(checked) => setInput({ ...input, entitlementHeld: checked === true })} data-testid="fred-sn-entitlement" />
          <Label htmlFor="fred-sn-entitlement">{T("کارت Safety Net برای امسال صادر شده", "Safety Net card already issued this year")}</Label>
        </div>
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">{T("مبالغ PBS (۱ ژانویه ۲۰۲۶؛ قابل ویرایش)", "PBS amounts (1 Jan 2026; editable)")}</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {numberField("fred-sn-rate-general", T("سقف General", "General co-payment"), rates.generalCopay, (value) => setRates({ ...rates, generalCopay: value }))}
            {numberField("fred-sn-rate-concession", T("سقف Concessional", "Concessional co-payment"), rates.concessionCopay, (value) => setRates({ ...rates, concessionCopay: value }))}
            {numberField("fred-sn-threshold-general", T("آستانهٔ General", "General threshold"), rates.generalThreshold, (value) => setRates({ ...rates, generalThreshold: value }))}
            {numberField("fred-sn-threshold-concession", T("آستانهٔ Concessional", "Concessional threshold"), rates.concessionThreshold, (value) => setRates({ ...rates, concessionThreshold: value }))}
          </div>
          <div className="mt-2 space-y-1">
            <a href={PBS_2026_RATES.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" aria-hidden="true" />PBS — current patient fees and charges</a>
            <a href={PBS_2026_RATES.thresholdSourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" aria-hidden="true" />Services Australia — Safety Net thresholds</a>
          </div>
        </details>
      </div>

      <Card className="h-fit space-y-2 p-4 text-sm" data-testid="fred-sn-result" aria-live="polite">
        {!result ? (
          <p className="text-destructive" data-testid="fred-sn-invalid">{T("همهٔ مبالغ باید عدد صفر یا مثبت باشند.", "All amounts must be zero or positive numbers.")}</p>
        ) : (
          <>
            <Row label={T("سهم بیمار (co-payment)", "Patient co-payment")} value={money(result.copayment)} testId="fred-sn-copayment" />
            <Row label={T("پرداخت کل بیمار", "Patient pays in total")} value={money(result.patientPays)} testId="fred-sn-patient-pays" />
            <Row label={T("مبلغ شمرده‌شده برای آستانه", "Counts toward threshold")} value={money(result.countsTowardThreshold)} testId="fred-sn-counts" />
            <Row label={T("مجموع جدید / آستانه", "New total / threshold")} value={`${money(result.newTotal)} / ${money(result.threshold)}`} testId="fred-sn-new-total" />
            <Row label={T("باقی‌مانده تا آستانه", "Remaining to threshold")} value={money(result.remainingAfter)} testId="fred-sn-remaining" />
            {result.crossesThreshold && <p className="rounded-lg bg-emerald-500/10 p-2 font-medium text-emerald-700 dark:text-emerald-300" data-testid="fred-sn-crossed">{T("این نسخه آستانه را رد می‌کند؛ بیمار ممکن است واجد شرایط کارت Safety Net شود.", "This script reaches the threshold; the patient may become eligible for a Safety Net card.")}</p>}
            {result.underCopayment && <p className="text-xs text-muted-foreground" data-testid="fred-sn-under-copayment">{T("قیمت کمتر از سقف co-payment است؛ بیمار همان قیمت را می‌پردازد.", "Price is under the co-payment; the patient pays the price.")}</p>}
            {input.premium > 0 && <p className="text-xs text-muted-foreground">{T("premium به آستانه اضافه نمی‌شود.", "Premiums do not count toward the threshold.")}</p>}
            <p className="text-xs text-muted-foreground">{T("تخفیف اختیاری داروخانه، Closing the Gap و قواعد خاص در نظر گرفته نشده‌اند.", "Optional pharmacy discounts, Closing the Gap and special rules are not modelled.")}</p>
          </>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <p className="flex items-baseline justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-mono font-semibold" dir="ltr" data-testid={testId}>{value}</span></p>;
}
