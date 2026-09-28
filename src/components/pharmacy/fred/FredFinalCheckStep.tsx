import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useBilingual } from "@/hooks/useBilingual";
import type { PharmacyFredPracticeEntry } from "@/lib/pharmacyFredPractice";
import { evaluateFinalCheck, getFinalCheckItems, type FinalCheckIssue, type FinalCheckItemId, type FredLabelDraft } from "@/lib/pharmacyFredWorkflow";

interface FredFinalCheckStepProps {
  script: PharmacyFredPracticeEntry;
  label: FredLabelDraft;
  onEditLabel: () => void;
}

export function FredFinalCheckStep({ script, label, onEditLabel }: FredFinalCheckStepProps) {
  const { T } = useBilingual();
  const [ticked, setTicked] = useState<Set<FinalCheckItemId>>(() => new Set());
  const [decision, setDecision] = useState<"release" | "hold" | null>(null);
  const itemLabels: Record<FinalCheckItemId, string> = {
    patient: T("هویت بیمار با نسخه و برچسب یکی است", "Patient identity matches script and label"),
    prescriber: T("مشخصات و امضای تجویزکننده معتبر است", "Prescriber details and signature are valid"),
    drug: T("دارو، قدرت و شکل دارویی با نسخه یکی است", "Drug, strength and form match the script"),
    directions: T("دستور مصرف روی برچسب دقیق و روشن است", "Label directions are accurate and clear"),
    quantity: T("تعداد و تکرار درست است", "Quantity and repeats are correct"),
    cal: T("برچسب‌های CAL مناسب انتخاب شده‌اند", "Appropriate CAL labels are applied"),
    counselling: T("مشاورهٔ لازم برای بیمار برنامه‌ریزی شده است", "Required counselling is planned"),
    validity: T("تاریخ و اعتبار نسخه بررسی شده است", "Script date and validity checked"),
    "s8-register": T("ثبت در دفتر S8 و بررسی SafeScript انجام شده است", "S8 register entry and SafeScript check done"),
  };
  const issueLabels: Record<FinalCheckIssue, string> = {
    "directions-mismatch": T("دستور روی برچسب با نسخه یکی نیست.", "Label directions do not match the script."),
    "quantity-mismatch": T("تعداد روی برچسب با نسخه یکی نیست.", "Label quantity does not match the script."),
    "repeats-mismatch": T("تعداد تکرار روی برچسب با نسخه یکی نیست.", "Label repeats do not match the script."),
    "expired-s8": T("نسخهٔ S8 منقضی شده است؛ عرضه نشود.", "The S8 script has expired; do not supply."),
    "unchecked-items": T("همهٔ موارد بررسی نهایی تیک نخورده‌اند.", "Not every final-check item is ticked."),
  };
  const result = evaluateFinalCheck(script, label, ticked);
  const toggle = (item: FinalCheckItemId) => {
    setDecision(null);
    setTicked((previous) => {
      const next = new Set(previous);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  };
  const correct = decision !== null && decision === result.expectedDecision;

  return (
    <div className="space-y-4">
      <ul className="space-y-2" data-testid="fred-final-check-list">
        {getFinalCheckItems(script).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Checkbox id={`fred-check-${item}`} checked={ticked.has(item)} onCheckedChange={() => toggle(item)} className="mt-0.5" data-testid={`fred-check-${item}`} />
            <label htmlFor={`fred-check-${item}`} className="text-sm leading-relaxed">{itemLabels[item]}</label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setDecision("release")} variant={decision === "release" ? "default" : "outline"} data-testid="fred-decision-release">{T("تأیید و تحویل", "Approve & release")}</Button>
        <Button type="button" onClick={() => setDecision("hold")} variant={decision === "hold" ? "default" : "outline"} data-testid="fred-decision-hold">{T("نگه‌داشتن / اصلاح", "Hold / correct")}</Button>
        <Button type="button" variant="ghost" onClick={onEditLabel} data-testid="fred-edit-label-btn">{T("ویرایش برچسب", "Edit label")}</Button>
      </div>
      {decision && (
        <Card className={`space-y-2 p-4 text-sm ${correct ? "border-emerald-500/40" : "border-rose-500/40"}`} data-testid="fred-final-check-feedback" data-correct={correct}>
          <p className="flex items-center gap-2 font-semibold">
            {correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <TriangleAlert className="h-4 w-4 text-rose-600" aria-hidden="true" />}
            {correct ? T("تصمیم درست است.", "Correct decision.") : result.expectedDecision === "hold" ? T("این نسخه باید نگه داشته شود.", "This script should be held.") : T("مشکلی پیدا نشد؛ می‌شد تحویل داد.", "No issue found; it could be released.")}
          </p>
          {result.issues.length > 0 && <ul className="list-disc space-y-1 ps-5" data-testid="fred-final-check-issues">{result.issues.map((issue) => <li key={issue}>{issueLabels[issue]}</li>)}</ul>}
        </Card>
      )}
    </div>
  );
}
