import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FRED_SAFETY_NET_SCENARIOS } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredSafetynetModule() {
const { T, isEn, selectedSafetyNetId, setSelectedSafetyNetId, safetyNetStep, setSafetyNetStep, selectedGapAnswer, setSelectedGapAnswer, selectedStatusAnswer, setSelectedStatusAnswer, safetyNetScenario, resetSafetyNet } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {T("تمرین محاسبه‌گر آستانه Safety Net (مبالغ مصوب ۲۰۲۶)", "PBS Safety Net Threshold Practice (2026 Reference Snapshot)")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {T(
                  "محاسبه مرحله‌ای فاصله تا آستانه و ارزیابی سهم بیمار بر پایه مقادیر ۲۰۲۶ Services Australia (ارقام تمرینی فرضی و غیربازبینی‌شده).",
                  "Step-by-step gap calculation and evaluation using fictional training values and Services Australia 2026 snapshot figures (unreviewed)."
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetSafetyNet}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {T("شروع مجدد", "Reset")}
            </Button>
          </div>

          {/* Official Source & Practice Disclaimer Banner */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
              <span className="font-semibold text-foreground">
                {T("مرجع رسمی مبالغ آستانه (مورخ ۲۰۲۶/۰۱/۰۱، بازبینی ۲۶ سپتامبر ۲۰۲۶):", "Official Threshold Reference (Services Australia 2026-01-01, Checked 26 Sep 2026):")}
              </span>
              <a
                href="https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline hover:text-primary/80 font-sans"
              >
                servicesaustralia.gov.au/pbs-safety-net-thresholds
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed" dir="auto">
              {T(
                "آستانه‌های رسمی سال ۲۰۲۶: عمومی ۱,۷۴۸.۲۰ دلار (پرداخت پیش از آستانه تا سقف ۲۵.۰۰ دلار)؛ امتیازی/دارای کارت تخفیف ۲۷۷.۲۰ دلار (تا سقف ۷.۷۰ دلار). قیمت فرآورده، برند انتخابی و شرایط فردی ممکن است مبالغ واقعی را تغییر دهند. این ابزار تمرینی، واجدشرایط‌بودن واقعی، مبالغ پرداختی نهایی یا صدور کارت Safety Net را تعیین نمی‌کند؛ کلیه پرداخت‌های زیر «ارقام تمرینی فرضی» هستند و نه پروندهٔ واقعی بیمار.",
                "2026 official thresholds: General $1,748.20 (pre-threshold costs up to $25.00); Concessional $277.20 (pre-threshold costs up to $7.70). Actual item prices, brand choice, and individual circumstances may change real amounts. This practice tool does not calculate actual eligibility/payment or determine issue of a Safety Net card; all amounts below are strictly fictional training values."
              )}
            </p>
          </div>

          {/* Scenario Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FRED_SAFETY_NET_SCENARIOS.map((sn) => {
              const isSelected = sn.id === selectedSafetyNetId;
              return (
                <button
                  key={sn.id}
                  type="button"
                  onClick={() => {
                    setSelectedSafetyNetId(sn.id);
                    resetSafetyNet();
                  }}
                  className={`p-3.5 rounded-xl border text-start transition cursor-pointer space-y-1.5 ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40"
                      : "border-border/70 bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">
                      {isEn ? sn.titleEn : sn.titleFa}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {sn.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {isEn ? sn.descriptionEn : sn.descriptionFa}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Stepped Safety Net Card */}
          <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
            {/* Step Indicators */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-xs font-semibold">
              <span className={`px-2.5 py-1 rounded-md ${safetyNetStep === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {T("۱. مرور ارقام پرونده", "1. Case Values")}
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-md ${safetyNetStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {T("۲. محاسبه شکاف تا آستانه", "2. Gap Calculation")}
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-md ${safetyNetStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {T("۳. وضعیت صدور کارت", "3. Outcome")}
              </span>
            </div>

            {/* Step 0: Base Case Values */}
            {safetyNetStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
                    <span className="text-muted-foreground block">{T("مجموع پرداخت فرضی تمرینی سال جاری", "Fictional Training Spend")}</span>
                    <span className="font-mono text-base font-bold text-foreground">
                      ${safetyNetScenario.currentSpend.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
                    <span className="text-muted-foreground block">{T("آستانه مصوب ۲۰۲۶ (Services Australia)", "2026 Annual Threshold (Services Australia)")}</span>
                    <span className="font-mono text-base font-bold text-foreground">
                      ${safetyNetScenario.syntheticThreshold.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
                    <span className="text-muted-foreground block">{T("سقف فرضی پیش از آستانه", "Illustrative Max Before Threshold")}</span>
                    <span className="font-mono text-base font-bold text-foreground text-primary">
                      ${safetyNetScenario.scriptContribution.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSafetyNetStep(1)}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <span>{T("گام بعد: ارزیابی فاصله تا آستانه", "Next: Calculate Gap")}</span>
                    {isEn ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Gap Calculation Question */}
            {safetyNetStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-foreground">
                    {T("فاصله هزینه جاری بیمار تا سقف Safety Net چقدر است؟", "What is the remaining spend required to reach the Safety Net threshold?")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    ${safetyNetScenario.syntheticThreshold.toFixed(2)} (آستانه) - ${safetyNetScenario.currentSpend.toFixed(2)} (پرداخت جاری)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    safetyNetScenario.expectedRemainingBeforeScript,
                    Number((safetyNetScenario.expectedRemainingBeforeScript + 15.5).toFixed(2)),
                    Number((safetyNetScenario.expectedRemainingBeforeScript - 10.0 > 0 ? safetyNetScenario.expectedRemainingBeforeScript - 10.0 : 45.0).toFixed(2)),
                  ]
                    .sort((a, b) => a - b)
                    .map((val) => {
                      const isSelected = selectedGapAnswer === val;
                      const isCorrect = val === safetyNetScenario.expectedRemainingBeforeScript;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSelectedGapAnswer(val)}
                          className={`p-3 rounded-xl border text-center font-mono font-bold text-sm transition cursor-pointer ${
                            isSelected
                              ? isCorrect
                                ? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                                : "bg-destructive/15 border-destructive text-destructive"
                              : "bg-muted/30 border-border/70 hover:bg-muted"
                          }`}
                        >
                          ${val.toFixed(2)}
                        </button>
                      );
                    })}
                </div>

                {selectedGapAnswer !== null && (
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      selectedGapAnswer === safetyNetScenario.expectedRemainingBeforeScript
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-destructive/10 border-destructive/30 text-destructive"
                    }`}
                  >
                    {selectedGapAnswer === safetyNetScenario.expectedRemainingBeforeScript ? (
                      <p>
                        ✓ {T("محاسبه صحیح است.", "Calculation correct.")} {T("فاصله تا سقف دقیقاً", "The remaining gap is exactly")}{" "}
                        <strong>${safetyNetScenario.expectedRemainingBeforeScript.toFixed(2)}</strong>.{" "}
                        {safetyNetScenario.expectedCrossesThreshold
                          ? T("سقف فرضی نسخه کنونی ($" + safetyNetScenario.scriptContribution.toFixed(2) + ") از این فاصله بیشتر است، بنابراین در این تمرین از سقف عبور می‌کند.", "Illustrative maximum exceeds this gap, crossing the threshold in this exercise.")
                          : T("سقف فرضی نسخه کنونی از این فاصله کمتر است، بنابراین در این تمرین هنوز به سقف نرسیده‌ایم.", "Illustrative maximum does not reach the threshold in this exercise.")}
                      </p>
                    ) : (
                      <p>
                        ✕ {T("محاسبه نادرست است. لطفاً اختلاف بین آستانه و هزینه جاری را بررسی کنید.", "Incorrect. Check the difference between threshold and current spend.")}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSafetyNetStep(0)}
                    className="text-xs cursor-pointer"
                  >
                    {T("مرحله قبل", "Previous")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedGapAnswer !== safetyNetScenario.expectedRemainingBeforeScript}
                    onClick={() => setSafetyNetStep(2)}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <span>{T("گام بعد: وضعیت نهایی سهم بیمار", "Next: Card Outcome")}</span>
                    {isEn ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Card Eligibility & Outcome */}
            {safetyNetStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-foreground">
                    {T("پس از این نسخه، وضعیت برخورداری از Safety Net چگونه است؟", "What is the patient's Safety Net status after this prescription?")}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatusAnswer(true)}
                    className={`p-3.5 rounded-xl border text-start transition cursor-pointer space-y-1 ${
                      selectedStatusAnswer === true
                        ? safetyNetScenario.expectedCrossesThreshold
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                          : "bg-destructive/15 border-destructive text-destructive"
                        : "bg-muted/30 border-border/70 hover:bg-muted"
                    }`}
                  >
                    <div className="font-bold text-xs">
                    {T("در تمرین ساختگی از آستانهٔ فرضی عبور می‌کند", "Fictional exercise threshold crossed")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {T("این پاسخ هیچ واجدشرایط‌بودن یا پرداخت واقعی را تعیین نمی‌کند.", "This does not determine real eligibility or payment.")}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatusAnswer(false)}
                    className={`p-3.5 rounded-xl border text-start transition cursor-pointer space-y-1 ${
                      selectedStatusAnswer === false
                        ? !safetyNetScenario.expectedCrossesThreshold
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                          : "bg-destructive/15 border-destructive text-destructive"
                        : "bg-muted/30 border-border/70 hover:bg-muted"
                    }`}
                  >
                    <div className="font-bold text-xs">
                    {T("در تمرین ساختگی هنوز از آستانهٔ فرضی عبور نمی‌کند", "Fictional exercise threshold not crossed")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {T("این پاسخ هیچ واجدشرایط‌بودن یا پرداخت واقعی را تعیین نمی‌کند.", "This does not determine real eligibility or payment.")}
                    </div>
                  </button>
                </div>

                {selectedStatusAnswer !== null && (
                  <div
                    className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${
                      selectedStatusAnswer === safetyNetScenario.expectedCrossesThreshold
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                        : "bg-destructive/10 border-destructive/30 text-destructive"
                    }`}
                  >
                    <p className="font-bold">
                      {selectedStatusAnswer === safetyNetScenario.expectedCrossesThreshold
                        ? "✓ " + T("نتیجه‌گیری صحیح است.", "Conclusion correct.")
                        : "✕ " + T("پاسخ با سناریو همخوانی ندارد.", "Answer does not match scenario values.")}
                    </p>
                    <p>
                      {isEn
                        ? safetyNetScenario.expectedPostScriptStatusEn
                        : safetyNetScenario.expectedPostScriptStatusFa}
                    </p>
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSafetyNetStep(1)}
                    className="text-xs cursor-pointer"
                  >
                    {T("مرحله قبل", "Previous")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetSafetyNet}
                    className="gap-1.5 text-xs cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{T("تکرار سناریو", "Restart Scenario")}</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      );
}
