import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  DEFAULT_FRED_LABEL_STATE,
  FRED_AUXILIARY_LABELS,
  FRED_RETENTION_DOCUMENTS,
  FRED_SAFETY_NET_SCENARIOS,
  FRED_SHORTCUT_PRACTICE,
  FRED_TRAINING_ERX_BARCODE,
  FRED_VISUALIZER_SECTIONS,
  INITIAL_EDUCATIONAL_TERMINAL_STATE,
  SYNTHETIC_VISUALIZER_SCRIPTS,
  EDUCATIONAL_TERMINAL_CHIPS,
  FINAL_REVIEW_CHECKLIST_CRITERIA,
  FINAL_REVIEW_CONFIRMATION_EN,
  FINAL_REVIEW_CONFIRMATION_FA,
  FINAL_REVIEW_ENTRIES,
  FINAL_REVIEW_WATERMARK_EN,
  FINAL_REVIEW_WATERMARK_FA,
  evaluateFredReconciliation,
  executeEducationalTerminalCommand,
  generateFredOwingNoticePreview,
  matchesFredTrainingBarcode,
  resolveFredPracticeShortcut,
  canOpenFinalReviewPreview,
  FRED_ACTION_WATERMARK_EN,
  FRED_ACTION_WATERMARK_FA,
  ODT_SESSION_ENTRIES,
  ODT_SESSION_CHECKLIST_CRITERIA,
  canOpenOdtSessionPreview,
  ODT_SESSION_RESULT_NOTICE_EN,
  ODT_SESSION_RESULT_NOTICE_FA,
  PBS_POS_PRACTICE_ITEMS,
  PBS_POS_PRACTICE_GROUPS,
  canOpenPbsPosPreview,
  PBS_POS_RESULT_NOTICE_EN,
  PBS_POS_RESULT_NOTICE_FA,
  type EducationalTerminalLogEntry,
  type EducationalTerminalState,
} from "./pharmacyFredPractice";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "./pharmacyFredPracticeData";
import { evaluateLiteralAst } from "../../scripts/pharmacyFredLiteralAst.mjs";

describe("pharmacyFredPractice library and data security", () => {
  it("contains 6 educational scenarios with zero PII fields", () => {
    expect(PHARMACY_FRED_PRACTICE_SCENARIOS).toHaveLength(6);

    const disallowedKeys = [
      "patientName",
      "patientDob",
      "medicareNumber",
      "prescriberName",
      "prescriberNumber",
      "dob",
      "medicare",
    ];

    for (const scenario of PHARMACY_FRED_PRACTICE_SCENARIOS) {
      for (const disallowed of disallowedKeys) {
        expect(scenario).not.toHaveProperty(disallowed);
      }
      expect(scenario.contentReviewStatus).toBe("unreviewed");
      expect(scenario.sourceUrl).toContain("5b4f7d2443a3ed97aea752c1d0d18583ce6d0067");
      expect(scenario.prescribedDrug).toBeTruthy();
      expect(scenario.schedule).toMatch(/^(S4|S8)$/);
    }

    // Verify stringified JSON does not contain Medicare or patient keywords
    const stringified = JSON.stringify(PHARMACY_FRED_PRACTICE_SCENARIOS);
    expect(stringified).not.toContain("David Miller");
    expect(stringified).not.toContain("Robert Vance");
    expect(stringified).not.toContain("2983 10928 1");
    expect(stringified).not.toContain("Dr. Sarah");
  });

  it("identifies expired S8 prescription scenario properly", () => {
    const expiredS8 = PHARMACY_FRED_PRACTICE_SCENARIOS.find((s) => s.isExpiredS8);
    expect(expiredS8).toBeDefined();
    expect(expiredS8?.id).toBe("script-3");
    expect(expiredS8?.schedule).toBe("S8");
  });

  it("evaluates safe literal AST nodes and fails closed on executable code", () => {
    const testFile = ts.createSourceFile(
      "test.ts",
      "const a = [{ name: 'safe', count: 42, active: true }]; const bad = Math.random(); const proto = { __proto__: { polluted: true } };",
      ts.ScriptTarget.Latest,
      true,
    );

    const safeInit = (testFile.statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!;
    const parsed = evaluateLiteralAst(safeInit);
    expect(parsed).toEqual([{ name: "safe", count: 42, active: true }]);

    // Disallowed executable call expression
    const badInit = (testFile.statements[1] as ts.VariableStatement).declarationList.declarations[0].initializer!;
    expect(() => evaluateLiteralAst(badInit)).toThrow(/Disallowed executable or non-literal AST node/);

    const unsafeProtoInit = (testFile.statements[2] as ts.VariableStatement).declarationList.declarations[0].initializer!;
    expect(() => evaluateLiteralAst(unsafeProtoInit)).toThrow(/Disallowed unsafe object property/);
  });

  it("resolves valid shortcuts and aliases regardless of case or whitespace", () => {
    expect(resolveFredPracticeShortcut("5/1")?.id).toBe("standard");
    expect(resolveFredPracticeShortcut("  5  ")?.id).toBe("standard");
    expect(resolveFredPracticeShortcut("1")?.id).toBe("standard");

    expect(resolveFredPracticeShortcut("5/3")?.id).toBe("outside");
    expect(resolveFredPracticeShortcut("3")?.id).toBe("outside");

    expect(resolveFredPracticeShortcut("5d")?.id).toBe("deferred");
    expect(resolveFredPracticeShortcut("D5")?.id).toBe("deferred");
    expect(resolveFredPracticeShortcut("defer")?.id).toBe("deferred");

    expect(resolveFredPracticeShortcut("5r")?.id).toBe("reg24");
    expect(resolveFredPracticeShortcut("reg24")?.id).toBe("reg24");
    expect(resolveFredPracticeShortcut("REG 24")?.id).toBe("reg24");
  });

  it("returns null for unknown or invalid shortcut inputs", () => {
    expect(resolveFredPracticeShortcut("")).toBeNull();
    expect(resolveFredPracticeShortcut("   ")).toBeNull();
    expect(resolveFredPracticeShortcut("xyz")).toBeNull();
    expect(resolveFredPracticeShortcut("99/9")).toBeNull();
  });

  it("verifies clean Persian UTF-8 text in shortcut metadata without mojibake", () => {
    for (const shortcut of FRED_SHORTCUT_PRACTICE) {
      expect(shortcut.titleFa).toBeTruthy();
      expect(shortcut.descriptionFa).toBeTruthy();
      // Ensure no raw mojibake replacement characters (\uFFFD or typical corrupt sequences)
      expect(shortcut.titleFa).not.toContain("\uFFFD");
      expect(shortcut.descriptionFa).not.toContain("\uFFFD");
      expect(shortcut.titleFa).not.toMatch(/[\u00D8\u00D9\u00DB]/);
      expect(shortcut.descriptionFa).not.toMatch(/[\u00D8\u00D9\u00DB]/);
      // Check presence of valid Persian characters
      expect(/[\u0600-\u06FF]/.test(shortcut.titleFa)).toBe(true);
      expect(/[\u0600-\u06FF]/.test(shortcut.descriptionFa)).toBe(true);
    }
  });

  it("validates exact training barcode and rejects invalid or empty barcodes", () => {
    expect(matchesFredTrainingBarcode(FRED_TRAINING_ERX_BARCODE)).toBe(true);
    expect(matchesFredTrainingBarcode("train-erx-4821")).toBe(true);
    expect(matchesFredTrainingBarcode("  TRAIN-ERX-4821  ")).toBe(true);

    expect(matchesFredTrainingBarcode("")).toBe(false);
    expect(matchesFredTrainingBarcode("WRONG-BARCODE")).toBe(false);
    expect(matchesFredTrainingBarcode("TRAIN-ERX-4820")).toBe(false);

    // evaluateFredReconciliation
    expect(evaluateFredReconciliation(FRED_TRAINING_ERX_BARCODE)).toEqual({ success: true });
    expect(evaluateFredReconciliation("").success).toBe(false);
    expect(evaluateFredReconciliation("   ").success).toBe(false);
    expect(evaluateFredReconciliation("RANDOM-BARCODE").success).toBe(false);
  });

  it("generates simulated owing notice preview marked strictly as educational sample", () => {
    const sample = PHARMACY_FRED_PRACTICE_SCENARIOS[0];
    const preview = generateFredOwingNoticePreview(sample);

    expect(preview.isEducationalSampleOnly).toBe(true);
    expect(preview.noticeId).toBe("OWING-NOTICE-SCRIPT-1");
    expect(preview.prescribedDrug).toBe(sample.prescribedDrug);
    expect(preview.barcode).toBe(FRED_TRAINING_ERX_BARCODE);
    expect(preview.noticeStatusTextEn).toContain("TRAINING PREVIEW ONLY");
  });

  describe("Safety Net educational simulation data", () => {
    it("provides accurate synthetic scenarios marked unreviewed with valid 2026 Services Australia calculations", () => {
      expect(FRED_SAFETY_NET_SCENARIOS.length).toBeGreaterThanOrEqual(2);

      const general = FRED_SAFETY_NET_SCENARIOS.find((s) => s.category === "general");
      expect(general).toBeDefined();
      expect(general?.syntheticThreshold).toBe(1748.20);
      expect(general?.currentSpend).toBe(1725.30);
      expect(general?.scriptContribution).toBe(25.00);
      expect(general?.expectedRemainingBeforeScript).toBe(22.90);
      expect(general?.expectedCrossesThreshold).toBe(true);
      expect(general?.descriptionEn).toContain("Fictional training values");
      expect(general?.sourceSnapshotDate).toBe("2026-01-01");
      expect(general?.sourceCheckDate).toBe("2026-09-26");
      expect(general?.sourceUrl).toContain("servicesaustralia.gov.au");

      const concessional = FRED_SAFETY_NET_SCENARIOS.find((s) => s.category === "concessional");
      expect(concessional).toBeDefined();
      expect(concessional?.syntheticThreshold).toBe(277.20);
      expect(concessional?.currentSpend).toBe(145.00);
      expect(concessional?.scriptContribution).toBe(7.70);
      expect(concessional?.expectedRemainingBeforeScript).toBe(132.20);
      expect(concessional?.expectedCrossesThreshold).toBe(false);
      expect(concessional?.descriptionEn).toContain("Fictional training values");
      expect(concessional?.sourceSnapshotDate).toBe("2026-01-01");

      for (const scenario of FRED_SAFETY_NET_SCENARIOS) {
        expect(scenario.contentReviewStatus).toBe("unreviewed");
        expect(scenario.syntheticThreshold).toBeGreaterThan(scenario.currentSpend);

        const remaining = Number((scenario.syntheticThreshold - scenario.currentSpend).toFixed(2));
        expect(scenario.expectedRemainingBeforeScript).toBeCloseTo(remaining, 2);

        const crosses = (scenario.currentSpend + scenario.scriptContribution) >= scenario.syntheticThreshold;
        expect(scenario.expectedCrossesThreshold).toBe(crosses);

        expect(/[\u0600-\u06FF]/.test(scenario.titleFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(scenario.descriptionFa)).toBe(true);
        expect(scenario.titleFa).not.toContain("\uFFFD");
        expect(scenario.descriptionFa).not.toContain("\uFFFD");
      }
    });

    it("verifies Regulation 49 shortcut naming, training-only alias note, and verified prerequisites without travel-alone claims", () => {
      const reg49 = FRED_SHORTCUT_PRACTICE.find((s) => s.id === "reg24");
      expect(reg49).toBeDefined();
      expect(reg49?.titleEn).toContain("Regulation 49 (formerly Regulation 24)");
      expect(reg49?.titleEn).toContain("Training Alias");
      expect(reg49?.titleFa).toContain("مقررات ۴۹ (قانون ۲۴ سابق)");
      expect(reg49?.descriptionEn).toContain("training-only alias");
      expect(reg49?.descriptionEn).toContain("not verified standard FRED syntax");
      expect(reg49?.descriptionEn).toContain("great hardship");
      expect(reg49?.descriptionEn).toContain("not optometrist or dentist");
      expect(reg49?.descriptionEn).toContain("nurse practitioner");
      expect(reg49?.descriptionFa).toContain("Nurse Practitioner (پرستار دارای مجوز تجویز)");
      expect(reg49?.descriptionFa).not.toContain("پرستار رسمی");
      expect(reg49?.descriptionEn).not.toContain("traveling patients");
      expect(reg49?.descriptionEn).not.toContain("Supply All 6 Months");
      expect(reg49?.descriptionFa).not.toContain("مسافر");
      expect(reg49?.descriptionFa).not.toContain("۶ ماه دارویی");
    });
  });

  describe("Labeling simulation data & defaults", () => {
    it("contains auxiliary warning labels with clean Persian text and zero PII in default state", () => {
      expect(FRED_AUXILIARY_LABELS).toHaveLength(4);

      for (const label of FRED_AUXILIARY_LABELS) {
        expect(label.code).toMatch(/^Label \d+$/);
        expect(label.textEn).toBeTruthy();
        expect(/[\u0600-\u06FF]/.test(label.textFa)).toBe(true);
        expect(label.textFa).not.toContain("\uFFFD");
      }

      // Default label state check
      expect(DEFAULT_FRED_LABEL_STATE.samplePatientCode).toContain("ANONYMIZED");
      expect(DEFAULT_FRED_LABEL_STATE.samplePatientCode).not.toContain("David");
      expect(DEFAULT_FRED_LABEL_STATE.medicationName).toBeTruthy();
      expect(DEFAULT_FRED_LABEL_STATE.directions).toBeTruthy();
    });
  });

  describe("Retention simulation documents", () => {
    it("defines 3 synthetic documents with fictional exercise buckets and non-regulatory notes", () => {
      expect(FRED_RETENTION_DOCUMENTS).toHaveLength(3);

      const codes = FRED_RETENTION_DOCUMENTS.map((d) => d.code);
      expect(codes).toEqual(["SIM-REG-801", "SIM-RX-402", "SIM-LOG-004"]);

      const buckets = FRED_RETENTION_DOCUMENTS.map((d) => d.exerciseBucket);
      expect(buckets).toEqual(["bucket_a", "bucket_b", "bucket_c"]);

      for (const doc of FRED_RETENTION_DOCUMENTS) {
        expect(doc.contentReviewStatus).toBe("unreviewed");
        expect(/[\u0600-\u06FF]/.test(doc.titleFa)).toBe(true);
        expect(/\d|\b(?:years?|statutory|legislation)\b/i.test(doc.exerciseNoteEn)).toBe(false);
        expect(/\d|سال|قانون|مقررات/.test(doc.exerciseNoteFa)).toBe(false);
        expect(/حوزهٔ قضایی/.test(doc.exerciseNoteFa)).toBe(true);
        expect(doc.titleFa).not.toContain("\uFFFD");
        expect(doc.exerciseNoteFa).not.toContain("\uFFFD");
        expect(doc.exerciseNoteEn).toContain("fictional");
      }
    });
  });

  describe("Script Visualizer & Practice Layout data", () => {
    it("defines 4 purely illustrative layout sections with clean bilingual text and zero clinical/prescriber claims", () => {
      expect(FRED_VISUALIZER_SECTIONS).toHaveLength(4);
      const sectionIds = FRED_VISUALIZER_SECTIONS.map((s) => s.id);
      expect(sectionIds).toEqual([
        "layout_header",
        "practice_zone_a",
        "practice_zone_b",
        "notice_footer",
      ]);

      // Strictly verify no patient, prescriber, medicare, barcode, or clinical section ids exist
      const disallowedIds = ["patient", "prescriber", "medication", "barcode", "repeats", "directions"];
      for (const id of disallowedIds) {
        expect(sectionIds).not.toContain(id);
      }

      for (const section of FRED_VISUALIZER_SECTIONS) {
        expect(section.badgeEn).toBeTruthy();
        expect(section.badgeFa).toBeTruthy();
        expect(section.descriptionEn).toBeTruthy();
        expect(section.descriptionFa).toBeTruthy();
        expect(section.layoutTipEn).toBeTruthy();
        expect(section.layoutTipFa).toBeTruthy();

        // Ensure clean UTF-8 Persian without mojibake
        expect(/[\u0600-\u06FF]/.test(section.badgeFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(section.titleFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(section.descriptionFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(section.layoutTipFa)).toBe(true);
        expect(section.badgeFa).not.toContain("\uFFFD");
        expect(section.titleFa).not.toContain("\uFFFD");
        expect(section.descriptionFa).not.toContain("\uFFFD");
        expect(section.layoutTipFa).not.toContain("\uFFFD");

        // Disallow clinical claims, signatures, and validity claims
        const stringified = JSON.stringify(section);
        expect(stringified).not.toContain("امضای معتبر");
        expect(stringified).not.toMatch(/valid signature|statutory|regulation 24|pb82|pbs/i);
      }
    });

    it("provides 2 fictional practice layouts named Layout A/B with pure bilingual placeholder text and zero patient/prescriber/drug data", () => {
      expect(SYNTHETIC_VISUALIZER_SCRIPTS).toHaveLength(2);

      const layoutNames = SYNTHETIC_VISUALIZER_SCRIPTS.map((s) => s.layoutNameEn);
      expect(layoutNames).toEqual([
        "Fictional Practice Layout A",
        "Fictional Practice Layout B",
      ]);

      const disallowedTerms = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "2018H", "8214K", "Regulation 24", "Reg 24",
        "PB 82", "PB82", "PBS", "RPBS", "TRAIN-ERX", "barcode", "امضای معتبر"
      ];

      for (const script of SYNTHETIC_VISUALIZER_SCRIPTS) {
        expect(script.contentReviewStatus).toBe("unreviewed");
        expect(script.placeholderItem).toMatch(/^Training item [AB]$/);
        expect(script.placeholderItemEn).toMatch(/^Training item [AB]$/);
        expect(script.placeholderItemFa).toMatch(/^آیتم تمرینی (?:الف|ب)$/);
        expect(script.illustrativeValue).toBe("Illustrative value only");
        expect(script.illustrativeValueEn).toBe("Illustrative value only");
        expect(script.illustrativeValueFa).toBe("صرفاً مقدار نمایشی");
        expect(script.layoutBadge).toMatch(/^Layout [AB]$/);
        expect(script.layoutBadgeEn).toMatch(/^Layout [AB]$/);
        expect(script.layoutBadgeFa).toMatch(/^چیدمان (?:الف|ب)$/);
        expect(script.instructionNoticeEn).toContain("No use instructions");
        expect(script.instructionNoticeEn).toContain("Not a real prescription");
        expect(script.instructionNoticeFa).toContain("فاقد دستور مصرف");
        expect(script.footerNoticeFa).toContain("چیدمان ساختگی");

        // Persian UTF-8 integrity
        expect(/[\u0600-\u06FF]/.test(script.layoutBadgeFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(script.placeholderItemFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(script.illustrativeValueFa)).toBe(true);
        expect(script.layoutBadgeFa).not.toContain("\uFFFD");
        expect(script.placeholderItemFa).not.toContain("\uFFFD");
        expect(script.illustrativeValueFa).not.toContain("\uFFFD");

        // Confirm absence of forbidden properties
        expect(script).not.toHaveProperty("patient");
        expect(script).not.toHaveProperty("anonymizedPatientTag");
        expect(script).not.toHaveProperty("simulatedMedicareRef");
        expect(script).not.toHaveProperty("prescriber");
        expect(script).not.toHaveProperty("prescriberClinicEn");
        expect(script).not.toHaveProperty("prescriberProviderNo");
        expect(script).not.toHaveProperty("pbsItemCode");
        expect(script).not.toHaveProperty("drugName");
        expect(script).not.toHaveProperty("repeatsCount");
        expect(script).not.toHaveProperty("isReg24");
        expect(script).not.toHaveProperty("trainingBarcode");

        // Check stringified representation for zero disallowed terms
        const json = JSON.stringify(script);
        for (const term of disallowedTerms) {
          expect(json).not.toContain(term);
        }
      }
    });
  });

  describe("Educational Terminal Whitelisted Commands & Pure Helpers", () => {
    it("defines 6 whitelisted chips with valid Persian/English labels and descriptions", () => {
      expect(EDUCATIONAL_TERMINAL_CHIPS).toHaveLength(6);
      const commands = EDUCATIONAL_TERMINAL_CHIPS.map((c) => c.command);
      expect(commands).toEqual(["HELP", "OPEN A", "OPEN B", "STATUS", "CLEAR", "RESET"]);

      for (const chip of EDUCATIONAL_TERMINAL_CHIPS) {
        expect(chip.labelEn).toBeTruthy();
        expect(chip.labelFa).toBeTruthy();
        expect(chip.descriptionEn).toBeTruthy();
        expect(chip.descriptionFa).toBeTruthy();
        expect(/[\u0600-\u06FF]/.test(chip.labelFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(chip.descriptionFa)).toBe(true);
        expect(chip.labelFa).not.toContain("\uFFFD");
        expect(chip.descriptionFa).not.toContain("\uFFFD");
      }
    });

    it("is pure, deterministic, and preserves immutability of current state", () => {
      const state: EducationalTerminalState = Object.freeze({
        history: Object.freeze([]) as unknown as EducationalTerminalLogEntry[],
        selectedEntryId: null,
        executedCount: 4,
        logSequence: 4,
      });

      const snapshot = JSON.stringify(state);
      const options = { timestamp: "14:30:00" };
      const res1 = executeEducationalTerminalCommand("HELP", state, options);
      const res2 = executeEducationalTerminalCommand("HELP", state, options);

      // Deterministic identical outputs
      expect(res1).toEqual(res2);
      expect(res1.nextState.history[0].id).toBe("term-seq-5-1-cmd");
      expect(res1.nextState.history[1].id).toBe("term-seq-5-2-out");
      expect(res1.nextState.history[0].timestamp).toBe("14:30:00");

      // Immutability verified: state properties are unchanged
      expect(JSON.stringify(state)).toBe(snapshot);
      expect(state.executedCount).toBe(4);
      expect(state.logSequence).toBe(4);
      expect(state.selectedEntryId).toBeNull();
      expect(state.history).toHaveLength(0);
    });

    it("evaluates all 6 whitelisted commands correctly and handles case/whitespace normalization", () => {
      let state = INITIAL_EDUCATIONAL_TERMINAL_STATE;

      // Empty input
      const emptyRes = executeEducationalTerminalCommand("   ", state);
      expect(emptyRes.actionTaken).toBe("empty");
      expect(emptyRes.nextState).toBe(state);

      // HELP command (lowercase with padding)
      const helpRes = executeEducationalTerminalCommand("  help  ", state, { timestamp: "12:00:00" });
      expect(helpRes.actionTaken).toBe("executed");
      expect(helpRes.nextState.executedCount).toBe(1);
      expect(helpRes.nextState.logSequence).toBe(1);
      expect(helpRes.nextState.history).toHaveLength(2); // command + output
      expect(helpRes.nextState.history[1].type).toBe("output");
      expect(helpRes.nextState.history[1].textEn).toContain("Available whitelisted commands");
      expect(helpRes.nextState.history[1].textFa).toContain("فرمان‌های مجاز");
      state = helpRes.nextState;

      // OPEN A command (mixed case)
      const openARes = executeEducationalTerminalCommand("open   a", state, { timestamp: "12:01:00" });
      expect(openARes.actionTaken).toBe("executed");
      expect(openARes.nextState.executedCount).toBe(2);
      expect(openARes.nextState.logSequence).toBe(2);
      expect(openARes.nextState.selectedEntryId).toBe("entry_a");
      const cardA = openARes.nextState.history[openARes.nextState.history.length - 1];
      expect(cardA.type).toBe("card");
      expect(cardA.cardDetail?.titleEn).toBe("Training entry A");
      expect(cardA.cardDetail?.titleFa).toBe("آیتم تمرینی الف");
      expect(cardA.cardDetail?.descriptionEn).toContain("Illustrative sample only — not a real prescription or record.");
      expect(cardA.cardDetail?.descriptionFa).toContain("نمایش صرفاً نمونه، هیچ نسخه یا رکورد واقعی نیست.");
      state = openARes.nextState;

      // STATUS command - increments executedCount and reflects it in output text
      const statusRes = executeEducationalTerminalCommand("STATUS", state, { timestamp: "12:02:00" });
      expect(statusRes.actionTaken).toBe("executed");
      expect(statusRes.nextState.executedCount).toBe(3);
      expect(statusRes.nextState.logSequence).toBe(3);
      const statusOut = statusRes.nextState.history[statusRes.nextState.history.length - 1];
      expect(statusOut.textEn).toContain("Commands Executed: 3");
      expect(statusOut.textFa).toContain("تعداد فرامین اجراشده: 3");
      expect(statusOut.textEn).toContain("Training entry A");
      expect(statusOut.textFa).toContain("آیتم تمرینی الف");
      state = statusRes.nextState;

      // OPEN B command
      const openBRes = executeEducationalTerminalCommand("OPEN B", state, { timestamp: "12:03:00" });
      expect(openBRes.actionTaken).toBe("executed");
      expect(openBRes.nextState.executedCount).toBe(4);
      expect(openBRes.nextState.logSequence).toBe(4);
      expect(openBRes.nextState.selectedEntryId).toBe("entry_b");
      const cardB = openBRes.nextState.history[openBRes.nextState.history.length - 1];
      expect(cardB.cardDetail?.titleEn).toBe("Training entry B");
      expect(cardB.cardDetail?.titleFa).toBe("آیتم تمرینی ب");
      state = openBRes.nextState;

      // CLEAR command - clears history, preserves active entry, increments executedCount and logSequence
      const clearRes = executeEducationalTerminalCommand("clear", state, { timestamp: "12:04:00" });
      expect(clearRes.actionTaken).toBe("cleared");
      expect(clearRes.nextState.history).toHaveLength(0);
      expect(clearRes.nextState.selectedEntryId).toBe("entry_b"); // selection preserved on clear
      expect(clearRes.nextState.executedCount).toBe(5); // executedCount incremented
      expect(clearRes.nextState.logSequence).toBe(5);
      state = clearRes.nextState;

      // RESET command - resets selectedEntryId to null and executedCount to 0, while keeping monotonic logSequence
      const resetRes = executeEducationalTerminalCommand("reset", state, { timestamp: "12:05:00" });
      expect(resetRes.actionTaken).toBe("executed");
      expect(resetRes.nextState.selectedEntryId).toBeNull();
      expect(resetRes.nextState.executedCount).toBe(0);
      expect(resetRes.nextState.logSequence).toBe(6);
      expect(resetRes.nextState.history).toHaveLength(2);
      expect(resetRes.nextState.history[1].type).toBe("system");
    });

    it("enforces 120-character input cap, rejects long inputs with bilingual error, and never echoes long inputs", () => {
      const state: EducationalTerminalState = {
        history: [],
        selectedEntryId: null,
        executedCount: 0,
        logSequence: 0,
      };

      const longInput = "HELP ".repeat(26); // 130 characters (> 120)
      expect(longInput.length).toBeGreaterThan(120);

      const res = executeEducationalTerminalCommand(longInput, state, { timestamp: "12:00:00" });
      expect(res.actionTaken).toBe("error");
      expect(res.nextState.executedCount).toBe(1);
      expect(res.nextState.logSequence).toBe(1);
      expect(res.nextState.history).toHaveLength(2);

      const cmdLog = res.nextState.history[0];
      const errLog = res.nextState.history[1];

      // Does not echo the raw long input in commandText or display text
      expect(cmdLog.commandText).toBe("[Exceeded max length]");
      expect(cmdLog.textEn).not.toContain(longInput);
      expect(cmdLog.textFa).not.toContain(longInput);
      expect(cmdLog.textEn).toContain("Command exceeded maximum length of 120 characters");
      expect(cmdLog.textFa).toContain("فرمان بیش از حد مجاز 120 نویسه است");

      expect(errLog.type).toBe("error");
      expect(errLog.textEn).toContain("Command input too long (maximum 120 characters).");
      expect(errLog.textFa).toContain("فرمان ورودی بیش از حد طولانی است (حداکثر 120 نویسه).");
    });

    it("caps history to 100 entries when executing commands beyond the history threshold", () => {
      let state = INITIAL_EDUCATIONAL_TERMINAL_STATE;

      // Execute 60 HELP commands -> would generate 120 entries without cap
      for (let i = 0; i < 60; i++) {
        state = executeEducationalTerminalCommand("HELP", state, { timestamp: "12:00:00" }).nextState;
      }

      expect(state.history.length).toBe(100);
      expect(state.executedCount).toBe(60);
      expect(state.logSequence).toBe(60);
      // Older entries are dropped, newest entries remain intact
      expect(state.history[state.history.length - 1].type).toBe("output");
    });

    it("ensures unique log IDs and avoids React key collisions when RESET is executed from INITIAL followed by commands", () => {
      // Step 1: Run RESET from INITIAL state
      let state = INITIAL_EDUCATIONAL_TERMINAL_STATE;
      const resetRes = executeEducationalTerminalCommand("RESET", state, { timestamp: "12:00:00" });
      expect(resetRes.actionTaken).toBe("executed");
      expect(resetRes.nextState.executedCount).toBe(0); // session count reset to 0
      expect(resetRes.nextState.logSequence).toBe(1); // sequence incremented monotonically
      expect(resetRes.nextState.history).toHaveLength(2);
      state = resetRes.nextState;

      // Step 2: Run HELP in the freshly reset session
      const helpRes = executeEducationalTerminalCommand("HELP", state, { timestamp: "12:00:05" });
      expect(helpRes.actionTaken).toBe("executed");
      expect(helpRes.nextState.executedCount).toBe(1); // user-facing session count is 1
      expect(helpRes.nextState.logSequence).toBe(2);
      expect(helpRes.nextState.history).toHaveLength(4);
      state = helpRes.nextState;

      // Step 3: Run OPEN A in the same session
      const openARes = executeEducationalTerminalCommand("OPEN A", state, { timestamp: "12:00:10" });
      expect(openARes.actionTaken).toBe("executed");
      expect(openARes.nextState.executedCount).toBe(2); // user-facing session count is 2
      expect(openARes.nextState.logSequence).toBe(3);
      expect(openARes.nextState.history).toHaveLength(6);
      state = openARes.nextState;

      // Verify all IDs in history are strictly unique (no React key collisions)
      const allIds = state.history.map((entry) => entry.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
      expect(allIds).toEqual([
        "term-seq-1-1-cmd",
        "term-seq-1-2-sys",
        "term-seq-2-1-cmd",
        "term-seq-2-2-out",
        "term-seq-3-1-cmd",
        "term-seq-3-2-card",
      ]);
    });

    it("returns bilingual error for unknown commands and never executes arbitrary input", () => {
      const state = INITIAL_EDUCATIONAL_TERMINAL_STATE;
      const invalidRes = executeEducationalTerminalCommand("rm -rf /", state);
      expect(invalidRes.actionTaken).toBe("error");
      const errEntry = invalidRes.nextState.history[1];
      expect(errEntry.type).toBe("error");
      expect(errEntry.textEn).toContain("Unrecognized command: 'rm -rf /'");
      expect(errEntry.textFa).toContain("فرمان ناشناخته: «rm -rf /»");

      // Verify zero disallowed clinical, prescriber, or patient terms in terminal chips and responses
      const disallowed = [
        "David", "Miller", "Medicare", "prescriber", "provider", "Atorvastatin",
        "Regulation 24", "PB 82", "PBS", "RPBS", "barcode", "امضای معتبر"
      ];
      const json = JSON.stringify({ chips: EDUCATIONAL_TERMINAL_CHIPS, errEntry });
      for (const term of disallowed) {
        expect(json).not.toContain(term);
      }
    });
  });

  describe("Final Review Preview practice library and data security", () => {
    it("defines exactly two fictional training entries marked unreviewed with persistent watermarks and zero clinical/patient PII", () => {
      expect(FINAL_REVIEW_ENTRIES).toHaveLength(2);

      const entryIds = FINAL_REVIEW_ENTRIES.map((e) => e.id);
      expect(entryIds).toEqual(["review_a", "review_b"]);

      for (const entry of FINAL_REVIEW_ENTRIES) {
        expect(entry.contentReviewStatus).toBe("unreviewed");
        expect(entry.watermarkEn).toBe(FINAL_REVIEW_WATERMARK_EN);
        expect(entry.watermarkFa).toBe(FINAL_REVIEW_WATERMARK_FA);
        expect(entry.titleEn).toBeTruthy();
        expect(entry.titleFa).toBeTruthy();
        expect(entry.descriptionEn).toBeTruthy();
        expect(entry.descriptionFa).toBeTruthy();
        expect(entry.zonePreviewEn).toBeTruthy();
        expect(entry.zonePreviewFa).toBeTruthy();

        // Verify valid Persian UTF-8 and no mojibake
        expect(entry.titleFa).not.toContain("\uFFFD");
        expect(entry.descriptionFa).not.toContain("\uFFFD");
        expect(entry.zonePreviewFa).not.toContain("\uFFFD");
        expect(/[\u0600-\u06FF]/.test(entry.titleFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(entry.descriptionFa)).toBe(true);

        // Disallowed PII / clinical terms
        const disallowed = [
          "David", "Miller", "Medicare", "prescriber", "provider", "Atorvastatin",
          "Lipitor", "Regulation 24", "PB 82", "PBS", "RPBS", "barcode", "امضای معتبر",
          "patient", "dispensed", "approved"
        ];
        const json = JSON.stringify(entry);
        for (const term of disallowed) {
          expect(json).not.toContain(term);
        }
      }
    });

    it("defines exactly 3 visual quality checklist criteria without clinical or legal verification claims", () => {
      expect(FINAL_REVIEW_CHECKLIST_CRITERIA).toHaveLength(3);
      const criteriaIds = FINAL_REVIEW_CHECKLIST_CRITERIA.map((c) => c.id);
      expect(criteriaIds).toEqual(["legibility", "notice_visible", "no_real_data"]);

      for (const criterion of FINAL_REVIEW_CHECKLIST_CRITERIA) {
        expect(criterion.labelEn).toBeTruthy();
        expect(criterion.labelFa).toBeTruthy();
        expect(criterion.descriptionEn).toBeTruthy();
        expect(criterion.descriptionFa).toBeTruthy();
        expect(/[\u0600-\u06FF]/.test(criterion.labelFa)).toBe(true);
        expect(criterion.labelFa).not.toContain("\uFFFD");
      }
    });

    it("evaluates canOpenFinalReviewPreview pure helper strictly: requires selected entry and all 3 criteria checked", () => {
      // No entry selected -> false regardless of checkboxes
      expect(
        canOpenFinalReviewPreview(null, {
          legibility: true,
          notice_visible: true,
          no_real_data: true,
        })
      ).toBe(false);

      // Entry selected but incomplete checkboxes -> false
      expect(
        canOpenFinalReviewPreview("review_a", {
          legibility: false,
          notice_visible: false,
          no_real_data: false,
        })
      ).toBe(false);

      expect(
        canOpenFinalReviewPreview("review_a", {
          legibility: true,
          notice_visible: false,
          no_real_data: true,
        })
      ).toBe(false);

      expect(
        canOpenFinalReviewPreview("review_a", {
          legibility: true,
          notice_visible: true,
          no_real_data: false,
        })
      ).toBe(false);

      // Entry selected AND all 3 checkboxes checked -> true
      expect(
        canOpenFinalReviewPreview("review_a", {
          legibility: true,
          notice_visible: true,
          no_real_data: true,
        })
      ).toBe(true);

      expect(
        canOpenFinalReviewPreview("review_b", {
          legibility: true,
          notice_visible: true,
          no_real_data: true,
        })
      ).toBe(true);
    });
  });

  describe("ODT Session Practice library and data security", () => {
    it("defines exactly two fictional training entries with persistent watermarks and zero clinical or dosing PII", () => {
      expect(ODT_SESSION_ENTRIES).toHaveLength(2);
      const entryIds = ODT_SESSION_ENTRIES.map((e) => e.id);
      expect(entryIds).toEqual(["odt_a", "odt_b"]);

      for (const entry of ODT_SESSION_ENTRIES) {
        expect(entry.contentReviewStatus).toBe("unreviewed");
        expect(entry.watermarkEn).toBe(FRED_ACTION_WATERMARK_EN);
        expect(entry.watermarkFa).toBe(FRED_ACTION_WATERMARK_FA);
        expect(entry.titleEn).toBeTruthy();
        expect(entry.titleFa).toBeTruthy();
        expect(entry.descriptionEn).toBeTruthy();
        expect(entry.descriptionFa).toBeTruthy();
        expect(entry.placeholderSessionRefEn).toBeTruthy();
        expect(entry.placeholderSessionRefFa).toBeTruthy();
        expect(entry.placeholderPatternEn).toBeTruthy();
        expect(entry.placeholderPatternFa).toBeTruthy();

        // Valid Persian UTF-8 and no mojibake
        expect(entry.titleFa).not.toContain("\uFFFD");
        expect(entry.descriptionFa).not.toContain("\uFFFD");
        expect(entry.placeholderSessionRefFa).not.toContain("\uFFFD");
        expect(/[\u0600-\u06FF]/.test(entry.titleFa)).toBe(true);
        expect(/[\u0600-\u06FF]/.test(entry.descriptionFa)).toBe(true);

        // Disallowed clinical/dosing terms
        const disallowed = [
          "Methadone", "Buprenorphine", "Suboxone", "David", "Miller", "Medicare",
          "prescriber", "provider", "safe", "lock", "S8", "register", "dose", "mg", "mL",
          "administered", "supervised", "takeaway"
        ];
        const json = JSON.stringify(entry);
        for (const term of disallowed) {
          expect(json).not.toContain(term);
        }
      }
    });

    it("defines 3 visual quality checklist criteria without clinical or legal verification claims", () => {
      expect(ODT_SESSION_CHECKLIST_CRITERIA).toHaveLength(3);
      const criteriaIds = ODT_SESSION_CHECKLIST_CRITERIA.map((c) => c.id);
      expect(criteriaIds).toEqual(["structure_clarity", "placeholder_verified", "no_clinical_data"]);

      for (const criterion of ODT_SESSION_CHECKLIST_CRITERIA) {
        expect(criterion.labelEn).toBeTruthy();
        expect(criterion.labelFa).toBeTruthy();
        expect(criterion.descriptionEn).toBeTruthy();
        expect(criterion.descriptionFa).toBeTruthy();
        expect(/[\u0600-\u06FF]/.test(criterion.labelFa)).toBe(true);
        expect(criterion.labelFa).not.toContain("\uFFFD");
      }
    });

    it("evaluates canOpenOdtSessionPreview pure helper strictly", () => {
      expect(
        canOpenOdtSessionPreview(null, {
          structure_clarity: true,
          placeholder_verified: true,
          no_clinical_data: true,
        })
      ).toBe(false);

      expect(
        canOpenOdtSessionPreview("odt_a", {
          structure_clarity: true,
          placeholder_verified: false,
          no_clinical_data: true,
        })
      ).toBe(false);

      expect(
        canOpenOdtSessionPreview("odt_a", {
          structure_clarity: true,
          placeholder_verified: true,
          no_clinical_data: true,
        })
      ).toBe(true);
    });

    it("contains educational result notices stating zero real-world action occurred", () => {
      expect(ODT_SESSION_RESULT_NOTICE_EN).toContain("no real-world dosing");
      expect(ODT_SESSION_RESULT_NOTICE_FA).toContain("هیچ رخداد");
    });
  });

  describe("PBS/POS Categorization Practice library and data security", () => {
    it("defines 3 fictional training items with clean Persian text and zero real PBS/financial/patient data", () => {
      expect(PBS_POS_PRACTICE_ITEMS).toHaveLength(3);
      const itemIds = PBS_POS_PRACTICE_ITEMS.map((i) => i.id);
      expect(itemIds).toEqual(["item_1", "item_2", "item_3"]);

      for (const item of PBS_POS_PRACTICE_ITEMS) {
        expect(item.contentReviewStatus).toBe("unreviewed");
        expect(item.titleEn).toBeTruthy();
        expect(item.titleFa).toBeTruthy();
        expect(item.badgeEn).toBeTruthy();
        expect(item.badgeFa).toBeTruthy();
        expect(item.descriptionEn).toBeTruthy();
        expect(item.descriptionFa).toBeTruthy();
        expect(item.placeholderRefEn).toBeTruthy();
        expect(item.placeholderRefFa).toBeTruthy();

        // Valid Persian UTF-8 and no mojibake
        expect(item.titleFa).not.toContain("\uFFFD");
        expect(item.descriptionFa).not.toContain("\uFFFD");
        expect(/[\u0600-\u06FF]/.test(item.titleFa)).toBe(true);

        // Disallowed entitlement/PBS/claim/financial terms
        const disallowed = [
          "David", "Miller", "Medicare", "prescriber", "provider", "Concession",
          "SafetyNet", "RPBS", "DVA", "$", "coPayment", "shred", "archive", "claim"
        ];
        const json = JSON.stringify(item);
        for (const term of disallowed) {
          expect(json).not.toContain(term);
        }
      }
    });

    it("defines 2 training groups without entitlement or statutory claims", () => {
      expect(PBS_POS_PRACTICE_GROUPS).toHaveLength(2);
      const groupIds = PBS_POS_PRACTICE_GROUPS.map((g) => g.id);
      expect(groupIds).toEqual(["group_a", "group_b"]);

      for (const group of PBS_POS_PRACTICE_GROUPS) {
        expect(group.titleEn).toBeTruthy();
        expect(group.titleFa).toBeTruthy();
        expect(/[\u0600-\u06FF]/.test(group.titleFa)).toBe(true);
        expect(group.titleFa).not.toContain("\uFFFD");
      }
    });

    it("evaluates canOpenPbsPosPreview pure helper: requires all 3 items to be assigned", () => {
      expect(
        canOpenPbsPosPreview({
          item_1: null,
          item_2: null,
          item_3: null,
        })
      ).toBe(false);

      expect(
        canOpenPbsPosPreview({
          item_1: "group_a",
          item_2: null,
          item_3: "group_b",
        })
      ).toBe(false);

      expect(
        canOpenPbsPosPreview({
          item_1: "group_a",
          item_2: "group_b",
          item_3: "group_a",
        })
      ).toBe(true);
    });

    it("contains educational result notices stating zero real-world claim or transaction occurred", () => {
      expect(PBS_POS_RESULT_NOTICE_EN).toContain("no real-world claim");
      expect(PBS_POS_RESULT_NOTICE_FA).toContain("هیچ رخداد");
    });
  });
});
