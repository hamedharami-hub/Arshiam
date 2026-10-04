import { useState } from "react";
import { Plus, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBilingual } from "@/hooks/useBilingual";
import { ODT_PRACTICE_PATIENT, summarizeOdtLog, validateOdtEntry, type OdtEntryIssue, type OdtLogEntry } from "@/lib/pharmacyFredWorkflow";

type Draft = Omit<OdtLogEntry, "id">;
const emptyDraft = (): Draft => ({ date: "", doseMg: ODT_PRACTICE_PATIENT.prescribedDoseMg, type: "supervised", idChecked: false, signed: false, takeawayLabel: false });

export function FredOdtLog() {
  const { T } = useBilingual();
  const [log, setLog] = useState<OdtLogEntry[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [issues, setIssues] = useState<OdtEntryIssue[]>([]);
  const summary = summarizeOdtLog(log);
  const issueLabels: Record<OdtEntryIssue, string> = {
    "invalid-date": T("تاریخ معتبر وارد کن.", "Enter a valid date."),
    "dose-mismatch": T(`دوز با دستور (${ODT_PRACTICE_PATIENT.prescribedDoseMg} mg) یکی نیست؛ بدون دستور جدید تجویزکننده تغییر نده.`, `Dose differs from the order (${ODT_PRACTICE_PATIENT.prescribedDoseMg} mg); do not change it without a new prescriber order.`),
    "duplicate-date": T("برای این تاریخ قبلاً دوز ثبت شده است.", "A dose is already recorded for this date."),
    "id-not-checked": T("هویت بیمار بررسی نشده است.", "Patient identity was not checked."),
    "not-signed": T("امضای بیمار ثبت نشده است.", "Patient signature is missing."),
    "takeaway-without-label": T("دوز takeaway بدون برچسب تاریخ مصرف تحویل نمی‌شود.", "Takeaway doses need a consumption-date label before release."),
  };

  const add = () => {
    const found = validateOdtEntry(draft, log);
    setIssues(found);
    if (found.length) return;
    setLog((previous) => [...previous, { ...draft, id: `${draft.date}-${previous.length}` }]);
    setDraft({ ...emptyDraft(), type: draft.type });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-3">
        <Card className="space-y-1 p-3 text-sm" data-testid="fred-odt-patient">
          <p className="font-semibold" dir="ltr">{ODT_PRACTICE_PATIENT.code}</p>
          <p dir="ltr">{ODT_PRACTICE_PATIENT.medicine} · {ODT_PRACTICE_PATIENT.prescribedDoseMg} mg</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{ODT_PRACTICE_PATIENT.regimen}</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fred-odt-date">{T("تاریخ", "Date")}</Label>
            <Input id="fred-odt-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} data-testid="fred-odt-date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fred-odt-dose">{T("دوز (mg)", "Dose (mg)")}</Label>
            <Input id="fred-odt-dose" type="number" min={0} value={draft.doseMg} onChange={(event) => setDraft({ ...draft, doseMg: Number(event.target.value) })} data-testid="fred-odt-dose" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["supervised", "takeaway"] as const).map((type) => (
            <button key={type} type="button" aria-pressed={draft.type === type} onClick={() => setDraft({ ...draft, type })} data-testid={`fred-odt-type-${type}`}
              className="rounded-lg border p-2 text-sm transition-colors hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold">
              {type === "supervised" ? T("تحت نظارت", "Supervised") : T("Takeaway", "Takeaway")}
            </button>
          ))}
        </div>
        {([
          ["idChecked", T("هویت بیمار بررسی شد", "Patient identity checked")],
          ["signed", T("بیمار امضا کرد", "Patient signed")],
          ...(draft.type === "takeaway" ? [["takeawayLabel", T("برچسب تاریخ مصرف روی بطری", "Consumption-date label on bottle")]] : []),
        ] as Array<[keyof Draft, string]>).map(([field, label]) => (
          <div key={field} className="flex items-center gap-2">
            <Checkbox id={`fred-odt-${field}`} checked={Boolean(draft[field])} onCheckedChange={(checked) => setDraft({ ...draft, [field]: checked === true })} data-testid={`fred-odt-${field}`} />
            <Label htmlFor={`fred-odt-${field}`}>{label}</Label>
          </div>
        ))}
        <Button type="button" className="gap-1.5" onClick={add} data-testid="fred-odt-add-btn"><Plus className="h-4 w-4" aria-hidden="true" />{T("ثبت در دفتر", "Record in log")}</Button>
        {issues.length > 0 && (
          <ul role="alert" className="space-y-1 rounded-lg border border-rose-500/40 bg-rose-500/5 p-3 text-sm" data-testid="fred-odt-issues">
            {issues.map((issue) => <li key={issue} className="flex items-start gap-1.5"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />{issueLabels[issue]}</li>)}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm" data-testid="fred-odt-summary">{T(`${log.length} دوز · ${summary.totalMg} mg · ${summary.supervised} تحت نظارت · ${summary.takeaway} takeaway`, `${log.length} doses · ${summary.totalMg} mg · ${summary.supervised} supervised · ${summary.takeaway} takeaway`)}</p>
          {log.length > 0 && <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => { setLog([]); setIssues([]); }} data-testid="fred-odt-reset-btn"><RotateCcw className="h-4 w-4" aria-hidden="true" />{T("پاک‌کردن دفتر", "Clear log")}</Button>}
        </div>
        {summary.gaps.map((gap) => (
          <p key={gap.after} className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-sm" data-testid="fred-odt-gap">
            {T(`${gap.missedDays} روز بدون دوز بین ${gap.after} و ${gap.before}؛ پیش از دوز بعدی طبق سیاست محلی ODT با تجویزکننده هماهنگ کن.`, `${gap.missedDays} missed day(s) between ${gap.after} and ${gap.before}; follow local ODT policy and contact the prescriber before the next dose.`)}
          </p>
        ))}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[28rem] text-sm" data-testid="fred-odt-table">
            <thead><tr className="text-start text-xs text-muted-foreground"><th className="p-2 text-start">{T("تاریخ", "Date")}</th><th className="p-2 text-start">mg</th><th className="p-2 text-start">{T("نوع", "Type")}</th><th className="p-2 text-start">{T("کنترل‌ها", "Checks")}</th></tr></thead>
            <tbody>
              {summary.sorted.map((entry) => (
                <tr key={entry.id} className="border-t" data-testid="fred-odt-row">
                  <td className="p-2 font-mono" dir="ltr">{entry.date}</td>
                  <td className="p-2 font-mono">{entry.doseMg}</td>
                  <td className="p-2">{entry.type === "supervised" ? T("تحت نظارت", "Supervised") : "Takeaway"}</td>
                  <td className="p-2 text-xs">ID ✓ · {T("امضا", "Signed")} ✓{entry.type === "takeaway" ? ` · ${T("برچسب", "Label")} ✓` : ""}</td>
                </tr>
              ))}
              {!log.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">{T("هنوز دوزی ثبت نشده است.", "No doses recorded yet.")}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{T("دفتر تمرینی ذخیره نمی‌شود و با بارگذاری دوباره پاک می‌شود.", "This practice log is not saved and clears on reload.")}</p>
      </div>
    </div>
  );
}
