import { CheckCircle2, Clock, Eye, FileText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FRED_ACTION_WATERMARK_EN, FRED_ACTION_WATERMARK_FA, ODT_SESSION_CHECKLIST_CRITERIA, ODT_SESSION_ENTRIES, ODT_SESSION_RESULT_NOTICE_EN, ODT_SESSION_RESULT_NOTICE_FA, canOpenOdtSessionPreview } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredOdtModule() {
const { T, isEn, odtState, handleSelectOdtEntry, handleSelectOdtFormat, handleToggleOdtCriterion, handleOpenOdtPreview, handleResetOdt, handleCloseOdtPreview, activeOdtEntry } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {T("تمرین ثبت جلسه ODT (صرفاً ساختگی و نمایشی)", "ODT Session Practice (Fictional Training Only)")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {T(
                  "تمرین تعاملی ساختار ثبت رویدادهای فرضی با برچسب‌های تمرینی و بررسی کیفیت و خوانایی (بدون دادهٔ بالینی، دوز یا ثبت واقعی).",
                  "Interactive structure practice for fictional event logs with training labels and quality checks (zero real clinical data or official log)."
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetOdt}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{T("بازنشانی جلسه", "Reset Session")}</span>
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
            {/* Column 1: Entry Selection, Format, and Checklist */}
            <div className="space-y-4">
              {/* Training Entries Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  {T("۱. انتخاب سناریوی تمرینی", "1. Select Training Scenario")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ODT_SESSION_ENTRIES.map((entry) => {
                    const isSelected = odtState.selectedEntryId === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectOdtEntry(entry.id)}
                        className={`p-3 rounded-xl border text-start transition cursor-pointer space-y-1.5 flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                            : "border-border hover:border-primary/50 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 w-full">
                          <span className="font-bold text-xs text-foreground">
                            {isEn ? entry.titleEn : entry.titleFa}
                          </span>
                          <span className="rounded bg-slate-700/80 px-2 py-0.5 text-xs text-slate-300">
                            {isEn ? entry.badgeEn : entry.badgeFa}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {isEn ? entry.descriptionEn : entry.descriptionFa}
                        </p>
                        <div className="text-[10px] font-mono text-muted-foreground/80 pt-1 border-t border-border/60">
                          {isEn ? entry.placeholderSessionRefEn : entry.placeholderSessionRefFa}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  {T("۲. انتخاب قالب ثبت ساختگی", "2. Select Fictional Format")}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!odtState.selectedEntryId}
                    aria-pressed={odtState.selectedFormat === "format_a"}
                    onClick={() => handleSelectOdtFormat("format_a")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      !odtState.selectedEntryId
                        ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                        : odtState.selectedFormat === "format_a"
                        ? "cursor-pointer border-primary bg-primary/10 text-primary font-bold"
                        : "cursor-pointer border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {T("قالب آلفا (Format Alpha)", "Format Alpha")}
                  </button>
                  <button
                    type="button"
                    disabled={!odtState.selectedEntryId}
                    aria-pressed={odtState.selectedFormat === "format_b"}
                    onClick={() => handleSelectOdtFormat("format_b")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      !odtState.selectedEntryId
                        ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                        : odtState.selectedFormat === "format_b"
                        ? "cursor-pointer border-primary bg-primary/10 text-primary font-bold"
                        : "cursor-pointer border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {T("قالب بتا (Format Beta)", "Format Beta")}
                  </button>
                </div>
                {!odtState.selectedEntryId && (
                  <p className="text-[11px] text-muted-foreground">
                    {T(
                      "ابتدا یک سناریوی تمرینی را از بالا انتخاب کنید تا انتخاب قالب فعال شود.",
                      "Select a training scenario above first to enable format selection."
                    )}
                  </p>
                )}
              </div>

              {/* 3 Visual Readability & Completeness Checkboxes */}
              <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  {T("۳. چک‌لیست خوانایی و ساختار تمرینی", "3. Structure & Readability Checklist")}
                </label>
                <div className="space-y-2">
                  {ODT_SESSION_CHECKLIST_CRITERIA.map((criterion) => {
                    const isChecked = odtState.checklist[criterion.id];
                    const inputId = `odt-checklist-${criterion.id}`;
                    return (
                      <label
                        key={criterion.id}
                        htmlFor={inputId}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition text-xs select-none ${
                          isChecked
                            ? "bg-primary/5 border-primary/40 text-foreground"
                            : "bg-card border-border/70 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOdtCriterion(criterion.id)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary cursor-pointer focus:ring-primary"
                        />
                        <div className="space-y-0.5">
                          <span className="font-semibold block leading-tight text-foreground">
                            {isEn ? criterion.labelEn : criterion.labelFa}
                          </span>
                          <span className="text-[11px] text-muted-foreground block leading-tight">
                            {isEn ? criterion.descriptionEn : criterion.descriptionFa}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Open Preview Button */}
              <div className="pt-1">
                <Button
                  type="button"
                  onClick={handleOpenOdtPreview}
                  disabled={!canOpenOdtSessionPreview(odtState.selectedEntryId, odtState.checklist)}
                  className="w-full gap-2 cursor-pointer font-bold"
                >
                  <Eye className="h-4 w-4" />
                  <span>{T("باز کردن پیش‌نمایش رویداد", "Open Session Preview")}</span>
                </Button>
                {!odtState.selectedEntryId && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                    {T(
                      "جهت فعال‌سازی پیش‌نمایش، ابتدا یک تمرین را انتخاب کرده و هر ۳ معیار چک‌لیست را علامت بزنید.",
                      "To enable the preview, select a training scenario and check all 3 criteria."
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Column 2: In-Page Preview or Placeholder */}
            <div>
              {!odtState.previewOpen ? (
                <Card className="p-6 border-dashed border-2 border-border/80 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px] bg-muted/10">
                  <div className="p-3 rounded-full bg-muted text-muted-foreground">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {T("پیش‌نمایش رویداد هنوز باز نشده است", "Session Preview Not Yet Opened")}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      {T(
                        "یکی از دو تمرین A یا B را انتخاب کرده و هر سه معیار خوانایی و ساختار را تأیید کنید تا پیش‌نمایش فعال شود.",
                        "Select Training A or Training B and confirm all three structure and completeness items to activate the in-page preview."
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
                activeOdtEntry && (
                  <Card className="p-4 sm:p-5 border-2 border-primary/40 shadow-sm space-y-4 bg-card">
                    {/* Confirmation Notice */}
                    <div role="status" aria-live="polite" className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold">
                          {isEn ? ODT_SESSION_RESULT_NOTICE_EN : ODT_SESSION_RESULT_NOTICE_FA}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        {T("شبیه‌سازی محلی", "Local Simulation Only")}
                      </Badge>
                    </div>

                    {/* Fictional Practice Session Mockup */}
                    <div
                      className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/30 space-y-3 font-sans text-xs relative overflow-hidden"
                      dir={isEn ? "ltr" : "rtl"}
                    >
                      {/* Top Mockup Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <strong className="text-sm font-bold text-foreground">
                            {isEn ? activeOdtEntry.titleEn : activeOdtEntry.titleFa}
                          </strong>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-[10px]">
                          {isEn ? activeOdtEntry.badgeEn : activeOdtEntry.badgeFa}
                        </Badge>
                      </div>

                      {/* Mockup Description */}
                      <p className="text-muted-foreground text-xs leading-relaxed" dir="auto">
                        {isEn ? activeOdtEntry.descriptionEn : activeOdtEntry.descriptionFa}
                      </p>

                      {/* Synthetic Reference & Pattern Info */}
                      <div className="p-3 rounded-lg bg-background/80 border border-border/60 space-y-1.5 text-[11px] leading-relaxed" dir="auto">
                        <div className="font-mono text-muted-foreground">
                          {isEn ? activeOdtEntry.placeholderSessionRefEn : activeOdtEntry.placeholderSessionRefFa}
                        </div>
                        <div className="text-muted-foreground font-mono">
                          {isEn ? activeOdtEntry.placeholderPatternEn : activeOdtEntry.placeholderPatternFa}
                        </div>
                        <div className="text-muted-foreground font-mono">
                          {isEn ? `Selected Format: ${odtState.selectedFormat === "format_a" ? "Format Alpha" : "Format Beta"}` : `قالب انتخابی: ${odtState.selectedFormat === "format_a" ? "قالب آلفا" : "قالب بتا"}`}
                        </div>
                      </div>

                      {/* Fictional Table Columns Placeholder */}
                      <div className="p-2.5 rounded-lg bg-background border border-border/60 font-mono text-[10px] space-y-1 text-muted-foreground">
                        <div className="flex justify-between border-b border-border/40 pb-1">
                          <span>[COL: EVENT_REF]</span>
                          <span>[COL: STRUCTURE_MODE]</span>
                          <span>[COL: STATUS]</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span>SIM-EVT-01</span>
                          <span>{odtState.selectedFormat === "format_a" ? "STRUCTURE_A" : "STRUCTURE_B"}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">PREVIEW_ONLY</span>
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
                        onClick={handleCloseOdtPreview}
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

          {/* Persistent Footer Watermark */}
          <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 text-center font-bold text-xs tracking-wider text-muted-foreground">
            {FRED_ACTION_WATERMARK_EN} • {FRED_ACTION_WATERMARK_FA}
          </div>
        </section>
      );
}
