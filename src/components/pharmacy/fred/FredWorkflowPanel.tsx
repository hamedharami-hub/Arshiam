import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "@/lib/pharmacyFredPracticeData";
import type { FredLabelDraft } from "@/lib/pharmacyFredWorkflow";
import { FredFinalCheckStep } from "./FredFinalCheckStep";
import { FredLabelStep } from "./FredLabelStep";
import { FredOdtLog } from "./FredOdtLog";
import { FredSafetyNetCalculator } from "./FredSafetyNetCalculator";

const emptyLabel = (): FredLabelDraft => ({ directions: "", quantity: 0, repeats: 0, calCodes: [] });

/** Guided dispensing workflow: label + CAL → pharmacist final check → Safety Net → ODT log. */
export function FredWorkflowPanel() {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [scriptId, setScriptId] = useState(PHARMACY_FRED_PRACTICE_SCENARIOS[0]?.id ?? "");
  const [labels, setLabels] = useState<Record<string, FredLabelDraft>>({});
  const [step, setStep] = useState("label");
  const script = useMemo(() => PHARMACY_FRED_PRACTICE_SCENARIOS.find((entry) => entry.id === scriptId) ?? PHARMACY_FRED_PRACTICE_SCENARIOS[0], [scriptId]);
  const label = labels[script.id] ?? emptyLabel();
  const setLabel = (next: FredLabelDraft) => setLabels((previous) => ({ ...previous, [script.id]: next }));

  return (
    <section className="space-y-4" dir={isEn ? "ltr" : "rtl"} data-testid="fred-workflow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />{T("گردش کار کامل نسخه‌پیچی", "Full dispensing workflow")}</h2>
          <p className="text-xs text-muted-foreground">{T("برچسب و CAL، بررسی نهایی داروساز، ماشین‌حساب Safety Net و دفتر دوز ODT؛ همه ساختگی و آموزشی.", "Label & CAL, pharmacist final check, Safety Net calculator and ODT dosing log; all fictional and educational.")}</p>
        </div>
        <Select value={script.id} onValueChange={setScriptId}>
          <SelectTrigger className="w-full sm:w-80" aria-label={T("نسخهٔ تمرینی", "Practice script")} data-testid="fred-workflow-script-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PHARMACY_FRED_PRACTICE_SCENARIOS.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.prescribedDrug} · {entry.schedule}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card role="note" className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-3 text-xs">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="leading-relaxed">{T("تمرین آموزشی و بازبینی‌نشده؛ هیچ نسخه، claim یا دوز واقعی ثبت نمی‌شود. قوانین ایالت و سیاست داروخانه را دنبال کن.", "Educational, unreviewed practice; no real script, claim or dose is recorded. Follow state law and pharmacy policy.")}</p>
      </Card>

      <Card className="space-y-1 p-3 text-sm" data-testid="fred-workflow-script-card">
        <p className="font-semibold" dir="ltr">{script.prescribedDrug}</p>
        <p className="text-muted-foreground" dir="ltr">{script.directions}</p>
        <p className="text-xs text-muted-foreground" dir="ltr">Qty {script.quantity} · Rpt {script.repeats} · {script.schedule} · PBS {script.pbsCode} · {script.scriptDate}</p>
      </Card>

      <Tabs value={step} onValueChange={setStep}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="label" data-testid="fred-step-label">{T("۱. برچسب و CAL", "1. Label & CAL")}</TabsTrigger>
          <TabsTrigger value="check" data-testid="fred-step-check">{T("۲. بررسی نهایی", "2. Final check")}</TabsTrigger>
          <TabsTrigger value="safetynet" data-testid="fred-step-safetynet">{T("۳. Safety Net", "3. Safety Net")}</TabsTrigger>
          <TabsTrigger value="odt" data-testid="fred-step-odt">{T("۴. دفتر ODT", "4. ODT log")}</TabsTrigger>
        </TabsList>
        <TabsContent value="label" forceMount hidden={step !== "label"} className="mt-4"><FredLabelStep key={script.id} script={script} label={label} onChange={setLabel} onNext={() => setStep("check")} /></TabsContent>
        <TabsContent value="check" forceMount hidden={step !== "check"} className="mt-4"><FredFinalCheckStep key={script.id} script={script} label={label} onEditLabel={() => setStep("label")} /></TabsContent>
        <TabsContent value="safetynet" forceMount hidden={step !== "safetynet"} className="mt-4"><FredSafetyNetCalculator /></TabsContent>
        <TabsContent value="odt" forceMount hidden={step !== "odt"} className="mt-4"><FredOdtLog /></TabsContent>
      </Tabs>
    </section>
  );
}
