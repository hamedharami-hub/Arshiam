import { CheckCircle2, HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FRED_RETENTION_DOCUMENTS, type RetentionBucket } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredRetentionModule() {
const { T, isEn, retentionSelections, retentionVerified, setRetentionVerified, resetRetention, handleSelectRetentionBucket, canVerifyRetention } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {T("تمرین دسته‌بندی و بایگانی مدارک (Document Retention)", "Document Retention & Archiving Practice")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {T(
                  "این دسته‌های ساختگی هیچ مدت یا قاعدهٔ واقعی نگهداری اسناد را نشان نمی‌دهند؛ تغییرات فقط در حافظهٔ موقت صفحه است.",
                  "These fictional buckets do not represent real retention periods or rules; changes remain in temporary page state."
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetRetention}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {T("شروع مجدد بایگانی", "Reset Archiving")}
            </Button>
          </div>

          <div className="space-y-3.5">
            {FRED_RETENTION_DOCUMENTS.map((doc) => {
              const currentSelection = retentionSelections[doc.id] || "";
              const isMatch = currentSelection === doc.exerciseBucket;
              return (
                <Card key={doc.id} className="p-4 sm:p-5 border-border/80 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                          {doc.code}
                        </span>
                        <h3 className="text-sm font-bold text-foreground">
                          {isEn ? doc.titleEn : doc.titleFa}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isEn ? doc.descriptionEn : doc.descriptionFa}
                      </p>
                    </div>

                    {/* Bucket Select */}
                    <div className="w-full sm:w-64">
                      <select
                        aria-label={`Exercise bucket for ${doc.code}`}
                        value={currentSelection}
                        onChange={(e) => handleSelectRetentionBucket(doc.id, e.target.value as RetentionBucket | "")}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      >
                        <option value="">{T("انتخاب دستهٔ تمرینی...", "Select exercise bucket...")}</option>
                        <option value="bucket_a">
                          {T("دستهٔ تمرینی A (ساختگی)", "Exercise bucket A (fictional)")}
                        </option>
                        <option value="bucket_b">
                          {T("دستهٔ تمرینی B (ساختگی)", "Exercise bucket B (fictional)")}
                        </option>
                        <option value="bucket_c">
                          {T("دستهٔ تمرینی C (ساختگی)", "Exercise bucket C (fictional)")}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Feedback after verification */}
                  {retentionVerified && currentSelection && (
                    <div
                      className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                        isMatch
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {isMatch ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{T("با کلید تمرین ساختگی همخوانی دارد.", "Matches the fictional exercise key.")}</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>{T("با کلید تمرین ساختگی همخوانی ندارد.", "Does not match the fictional exercise key.")}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isEn ? doc.exerciseNoteEn : doc.exerciseNoteFa}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={() => setRetentionVerified(true)}
              disabled={!canVerifyRetention}
              className="gap-2 cursor-pointer text-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{T("بررسی دسته‌بندی‌ها (Check Retention)", "Check Retention")}</span>
            </Button>
          </div>
        </section>
      );
}
