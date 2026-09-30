import { CheckCircle2, Eye, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FINAL_REVIEW_CHECKLIST_CRITERIA, FINAL_REVIEW_CONFIRMATION_EN, FINAL_REVIEW_CONFIRMATION_FA, FINAL_REVIEW_ENTRIES, FINAL_REVIEW_WATERMARK_EN, FINAL_REVIEW_WATERMARK_FA, canOpenFinalReviewPreview } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredReviewModule() {
const { T, isEn, finalReviewState, handleSelectFinalReviewEntry, handleToggleFinalReviewCriterion, handleOpenFinalReviewPreview, handleResetFinalReview, handleCloseFinalReviewPreview, activeReviewEntry } = useFredPractice();
return (
        <section
          className="space-y-5 animate-in fade-in duration-200"
          aria-label={T("پیش‌نمایش بازبینی پایانی", "Final Review Preview")}
        >
          {/* Module Header Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {T("پیش‌نمایش بازبینی پایانی (صرفاً تمرینی)", "Final Review Preview (Practice Only)")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {T(
                  "بررسی بصری کیفیت چیدمان فرم بدون داده‌های واقعی یا نسخه‌پیچی.",
                  "Visual check of form layout quality with zero real-world data or dispensing."
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFinalReview}
              className="cursor-pointer text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{T("بازنشانی بازبینی", "Reset Review")}</span>
            </Button>
          </div>

          {/* Prominent Permanent Watermark Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-bold tracking-wide">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="font-mono">{FINAL_REVIEW_WATERMARK_EN}</span>
            </div>
            <div className="text-[11px] font-sans font-medium text-amber-800 dark:text-amber-300">
              ⚠️ {FINAL_REVIEW_WATERMARK_FA}
            </div>
          </div>

          {/* Responsive Layout: Mobile 1 col, Desktop 2 cols (max 2 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Column 1: Configuration & 3 Visual Quality Checkboxes */}
            <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Eye className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="font-bold text-sm text-foreground">
                  {T("پیکربندی و معیارهای بازبینی بصری", "Review Configuration & Visual Criteria")}
                </h3>
              </div>

              {/* Entry Selection: Training A / Training B */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  {T("انتخاب ورودی تمرینی ساختگی:", "Select Fictional Training Entry:")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {FINAL_REVIEW_ENTRIES.map((entry) => {
                    const isSelected = finalReviewState.selectedEntryId === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectFinalReviewEntry(entry.id)}
                        className={`p-3 rounded-xl border text-start transition cursor-pointer space-y-1 ${
                          isSelected
                            ? "bg-sky-500/10 border-sky-500/50 text-foreground ring-1 ring-sky-500/30"
                            : "bg-muted/30 border-border/60 hover:bg-muted/50 text-muted-foreground"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <strong className="text-xs font-bold text-foreground">
                            {isEn ? entry.titleEn : entry.titleFa}
                          </strong>
                          <Badge variant="outline" className="text-[9px]">
                            {isEn ? entry.badgeEn : entry.badgeFa}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed break-words" dir="auto">
                          {isEn ? entry.descriptionEn : entry.descriptionFa}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 Visual Quality Checkboxes */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground block">
                    {T("معیارهای سه‌گانه کیفیت بصری تمرین:", "Three Visual Quality Criteria for Practice:")}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {T(
                      "برای فعال‌شدن پیش‌نمایش تمرینی، تمام ۳ مورد زیر باید تأیید شوند.",
                      "All 3 checkboxes must be confirmed to enable the practice preview."
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  {FINAL_REVIEW_CHECKLIST_CRITERIA.map((criterion) => {
                    const isChecked = finalReviewState.checklist[criterion.id];
                    return (
                      <label
                        key={criterion.id}
                        htmlFor={`final-review-${criterion.id}`}
                        className={`p-2.5 rounded-xl border flex items-start gap-3 transition cursor-pointer select-none ${
                          isChecked
                            ? "bg-sky-500/5 border-sky-500/30"
                            : "bg-muted/20 border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`final-review-${criterion.id}`}
                          checked={isChecked}
                          onChange={() => handleToggleFinalReviewCriterion(criterion.id)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                        />
                        <div className="space-y-0.5 text-xs leading-snug">
                          <span className="font-semibold text-foreground block">
                            {isEn ? criterion.labelEn : criterion.labelFa}
                          </span>
                          <span className="text-[11px] text-muted-foreground block" dir="auto">
                            {isEn ? criterion.descriptionEn : criterion.descriptionFa}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="default"
                  onClick={handleOpenFinalReviewPreview}
                  disabled={!canOpenFinalReviewPreview(finalReviewState.selectedEntryId, finalReviewState.checklist)}
                  className="flex-1 cursor-pointer text-xs"
                >
                  <Eye className="h-4 w-4 me-1.5" />
                  <span>{T("باز کردن پیش‌نمایش تمرینی", "Open Practice Preview")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFinalReview}
                  className="cursor-pointer text-xs"
                >
                  <span>{T("بازنشانی", "Reset")}</span>
                </Button>
              </div>
            </Card>

            {/* Column 2: In-Page Preview Area */}
            <div className="space-y-4">
              {!finalReviewState.previewOpen ? (
                <Card className="p-6 text-center border-dashed border-border/80 bg-muted/20 space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {T("پیش‌نمایش تمرینی هنوز باز نشده است", "Practice Preview Not Yet Opened")}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      {T(
                        "یکی از دو ورودی تمرین A یا تمرین B را انتخاب کرده و هر سه معیار کیفیت بصری را علامت بزنید تا پیش‌نمایش درون‌صفحه‌ای فعال شود.",
                        "Select Training A or Training B and confirm all three visual quality items to activate the in-page preview."
                      )}
                    </p>
                  </div>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                      {FINAL_REVIEW_WATERMARK_EN}
                    </Badge>
                  </div>
                </Card>
              ) : (
                activeReviewEntry && (
                  <Card className="p-4 sm:p-5 border-2 border-sky-500/40 shadow-sm space-y-4 bg-card">
                    {/* Confirmation Notice */}
                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-950 dark:text-sky-200 text-xs flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span className="font-semibold">
                          {isEn ? FINAL_REVIEW_CONFIRMATION_EN : FINAL_REVIEW_CONFIRMATION_FA}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-sky-500/40 text-sky-600 dark:text-sky-400">
                        {T("شبیه‌سازی محلی", "Local Simulation Only")}
                      </Badge>
                    </div>

                    {/* Fictional Practice Sheet Mockup */}
                    <div
                      className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/30 space-y-3 font-sans text-xs relative overflow-hidden"
                      dir={isEn ? "ltr" : "rtl"}
                    >
                      {/* Top Mockup Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                          <strong className="text-sm font-bold text-foreground">
                            {isEn ? activeReviewEntry.titleEn : activeReviewEntry.titleFa}
                          </strong>
                        </div>
                        <Badge className="bg-sky-600 text-white text-[10px]">
                          {isEn ? activeReviewEntry.badgeEn : activeReviewEntry.badgeFa}
                        </Badge>
                      </div>

                      {/* Mockup Description */}
                      <p className="text-muted-foreground text-xs leading-relaxed" dir="auto">
                        {isEn ? activeReviewEntry.descriptionEn : activeReviewEntry.descriptionFa}
                      </p>

                      {/* Synthetic Placeholder Zones */}
                      <div className="p-3 rounded-lg bg-background/80 border border-border/60 font-mono text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed" dir="auto">
                        {isEn ? activeReviewEntry.zonePreviewEn : activeReviewEntry.zonePreviewFa}
                      </div>

                      {/* Persistent Watermark Stamp on Mockup */}
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center font-bold text-[10px] tracking-wider text-amber-800 dark:text-amber-300">
                        ⚠️ {FINAL_REVIEW_WATERMARK_EN} • {FINAL_REVIEW_WATERMARK_FA}
                      </div>
                    </div>

                    {/* Footer Close Preview Button */}
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleCloseFinalReviewPreview}
                        className="cursor-pointer text-xs"
                      >
                        {T("بستن پیش‌نمایش", "Close Preview")}
                      </Button>
                    </div>
                  </Card>
                )
              )}
            </div>
          </div>
        </section>
      );
}
