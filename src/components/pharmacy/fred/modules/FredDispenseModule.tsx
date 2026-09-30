import { AlertTriangle, ArrowLeft, ArrowRight, Barcode, CheckCircle2, Eye, FileText, Keyboard, Pill, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FRED_SHORTCUT_PRACTICE, FRED_TRAINING_ERX_BARCODE } from "@/lib/pharmacyFredPractice";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "@/lib/pharmacyFredPracticeData";
import { useFredPractice } from "../FredPracticeContext";
export function FredDispenseModule() {
const { T, isEn, selectedId, dispenseStep, setDispenseStep, shortcutInput, setShortcutInput, owingBarcode, setOwingBarcode, owingReconciled, setOwingReconciled, barcodeError, setBarcodeError, scenario, parsedShortcut, resetDispense, handleSelectScenario, handleStartNewScenario, handleMarkOffOwing, handleOpenNoticePreview, isExactBarcodeValid } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {T("گردش‌کار نسخه‌پیچی و شرت‌کات‌ها", "Dispensing Workflow & Shortcuts")}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={resetDispense}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {T("شروع مجدد این ماژول", "Reset Dispense")}
            </Button>
          </div>

          {/* Scenario Selector */}
          <section className="space-y-3" aria-label={T("انتخاب سناریوی نسخه", "Prescription scenario selection")}>
            <div className="flex items-center justify-between">
              <label htmlFor="fred-scenario-select" className="text-sm font-semibold text-foreground">
                {T("انتخاب سناریوی نسخه تمرینی:", "Select training prescription scenario:")}
              </label>
              <span className="text-xs text-muted-foreground">
                {PHARMACY_FRED_PRACTICE_SCENARIOS.length} {T("سناریو موجود", "scenarios available")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PHARMACY_FRED_PRACTICE_SCENARIOS.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectScenario(item.id)}
                    className={`p-3 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/40"
                        : "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">
                        {item.prescribedDrug}
                      </span>
                      <Badge variant={item.schedule === "S8" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                        {item.schedule}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
                        {item.type}
                      </span>
                      <span>•</span>
                      <span>{item.pbsCode}</span>
                      {item.isExpiredS8 && (
                        <span className="text-destructive font-semibold text-[10px]">
                          {T("منقضی S8", "Expired S8")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Dispense Step Tabs */}
          <nav className="flex items-center gap-2 border-b border-border/70 pb-2 text-sm" aria-label={T("مراحل تمرین نسخه", "Prescription practice steps")}>
            <button
              type="button"
              onClick={() => setDispenseStep(0)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm ${
                dispenseStep === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>{T("۱. بررسی نسخه", "1. Review Script")}</span>
            </button>
            <button
              type="button"
              onClick={() => setDispenseStep(1)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm ${
                dispenseStep === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Keyboard className="h-4 w-4" />
              <span>{T("۲. میانبر FRED", "2. FRED Shortcut")}</span>
            </button>
            <button
              type="button"
              onClick={() => setDispenseStep(2)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm ${
                dispenseStep === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Barcode className="h-4 w-4" />
              <span>{T("۳. تسویه بدهی (Owing)", "3. Owing & Reconciliation")}</span>
              {owingReconciled && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            </button>
          </nav>

          {/* Step 1: Script Review */}
          {dispenseStep === 0 && scenario && (
            <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    {scenario.prescribedDrug}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[11px]">
                    {scenario.type}
                  </Badge>
                  <Badge variant={scenario.schedule === "S8" ? "destructive" : "secondary"} className="text-[11px]">
                    {scenario.schedule}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    {scenario.contentReviewStatus}
                  </Badge>
                </div>
              </div>

              {scenario.isExpiredS8 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs leading-relaxed">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div>
                      <span className="font-bold">
                        {T("هشدار تاریخ نسخه S8 منقضی شده (نمونه قوانین NSW):", "Warning: Expired S8 Prescription (NSW Rules Snapshot):")}
                      </span>{" "}
                      {T(
                        "بر اساس راهنمای وزارت بهداشت نیوساوت‌ولز (NSW Health snapshot مورخ ۲۶ سپتامبر ۲۰۲۶)، حداکثر اعتبار نسخه‌های عمومی ۱۲ ماه و نسخه‌های S8 و S4 Appendix D برابر با ۶ ماه است؛ سایر ایالت‌ها و قلمروهای استرالیا ممکن است مقررات متفاوتی داشته باشند. تاریخ صدور این نسخه فرضی بیش از ۶ ماه گذشته است.",
                        "Per NSW Health guidance (NSW Health snapshot checked 26 Sep 2026), prescription validity is 12 months generally, except S8 and S4 Appendix D prescriptions which are valid for 6 months; other Australian states and territories may have different requirements. This simulated prescription date exceeds 6 months."
                      )}
                    </div>
                    <div className="text-[11px] text-destructive/90 font-medium flex items-center justify-between gap-2 flex-wrap pt-0.5">
                      <span>
                        {T(
                          "این یک ارزیابی کامل از صحت نسخه یا تصمیم واقعی نسخه‌پیچی نیست.",
                          "This is not a complete assessment of prescription validity or a real dispensing decision."
                        )}
                      </span>
                      <a
                        href="https://www.health.nsw.gov.au/pharmaceutical/Pages/legal-form-prescription.aspx"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-destructive/80 font-sans"
                      >
                        NSW Health Reference
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="text-muted-foreground block">{T("کد PBS دارویی", "PBS Item Code")}</span>
                  <span className="font-mono font-semibold text-foreground text-sm">{scenario.pbsCode}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="text-muted-foreground block">{T("تعداد و تکرار", "Qty & Repeats")}</span>
                  <span className="font-semibold text-foreground text-sm">
                    {scenario.quantity} {T("عدد", "units")} / {scenario.repeats} {T("تکرار", "repeats")}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="text-muted-foreground block">{T("تاریخ نسخه", "Script Date")}</span>
                  <span className="font-mono font-semibold text-foreground text-sm">{scenario.scriptDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1 sm:col-span-2 md:col-span-3">
                  <span className="text-muted-foreground block">{T("جایگزین برند A-Flag", "A-Flag Generic Substitute")}</span>
                  <span className="text-foreground font-medium">{scenario.aFlagGenericSubstitute}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1 sm:col-span-2 md:col-span-3">
                  <span className="text-muted-foreground block">{T("دستور مصرف (Directions)", "Directions")}</span>
                  <span className="text-foreground font-medium italic" dir="ltr">
                    "{scenario.directions}"
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setDispenseStep(1)}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <span>{T("مرحله بعد: تمرین میانبر FRED", "Next: Practice FRED Shortcut")}</span>
                  {isEn ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: FRED Shortcut Parser */}
          {dispenseStep === 1 && (
            <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {T("پارسر و پردازش میانبر FRED Dispense", "FRED Dispense Shortcut & Alias Parser")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {T(
                    "در سیستم FRED از میانبرهای عددی و حروفی جهت تعیین نوبت دیسپنس و تکرارها استفاده می‌شود.",
                    "FRED uses numeric and letter shortcuts for dispense sequence and repeats."
                  )}
                </p>
              </div>

              {/* Quick Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground block">
                  {T("میانبرهای استاندارد منبع:", "Standard source shortcuts:")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {FRED_SHORTCUT_PRACTICE.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setShortcutInput(sc.syntax)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                        shortcutInput.trim().toUpperCase() === sc.syntax
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 hover:bg-muted text-foreground border-border/70"
                      }`}
                    >
                      <span>{sc.syntax}</span>
                      <span className="text-[10px] font-sans font-normal opacity-80">
                        ({sc.id})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Field */}
              <div className="space-y-1.5">
                <label htmlFor="fred-shortcut-input" className="text-xs font-semibold text-foreground">
                  {T("ورود میانبر / نام مستعار (Shortcut or Alias):", "Enter shortcut syntax or alias:")}
                </label>
                <Input
                  id="fred-shortcut-input"
                  value={shortcutInput}
                  onChange={(e) => setShortcutInput(e.target.value)}
                  placeholder="مثال: 5/1 یا 5 یا 5D یا 5R"
                  className="font-mono text-sm uppercase max-w-xs"
                  dir="ltr"
                />
              </div>

              {/* Parsed Result Display */}
              {parsedShortcut ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {isEn ? parsedShortcut.titleEn : parsedShortcut.titleFa}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/40">
                      Syntax: {parsedShortcut.syntax}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed" dir="auto">
                    {isEn ? parsedShortcut.descriptionEn : parsedShortcut.descriptionFa}
                  </p>
                  {parsedShortcut.id === "reg24" && (
                    <div className="text-[11px] pt-1.5 border-t border-emerald-500/20 text-muted-foreground flex items-center justify-between gap-2 flex-wrap">
                      <span>{T("منبع رسمی PBS برای مقررات ۴۹:", "Official PBS Regulation 49 Reference:")}</span>
                      <a
                        href="https://www.pbs.gov.au/healthpro/explanatory-notes/section1/Section_1_2_Explanatory_Notes"
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-emerald-800 dark:text-emerald-300 hover:text-foreground font-sans"
                      >
                        PBS Reg 49 Explanatory Notes
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-muted/60 border border-border/60 text-xs text-muted-foreground">
                  {T(
                    "میانبر شناخته نشد. میانبرهای استاندارد شامل 5/1، 5، 1، 5/3، 3، 5D، D5، DEFER و نام‌های مستعار تمرینی شامل 5R، R5، REG24 هستند.",
                    "Unrecognized shortcut. Standard aliases include 5/1, 5, 1, 5/3, 3, 5D, D5, DEFER, and training aliases include 5R, R5, REG24."
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDispenseStep(0)}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  {isEn ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  <span>{T("مرحله قبل", "Previous")}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDispenseStep(2)}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  <span>{T("مرحله بعد: تسویه بدهی (Owing)", "Next: Owing & Reconciliation")}</span>
                  {isEn ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Owing & Reconciliation Simulation */}
          {dispenseStep === 2 && scenario && (
            <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {T("شبیه‌سازی تسویه بدهی نسخه (Owing Reconciliation)", "Owing Prescription Reconciliation Simulation")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {T(
                    "در سناریوی بدهی (Owing)، ورود بارکد تمرینی دقیق برای تسویه شبیه‌سازی لازم است.",
                    "Entering the exact educational barcode reconciles the owing item."
                  )}
                </p>
              </div>

              {/* Owing Status Card */}
              <div className="p-3.5 rounded-xl border space-y-3 bg-muted/20 border-border/60">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      {T("وضعیت بدهی پرونده جاری:", "Current owing status:")}
                    </span>
                  </div>
                  <Badge
                    variant={owingReconciled ? "secondary" : "outline"}
                    className={
                      owingReconciled
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    }
                  >
                    {owingReconciled
                      ? T("تسویه‌شده (Reconciled)", "Reconciled")
                      : T("بدهی فعال (Owing Active)", "Owing Active")}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong className="text-foreground">{T("دارو:", "Medication:")}</strong> {scenario.prescribedDrug} ({scenario.quantity} {T("عدد", "units")})
                  </p>
                  <p>
                    <strong className="text-foreground">{T("بارکد آموزشی مورد انتظار:", "Expected educational barcode:")}</strong>{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">
                      {FRED_TRAINING_ERX_BARCODE}
                    </code>
                  </p>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenNoticePreview}
                    className="gap-1.5 cursor-pointer text-xs"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>{T("پیش‌نمایش درون‌برنامه‌ای برگه بدهی (Preview Notice)", "Preview In-App Owing Notice")}</span>
                  </Button>
                </div>
              </div>

              {/* Barcode Reconciliation Input */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label htmlFor="fred-barcode-input" className="text-xs font-semibold text-foreground block">
                  {T("اسکن یا ورود بارکد نسخه دریافتی جهت تسویه:", "Scan or enter script barcode to mark off:")}
                </label>

                <div className="flex items-center gap-2 max-w-md">
                  <Input
                    id="fred-barcode-input"
                    value={owingBarcode}
                    onChange={(e) => {
                      setOwingBarcode(e.target.value);
                      if (barcodeError) setBarcodeError(null);
                    }}
                    disabled={owingReconciled}
                    placeholder={`ورود کد ${FRED_TRAINING_ERX_BARCODE}`}
                    className="font-mono text-sm uppercase"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    onClick={handleMarkOffOwing}
                    disabled={owingReconciled || !isExactBarcodeValid}
                    className="gap-1.5 cursor-pointer shrink-0 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{T("تسویه (Mark Off)", "Mark Off")}</span>
                  </Button>
                </div>

                {barcodeError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1" role="alert">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{barcodeError}</span>
                  </p>
                )}

                {owingReconciled && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {T(
                          "تسویه آموزشی با بارکد TRAIN-ERX-4821 با موفقیت تأیید شد.",
                          "Educational reconciliation with TRAIN-ERX-4821 confirmed."
                        )}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOwingReconciled(false);
                        setOwingBarcode("");
                      }}
                      className="text-xs h-7 cursor-pointer"
                    >
                      {T("تکرار مجدد", "Reopen")}
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDispenseStep(1)}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  {isEn ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  <span>{T("مرحله قبل", "Previous")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartNewScenario}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{T("شروع سناریوی جدید", "Start New Scenario")}</span>
                </Button>
              </div>
            </Card>
          )}
        </section>
      );
}
