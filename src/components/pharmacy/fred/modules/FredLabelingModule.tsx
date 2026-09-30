import { RotateCcw, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FRED_AUXILIARY_LABELS } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredLabelingModule() {
const { T, isEn, labelState, setLabelState, resetLabel, handleToggleAuxiliaryLabel } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {T("طراحی و پیش‌نمایش برچسب دارویی (Dispensing Label)", "Dispensing Desk Labeling Simulator")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {T(
                  "تنظیم دستور مصرف و برچسب‌های هشدار کمکی روی استیکر حرارتی تمرینی (پیش‌نمایش درون‌برنامه‌ای، بدون چاپ واقعی).",
                  "Configure directions and cautionary auxiliary labels on a simulated thermal sticker."
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetLabel}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {T("بازنشانی برچسب", "Reset Label")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Editor Controls */}
            <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span>{T("ویرایش اطلاعات برچسب", "Edit Label Parameters")}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">
                    {T("شناسه بیمار تمرینی (ساختگی):", "Simulated Patient ID (Fictional):")}
                  </label>
                  <Input
                    value={labelState.samplePatientCode}
                    disabled
                    className="font-mono text-xs bg-muted/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="label-medication-input" className="text-foreground font-semibold block mb-1">
                    {T("نام و قدرت دارو:", "Medication & Strength:")}
                  </label>
                  <Input
                    id="label-medication-input"
                    value={labelState.medicationName}
                    onChange={(e) => setLabelState((prev) => ({ ...prev, medicationName: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="label-directions-input" className="text-foreground font-semibold block mb-1">
                    {T("دستور مصرف (Directions):", "Directions:")}
                  </label>
                  <textarea
                    id="label-directions-input"
                    value={labelState.directions}
                    onChange={(e) => setLabelState((prev) => ({ ...prev, directions: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-foreground font-semibold block mb-1.5">
                    {T("برچسب‌های هشدار کمکی (Auxiliary Warning Labels):", "Auxiliary Warning Labels:")}
                  </label>
                  <div className="space-y-2">
                    {FRED_AUXILIARY_LABELS.map((lbl) => {
                      const isChecked = labelState.selectedLabelIds.includes(lbl.id);
                      return (
                        <label
                          key={lbl.id}
                          className="flex items-start gap-2.5 p-2 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer transition text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAuxiliaryLabel(lbl.id)}
                            className="mt-0.5 rounded border-gray-300"
                          />
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">{lbl.code}: </span>
                            <span className="text-muted-foreground">{isEn ? lbl.textEn : lbl.textFa}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="label-initials-input" className="text-muted-foreground block mb-1">
                      {T("کد داروساز (Initials):", "Pharmacist Initials:")}
                    </label>
                    <Input
                      id="label-initials-input"
                      value={labelState.pharmacistInitials}
                      onChange={(e) => setLabelState((prev) => ({ ...prev, pharmacistInitials: e.target.value }))}
                      className="font-mono text-xs uppercase"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">
                      {T("شماره نسخه ساختگی:", "Simulated Script Ref:")}
                    </label>
                    <Input
                      value={labelState.simulatedScriptNo}
                      disabled
                      className="font-mono text-xs bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Live In-Page Label Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {T("پیش‌نمایش استیکر حرارتی درون‌برنامه‌ای:", "In-Page Thermal Label Preview:")}
                </span>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                  TRAINING PREVIEW ONLY
                </Badge>
              </div>

              {/* Thermal Label Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-card border-2 border-dashed border-border shadow-md space-y-4 font-mono text-xs select-none" dir="ltr">
                {/* Warning Header Watermark */}
                <div className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 p-1.5 rounded text-center text-[10px] font-bold tracking-wider">
                  ⚠️ TRAINING ONLY — NOT FOR DISPENSING
                </div>

                {/* Dispensary Header */}
                <div className="border-b border-border/80 pb-2 text-center space-y-0.5">
                  <div className="font-bold text-sm tracking-tight text-foreground">COMMUNITY PHARMACY TRAINING LAB</div>
                  <div className="text-[10px] text-muted-foreground">123 Simulation Way, Practice Suburb | PH: (02) 5550 0199</div>
                </div>

                {/* Script and Patient Reference */}
                <div className="flex justify-between text-[11px] text-foreground border-b border-border/60 pb-2">
                  <span><strong>RX:</strong> {labelState.simulatedScriptNo}</span>
                  <span><strong>DATE:</strong> 2026-09-26</span>
                </div>

                <div className="text-xs text-foreground">
                  <strong>PATIENT:</strong> {labelState.samplePatientCode}
                </div>

                {/* Medication Name */}
                <div className="text-sm font-bold text-foreground py-1 bg-muted/40 px-2 rounded">
                  {labelState.medicationName || "(No medication entered)"}
                </div>

                {/* Directions */}
                <div className="p-2 rounded border border-border/60 bg-muted/20 text-xs italic font-sans leading-relaxed text-foreground">
                  "{labelState.directions || "(No directions specified)"}"
                </div>

                {/* Selected Auxiliary Warnings */}
                {labelState.selectedLabelIds.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {labelState.selectedLabelIds.map((id) => {
                      const lbl = FRED_AUXILIARY_LABELS.find((l) => l.id === id);
                      if (!lbl) return null;
                      return (
                        <div key={id} className={`p-1.5 rounded border text-[10px] font-sans ${lbl.colorClass}`}>
                          <strong>{lbl.code}:</strong> {lbl.textEn}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Watermark and Initials */}
                <div className="border-t border-border/80 pt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>KEEP OUT OF REACH OF CHILDREN</span>
                  <span>DISP: <strong>{labelState.pharmacistInitials || "---"}</strong></span>
                </div>

                <div className="text-[9px] text-center text-muted-foreground/80 tracking-wider">
                  EDUCATIONAL SIMULATION DEMO • NO REAL DRUG DISPENSED
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                {T(
                  "این صرفاً یک پیش‌نمایش متنی/تصویری درون صفحه است. هیچ گزینه‌ای برای چاپ فیزیکی یا ثبت دائمی وجود ندارد.",
                  "In-page visual preview only. Physical printing and permanent storage are deliberately disabled."
                )}
              </p>
            </div>
          </div>
        </section>
      );
}
