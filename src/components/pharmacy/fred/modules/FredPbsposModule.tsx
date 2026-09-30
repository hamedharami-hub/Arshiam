import { CheckCircle2, Eye, Layers, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FRED_ACTION_WATERMARK_EN, FRED_ACTION_WATERMARK_FA, PBS_POS_PRACTICE_ITEMS, PBS_POS_RESULT_NOTICE_EN, PBS_POS_RESULT_NOTICE_FA, canOpenPbsPosPreview } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredPbsposModule() {
const { T, isEn, pbsPosState, handleAssignPbsPosItem, handleOpenPbsPosPreview, handleResetPbsPos, handleClosePbsPosPreview } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {T("پیش‌نمایش دسته‌بندی PBS/POS (صرفاً تمرین محلی)", "PBS/POS Categorization Practice (Local Training Only)")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {T(
                  "تمرین انتخاب و دسته‌بندی آیتم‌های تمرینی فرضی به گروه‌های محلی (بدون بیمار، دارو، کد یا تراکنش واقعی).",
                  "Practice assigning fictional training items to local training groups (zero patient, drug, code, or real transaction)."
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetPbsPos}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{T("بازنشانی دسته‌ها", "Reset Categories")}</span>
            </Button>
          </div>

          {/* Persistent Bilingual Watermark Header */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2 flex-wrap">
            <span>⚠️ {isEn ? FRED_ACTION_WATERMARK_EN : FRED_ACTION_WATERMARK_FA}</span>
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
              {FRED_ACTION_WATERMARK_EN}
            </Badge>
          </div>

          {/* Responsive 2-Column Grid (Mobile: 1 col, Desktop: 2 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Column 1: Items List and Group Assignment */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                {T("۱. تخصیص هر آیتم تمرینی به یک گروه", "1. Assign Each Training Item to a Group")}
              </label>

              <div className="space-y-3">
                {PBS_POS_PRACTICE_ITEMS.map((item) => {
                  const currentGroup = pbsPosState.assignments[item.id];
                  return (
                    <Card key={item.id} className="p-3.5 border border-border/80 bg-card space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <strong className="text-xs font-bold text-foreground">
                          {isEn ? item.titleEn : item.titleFa}
                        </strong>
                        <span className="rounded bg-slate-700/80 px-2 py-0.5 text-xs text-slate-300">
                          {isEn ? item.badgeEn : item.badgeFa}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {isEn ? item.descriptionEn : item.descriptionFa}
                      </p>
                      <div className="text-[10px] font-mono text-muted-foreground/80">
                        {isEn ? item.placeholderRefEn : item.placeholderRefFa}
                      </div>

                      {/* Group Assignment Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {T("انتخاب گروه:", "Select Group:")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-pressed={currentGroup === "group_a"}
                            onClick={() =>
                              handleAssignPbsPosItem(
                                item.id,
                                currentGroup === "group_a" ? null : "group_a"
                              )
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                              currentGroup === "group_a"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {T("گروه الف", "Group A")}
                          </button>
                          <button
                            type="button"
                            aria-pressed={currentGroup === "group_b"}
                            onClick={() =>
                              handleAssignPbsPosItem(
                                item.id,
                                currentGroup === "group_b" ? null : "group_b"
                              )
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                              currentGroup === "group_b"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {T("گروه ب", "Group B")}
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Open Preview Button */}
              <div className="pt-1">
                <Button
                  type="button"
                  onClick={handleOpenPbsPosPreview}
                  disabled={!canOpenPbsPosPreview(pbsPosState.assignments)}
                  className="w-full gap-2 cursor-pointer font-bold"
                >
                  <Eye className="h-4 w-4" />
                  <span>{T("باز کردن پیش‌نمایش دسته‌بندی", "Open Categorization Preview")}</span>
                </Button>
                {!canOpenPbsPosPreview(pbsPosState.assignments) && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                    {T(
                      "جهت فعال‌سازی پیش‌نمایش، برای هر سه آیتم تمرینی یک گروه انتخاب کنید.",
                      "To enable preview, assign a group to all three training items."
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Column 2: In-Page Grouping Preview or Placeholder */}
            <div>
              {!pbsPosState.previewOpen ? (
                <Card className="p-6 border-dashed border-2 border-border/80 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px] bg-muted/10">
                  <div className="p-3 rounded-full bg-muted text-muted-foreground">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {T("پیش‌نمایش دسته‌بندی هنوز باز نشده است", "Categorization Preview Not Yet Opened")}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      {T(
                        "برای هر سه آیتم تمرینی، یک دسته (گروه الف یا ب) انتخاب کنید تا پیش‌نمایش گروه محلی فعال شود.",
                        "Assign all three training items to a group (Group A or Group B) to activate the local grouping preview."
                      )}
                    </p>
                  </div>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                      {FRED_ACTION_WATERMARK_EN}
                    </Badge>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 sm:p-5 border-2 border-primary/40 shadow-sm space-y-4 bg-card">
                  {/* Confirmation Notice */}
                  <div role="status" aria-live="polite" className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold">
                        {isEn ? PBS_POS_RESULT_NOTICE_EN : PBS_POS_RESULT_NOTICE_FA}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      {T("شبیه‌سازی محلی", "Local Simulation Only")}
                    </Badge>
                  </div>

                  {/* Group Containers Mockup */}
                  <div
                    className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/30 space-y-3 font-sans text-xs relative overflow-hidden"
                    dir={isEn ? "ltr" : "rtl"}
                  >
                    {/* Group A Box */}
                    <div className="p-3 rounded-lg bg-background border border-border/60 space-y-2">
                      <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                        <strong className="text-xs font-bold text-foreground">
                          {isEn ? "Training Group A" : "دسته تمرینی الف"}
                        </strong>
                        <Badge variant="secondary" className="text-[10px]">
                          {PBS_POS_PRACTICE_ITEMS.filter((i) => pbsPosState.assignments[i.id] === "group_a").length} {T("آیتم", "Items")}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {PBS_POS_PRACTICE_ITEMS.filter((i) => pbsPosState.assignments[i.id] === "group_a").map((item) => (
                          <div key={item.id} className="p-1.5 rounded bg-muted/40 text-[11px] font-mono flex items-center justify-between">
                            <span>{isEn ? item.titleEn : item.titleFa}</span>
                            <span className="text-muted-foreground">{isEn ? item.placeholderRefEn : item.placeholderRefFa}</span>
                          </div>
                        ))}
                        {PBS_POS_PRACTICE_ITEMS.filter((i) => pbsPosState.assignments[i.id] === "group_a").length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic py-1">
                            {T("هیچ آیتمی در این دسته قرار نگرفته است.", "No items assigned to this group.")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Group B Box */}
                    <div className="p-3 rounded-lg bg-background border border-border/60 space-y-2">
                      <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                        <strong className="text-xs font-bold text-foreground">
                          {isEn ? "Training Group B" : "دسته تمرینی ب"}
                        </strong>
                        <Badge variant="secondary" className="text-[10px]">
                          {PBS_POS_PRACTICE_ITEMS.filter((i) => pbsPosState.assignments[i.id] === "group_b").length} {T("آیتم", "Items")}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {PBS_POS_PRACTICE_ITEMS.filter((i) => pbsPosState.assignments[i.id] === "group_b").map((item) => (
                          <div key={item.id} className="p-1.5 rounded bg-muted/40 text-[11px] font-mono flex items-center justify-between">
                            <span>{isEn ? item.titleEn : item.titleFa}</span>
                            <span className="text-muted-foreground">{isEn ? item.placeholderRefEn : item.placeholderRefFa}</span>
                          </div>
                        ))}
                        {PBS_POS_PRACTICE_ITEMS.filter((i) => pbsPosState.assignments[i.id] === "group_b").length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic py-1">
                            {T("هیچ آیتمی در این دسته قرار نگرفته است.", "No items assigned to this group.")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Persistent Watermark Stamp on Mockup */}
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center font-bold text-[10px] tracking-wider text-amber-800 dark:text-amber-300">
                      ⚠️ {FRED_ACTION_WATERMARK_EN} • {FRED_ACTION_WATERMARK_FA}
                    </div>
                  </div>

                  {/* Footer Close Preview Button */}
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleClosePbsPosPreview}
                      className="cursor-pointer text-xs"
                    >
                      {T("بستن پیش‌نمایش", "Close Preview")}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Persistent Footer Watermark */}
          <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 text-center font-bold text-xs tracking-wider text-muted-foreground">
            {FRED_ACTION_WATERMARK_EN} • {FRED_ACTION_WATERMARK_FA}
          </div>
        </section>
      );
}
