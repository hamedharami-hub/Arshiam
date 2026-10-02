import { useState } from "react";
import { useBilingual } from "@/hooks/useBilingual";
import { DEFAULT_FRED_LABEL_STATE, FINAL_REVIEW_ENTRIES, FRED_RETENTION_DOCUMENTS, FRED_SAFETY_NET_SCENARIOS, FRED_TRAINING_ERX_BARCODE, FRED_VISUALIZER_SECTIONS, INITIAL_EDUCATIONAL_TERMINAL_STATE, INITIAL_FINAL_REVIEW_STATE, INITIAL_ODT_SESSION_STATE, INITIAL_PBS_POS_STATE, ODT_SESSION_ENTRIES, SYNTHETIC_VISUALIZER_SCRIPTS, canOpenFinalReviewPreview, canOpenOdtSessionPreview, canOpenPbsPosPreview, evaluateFredReconciliation, executeEducationalTerminalCommand, generateFredOwingNoticePreview, resolveFredPracticeShortcut, type EducationalTerminalState, type FinalReviewPracticeEntry, type FinalReviewPracticeId, type FinalReviewPracticeState, type FredLabelState, type FredOwingNoticePreview, type FredSafetyNetScenario, type FredShortcutPractice, type OdtSessionFormat, type OdtSessionPracticeEntry, type OdtSessionPracticeId, type OdtSessionPracticeState, type PbsPosGroupId, type PbsPosItemId, type PbsPosPracticeState, type PharmacyFredPracticeEntry, type RetentionBucket, type ScriptVisualizerSection, type ScriptVisualizerSectionId, type SyntheticVisualizerScript } from "@/lib/pharmacyFredPractice";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "@/lib/pharmacyFredPracticeData";
type DispenseStep = 0 | 1 | 2;
type SafetyNetStep = 0 | 1 | 2;

export function useFredPracticeState() {
const { T, lang } = useBilingual();
  const isEn = lang === "en";

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

  return { T, lang, isEn, selectedId, setSelectedId, dispenseStep, setDispenseStep, shortcutInput, setShortcutInput, owingBarcode, setOwingBarcode, owingReconciled, setOwingReconciled, barcodeError, setBarcodeError, previewNotice, setPreviewNotice, scenario, parsedShortcut, resetDispense, handleSelectScenario, handleStartNewScenario, handleMarkOffOwing, handleOpenNoticePreview, isExactBarcodeValid, selectedSafetyNetId, setSelectedSafetyNetId, safetyNetStep, setSafetyNetStep, selectedGapAnswer, setSelectedGapAnswer, selectedStatusAnswer, setSelectedStatusAnswer, safetyNetScenario, resetSafetyNet, labelState, setLabelState, resetLabel, handleToggleAuxiliaryLabel, retentionSelections, setRetentionSelections, retentionVerified, setRetentionVerified, resetRetention, handleSelectRetentionBucket, canVerifyRetention, selectedVisualizerScriptId, setSelectedVisualizerScriptId, selectedSectionId, setSelectedSectionId, visualizerScript, activeSectionDetail, resetVisualizer, terminalState, setTerminalState, terminalInput, setTerminalInput, handleRunTerminalCommand, handleResetTerminal, finalReviewState, setFinalReviewState, handleSelectFinalReviewEntry, handleToggleFinalReviewCriterion, handleOpenFinalReviewPreview, handleResetFinalReview, handleCloseFinalReviewPreview, activeReviewEntry, odtState, setOdtState, handleSelectOdtEntry, handleSelectOdtFormat, handleToggleOdtCriterion, handleOpenOdtPreview, handleResetOdt, handleCloseOdtPreview, activeOdtEntry, pbsPosState, setPbsPosState, handleAssignPbsPosItem, handleOpenPbsPosPreview, handleResetPbsPos, handleClosePbsPosPreview };
}
