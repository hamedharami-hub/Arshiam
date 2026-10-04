import { CheckCircle2, Eye, HelpCircle, Keyboard, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FRED_VISUALIZER_SECTIONS, SYNTHETIC_VISUALIZER_SCRIPTS } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredVisualizerModule() {
const { T, isEn, selectedVisualizerScriptId, setSelectedVisualizerScriptId, selectedSectionId, setSelectedSectionId, visualizerScript, activeSectionDetail, resetVisualizer } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {T("نمایشگر چیدمان تمرینی", "Practice Layout Visualizer")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {T(
                  "بررسی تعاملی بخش‌های چیدمان تمرینی ساختگی بدون داده‌های بالینی یا مشخصات واقعی.",
                  "Interactive inspection of fictional layout sections without clinical or real-world details."
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetVisualizer}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {T("بازنشانی بازرس", "Reset Inspector")}
            </Button>
          </div>

          {/* Fictional Layout Selector */}
          <div className="flex items-center gap-2 flex-wrap" dir={isEn ? "ltr" : "rtl"}>
            <span className="text-xs font-semibold text-muted-foreground">
              {T("انتخاب چیدمان تمرینی ساختگی:", "Select fictional practice layout:")}
            </span>
            {SYNTHETIC_VISUALIZER_SCRIPTS.map((s) => {
              const isSelected = s.id === selectedVisualizerScriptId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedVisualizerScriptId(s.id);
                    setSelectedSectionId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-purple-500/15 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs"
                      : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{isEn ? s.layoutNameEn : s.layoutNameFa}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {isEn ? (s.layoutBadgeEn || s.layoutBadge) : (s.layoutBadgeFa || s.layoutBadge)}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Visualizer Main Grid: Left = Practice Sheet, Right = Section Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Synthetic Practice Sheet (7 or 8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1" dir={isEn ? "ltr" : "rtl"}>
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? visualizerScript.layoutNameEn : visualizerScript.layoutNameFa}</span>
                </span>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
                  {isEn ? (visualizerScript.layoutBadgeEn || visualizerScript.layoutBadge) : (visualizerScript.layoutBadgeFa || visualizerScript.layoutBadge)}
                </Badge>
              </div>

              {/* Fictional Sheet Container */}
              <div
                className="bg-[#fcfbf7] dark:bg-card text-slate-900 dark:text-slate-100 border-2 border-teal-800/80 rounded-2xl p-4 sm:p-5 shadow-md space-y-3 font-mono text-xs select-none"
                dir={isEn ? "ltr" : "rtl"}
              >
                {/* Paper Header */}
                <div className="border-b-2 border-teal-800 pb-2 flex items-center justify-between gap-2 flex-wrap" dir={isEn ? "ltr" : "rtl"}>
                  <div>
                    <span className="font-bold text-xs tracking-tight text-teal-900 dark:text-teal-300">
                      {T("چیدمان تمرینی ساختگی", "FICTIONAL PRACTICE LAYOUT")}
                    </span>
                    <p className="text-[9px] text-muted-foreground font-sans">
                      {T("صرفاً نسخه نمایشی تمرینی غیرعملیاتی", "NON-OPERATIONAL TRAINING DEMO ONLY")}
                    </p>
                  </div>
                  <Badge className="bg-teal-800 text-white font-mono text-[10px]">
                    {isEn ? (visualizerScript.layoutBadgeEn || visualizerScript.layoutBadge) : (visualizerScript.layoutBadgeFa || visualizerScript.layoutBadge)}
                  </Badge>
                </div>

                {/* Permanent Prominent Watermark Banner */}
                <div className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 p-2 rounded-lg text-center font-sans text-xs font-extrabold tracking-wider space-y-0.5">
                  <div>⚠️ TRAINING ONLY — NOT FOR DISPENSING</div>
                  {!isEn && (
                    <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300" dir="rtl">
                      ⚠️ فقط آموزشی — غیرقابل نسخه‌پیچی
                    </div>
                  )}
                </div>

                {/* Section 1: Header Area */}
                <button
                  type="button"
                  onClick={() => setSelectedSectionId("layout_header")}
                  aria-label={T("بخش: سربرگ فرم (فرضی)", "Section: Header Area (Placeholder)")}
                  className={`w-full text-start p-2.5 rounded-xl border-2 transition cursor-pointer space-y-1 ${
                    selectedSectionId === "layout_header"
                      ? "border-purple-600 bg-purple-500/15 ring-2 ring-purple-500/40"
                      : "border-dashed border-sky-600/70 bg-sky-50/60 dark:bg-sky-950/20 hover:border-sky-600"
                  }`}
                  dir={isEn ? "ltr" : "rtl"}
                >
                  <div className="flex items-center justify-between text-[10px] font-sans">
                    <span className="font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wide">
                      {T("بخش: سربرگ فرم (فرضی)", "Section: Header Area (Placeholder)")}
                    </span>
                    <span className="text-muted-foreground text-[9px]">
                      {T("(برای بررسی کلیک کنید)", "(Click to inspect)")}
                    </span>
                  </div>
                  <div className="font-bold text-foreground" dir="auto">
                    {isEn ? visualizerScript.layoutNameEn : visualizerScript.layoutNameFa}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-sans" dir="auto">
                    {T("جایگاه سربرگ تمرینی صرفاً جهت نمایش ساختار بصری", "Illustrative practice header placeholder")}
                  </div>
                </button>

                {/* Section 2: Practice Zone A */}
                <button
                  type="button"
                  onClick={() => setSelectedSectionId("practice_zone_a")}
                  aria-label={T("بخش: ناحیه تمرینی ۱", "Section: Practice Zone A")}
                  className={`w-full text-start p-2.5 rounded-xl border-2 transition cursor-pointer space-y-1 ${
                    selectedSectionId === "practice_zone_a"
                      ? "border-purple-600 bg-purple-500/15 ring-2 ring-purple-500/40"
                      : "border-dashed border-indigo-600/70 bg-indigo-50/60 dark:bg-indigo-950/20 hover:border-indigo-600"
                  }`}
                  dir={isEn ? "ltr" : "rtl"}
                >
                  <div className="flex items-center justify-between text-[10px] font-sans">
                    <span className="font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
                      {T("بخش: ناحیه تمرینی ۱", "Section: Practice Zone A")}
                    </span>
                    <span className="text-muted-foreground text-[9px]">
                      {T("(برای بررسی کلیک کنید)", "(Click to inspect)")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground font-sans" dir="auto">
                    {isEn ? (visualizerScript.placeholderItemEn || visualizerScript.placeholderItem) : (visualizerScript.placeholderItemFa || visualizerScript.placeholderItem)}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-sans" dir="auto">
                    {isEn ? (visualizerScript.illustrativeValueEn || visualizerScript.illustrativeValue) : (visualizerScript.illustrativeValueFa || visualizerScript.illustrativeValue)}
                  </div>
                </button>

                {/* Section 3: Practice Zone B */}
                <button
                  type="button"
                  onClick={() => setSelectedSectionId("practice_zone_b")}
                  aria-label={T("بخش: ناحیه تمرینی ۲", "Section: Practice Zone B")}
                  className={`w-full text-start p-2.5 rounded-xl border-2 transition cursor-pointer space-y-1 ${
                    selectedSectionId === "practice_zone_b"
                      ? "border-purple-600 bg-purple-500/15 ring-2 ring-purple-500/40"
                      : "border-dashed border-amber-600/70 bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-600"
                  }`}
                  dir={isEn ? "ltr" : "rtl"}
                >
                  <div className="flex items-center justify-between text-[10px] font-sans">
                    <span className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                      {T("بخش: ناحیه تمرینی ۲", "Section: Practice Zone B")}
                    </span>
                    <span className="text-muted-foreground text-[9px]">
                      {T("(برای بررسی کلیک کنید)", "(Click to inspect)")}
                    </span>
                  </div>
                  <div className="italic text-foreground font-sans" dir="auto">
                    {isEn ? visualizerScript.instructionNoticeEn : visualizerScript.instructionNoticeFa}
                  </div>
                </button>

                {/* Section 4: Notice Footer */}
                <button
                  type="button"
                  onClick={() => setSelectedSectionId("notice_footer")}
                  aria-label={T("بخش: پاورقی هشداری", "Section: Notice Footer")}
                  className={`w-full text-start p-2.5 rounded-xl border-2 transition cursor-pointer space-y-1 ${
                    selectedSectionId === "notice_footer"
                      ? "border-purple-600 bg-purple-500/15 ring-2 ring-purple-500/40"
                      : "border-dashed border-slate-500/70 bg-slate-100/60 dark:bg-slate-900/40 hover:border-slate-500"
                  }`}
                  dir={isEn ? "ltr" : "rtl"}
                >
                  <div className="flex items-center justify-between text-[10px] font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">
                      {T("بخش: پاورقی هشداری", "Section: Notice Footer")}
                    </span>
                    <span className="text-muted-foreground text-[9px]">
                      {T("(برای بررسی کلیک کنید)", "(Click to inspect)")}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-sans" dir="auto">
                    {isEn ? visualizerScript.footerNoticeEn : visualizerScript.footerNoticeFa}
                  </div>
                </button>

                {/* Sheet Footer Disclaimer */}
                <div className="border-t border-dashed border-border pt-2 text-center text-[9px] text-muted-foreground font-sans" dir="auto">
                  {T(
                    "نسخه واقعی نیست • فاقد هرگونه کاربرد نسخه‌پیچی یا بیمه‌ای • صرفاً دمو تمرینی ساختگی",
                    "NOT A REAL PRESCRIPTION • NO DISPENSING OR CLAIMING USE • FICTIONAL PRACTICE DEMO"
                  )}
                </div>
              </div>
            </div>

            {/* Section Inspector Details (4 or 5 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-3">
              <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-sm text-foreground">
                      {T("بازرس آموزشی بخش‌های نسخه", "Training Section Inspector")}
                    </h3>
                  </div>
                  {selectedSectionId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSectionId(null)}
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{T("بستن", "Clear")}</span>
                    </Button>
                  )}
                </div>

                {activeSectionDetail ? (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-purple-600 text-white text-[10px]">
                        {isEn ? activeSectionDetail.badgeEn : activeSectionDetail.badgeFa}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {T("شناسه:", "ID:")} {activeSectionDetail.id}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">
                        {isEn ? activeSectionDetail.titleEn : activeSectionDetail.titleFa}
                      </h4>
                    </div>

                    {/* Section Description */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {T("توضیحات بخش تمرینی:", "Practice Section Information:")}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed font-sans" dir="auto">
                        {isEn ? activeSectionDetail.descriptionEn : activeSectionDetail.descriptionFa}
                      </p>
                    </div>

                    {/* Layout Tip */}
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1.5">
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Keyboard className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        {T("راهنمای رابط کاربری:", "Interface Layout Tip:")}
                      </span>
                      <p className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed font-sans" dir="auto">
                        {isEn ? activeSectionDetail.layoutTipEn : activeSectionDetail.layoutTipFa}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <div className="mx-auto w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        {T("بخشی انتخاب نشده است", "No section selected")}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {T(
                          "برای مشاهده راهنمای بخش‌های چیدمان تمرینی، روی یکی از بخش‌های کادربندی‌شده برگه کلیک کنید.",
                          "Click any framed section on the practice layout to inspect illustrative layout tips."
                        )}
                      </p>
                    </div>

                    {/* Quick Section Jump Buttons */}
                    <div className="pt-2 grid grid-cols-2 gap-2 text-start">
                      {FRED_VISUALIZER_SECTIONS.map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedSectionId(sec.id)}
                          className="p-2 rounded-lg border border-border/70 hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer text-center"
                        >
                          {isEn ? sec.badgeEn : sec.badgeFa}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </section>
      );
}
