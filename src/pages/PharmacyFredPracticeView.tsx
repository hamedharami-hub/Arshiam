import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  Keyboard,
  Layers,
  Pill,
  Printer,
  RotateCcw,
  Shield,
  ShieldAlert,
  Tag,
  Terminal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBilingual } from "@/hooks/useBilingual";
import {
  DEFAULT_FRED_LABEL_STATE,
  EDUCATIONAL_TERMINAL_CHIPS,
  FINAL_REVIEW_CHECKLIST_CRITERIA,
  FINAL_REVIEW_CONFIRMATION_EN,
  FINAL_REVIEW_CONFIRMATION_FA,
  FINAL_REVIEW_ENTRIES,
  FINAL_REVIEW_WATERMARK_EN,
  FINAL_REVIEW_WATERMARK_FA,
  FRED_ACTION_WATERMARK_EN,
  FRED_ACTION_WATERMARK_FA,
  FRED_AUXILIARY_LABELS,
  FRED_RETENTION_DOCUMENTS,
  FRED_SAFETY_NET_SCENARIOS,
  FRED_SHORTCUT_PRACTICE,
  FRED_TRAINING_ERX_BARCODE,
  FRED_VISUALIZER_SECTIONS,
  INITIAL_EDUCATIONAL_TERMINAL_STATE,
  INITIAL_FINAL_REVIEW_STATE,
  INITIAL_ODT_SESSION_STATE,
  INITIAL_PBS_POS_STATE,
  ODT_SESSION_CHECKLIST_CRITERIA,
  ODT_SESSION_ENTRIES,
  ODT_SESSION_RESULT_NOTICE_EN,
  ODT_SESSION_RESULT_NOTICE_FA,
  PBS_POS_PRACTICE_GROUPS,
  PBS_POS_PRACTICE_ITEMS,
  PBS_POS_RESULT_NOTICE_EN,
  PBS_POS_RESULT_NOTICE_FA,
  SYNTHETIC_VISUALIZER_SCRIPTS,
  TERMINAL_INPUT_MAX_LENGTH,
  canOpenFinalReviewPreview,
  canOpenOdtSessionPreview,
  canOpenPbsPosPreview,
  evaluateFredReconciliation,
  executeEducationalTerminalCommand,
  generateFredOwingNoticePreview,
  resolveFredPracticeShortcut,
  type EducationalTerminalChip,
  type EducationalTerminalState,
  type FinalReviewChecklistCriterion,
  type FinalReviewPracticeEntry,
  type FinalReviewPracticeId,
  type FinalReviewPracticeState,
  type FredLabelState,
  type FredOwingNoticePreview,
  type FredRetentionDocument,
  type FredSafetyNetScenario,
  type FredShortcutPractice,
  type OdtSessionChecklistCriterion,
  type OdtSessionFormat,
  type OdtSessionPracticeEntry,
  type OdtSessionPracticeId,
  type OdtSessionPracticeState,
  type PbsPosGroupId,
  type PbsPosItemId,
  type PbsPosPracticeGroup,
  type PbsPosPracticeItem,
  type PbsPosPracticeState,
  type PharmacyFredPracticeEntry,
  type RetentionBucket,
  type ScriptVisualizerSection,
  type ScriptVisualizerSectionId,
  type SyntheticVisualizerScript,
} from "@/lib/pharmacyFredPractice";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "@/lib/pharmacyFredPracticeData";

type PracticeModule =
  | "dispense"
  | "safetynet"
  | "labeling"
  | "retention"
  | "visualizer"
  | "terminal"
  | "review"
  | "odt"
  | "pbspos";
type DispenseStep = 0 | 1 | 2;
type SafetyNetStep = 0 | 1 | 2;

export default function PharmacyFredPracticeView() {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";

  // Active training module
  const [activeModule, setActiveModule] = useState<PracticeModule>("dispense");

  // --- Module 1: FRED Dispense State ---
  const [selectedId, setSelectedId] = useState<string>(
    PHARMACY_FRED_PRACTICE_SCENARIOS[0]?.id ?? ""
  );
  const [dispenseStep, setDispenseStep] = useState<DispenseStep>(0);
  const [shortcutInput, setShortcutInput] = useState<string>("5/1");
  const [owingBarcode, setOwingBarcode] = useState<string>("");
  const [owingReconciled, setOwingReconciled] = useState<boolean>(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<FredOwingNoticePreview | null>(null);

  const scenario: PharmacyFredPracticeEntry | undefined =
    PHARMACY_FRED_PRACTICE_SCENARIOS.find((item) => item.id === selectedId) ??
    PHARMACY_FRED_PRACTICE_SCENARIOS[0];

  const parsedShortcut: FredShortcutPractice | null = resolveFredPracticeShortcut(shortcutInput);

  const resetDispense = () => {
    setDispenseStep(0);
    setShortcutInput("5/1");
    setOwingBarcode("");
    setOwingReconciled(false);
    setBarcodeError(null);
    setPreviewNotice(null);
  };

  const handleSelectScenario = (id: string) => {
    setSelectedId(id);
    resetDispense();
  };

  const handleStartNewScenario = () => {
    if (PHARMACY_FRED_PRACTICE_SCENARIOS.length > 0) {
      const currentIndex = PHARMACY_FRED_PRACTICE_SCENARIOS.findIndex((item) => item.id === selectedId);
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % PHARMACY_FRED_PRACTICE_SCENARIOS.length;
      setSelectedId(PHARMACY_FRED_PRACTICE_SCENARIOS[nextIndex].id);
    }
    resetDispense();
  };

  const handleMarkOffOwing = () => {
    const evalResult = evaluateFredReconciliation(owingBarcode);
    if (!evalResult.success) {
      setBarcodeError(
        isEn
          ? evalResult.errorMessageEn ?? "Invalid barcode"
          : evalResult.errorMessageFa ?? "بارکد نامعتبر است"
      );
      return;
    }
    setOwingReconciled(true);
    setBarcodeError(null);
  };

  const handleOpenNoticePreview = () => {
    if (!scenario) return;
    const preview = generateFredOwingNoticePreview(scenario);
    setPreviewNotice(preview);
  };

  const isExactBarcodeValid = owingBarcode.trim().toUpperCase() === FRED_TRAINING_ERX_BARCODE;

  // --- Module 2: Safety Net Practice State ---
  const [selectedSafetyNetId, setSelectedSafetyNetId] = useState<string>(
    FRED_SAFETY_NET_SCENARIOS[0]?.id ?? ""
  );
  const [safetyNetStep, setSafetyNetStep] = useState<SafetyNetStep>(0);
  const [selectedGapAnswer, setSelectedGapAnswer] = useState<number | null>(null);
  const [selectedStatusAnswer, setSelectedStatusAnswer] = useState<boolean | null>(null);

  const safetyNetScenario: FredSafetyNetScenario =
    FRED_SAFETY_NET_SCENARIOS.find((item) => item.id === selectedSafetyNetId) ??
    FRED_SAFETY_NET_SCENARIOS[0];

  const resetSafetyNet = () => {
    setSafetyNetStep(0);
    setSelectedGapAnswer(null);
    setSelectedStatusAnswer(null);
  };

  // --- Module 3: Labeling Practice State ---
  const [labelState, setLabelState] = useState<FredLabelState>({ ...DEFAULT_FRED_LABEL_STATE });

  const resetLabel = () => {
    setLabelState({ ...DEFAULT_FRED_LABEL_STATE });
  };

  const handleToggleAuxiliaryLabel = (labelId: string) => {
    setLabelState((prev) => {
      const exists = prev.selectedLabelIds.includes(labelId);
      return {
        ...prev,
        selectedLabelIds: exists
          ? prev.selectedLabelIds.filter((id) => id !== labelId)
          : [...prev.selectedLabelIds, labelId],
      };
    });
  };

  // --- Module 4: Retention Practice State ---
  const [retentionSelections, setRetentionSelections] = useState<Record<string, RetentionBucket | "">>({});
  const [retentionVerified, setRetentionVerified] = useState<boolean>(false);

  const resetRetention = () => {
    setRetentionSelections({});
    setRetentionVerified(false);
  };

  const handleSelectRetentionBucket = (docId: string, bucket: RetentionBucket | "") => {
    setRetentionSelections((prev) => {
      const next = { ...prev };
      if (bucket) next[docId] = bucket;
      else delete next[docId];
      return next;
    });
    setRetentionVerified(false);
  };

  const canVerifyRetention = FRED_RETENTION_DOCUMENTS.length > 0 &&
    FRED_RETENTION_DOCUMENTS.every((doc) => Boolean(retentionSelections[doc.id]));

  // --- Module 5: Script Visualizer & Section Inspector State ---
  const [selectedVisualizerScriptId, setSelectedVisualizerScriptId] = useState<string>(
    SYNTHETIC_VISUALIZER_SCRIPTS[0]?.id ?? ""
  );
  const [selectedSectionId, setSelectedSectionId] = useState<ScriptVisualizerSectionId | null>(null);

  const visualizerScript: SyntheticVisualizerScript =
    SYNTHETIC_VISUALIZER_SCRIPTS.find((s) => s.id === selectedVisualizerScriptId) ??
    SYNTHETIC_VISUALIZER_SCRIPTS[0];

  const activeSectionDetail: ScriptVisualizerSection | null =
    FRED_VISUALIZER_SECTIONS.find((sec) => sec.id === selectedSectionId) ?? null;

  const resetVisualizer = () => {
    setSelectedVisualizerScriptId(SYNTHETIC_VISUALIZER_SCRIPTS[0]?.id ?? "");
    setSelectedSectionId(null);
  };

  // --- Module 6: Educational Practice Terminal State ---
  const [terminalState, setTerminalState] = useState<EducationalTerminalState>(INITIAL_EDUCATIONAL_TERMINAL_STATE);
  const [terminalInput, setTerminalInput] = useState("");

  const handleRunTerminalCommand = (cmd: string) => {
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const res = executeEducationalTerminalCommand(cmd, terminalState, { timestamp });
    setTerminalState(res.nextState);
    setTerminalInput("");
  };

  const handleResetTerminal = () => {
    setTerminalState(INITIAL_EDUCATIONAL_TERMINAL_STATE);
    setTerminalInput("");
  };

  // --- Module 7: Final Review Preview Practice State ---
  const [finalReviewState, setFinalReviewState] = useState<FinalReviewPracticeState>(INITIAL_FINAL_REVIEW_STATE);

  const handleSelectFinalReviewEntry = (id: FinalReviewPracticeId) => {
    setFinalReviewState({
      selectedEntryId: id,
      checklist: {
        legibility: false,
        notice_visible: false,
        no_real_data: false,
      },
      previewOpen: false,
    });
  };

  const handleToggleFinalReviewCriterion = (criterionId: "legibility" | "notice_visible" | "no_real_data") => {
    setFinalReviewState((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [criterionId]: !prev.checklist[criterionId],
      },
    }));
  };

  const handleOpenFinalReviewPreview = () => {
    if (!canOpenFinalReviewPreview(finalReviewState.selectedEntryId, finalReviewState.checklist)) return;
    setFinalReviewState((prev) => ({
      ...prev,
      previewOpen: true,
    }));
  };

  const handleResetFinalReview = () => {
    setFinalReviewState(INITIAL_FINAL_REVIEW_STATE);
  };

  const handleCloseFinalReviewPreview = () => {
    setFinalReviewState((prev) => ({
      ...prev,
      previewOpen: false,
    }));
  };

  const activeReviewEntry: FinalReviewPracticeEntry | undefined = FINAL_REVIEW_ENTRIES.find(
    (e) => e.id === finalReviewState.selectedEntryId
  );

  // --- Module 8: ODT Session Practice State ---
  const [odtState, setOdtState] = useState<OdtSessionPracticeState>(INITIAL_ODT_SESSION_STATE);

  const handleSelectOdtEntry = (id: OdtSessionPracticeId) => {
    setOdtState({
      selectedEntryId: id,
      selectedFormat: "format_a",
      checklist: {
        structure_clarity: false,
        placeholder_verified: false,
        no_clinical_data: false,
      },
      previewOpen: false,
    });
  };

  const handleSelectOdtFormat = (format: OdtSessionFormat) => {
    setOdtState((prev) => {
      if (!prev.selectedEntryId) return prev;
      if (prev.selectedFormat === format) return prev;
      return {
        ...prev,
        selectedFormat: format,
        checklist: {
          structure_clarity: false,
          placeholder_verified: false,
          no_clinical_data: false,
        },
        previewOpen: false,
      };
    });
  };

  const handleToggleOdtCriterion = (
    criterionId: "structure_clarity" | "placeholder_verified" | "no_clinical_data"
  ) => {
    setOdtState((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [criterionId]: !prev.checklist[criterionId],
      },
    }));
  };

  const handleOpenOdtPreview = () => {
    if (!canOpenOdtSessionPreview(odtState.selectedEntryId, odtState.checklist)) return;
    setOdtState((prev) => ({
      ...prev,
      previewOpen: true,
    }));
  };

  const handleResetOdt = () => {
    setOdtState(INITIAL_ODT_SESSION_STATE);
  };

  const handleCloseOdtPreview = () => {
    setOdtState((prev) => ({
      ...prev,
      previewOpen: false,
    }));
  };

  const activeOdtEntry: OdtSessionPracticeEntry | undefined = ODT_SESSION_ENTRIES.find(
    (e) => e.id === odtState.selectedEntryId
  );

  // --- Module 9: PBS/POS Categorization Practice State ---
  const [pbsPosState, setPbsPosState] = useState<PbsPosPracticeState>(INITIAL_PBS_POS_STATE);

  const handleAssignPbsPosItem = (itemId: PbsPosItemId, groupId: PbsPosGroupId | null) => {
    setPbsPosState((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [itemId]: groupId,
      },
      previewOpen: false,
    }));
  };

  const handleOpenPbsPosPreview = () => {
    if (!canOpenPbsPosPreview(pbsPosState.assignments)) return;
    setPbsPosState((prev) => ({
      ...prev,
      previewOpen: true,
    }));
  };

  const handleResetPbsPos = () => {
    setPbsPosState(INITIAL_PBS_POS_STATE);
  };

  const handleClosePbsPosPreview = () => {
    setPbsPosState((prev) => ({
      ...prev,
      previewOpen: false,
    }));
  };

  return (
    <main
      className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-5 sm:py-6"
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary shrink-0" aria-hidden="true">
            <Keyboard className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {T("شبیه‌ساز آموزشی کارگاه داروخانه (Pharmacy Lab)", "Pharmacy & FRED Educational Simulator")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {T(
                "تمرین مرحله‌ای سناریوهای نسخه، شرت‌کات‌ها، آستانه Safety Net، طراحی برچسب و نگهداری اسناد (شبیه‌سازی محلی).",
                "Interactive practice of prescription workflows, shortcuts, Safety Net thresholds, labeling, and document retention."
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Prominent Educational Notice */}
      <Card
        role="note"
        className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-4 text-sm"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed text-amber-950 dark:text-amber-200">
          <p className="font-semibold">
            {T(
              "محیط شبیه‌سازی آموزشی مستقل (Non-operational Educational Simulator)",
              "Non-operational Educational Simulator"
            )}
          </p>
          <p>
            {T(
              "این قابلیت صرفاً برای آموزش و تمرین است و هیچ اتصال واقعی به FRED، سازمان PBS، سامانه‌های SafeScript یا ارسال ادعا ندارد. تمام سناریوها، شناسه‌ها و مبالغ ساختگی‌اند و بازنمایی بیمار یا استحقاق واقعی نیستند. هیچ چاپ فیزیکی، تراکنش مالی یا تصمیم‌گیری بالینی انجام نمی‌شود.",
              "Designed exclusively for educational practice. No actual connection to FRED, PBS, SafeScript, or claim submission. All scenarios, identifiers, and amounts are fictional exercise data and do not represent an actual patient or entitlement. No physical printing, financial transactions, or clinical decisions occur."
            )}
          </p>
          <p className="text-[11px] font-medium text-amber-900/90 dark:text-amber-200/90 border-t border-amber-500/20 pt-1.5">
            ⚠️ {T(
              "اطلاعیه ایمنی بالینی: نام داروها، دوزها/قدرت‌ها، دستورات مصرف و کدهای PBS در نمونه‌های این کارگاه به‌صورت مستقل از نظر بالینی اعتبارسنجی نشده‌اند (وضعیت پرونده‌ها: بازبینی‌نشده بالینی / unreviewed) و هرگز نباید برای تجویز، تحویل دارو، ارسال ادعا یا راهنمایی بیمار واقعی مورد استفاده قرار گیرند.",
              "Clinical Safety Notice: Medication names, strengths, directions, and PBS codes in these simulation cases are not independently clinically validated (case status: unreviewed) and must not be used to prescribe, supply, claim, or guide an actual patient."
            )}
          </p>
        </div>
      </Card>

      {/* Primary Training Module Selector */}
      <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/80 overflow-x-auto" aria-label={T("ماژول‌های آموزشی", "Educational modules")}>
        <button
          type="button"
          onClick={() => setActiveModule("dispense")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "dispense"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Keyboard className="h-4 w-4 text-primary" />
          <span>{T("نسخه‌پیچی و شرت‌کات‌ها (FRED)", "FRED Dispense")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("safetynet")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "safetynet"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>{T("محاسبه‌گر Safety Net", "Safety Net Practice")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("labeling")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "labeling"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>{T("طراحی برچسب دارو", "Dispensing Label")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("retention")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "retention"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{T("بایگانی و نگهداری مدارک", "Document Retention")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("visualizer")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "visualizer"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span>{T("نمایشگر و بازرس نسخه", "Script Visualizer")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("terminal")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "terminal"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{T("ترمینال تمرینی", "Practice Terminal")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("review")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "review"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>{T("پیش‌نمایش بازبینی پایانی", "Final Review Preview")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("odt")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "odt"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>{T("تمرین ثبت جلسه ODT", "ODT Session Practice")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("pbspos")}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === "pbspos"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>{T("پیش‌نمایش دسته‌بندی PBS/POS", "PBS/POS Categorization Practice")}</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* MODULE 1: FRED Dispense & Shortcuts (Existing)             */}
      {/* ========================================================= */}
      {activeModule === "dispense" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 2: Safety Net Practice (New)                       */}
      {/* ========================================================= */}
      {activeModule === "safetynet" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 3: Labeling Practice (New)                         */}
      {/* ========================================================= */}
      {activeModule === "labeling" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 4: Document Retention Practice (New)               */}
      {/* ========================================================= */}
      {activeModule === "retention" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 5: Script Visualizer & Section Inspector (Clean)    */}
      {/* ========================================================= */}
      {activeModule === "visualizer" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 6: Educational Practice Terminal (Whitelisted)      */}
      {/* ========================================================= */}
      {activeModule === "terminal" && (
        <section className="space-y-5 animate-in fade-in duration-200" aria-label={T("ترمینال تمرینی", "Practice Terminal")}>
          {/* Header & Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>{T("ترمینال تمرینی", "Practice Terminal")}</span>
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl">
                {T(
                  "کنسول متنی تمرینی موقت برای آزمودن فرامین مجاز در حافظه، بدون اتصال به سیستم‌های خارجی یا واقعی.",
                  "Temporary practice text console for testing whitelisted commands in memory, without external or live connections."
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTerminal}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{T("بازنشانی ترمینال", "Reset Terminal")}</span>
            </Button>
          </div>

          {/* Prominent Watermark Banner */}
          <div className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 p-2.5 rounded-xl text-center font-sans text-xs font-extrabold tracking-wider space-y-0.5">
            <div>⚠️ TRAINING ONLY — NOT CONNECTED TO A PHARMACY SYSTEM</div>
            <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300" dir="rtl">
              ⚠️ فقط آموزشی — متصل به هیچ سامانه داروخانه‌ای نیست
            </div>
          </div>

          {/* Two-Column Grid: Left = Console & Input, Right = Reference & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Command Input & Terminal Console */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Command Input Area */}
              <div className="space-y-2">
                <label
                  htmlFor="fred-terminal-input"
                  className="text-xs font-semibold text-foreground block"
                >
                  {T("ورود فرمان تمرینی (Whitelisted Command):", "Enter whitelisted command:")}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="fred-terminal-input"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    maxLength={TERMINAL_INPUT_MAX_LENGTH}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRunTerminalCommand(terminalInput);
                      }
                    }}
                    placeholder={
                      isEn
                        ? "e.g. HELP, OPEN A, OPEN B, STATUS, CLEAR, RESET"
                        : "مثال: HELP, OPEN A, OPEN B, STATUS, CLEAR, RESET"
                    }
                    className="font-mono text-sm max-w-lg"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRunTerminalCommand(terminalInput)}
                    className="gap-1.5 cursor-pointer text-xs shrink-0"
                  >
                    <span>{T("اجرا", "Execute")}</span>
                  </Button>
                </div>
              </div>

              {/* Quick Whitelisted Command Chips */}
              <div className="space-y-1.5" dir={isEn ? "ltr" : "rtl"}>
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {T("فرمان‌های سریع (کلیک برای اجرا):", "Quick commands (click to execute):")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {EDUCATIONAL_TERMINAL_CHIPS.map((chip) => (
                    <button
                      key={chip.command}
                      type="button"
                      onClick={() => handleRunTerminalCommand(chip.command)}
                      className="px-2.5 py-1 rounded-lg border border-border/80 bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="font-mono text-primary text-[11px] font-bold" dir="ltr">
                        {chip.command}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({isEn ? chip.labelEn : chip.labelFa})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Console Output Display */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1" dir={isEn ? "ltr" : "rtl"}>
                  <span className="font-bold flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{T("خروجی کنسول تمرینی", "Training Console Output")}</span>
                  </span>
                  <span className="font-mono text-[10px]">
                    {terminalState.history.length} {T("ورودی", "entries")}
                  </span>
                </div>

                <div
                  role="log"
                  aria-live="polite"
                  aria-label={T("گزارش خروجی ترمینال", "Terminal output log")}
                  className="bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-xs border border-slate-800 shadow-inner space-y-3 min-h-[300px] max-h-[460px] overflow-y-auto"
                >
                  {terminalState.history.length === 0 ? (
                    <div className="py-12 text-center space-y-2 text-slate-400">
                      <Terminal className="h-8 w-8 mx-auto opacity-40 text-emerald-400" />
                      <p className="font-sans text-xs">
                        {T(
                          "کنسول خالی است. فرمانی وارد کنید یا روی یکی از دکمه‌های بالا (مثل HELP یا OPEN A) کلیک کنید.",
                          "Console is empty. Enter a command or click a chip above (e.g. HELP or OPEN A)."
                        )}
                      </p>
                    </div>
                  ) : (
                    terminalState.history.map((entry) => (
                      <div key={entry.id} className="space-y-1">
                        {/* Timestamp & Type indicator */}
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono">{entry.timestamp}</span>
                          <span className="uppercase text-[9px] px-1 rounded bg-slate-900 border border-slate-800">
                            {entry.type}
                          </span>
                        </div>

                        {/* Entry Content */}
                        {entry.type === "command" && (
                          <div className="text-emerald-400 font-bold font-mono text-start" dir="ltr">
                            {entry.textEn}
                          </div>
                        )}

                        {entry.type === "output" && (
                          <div
                            className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed font-sans text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80"
                            dir="auto"
                          >
                            {isEn ? entry.textEn : entry.textFa}
                          </div>
                        )}

                        {entry.type === "error" && (
                          <div
                            className="text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 flex items-start gap-2 font-sans text-xs break-words"
                            dir="auto"
                          >
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>{isEn ? entry.textEn : entry.textFa}</div>
                          </div>
                        )}

                        {entry.type === "system" && (
                          <div
                            className="text-sky-300 bg-sky-950/40 p-2.5 rounded-xl border border-sky-900/60 flex items-start gap-2 font-sans text-xs break-words"
                            dir="auto"
                          >
                            <RotateCcw className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                            <div>{isEn ? entry.textEn : entry.textFa}</div>
                          </div>
                        )}

                        {entry.type === "card" && entry.cardDetail && (
                          <div className="space-y-2">
                            <div className="text-emerald-300 text-xs font-sans" dir="auto">
                              {isEn ? entry.textEn : entry.textFa}
                            </div>
                            <div
                              className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl p-3.5 space-y-2 font-sans text-xs"
                              dir={isEn ? "ltr" : "rtl"}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <FileText className="h-4 w-4 text-emerald-400" />
                                  <span>{isEn ? entry.cardDetail.titleEn : entry.cardDetail.titleFa}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-600 text-white text-[10px]">
                                    {isEn ? entry.cardDetail.badgeEn : entry.cardDetail.badgeFa}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-300">
                                    {T("صرفاً تمرینی", "TRAINING ONLY")}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed" dir="auto">
                                {isEn ? entry.cardDetail.descriptionEn : entry.cardDetail.descriptionFa}
                              </p>
                              <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5" dir="auto">
                                {isEn ? entry.cardDetail.sampleNoticeEn : entry.cardDetail.sampleNoticeFa}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Session Reference & Status */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Terminal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-sm text-foreground">
                    {T("وضعیت سشن و راهنمای فرامین", "Session Status & Command Reference")}
                  </h3>
                </div>

                {/* Session Status Summary */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{T("وضعیت سشن:", "Session State:")}</span>
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
                      {T("فعال در حافظه", "Active (In-Memory)")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{T("آیتم فعال:", "Active Item:")}</span>
                    <span className="font-bold text-foreground">
                      {terminalState.selectedEntryId
                        ? (terminalState.selectedEntryId === "entry_a"
                            ? T("آیتم تمرینی الف", "Training entry A")
                            : T("آیتم تمرینی ب", "Training entry B"))
                        : T("هیچ‌کدام", "None")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{T("فرامین اجراشده:", "Commands Executed:")}</span>
                    <span className="font-mono font-bold text-foreground">
                      {terminalState.executedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{T("ذخیره‌سازی دائم:", "Persistence:")}</span>
                    <span>{T("غیرفعال (صرفاً موقت)", "Disabled (Temporary)")}</span>
                  </div>
                </div>

                {/* Console Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunTerminalCommand("CLEAR")}
                    className="flex-1 cursor-pointer text-xs"
                  >
                    <span>{T("پاکسازی لاگ", "Clear Log")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunTerminalCommand("RESET")}
                    className="flex-1 cursor-pointer text-xs"
                  >
                    <span>{T("شروع مجدد", "Reset Session")}</span>
                  </Button>
                </div>

                {/* Whitelist Commands Reference Table */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground block">
                    {T("فهرست فرمان‌های مجاز تمرینی:", "Whitelisted Training Commands:")}
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {EDUCATIONAL_TERMINAL_CHIPS.map((chip) => (
                      <div
                        key={chip.command}
                        className="p-2 rounded-lg bg-muted/30 border border-border/50 space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <strong className="text-primary text-[11px]">{chip.command}</strong>
                          <span className="text-[10px] text-muted-foreground">
                            {isEn ? chip.labelEn : chip.labelFa}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-sans leading-relaxed" dir="auto">
                          {isEn ? chip.descriptionEn : chip.descriptionFa}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* MODULE 7: Final Review Preview (Purely Educational)       */}
      {/* ========================================================= */}
      {activeModule === "review" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 8: ODT Session Practice (Fictional Training)       */}
      {/* ========================================================= */}
      {activeModule === "odt" && (
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
      )}

      {/* ========================================================= */}
      {/* MODULE 9: PBS/POS Categorization Practice                 */}
      {/* ========================================================= */}
      {activeModule === "pbspos" && (
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
      )}

      {/* In-app Owing Notice Preview Modal / Drawer */}
      {previewNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  {T("پیش‌نمایش درون‌برنامه‌ای برگه بدهی", "In-App Owing Notice Preview")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNotice(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label={T("بستن", "Close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Banner Inside Preview */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-200">
              <strong>{isEn ? previewNotice.noticeStatusTextEn : previewNotice.noticeStatusTextFa}</strong>
              <p className="mt-0.5 text-muted-foreground">
                {T(
                  "این صرفاً یک پیش‌نمایش متنی داخل نرم‌افزار است و هیچ سندی به چاپگر ارسال نمی‌شود.",
                  "This is an in-app simulated view. No data is sent to printers or external services."
                )}
              </p>
            </div>

            {/* Notice Paper Content */}
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 font-mono text-xs space-y-2 leading-relaxed" dir="ltr">
              <div className="text-center font-bold text-foreground pb-2 border-b border-border">
                FRED DISPENSE — OWING MEDICATION NOTICE
              </div>
              <div><strong>Notice ID:</strong> {previewNotice.noticeId}</div>
              <div><strong>Medication:</strong> {previewNotice.prescribedDrug}</div>
              <div><strong>Schedule:</strong> {previewNotice.schedule}</div>
              <div><strong>Quantity:</strong> {previewNotice.quantity}</div>
              <div><strong>Original Script Date:</strong> {previewNotice.scriptDate}</div>
              <div><strong>Simulated Issue Date:</strong> {previewNotice.issueDate}</div>
              <div className="pt-2 border-t border-border text-center">
                <strong>Barcode:</strong> {previewNotice.barcode}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewNotice(null)}
                className="cursor-pointer text-xs"
              >
                {T("بستن پیش‌نمایش", "Close Preview")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
