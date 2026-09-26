import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PharmacyFredPracticeView from "./PharmacyFredPracticeView";
import { FRED_TRAINING_ERX_BARCODE } from "@/lib/pharmacyFredPractice";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "@/lib/pharmacyFredPracticeData";

const { languageState } = vi.hoisted(() => ({ languageState: { lang: "en" as "en" | "fa" } }));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    lang: languageState.lang,
    T: (fa: string, en: string) => (languageState.lang === "en" ? en : fa),
  }),
}));

describe("PharmacyFredPracticeView", () => {
  let printSpy: ReturnType<typeof vi.spyOn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    languageState.lang = "en";
    printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    fetchSpy = vi.spyOn(window, "fetch").mockImplementation(() => Promise.reject(new Error("Network forbidden")));
  });

  it("renders educational simulator, disclaimer banner, and initial scenario", () => {
    render(<PharmacyFredPracticeView />);

    expect(
      screen.getByRole("heading", { name: "Pharmacy & FRED Educational Simulator" })
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Non-operational Educational Simulator");
    expect(screen.getByRole("note")).toHaveTextContent("No actual connection to FRED, PBS, SafeScript");
    expect(screen.getByRole("note")).toHaveTextContent("All scenarios, identifiers, and amounts are fictional exercise data");
    expect(screen.getByRole("note")).toHaveTextContent("Clinical Safety Notice");
    expect(screen.getByRole("note")).toHaveTextContent("not independently clinically validated");

    // Initial scenario
    const firstScenario = PHARMACY_FRED_PRACTICE_SCENARIOS[0];
    expect(screen.getAllByText(firstScenario.prescribedDrug).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(firstScenario.pbsCode).length).toBeGreaterThanOrEqual(1);

    // No network requests were made
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows switching scenarios and displays localized NSW warning on expired S8 script with disclaimer and source link", () => {
    render(<PharmacyFredPracticeView />);

    const expiredS8Scenario = PHARMACY_FRED_PRACTICE_SCENARIOS.find((s) => s.isExpiredS8);
    expect(expiredS8Scenario).toBeDefined();

    // Click the expired S8 scenario card
    const scenarioBtn = screen.getByRole("button", { name: /OxyContin/i });
    fireEvent.click(scenarioBtn);

    expect(screen.getByText(/Warning: Expired S8 Prescription \(NSW Rules Snapshot\)/i)).toBeInTheDocument();
    expect(screen.getByText(/NSW Health snapshot checked 26 Sep 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/prescription validity is 12 months generally, except S8 and S4 Appendix D/i)).toBeInTheDocument();
    expect(screen.getByText(/This is not a complete assessment of prescription validity or a real dispensing decision\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NSW Health Reference/i })).toHaveAttribute(
      "href",
      "https://www.health.nsw.gov.au/pharmaceutical/Pages/legal-form-prescription.aspx"
    );
  });

  it("starts the next scenario and returns to script review", () => {
    render(<PharmacyFredPracticeView />);
    const nextScenario = PHARMACY_FRED_PRACTICE_SCENARIOS[1];

    fireEvent.click(screen.getByRole("button", { name: /3\. Owing & Reconciliation/i }));
    fireEvent.click(screen.getByRole("button", { name: /Start New Scenario/i }));

    expect(screen.getByRole("heading", { name: nextScenario.prescribedDrug })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Review Script/i })).toHaveClass("bg-primary");
    expect(screen.queryByLabelText(/Scan or enter script barcode/i)).not.toBeInTheDocument();
  });

  it("navigates through step 2 and handles valid shortcuts, Regulation 49 training alias, and invalid input gracefully", () => {
    render(<PharmacyFredPracticeView />);

    // Navigate to step 2: FRED Shortcut
    fireEvent.click(screen.getByRole("button", { name: /2\. FRED Shortcut/i }));
    expect(screen.getByRole("heading", { name: "FRED Dispense Shortcut & Alias Parser" })).toBeInTheDocument();

    // Default shortcut 5/1 is parsed
    expect(screen.getByText(/Standard 1st Supply \+ 5 Repeats/i)).toBeInTheDocument();

    // Change input to 5D
    const input = screen.getByLabelText(/Enter shortcut syntax or alias/i);
    fireEvent.change(input, { target: { value: "5D" } });
    expect(screen.getByText(/Defer Script \(No Drug Supply Today\)/i)).toBeInTheDocument();

    // Click a shortcut chip (e.g. 5R)
    const chip5R = screen.getByRole("button", { name: /^5R/ });
    fireEvent.click(chip5R);
    expect(screen.getByText(/Regulation 49 \(formerly Regulation 24\) — Training Alias/i)).toBeInTheDocument();
    expect(screen.getByText(/custom training-only alias, not verified standard FRED syntax/i)).toBeInTheDocument();
    expect(screen.getByText(/rules-learning exercise, not a dispensing or claiming instruction/i)).toBeInTheDocument();
    expect(screen.getByText(/max PBS quantity is insufficient/i)).toBeInTheDocument();
    expect(screen.getByText(/medical practitioner, midwife, or nurse practitioner/i)).toBeInTheDocument();
    expect(screen.getByText(/great hardship would result/i)).toBeInTheDocument();
    expect(screen.queryByText(/Supply All 6 Months/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/traveling patients/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PBS Reg 49 Explanatory Notes/i })).toHaveAttribute(
      "href",
      "https://www.pbs.gov.au/healthpro/explanatory-notes/section1/Section_1_2_Explanatory_Notes"
    );

    // Enter invalid shortcut
    fireEvent.change(input, { target: { value: "INVALID_CODE" } });
    expect(screen.getByText(/Unrecognized shortcut/i)).toBeInTheDocument();
  });

  it("enforces exact barcode TRAIN-ERX-4821 for owing mark-off and rejects wrong barcodes", () => {
    render(<PharmacyFredPracticeView />);

    // Navigate to Step 3: Owing & Reconciliation
    fireEvent.click(screen.getByRole("button", { name: /3\. Owing & Reconciliation/i }));
    expect(screen.getByRole("heading", { name: "Owing Prescription Reconciliation Simulation" })).toBeInTheDocument();

    const markOffBtn = screen.getByRole("button", { name: /Mark Off/i });
    expect(markOffBtn).toBeDisabled();

    const barcodeInput = screen.getByLabelText(/Scan or enter script barcode to mark off/i);

    // Enter wrong barcode
    fireEvent.change(barcodeInput, { target: { value: "WRONG-1234" } });
    expect(markOffBtn).toBeDisabled();

    // Enter exact barcode
    fireEvent.change(barcodeInput, { target: { value: FRED_TRAINING_ERX_BARCODE } });
    expect(markOffBtn).toBeEnabled();

    // Click Mark Off
    fireEvent.click(markOffBtn);
    expect(screen.getByText(/Educational reconciliation with TRAIN-ERX-4821 confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/Reconciled/i)).toBeInTheDocument();

    // Reopen resets reconciliation
    const reopenBtn = screen.getByRole("button", { name: /Reopen/i });
    fireEvent.click(reopenBtn);
    expect(screen.getByText(/Owing Active/i)).toBeInTheDocument();
  });

  it("opens in-app owing notice preview without calling window.print or window.alert", () => {
    render(<PharmacyFredPracticeView />);

    // Go to step 3
    fireEvent.click(screen.getByRole("button", { name: /3\. Owing & Reconciliation/i }));

    // Click preview notice button
    const previewBtn = screen.getByRole("button", { name: /Preview In-App Owing Notice/i });
    fireEvent.click(previewBtn);

    // Preview dialog is visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("In-App Owing Notice Preview")).toBeInTheDocument();
    expect(screen.getByText("FRED DISPENSE — OWING MEDICATION NOTICE")).toBeInTheDocument();

    // Assert strictly NO window.print or window.alert was triggered
    expect(printSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    // Close preview
    const closeBtn = screen.getByRole("button", { name: /Close Preview/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports Persian language RTL mode and resets practice on demand", () => {
    languageState.lang = "fa";
    render(<PharmacyFredPracticeView />);

    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
    expect(
      screen.getByRole("heading", { name: "شبیه‌ساز آموزشی کارگاه داروخانه (Pharmacy Lab)" })
    ).toBeInTheDocument();

    // Click reset practice button
    const resetBtn = screen.getByRole("button", { name: /شروع مجدد/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/۱\. بررسی نسخه/i)).toBeInTheDocument();

    // Step 2 shortcut in Persian: verify Nurse Practitioner profession distinction and absence of generic پرستار رسمی
    fireEvent.click(screen.getByRole("button", { name: /۲\. میانبر FRED/i }));
    const chip5RFa = screen.getByRole("button", { name: /^5R/ });
    fireEvent.click(chip5RFa);
    expect(screen.getByText(/Nurse Practitioner \(پرستار دارای مجوز تجویز\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/پرستار رسمی/i)).not.toBeInTheDocument();

    // Ensure zero network requests
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("Safety Net interactive module", () => {
    it("completes stepped calculation workflow with 2026 Services Australia figures, source link, and synthetic-only disclaimers", () => {
      render(<PharmacyFredPracticeView />);

      // Switch to Safety Net module
      fireEvent.click(screen.getByRole("button", { name: /Safety Net Practice/i }));
      expect(screen.getByRole("heading", { name: /PBS Safety Net Threshold Practice/i })).toBeInTheDocument();

      // Official source banner and link
      expect(screen.getByText(/Official Threshold Reference \(Services Australia 2026-01-01, Checked 26 Sep 2026\)/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /servicesaustralia\.gov\.au\/pbs-safety-net-thresholds/i })).toHaveAttribute(
        "href",
        "https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016"
      );
      expect(screen.getByText(/General \$1,748\.20 \(pre-threshold costs up to \$25\.00\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Concessional \$277\.20 \(pre-threshold costs up to \$7\.70\)/i)).toBeInTheDocument();
      expect(screen.getByText(/This practice tool does not calculate actual eligibility\/payment or determine issue of a Safety Net card/i)).toBeInTheDocument();

      // Step 0: Check initial 2026 values for general patient scenario
      expect(screen.getByText("Fictional Training Spend")).toBeInTheDocument();
      expect(screen.getByText("$1725.30")).toBeInTheDocument();
      expect(screen.getByText("2026 Annual Threshold (Services Australia)")).toBeInTheDocument();
      expect(screen.getByText("$1748.20")).toBeInTheDocument();
      expect(screen.getByText("Illustrative Max Before Threshold")).toBeInTheDocument();
      expect(screen.getByText("$25.00")).toBeInTheDocument();

      // Proceed to Step 1 (Gap calculation)
      fireEvent.click(screen.getByRole("button", { name: /Next: Calculate Gap/i }));
      expect(screen.getByText(/What is the remaining spend required to reach the Safety Net threshold\?/i)).toBeInTheDocument();

      // Next button should be disabled before answering correctly
      const nextToOutcomeBtn = screen.getByRole("button", { name: /Next: Card Outcome/i });
      expect(nextToOutcomeBtn).toBeDisabled();

      // Click correct gap option ($22.90)
      const correctGapBtn = screen.getByRole("button", { name: "$22.90" });
      fireEvent.click(correctGapBtn);

      expect(screen.getByText(/Calculation correct\./i)).toBeInTheDocument();
      expect(nextToOutcomeBtn).toBeEnabled();

      // Proceed to Step 2 (Card Outcome)
      fireEvent.click(nextToOutcomeBtn);
      expect(screen.getByText(/What is the patient's Safety Net status after this prescription\?/i)).toBeInTheDocument();

      // Click "Crosses threshold" option
      const crossesOptionBtn = screen.getByRole("button", { name: /Fictional exercise threshold crossed/i });
      fireEvent.click(crossesOptionBtn);

      expect(screen.getByText(/Conclusion correct\./i)).toBeInTheDocument();
      expect(screen.getByText(/In this fictional exercise, the mock total \(\$1,750\.30\) crosses the 2026 mock threshold \(\$1,748\.20\)/i)).toBeInTheDocument();

      // Restart scenario resets back to step 0
      fireEvent.click(screen.getByRole("button", { name: /Restart Scenario/i }));
      expect(screen.getByText(/1\. Case Values/i)).toHaveClass("bg-primary");

      // Switch to Concessional scenario
      fireEvent.click(screen.getByRole("button", { name: /Concessional Patient 2026 Threshold Assessment/i }));
      expect(screen.getByText("$145.00")).toBeInTheDocument();
      expect(screen.getByText("$277.20")).toBeInTheDocument();
      expect(screen.getByText("$7.70")).toBeInTheDocument();

      // Verify no network or printing side-effects occurred
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
    });
  });

  describe("Labeling simulator module", () => {
    it("renders in-page thermal label sticker, updates directions and auxiliary warning labels, and resets cleanly", () => {
      render(<PharmacyFredPracticeView />);

      // Switch to Labeling module
      fireEvent.click(screen.getByRole("button", { name: /Dispensing Label/i }));
      expect(screen.getByRole("heading", { name: "Dispensing Desk Labeling Simulator" })).toBeInTheDocument();

      // In-page sticker watermark and warnings
      expect(screen.getByText("⚠️ TRAINING ONLY — NOT FOR DISPENSING")).toBeInTheDocument();
      expect(screen.getByText(/TRAINING PREVIEW ONLY/i)).toBeInTheDocument();

      // Default medication and directions preview
      expect(screen.getByText("Atorvastatin 20mg Tablets")).toBeInTheDocument();
      expect(screen.getByText(/"Take ONE tablet daily at bedtime\."/i)).toBeInTheDocument();

      // Default has Label 1 checked
      expect(screen.getAllByText("Take with or immediately after food.").length).toBeGreaterThanOrEqual(2);

      // Update directions
      const directionsInput = screen.getByLabelText(/Directions:/i);
      fireEvent.change(directionsInput, { target: { value: "Take TWO tablets in the morning." } });
      expect(screen.getByText(/"Take TWO tablets in the morning\."/i)).toBeInTheDocument();

      // Toggle auxiliary warning label (Label 13: Drowsiness)
      const label13Checkbox = screen.getByLabelText(/Label 13:/i);
      fireEvent.click(label13Checkbox);
      expect(screen.getAllByText("May cause drowsiness. If affected do not drive or operate machinery.").length).toBeGreaterThanOrEqual(2);

      // Reset label restores default state
      fireEvent.click(screen.getByRole("button", { name: /Reset Label/i }));
      expect(screen.getByText(/"Take ONE tablet daily at bedtime\."/i)).toBeInTheDocument();

      // Assert zero physical print calls
      expect(printSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Document retention module", () => {
    it("allows categorizing records with fictional exercise buckets and verifies the exercise key", () => {
      render(<PharmacyFredPracticeView />);

      // Switch to Retention module
      fireEvent.click(screen.getByRole("button", { name: /Document Retention/i }));
      expect(screen.getByRole("heading", { name: "Document Retention & Archiving Practice" })).toBeInTheDocument();

      // Verify the 3 documents are displayed
      expect(screen.getByText("SIM-REG-801")).toBeInTheDocument();
      expect(screen.getByText("SIM-RX-402")).toBeInTheDocument();
      expect(screen.getByText("SIM-LOG-004")).toBeInTheDocument();

      const verifyBtn = screen.getByRole("button", { name: /Check Retention/i });
      expect(verifyBtn).toBeDisabled();

      // Select matching buckets for all three
      const regSelect = screen.getByLabelText("Exercise bucket for SIM-REG-801");
      const rxSelect = screen.getByLabelText("Exercise bucket for SIM-RX-402");
      const logSelect = screen.getByLabelText("Exercise bucket for SIM-LOG-004");

      fireEvent.change(regSelect, { target: { value: "bucket_a" } });
      expect(verifyBtn).toBeDisabled();
      fireEvent.change(rxSelect, { target: { value: "bucket_b" } });
      expect(verifyBtn).toBeDisabled();
      fireEvent.change(logSelect, { target: { value: "bucket_c" } });

      expect(verifyBtn).toBeEnabled();
      fireEvent.click(verifyBtn);

      // Verify matching feedback appears
      const matches = screen.getAllByText("Matches the fictional exercise key.");
      expect(matches).toHaveLength(3);

      // Changing any selection requires a fresh full verification.
      fireEvent.change(logSelect, { target: { value: "bucket_a" } });
      expect(verifyBtn).toBeEnabled();
      fireEvent.click(verifyBtn);
      expect(screen.getByText("Does not match the fictional exercise key.")).toBeInTheDocument();

      // Clearing an individual select removes it from state and disables checking.
      fireEvent.change(logSelect, { target: { value: "" } });
      expect(verifyBtn).toBeDisabled();
      fireEvent.change(logSelect, { target: { value: "bucket_c" } });
      expect(verifyBtn).toBeEnabled();
      fireEvent.change(regSelect, { target: { value: "" } });
      expect(verifyBtn).toBeDisabled();

      // Reset archiving
      fireEvent.click(screen.getByRole("button", { name: /Reset Archiving/i }));
      expect(regSelect).toHaveValue("");
      expect(rxSelect).toHaveValue("");
      expect(logSelect).toHaveValue("");
      expect(screen.queryByText("Matches the fictional exercise key.")).not.toBeInTheDocument();

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe("Script Visualizer & Practice Layout module", () => {
    it("renders fictional practice sheet with prominent watermark, allows inspecting layout sections, switching layouts, and resetting", () => {
      render(<PharmacyFredPracticeView />);

      // Switch to Visualizer module
      fireEvent.click(screen.getByRole("button", { name: /Script Visualizer/i }));
      expect(
        screen.getByRole("heading", { name: "Practice Layout Visualizer" })
      ).toBeInTheDocument();

      // Verify prominent watermark banner and fictional sheet header
      expect(screen.getByText("⚠️ TRAINING ONLY — NOT FOR DISPENSING")).toBeInTheDocument();
      expect(screen.getByText("FICTIONAL PRACTICE LAYOUT")).toBeInTheDocument();
      expect(screen.getByText("NON-OPERATIONAL TRAINING DEMO ONLY")).toBeInTheDocument();

      // Initial synthetic layout is Layout A
      expect(screen.getByText("Training item A")).toBeInTheDocument();
      expect(screen.getByText("Illustrative value only")).toBeInTheDocument();
      expect(screen.getByText(/No use instructions — Not a real prescription/i)).toBeInTheDocument();

      // Initially no section is selected
      expect(screen.getByText("No section selected")).toBeInTheDocument();

      // Click Header Area section
      const headerSection = screen.getByRole("button", { name: /Section: Header Area/i });
      fireEvent.click(headerSection);

      expect(
        screen.getByRole("heading", { name: "Practice Form Header Area" })
      ).toBeInTheDocument();
      expect(screen.getByText("Practice Section Information:")).toBeInTheDocument();
      expect(screen.getByText("Interface Layout Tip:")).toBeInTheDocument();

      // Click Practice Zone A section
      const zoneASection = screen.getByRole("button", { name: /Section: Practice Zone A/i });
      fireEvent.click(zoneASection);

      expect(
        screen.getByRole("heading", { name: "Practice Zone A (Placeholder Content)" })
      ).toBeInTheDocument();

      // Click Clear button in inspector
      const clearBtn = screen.getByRole("button", { name: /Clear/i });
      fireEvent.click(clearBtn);
      expect(screen.getByText("No section selected")).toBeInTheDocument();

      // Switch to Layout B
      const layoutBBtn = screen.getByRole("button", { name: /Fictional Practice Layout B/i });
      fireEvent.click(layoutBBtn);

      expect(screen.getByText("Training item B")).toBeInTheDocument();

      // Reset inspector
      const resetBtn = screen.getByRole("button", { name: /Reset Inspector/i });
      fireEvent.click(resetBtn);

      // Back to initial Layout A
      expect(screen.getByText("Training item A")).toBeInTheDocument();
      expect(screen.getByText("No section selected")).toBeInTheDocument();

      // Verify zero patient, medicare, prescriber, drug, dose, regulation, PBS, or signature terms in the visualizer module
      const visualizerSection = screen.getByRole("heading", { name: "Practice Layout Visualizer" }).closest("section")!;
      const visualizerText = visualizerSection.textContent ?? "";
      const disallowedInModule = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "2018H", "8214K", "Regulation 24", "Reg 24",
        "PB 82", "PB82", "PBS", "RPBS", "TRAIN-ERX", "barcode", "امضای معتبر",
        "valid signature", "statutory entitlement", "TRAINING-PATIENT"
      ];

      for (const term of disallowedInModule) {
        expect(visualizerText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("supports Persian language mode in Visualizer: renders all sheet labels, hotspots, placeholders, badges, click guides, and footers in Persian with English watermark and Persian warning, and zero static English leakage or forbidden claims", () => {
      languageState.lang = "fa";
      render(<PharmacyFredPracticeView />);

      // Switch to Visualizer module via Persian tab button
      fireEvent.click(screen.getByRole("button", { name: /نمایشگر و بازرس نسخه/i }));
      expect(
        screen.getByRole("heading", { name: "نمایشگر چیدمان تمرینی" })
      ).toBeInTheDocument();

      // Verify sheet container direction is RTL
      const sheetContainer = screen.getByText("چیدمان تمرینی ساختگی").closest("div[dir]")!;
      expect(sheetContainer).toHaveAttribute("dir", "rtl");

      // Verify prominent watermark banner: has exact English watermark AND Persian warning
      expect(screen.getByText("⚠️ TRAINING ONLY — NOT FOR DISPENSING")).toBeInTheDocument();
      expect(screen.getByText("⚠️ فقط آموزشی — غیرقابل نسخه‌پیچی")).toBeInTheDocument();

      // Verify sheet header in Persian
      expect(screen.getByText("چیدمان تمرینی ساختگی")).toBeInTheDocument();
      expect(screen.getByText("صرفاً نسخه نمایشی تمرینی غیرعملیاتی")).toBeInTheDocument();

      // Badges in Persian
      expect(screen.getAllByText("چیدمان الف").length).toBeGreaterThanOrEqual(1);

      // Initial synthetic layout is Layout A with Persian placeholders
      expect(screen.getByText("آیتم تمرینی الف")).toBeInTheDocument();
      expect(screen.getByText("صرفاً مقدار نمایشی")).toBeInTheDocument();
      expect(screen.getByText(/فاقد دستور مصرف — نسخه واقعی نیست/i)).toBeInTheDocument();

      // All 4 hotspots have Persian titles and click guide
      expect(screen.getByRole("button", { name: /بخش: سربرگ فرم \(فرضی\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /بخش: ناحیه تمرینی ۱/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /بخش: ناحیه تمرینی ۲/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /بخش: پاورقی هشداری/i })).toBeInTheDocument();
      expect(screen.getAllByText("(برای بررسی کلیک کنید)").length).toBe(4);

      // Sheet footer disclaimer in Persian
      expect(
        screen.getByText(/نسخه واقعی نیست • فاقد هرگونه کاربرد نسخه‌پیچی یا بیمه‌ای • صرفاً دمو تمرینی ساختگی/i)
      ).toBeInTheDocument();

      // Initially no section is selected
      expect(screen.getByText("بخشی انتخاب نشده است")).toBeInTheDocument();

      // Click Header Area section in Persian
      const headerSection = screen.getByRole("button", { name: /بخش: سربرگ فرم \(فرضی\)/i });
      fireEvent.click(headerSection);

      expect(
        screen.getByRole("heading", { name: "ناحیه سربرگ فرم تمرینی" })
      ).toBeInTheDocument();
      expect(screen.getByText("توضیحات بخش تمرینی:")).toBeInTheDocument();
      expect(screen.getByText("راهنمای رابط کاربری:")).toBeInTheDocument();

      // Click Clear button in inspector
      const clearBtn = screen.getByRole("button", { name: /بستن/i });
      fireEvent.click(clearBtn);
      expect(screen.getByText("بخشی انتخاب نشده است")).toBeInTheDocument();

      // Switch to Layout B in Persian
      const layoutBBtn = screen.getByRole("button", { name: /چیدمان تمرینی ساختگی ب/i });
      fireEvent.click(layoutBBtn);

      expect(screen.getByText("آیتم تمرینی ب")).toBeInTheDocument();
      expect(screen.getAllByText("چیدمان ب").length).toBeGreaterThanOrEqual(1);

      // Reset inspector
      const resetBtn = screen.getByRole("button", { name: /بازنشانی بازرس/i });
      fireEvent.click(resetBtn);

      // Back to initial Layout A
      expect(screen.getByText("آیتم تمرینی الف")).toBeInTheDocument();
      expect(screen.getByText("بخشی انتخاب نشده است")).toBeInTheDocument();

      // Verify DOM of Visualizer module is completely clean of previous static English strings
      const visualizerSection = screen.getByRole("heading", { name: "نمایشگر چیدمان تمرینی" }).closest("section")!;
      const visualizerText = visualizerSection.textContent ?? "";

      const previousStaticEnglish = [
        "Practice Visualizer",
        "FICTIONAL PRACTICE LAYOUT",
        "NON-OPERATIONAL TRAINING DEMO ONLY",
        "(Click to inspect)",
        "Section: Header Area (Placeholder)",
        "Section: Practice Zone A",
        "Section: Practice Zone B",
        "Section: Notice Footer",
        "Illustrative practice header placeholder",
        "NOT A REAL PRESCRIPTION • NO DISPENSING OR CLAIMING USE",
      ];

      for (const phrase of previousStaticEnglish) {
        expect(visualizerText).not.toContain(phrase);
      }

      // Verify zero patient, medicare, prescriber, drug, dose, regulation, PBS, or signature terms in the visualizer module
      const disallowedInModule = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "2018H", "8214K", "Regulation 24", "Reg 24",
        "PB 82", "PB82", "PBS", "RPBS", "TRAIN-ERX", "barcode", "امضای معتبر",
        "valid signature", "statutory entitlement", "TRAINING-PATIENT"
      ];

      for (const term of disallowedInModule) {
        expect(visualizerText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe("Educational Practice Terminal module", () => {
    it("renders terminal in English, processes commands via Enter/Execute/Chips, verifies cards, clear, reset, and error handling", () => {
      render(<PharmacyFredPracticeView />);

      // Switch to Terminal module
      fireEvent.click(screen.getByRole("button", { name: /Practice Terminal/i }));
      expect(
        screen.getByRole("heading", { name: "Practice Terminal" })
      ).toBeInTheDocument();

      // Check watermark
      expect(
        screen.getByText("⚠️ TRAINING ONLY — NOT CONNECTED TO A PHARMACY SYSTEM")
      ).toBeInTheDocument();

      // Check empty state
      expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
      expect(screen.getByText(/Console is empty/i)).toBeInTheDocument();

      // 1. HELP via Enter key
      const input = screen.getByLabelText(/Enter whitelisted command:/i);
      expect(input).toHaveAttribute("maxlength", "120");

      fireEvent.change(input, { target: { value: "HELP" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByText(/Available whitelisted commands/i)).toBeInTheDocument();
      expect(input).toHaveValue("");

      // 2. OPEN A via Execute button
      fireEvent.change(input, { target: { value: "OPEN A" } });
      fireEvent.click(screen.getByRole("button", { name: "Execute" }));

      expect(screen.getAllByText("Training entry A").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText("Illustrative sample only — not a real prescription or record.")
      ).toBeInTheDocument();
      expect(screen.getByText("No medical, dispensing, or patient data.")).toBeInTheDocument();

      // 3. STATUS via chip click (executedCount will be 3)
      const statusChip = screen.getByRole("button", { name: /STATUS/i });
      fireEvent.click(statusChip);
      expect(screen.getByText(/Session Status: Active \(In-Memory Only\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Commands Executed: 3/i)).toBeInTheDocument();

      // 4. OPEN B via chip click (executedCount becomes 4)
      const openBChip = screen.getByRole("button", { name: /OPEN B/i });
      fireEvent.click(openBChip);
      expect(screen.getAllByText("Training entry B").length).toBeGreaterThanOrEqual(1);

      // 5. Unknown command shows error (executedCount becomes 5)
      fireEvent.change(input, { target: { value: "INVALID_CMD" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(
        screen.getByText(/Unrecognized command: 'INVALID_CMD'\. Type HELP for available commands\./i)
      ).toBeInTheDocument();

      // 6. CLEAR log via command: clears log, preserves selection ('Training entry B'), and increments count to 6
      fireEvent.change(input, { target: { value: "CLEAR" } });
      fireEvent.click(screen.getByRole("button", { name: "Execute" }));
      expect(screen.getByText(/Console is empty/i)).toBeInTheDocument();
      // Selection preserved in the status pane:
      expect(screen.getAllByText("Training entry B").length).toBeGreaterThanOrEqual(1);

      // Verify count was incremented on CLEAR by running STATUS (executedCount becomes 7)
      fireEvent.click(statusChip);
      expect(screen.getByText(/Commands Executed: 7/i)).toBeInTheDocument();

      // 7. RESET terminal via button (restores INITIAL_EDUCATIONAL_TERMINAL_STATE)
      fireEvent.click(screen.getByRole("button", { name: "Reset Terminal" }));
      expect(screen.getByText(/None/i)).toBeInTheDocument();
      expect(screen.getByText(/Console is empty/i)).toBeInTheDocument();

      // 8. Regression test: Execute RESET command from INITIAL state, followed by HELP and OPEN A
      fireEvent.change(input, { target: { value: "RESET" } });
      fireEvent.click(screen.getByRole("button", { name: "Execute" }));
      expect(screen.getByText(/Terminal session reset to initial state/i)).toBeInTheDocument();
      // Counter is 0 for newly reset session
      expect(screen.getByText("0")).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "HELP" } });
      fireEvent.click(screen.getByRole("button", { name: "Execute" }));
      expect(screen.getByText(/Available whitelisted commands/i)).toBeInTheDocument();
      // Session counter increments to 1
      expect(screen.getByText("1")).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "OPEN A" } });
      fireEvent.click(screen.getByRole("button", { name: "Execute" }));
      expect(screen.getAllByText("Training entry A").length).toBeGreaterThanOrEqual(1);
      // Session counter increments to 2
      expect(screen.getByText("2")).toBeInTheDocument();

      // Check zero forbidden terms in Terminal DOM
      const terminalSection = screen.getByRole("heading", { name: "Practice Terminal" }).closest("section")!;
      const terminalText = terminalSection.textContent ?? "";
      const disallowedTerms = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "Regulation 24", "Reg 24", "PB 82", "PB82",
        "PBS", "RPBS", "barcode", "امضای معتبر", "statutory entitlement"
      ];
      for (const term of disallowedTerms) {
        expect(terminalText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("supports Persian mode in Terminal: renders Persian labels, watermark, chips, cards, errors, and resets cleanly", () => {
      languageState.lang = "fa";
      render(<PharmacyFredPracticeView />);

      // Switch to Terminal module in Persian
      fireEvent.click(screen.getByRole("button", { name: /ترمینال تمرینی/i }));
      expect(
        screen.getByRole("heading", { name: "ترمینال تمرینی" })
      ).toBeInTheDocument();

      // Watermark in Persian & English
      expect(
        screen.getByText("⚠️ TRAINING ONLY — NOT CONNECTED TO A PHARMACY SYSTEM")
      ).toBeInTheDocument();
      expect(
        screen.getByText("⚠️ فقط آموزشی — متصل به هیچ سامانه داروخانه‌ای نیست")
      ).toBeInTheDocument();

      // Empty state in Persian
      expect(screen.getByText(/کنسول خالی است/i)).toBeInTheDocument();

      // Run OPEN A via chip
      const openAChip = screen.getByRole("button", { name: /باز کردن الف/i });
      fireEvent.click(openAChip);

      expect(screen.getAllByText("آیتم تمرینی الف").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("نمایش صرفاً نمونه، هیچ نسخه یا رکورد واقعی نیست.")).toBeInTheDocument();
      expect(screen.getByText("فاقد اطلاعات پزشکی، دارویی یا هویتی بیمار.")).toBeInTheDocument();

      // Run HELP via chip
      const helpChip = screen.getByRole("button", { name: /راهنما \(HELP\)/i });
      fireEvent.click(helpChip);
      expect(screen.getByText(/فرمان‌های مجاز در این ترمینال تمرینی:/i)).toBeInTheDocument();

      // Run unknown command in Persian
      const input = screen.getByLabelText(/ورود فرمان تمرینی/i);
      expect(input).toHaveAttribute("maxlength", "120");
      fireEvent.change(input, { target: { value: "UNKNOWN_TEST" } });
      fireEvent.click(screen.getByRole("button", { name: "اجرا" }));
      expect(
        screen.getByText(/فرمان ناشناخته: «UNKNOWN_TEST»\. برای مشاهده فهرست فرمان‌ها HELP را وارد کنید\./i)
      ).toBeInTheDocument();

      // Reset session
      fireEvent.click(screen.getByRole("button", { name: "بازنشانی ترمینال" }));
      expect(screen.getByText(/کنسول خالی است/i)).toBeInTheDocument();

      // Check zero forbidden terms in Persian Terminal DOM
      const terminalSection = screen.getByRole("heading", { name: "ترمینال تمرینی" }).closest("section")!;
      const terminalText = terminalSection.textContent ?? "";
      const disallowedTerms = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "Regulation 24", "Reg 24", "PB 82", "PB82",
        "PBS", "RPBS", "barcode", "امضای معتبر", "statutory entitlement"
      ];
      for (const term of disallowedTerms) {
        expect(terminalText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe("Final Review Preview module", () => {
    it("renders in English, manages Training A/B selection, enables preview button only when all 3 checkboxes are checked, clears state on entry switch/reset, and displays persistent watermarks with zero side-effects", () => {
      render(<PharmacyFredPracticeView />);

      // Switch to Final Review Preview module
      fireEvent.click(screen.getByRole("button", { name: /Final Review Preview/i }));
      expect(
        screen.getByRole("heading", { name: "Final Review Preview (Practice Only)" })
      ).toBeInTheDocument();

      // Verify persistent watermark banner
      expect(screen.getAllByText("TRAINING ONLY — NOT A HANDOUT").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/⚠️ فقط تمرین — برگه واقعی نیست/i)).toBeInTheDocument();

      // Open Practice Preview button is initially disabled
      const openBtn = screen.getByRole("button", { name: /Open Practice Preview/i });
      expect(openBtn).toBeDisabled();

      // Initial empty state in preview column
      expect(screen.getByText("Practice Preview Not Yet Opened")).toBeInTheDocument();

      // 1. Select Training A
      const trainABtn = screen.getByRole("button", { name: /Training A/i });
      fireEvent.click(trainABtn);
      expect(openBtn).toBeDisabled();

      // Locate the 3 visual quality checkboxes
      const cb1 = screen.getByLabelText(/Layout legibility verified for training purposes/i);
      const cb2 = screen.getByLabelText(/Training notice and watermark clearly visible/i);
      const cb3 = screen.getByLabelText(/Absence of real patient, prescription, or clinical data verified/i);

      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();

      // Tick 1st checkbox -> still disabled
      fireEvent.click(cb1);
      expect(cb1).toBeChecked();
      expect(openBtn).toBeDisabled();

      // Tick 2nd checkbox -> still disabled
      fireEvent.click(cb2);
      expect(cb2).toBeChecked();
      expect(openBtn).toBeDisabled();

      // Tick 3rd checkbox -> now enabled!
      fireEvent.click(cb3);
      expect(cb3).toBeChecked();
      expect(openBtn).toBeEnabled();

      // 2. Open Preview
      fireEvent.click(openBtn);

      // Verify confirmation notice
      expect(
        screen.getByText("Practice preview opened; no handout or dispensing occurred")
      ).toBeInTheDocument();
      expect(screen.getByText("Local Simulation Only")).toBeInTheDocument();

      // Verify mockup content
      expect(screen.getAllByText("Training A").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Form Layout A").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Zone 1: Practice Header Area/i)).toBeInTheDocument();

      // 3. Switch to Training B -> clears all 3 checkboxes and closes preview
      const trainBBtn = screen.getByRole("button", { name: /Training B/i });
      fireEvent.click(trainBBtn);

      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();
      expect(openBtn).toBeDisabled();
      expect(screen.getByText("Practice Preview Not Yet Opened")).toBeInTheDocument();
      expect(
        screen.queryByText("Practice preview opened; no handout or dispensing occurred")
      ).not.toBeInTheDocument();

      // Tick all 3 checkboxes for Training B
      fireEvent.click(cb1);
      fireEvent.click(cb2);
      fireEvent.click(cb3);
      expect(openBtn).toBeEnabled();

      fireEvent.click(openBtn);
      expect(
        screen.getByText("Practice preview opened; no handout or dispensing occurred")
      ).toBeInTheDocument();
      expect(screen.getAllByText("Training B").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Form Layout B").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Zone 1: Practice Alternative Header/i)).toBeInTheDocument();

      // 4. Click Reset Review button
      const resetBtn = screen.getByRole("button", { name: "Reset Review" });
      fireEvent.click(resetBtn);

      expect(screen.getByText("Practice Preview Not Yet Opened")).toBeInTheDocument();
      expect(openBtn).toBeDisabled();
      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();

      // Verify zero forbidden terms in Final Review DOM
      const reviewSection = screen.getByRole("heading", { name: "Final Review Preview (Practice Only)" }).closest("section")!;
      const reviewText = reviewSection.textContent ?? "";
      const disallowedTerms = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "Lipitor", "Regulation 24", "Reg 24", "PB 82",
        "PB82", "PBS", "RPBS", "barcode", "امضای معتبر", "statutory entitlement"
      ];
      for (const term of disallowedTerms) {
        expect(reviewText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("supports Persian mode in Final Review Preview: renders Persian labels, watermarks, checkboxes, opens in-page preview with Persian confirmation, and resets cleanly with zero side-effects", () => {
      languageState.lang = "fa";
      render(<PharmacyFredPracticeView />);

      // Switch to Final Review module in Persian
      fireEvent.click(screen.getByRole("button", { name: /پیش‌نمایش بازبینی پایانی/i }));
      expect(
        screen.getByRole("heading", { name: "پیش‌نمایش بازبینی پایانی (صرفاً تمرینی)" })
      ).toBeInTheDocument();

      // Watermark in Persian & English
      expect(screen.getAllByText("TRAINING ONLY — NOT A HANDOUT").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/⚠️ فقط تمرین — برگه واقعی نیست/i)).toBeInTheDocument();

      // Button is initially disabled
      const openBtn = screen.getByRole("button", { name: /باز کردن پیش‌نمایش تمرینی/i });
      expect(openBtn).toBeDisabled();

      // Select Training A in Persian
      const trainABtn = screen.getByRole("button", { name: /تمرین A/i });
      fireEvent.click(trainABtn);
      expect(openBtn).toBeDisabled();

      // 3 Persian checkboxes
      const cb1 = screen.getByLabelText(/بررسی خوانایی چیدمان برای اهداف تمرینی/i);
      const cb2 = screen.getByLabelText(/دیده شدن شفاف هشدار تمرینی و واترمارک/i);
      const cb3 = screen.getByLabelText(/اطمینان از نبود هرگونه اطلاعات واقعی بیمار، نسخه یا بالینی/i);

      fireEvent.click(cb1);
      fireEvent.click(cb2);
      fireEvent.click(cb3);
      expect(openBtn).toBeEnabled();

      // Open in-page preview
      fireEvent.click(openBtn);

      // Verify Persian confirmation
      expect(
        screen.getByText("پیش‌نمایش تمرینی باز شد؛ هیچ تحویل یا dispensing انجام نشد")
      ).toBeInTheDocument();
      expect(screen.getByText("شبیه‌سازی محلی")).toBeInTheDocument();

      // Mockup content in Persian
      expect(screen.getAllByText("تمرین A").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("چیدمان فرم A").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/ناحیه ۱: سربرگ تمرینی/i)).toBeInTheDocument();

      // Close preview
      const closeBtn = screen.getByRole("button", { name: "بستن پیش‌نمایش" });
      fireEvent.click(closeBtn);
      expect(screen.getByText("پیش‌نمایش تمرینی هنوز باز نشده است")).toBeInTheDocument();

      // Reset
      const resetBtn = screen.getByRole("button", { name: "بازنشانی بازبینی" });
      fireEvent.click(resetBtn);
      expect(openBtn).toBeDisabled();

      // Check zero forbidden terms in Persian DOM
      const reviewSection = screen.getByRole("heading", { name: "پیش‌نمایش بازبینی پایانی (صرفاً تمرینی)" }).closest("section")!;
      const reviewText = reviewSection.textContent ?? "";
      const disallowedTerms = [
        "David", "Miller", "Vance", "Smith", "Medicare", "prescriber", "provider",
        "Atorvastatin", "Rosuvastatin", "Lipitor", "Regulation 24", "Reg 24", "PB 82",
        "PB82", "PBS", "RPBS", "barcode", "امضای معتبر", "statutory entitlement"
      ];
      for (const term of disallowedTerms) {
        expect(reviewText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe("ODT Session Practice module", () => {
    it("renders in English, keeps format buttons disabled until scenario selection, manages Training A/B selection, format toggle, checklist validation, aria-pressed, format change reset, scenario switch reset to Alpha, and opens in-page preview with persistent watermarks and zero side-effects", () => {
      languageState.lang = "en";
      render(<PharmacyFredPracticeView />);

      // Switch to ODT module
      fireEvent.click(screen.getByRole("button", { name: "ODT Session Practice" }));
      expect(
        screen.getByRole("heading", { name: "ODT Session Practice (Fictional Training Only)" })
      ).toBeInTheDocument();

      // Persistent bilingual watermark
      expect(screen.getAllByText("TRAINING ONLY — NO REAL-WORLD ACTION").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/فقط تمرین — هیچ اقدام واقعی انجام نمی‌شود/i).length).toBeGreaterThanOrEqual(1);

      // Open button initially disabled
      const openBtn = screen.getByRole("button", { name: "Open Session Preview" });
      expect(openBtn).toBeDisabled();

      // Format buttons initially disabled before scenario selection with helper notice
      const formatAlphaBtn = screen.getByRole("button", { name: "Format Alpha" });
      const formatBetaBtn = screen.getByRole("button", { name: "Format Beta" });
      expect(formatAlphaBtn).toBeDisabled();
      expect(formatBetaBtn).toBeDisabled();
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "true");
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByText("Select a training scenario above first to enable format selection.")
      ).toBeInTheDocument();

      // Check aria-pressed on scenario buttons
      const trainABtn = screen.getByRole("button", { name: /Training A/i });
      const trainBBtn = screen.getByRole("button", { name: /Training B/i });
      expect(trainABtn).toHaveAttribute("aria-pressed", "false");
      expect(trainBBtn).toHaveAttribute("aria-pressed", "false");

      // Select Training A -> enables format buttons
      fireEvent.click(trainABtn);
      expect(trainABtn).toHaveAttribute("aria-pressed", "true");
      expect(trainBBtn).toHaveAttribute("aria-pressed", "false");
      expect(formatAlphaBtn).toBeEnabled();
      expect(formatBetaBtn).toBeEnabled();
      expect(openBtn).toBeDisabled();

      // Switch format to Format Beta
      fireEvent.click(formatBetaBtn);
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "false");
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "true");

      // Checkboxes
      const cb1 = screen.getByLabelText(/Record layout and structure clarity verified/i);
      const cb2 = screen.getByLabelText(/Fictional placeholder completeness confirmed/i);
      const cb3 = screen.getByLabelText(/Confirmation of zero patient, medication, or clinical data/i);

      fireEvent.click(cb1);
      expect(openBtn).toBeDisabled();
      fireEvent.click(cb2);
      expect(openBtn).toBeDisabled();
      fireEvent.click(cb3);
      expect(openBtn).toBeEnabled();

      // Open in-page preview
      fireEvent.click(openBtn);

      // Verify confirmation notice with role="status" and aria-live="polite"
      const confirmNotice = screen.getByText("Local practice only; no real-world dosing, official log update, or delivery occurred");
      expect(confirmNotice).toBeInTheDocument();
      const statusBanner = confirmNotice.closest("[role='status']");
      expect(statusBanner).toBeInTheDocument();
      expect(statusBanner).toHaveAttribute("aria-live", "polite");
      expect(screen.getByText("Local Simulation Only")).toBeInTheDocument();

      // Verify preview content
      expect(screen.getAllByText("Training A").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/REF-TRAIN-ALPHA-01/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("[COL: STRUCTURE_MODE]")).toBeInTheDocument();
      expect(screen.getByText("STRUCTURE_B")).toBeInTheDocument();
      expect(screen.getByText("PREVIEW_ONLY")).toBeInTheDocument();

      // Switching format while preview is open must close preview and reset checklist
      fireEvent.click(formatAlphaBtn);
      expect(screen.getByText("Session Preview Not Yet Opened")).toBeInTheDocument();
      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();
      expect(openBtn).toBeDisabled();
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "true");
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "false");

      // Re-tick all 3 checkboxes with Format Alpha
      fireEvent.click(cb1);
      fireEvent.click(cb2);
      fireEvent.click(cb3);
      expect(openBtn).toBeEnabled();
      fireEvent.click(openBtn);
      expect(screen.getByText("STRUCTURE_A")).toBeInTheDocument();

      // Switch format to Beta again
      fireEvent.click(formatBetaBtn);
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Session Preview Not Yet Opened")).toBeInTheDocument();

      // Switch to Training B -> clears checkboxes, closes preview, and visibly resets format back to Alpha
      fireEvent.click(trainBBtn);
      expect(trainBBtn).toHaveAttribute("aria-pressed", "true");
      expect(trainABtn).toHaveAttribute("aria-pressed", "false");
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "true");
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "false");
      expect(formatAlphaBtn).toBeEnabled();
      expect(formatBetaBtn).toBeEnabled();
      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();
      expect(openBtn).toBeDisabled();
      expect(screen.getByText("Session Preview Not Yet Opened")).toBeInTheDocument();

      // Tick all 3 checkboxes for Training B
      fireEvent.click(cb1);
      fireEvent.click(cb2);
      fireEvent.click(cb3);
      expect(openBtn).toBeEnabled();

      fireEvent.click(openBtn);
      expect(screen.getAllByText("Training B").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/REF-TRAIN-BETA-02/i).length).toBeGreaterThanOrEqual(1);

      // Reset
      const resetBtn = screen.getByRole("button", { name: "Reset Session" });
      fireEvent.click(resetBtn);
      expect(screen.getByText("Session Preview Not Yet Opened")).toBeInTheDocument();
      expect(openBtn).toBeDisabled();
      expect(formatAlphaBtn).toBeDisabled();
      expect(formatBetaBtn).toBeDisabled();

      // Disallowed terms check
      const odtSection = screen.getByRole("heading", { name: "ODT Session Practice (Fictional Training Only)" }).closest("section")!;
      const odtText = odtSection.textContent ?? "";
      const disallowedTerms = [
        "Methadone", "Buprenorphine", "Suboxone", "David", "Miller", "Medicare",
        "prescriber", "provider", "safe", "lock", "S8", "register", "dose", "mg", "mL",
        "administered", "supervised", "takeaway"
      ];
      for (const term of disallowedTerms) {
        expect(odtText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("supports Persian mode in ODT Session Practice: keeps format disabled until scenario selected, renders Persian labels, watermarks, checkboxes, aria-pressed, resets format to Alpha on scenario change, opens in-page preview with Persian confirmation, and resets cleanly with zero side-effects", () => {
      languageState.lang = "fa";
      render(<PharmacyFredPracticeView />);

      fireEvent.click(screen.getByRole("button", { name: /تمرین ثبت جلسه ODT/i }));
      expect(
        screen.getByRole("heading", { name: "تمرین ثبت جلسه ODT (صرفاً ساختگی و نمایشی)" })
      ).toBeInTheDocument();

      // Watermark in Persian & English
      expect(screen.getAllByText("TRAINING ONLY — NO REAL-WORLD ACTION").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/فقط تمرین — هیچ اقدام واقعی انجام نمی‌شود/i).length).toBeGreaterThanOrEqual(1);

      const openBtn = screen.getByRole("button", { name: /باز کردن پیش‌نمایش رویداد/i });
      expect(openBtn).toBeDisabled();

      // Format buttons initially disabled in Persian with helper text
      const formatAlphaBtn = screen.getByRole("button", { name: /قالب آلفا/i });
      const formatBetaBtn = screen.getByRole("button", { name: /قالب بتا/i });
      expect(formatAlphaBtn).toBeDisabled();
      expect(formatBetaBtn).toBeDisabled();
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "true");
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByText("ابتدا یک سناریوی تمرینی را از بالا انتخاب کنید تا انتخاب قالب فعال شود.")
      ).toBeInTheDocument();

      // Select Training A in Persian and check aria-pressed
      const trainABtn = screen.getByRole("button", { name: /تمرین A/i });
      const trainBBtn = screen.getByRole("button", { name: /تمرین B/i });
      expect(trainABtn).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(trainABtn);
      expect(trainABtn).toHaveAttribute("aria-pressed", "true");
      expect(trainBBtn).toHaveAttribute("aria-pressed", "false");
      expect(formatAlphaBtn).toBeEnabled();
      expect(formatBetaBtn).toBeEnabled();
      expect(openBtn).toBeDisabled();

      // Checkboxes
      const cb1 = screen.getByLabelText(/بررسی خوانایی و شفافیت ساختار ثبت تمرینی/i);
      const cb2 = screen.getByLabelText(/تأیید کامل‌بودن فیلدهای جای‌نگهدار فرضی/i);
      const cb3 = screen.getByLabelText(/اطمینان قطعی از نبود اطلاعات بیمار، دارو، دوز یا دادهٔ بالینی/i);

      fireEvent.click(cb1);
      fireEvent.click(cb2);
      fireEvent.click(cb3);
      expect(openBtn).toBeEnabled();

      // Open preview
      fireEvent.click(openBtn);
      const confirmNotice = screen.getByText("فقط تمرین محلی بوده و هیچ رخداد، ثبت رسمی یا تحویل دوز واقعی انجام نشده است");
      expect(confirmNotice).toBeInTheDocument();
      const statusBanner = confirmNotice.closest("[role='status']");
      expect(statusBanner).toBeInTheDocument();
      expect(statusBanner).toHaveAttribute("aria-live", "polite");
      expect(screen.getByText("شبیه‌سازی محلی")).toBeInTheDocument();

      expect(screen.getAllByText("تمرین A").length).toBeGreaterThanOrEqual(1);

      // Changing format closes preview and resets checklist in Persian
      fireEvent.click(formatBetaBtn);
      expect(screen.getByText("پیش‌نمایش رویداد هنوز باز نشده است")).toBeInTheDocument();
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "true");
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "false");
      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();
      expect(openBtn).toBeDisabled();

      // Changing scenario back to Training B resets format visibly back to Alpha
      fireEvent.click(trainBBtn);
      expect(trainBBtn).toHaveAttribute("aria-pressed", "true");
      expect(trainABtn).toHaveAttribute("aria-pressed", "false");
      expect(formatAlphaBtn).toHaveAttribute("aria-pressed", "true");
      expect(formatBetaBtn).toHaveAttribute("aria-pressed", "false");
      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();
      expect(openBtn).toBeDisabled();

      // Re-check and open preview
      fireEvent.click(cb1);
      fireEvent.click(cb2);
      fireEvent.click(cb3);
      fireEvent.click(openBtn);
      const closeBtn = screen.getByRole("button", { name: "بستن پیش‌نمایش" });
      fireEvent.click(closeBtn);
      expect(screen.getByText("پیش‌نمایش رویداد هنوز باز نشده است")).toBeInTheDocument();

      // Reset
      const resetBtn = screen.getByRole("button", { name: "بازنشانی جلسه" });
      fireEvent.click(resetBtn);
      expect(openBtn).toBeDisabled();
      expect(formatAlphaBtn).toBeDisabled();
      expect(formatBetaBtn).toBeDisabled();

      // Disallowed terms check
      const odtSection = screen.getByRole("heading", { name: "تمرین ثبت جلسه ODT (صرفاً ساختگی و نمایشی)" }).closest("section")!;
      const odtText = odtSection.textContent ?? "";
      const disallowedTerms = [
        "Methadone", "Buprenorphine", "Suboxone", "David", "Miller", "Medicare",
        "prescriber", "provider", "safe", "lock", "S8", "register", "dose", "mg", "mL",
        "administered", "supervised", "takeaway"
      ];
      for (const term of disallowedTerms) {
        expect(odtText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe("PBS/POS Categorization Practice module", () => {
    it("renders in English, assigns items to Group A and B with aria-pressed, closes preview on assignment change, disables preview on incomplete assignment, and resets cleanly with zero side-effects", () => {
      languageState.lang = "en";
      render(<PharmacyFredPracticeView />);

      fireEvent.click(screen.getByRole("button", { name: "PBS/POS Categorization Practice" }));
      expect(
        screen.getByRole("heading", { name: "PBS/POS Categorization Practice (Local Training Only)" })
      ).toBeInTheDocument();

      // Persistent watermark
      expect(screen.getAllByText("TRAINING ONLY — NO REAL-WORLD ACTION").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/فقط تمرین — هیچ اقدام واقعی انجام نمی‌شود/i).length).toBeGreaterThanOrEqual(1);

      const openBtn = screen.getByRole("button", { name: "Open Categorization Preview" });
      expect(openBtn).toBeDisabled();

      // Find group buttons for each item and check initial aria-pressed="false"
      const groupABtns = screen.getAllByRole("button", { name: "Group A" });
      const groupBBtns = screen.getAllByRole("button", { name: "Group B" });
      expect(groupABtns).toHaveLength(3);
      expect(groupBBtns).toHaveLength(3);
      expect(groupABtns[0]).toHaveAttribute("aria-pressed", "false");
      expect(groupBBtns[0]).toHaveAttribute("aria-pressed", "false");

      // Assign Item 1 to Group A, Item 2 to Group B -> still disabled
      fireEvent.click(groupABtns[0]);
      expect(groupABtns[0]).toHaveAttribute("aria-pressed", "true");
      expect(groupBBtns[0]).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(groupBBtns[1]);
      expect(groupBBtns[1]).toHaveAttribute("aria-pressed", "true");
      expect(openBtn).toBeDisabled();

      // Assign Item 3 to Group A -> now all 3 assigned -> enabled
      fireEvent.click(groupABtns[2]);
      expect(groupABtns[2]).toHaveAttribute("aria-pressed", "true");
      expect(openBtn).toBeEnabled();

      // Open preview
      fireEvent.click(openBtn);
      const confirmNotice = screen.getByText("Local practice only; no real-world claim, POS transaction, or archive occurred");
      expect(confirmNotice).toBeInTheDocument();
      const statusBanner = confirmNotice.closest("[role='status']");
      expect(statusBanner).toBeInTheDocument();
      expect(statusBanner).toHaveAttribute("aria-live", "polite");
      expect(screen.getByText("Local Simulation Only")).toBeInTheDocument();

      // Check Group A has 2 items, Group B has 1 item
      expect(screen.getByText("2 Items")).toBeInTheDocument();
      expect(screen.getByText("1 Items")).toBeInTheDocument();

      // Changing an assignment while preview is open must close preview
      fireEvent.click(groupBBtns[0]); // switch Item 1 to Group B
      expect(screen.getByText("Categorization Preview Not Yet Opened")).toBeInTheDocument();
      expect(groupBBtns[0]).toHaveAttribute("aria-pressed", "true");
      expect(groupABtns[0]).toHaveAttribute("aria-pressed", "false");
      expect(openBtn).toBeEnabled(); // all 3 still assigned

      // Toggling the assigned group off on Item 1 makes assignments incomplete -> disabled button
      fireEvent.click(groupBBtns[0]); // toggle off Item 1
      expect(groupBBtns[0]).toHaveAttribute("aria-pressed", "false");
      expect(openBtn).toBeDisabled();

      // Re-assign Item 1 to Group A and open preview again
      fireEvent.click(groupABtns[0]);
      expect(openBtn).toBeEnabled();
      fireEvent.click(openBtn);
      expect(screen.getByText("2 Items")).toBeInTheDocument();

      // Close preview
      const closeBtn = screen.getByRole("button", { name: "Close Preview" });
      fireEvent.click(closeBtn);
      expect(screen.getByText("Categorization Preview Not Yet Opened")).toBeInTheDocument();

      // Reset
      const resetBtn = screen.getByRole("button", { name: "Reset Categories" });
      fireEvent.click(resetBtn);
      expect(openBtn).toBeDisabled();
      expect(groupABtns[0]).toHaveAttribute("aria-pressed", "false");

      // Disallowed terms check
      const pbsSection = screen.getByRole("heading", { name: "PBS/POS Categorization Practice (Local Training Only)" }).closest("section")!;
      const pbsText = pbsSection.textContent ?? "";
      const disallowedTerms = [
        "David", "Miller", "Medicare", "prescriber", "provider", "Concession",
        "SafetyNet", "RPBS", "DVA", "$", "coPayment", "shred", "archive", "claim"
      ];
      for (const term of disallowedTerms) {
        expect(pbsText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("supports Persian mode in PBS/POS Categorization Practice: renders Persian labels, watermarks, allows assigning groups with aria-pressed, closes preview on change, opens in-page preview with Persian confirmation, and resets cleanly with zero side-effects", () => {
      languageState.lang = "fa";
      render(<PharmacyFredPracticeView />);

      fireEvent.click(screen.getByRole("button", { name: /پیش‌نمایش دسته‌بندی PBS\/POS/i }));
      expect(
        screen.getByRole("heading", { name: "پیش‌نمایش دسته‌بندی PBS/POS (صرفاً تمرین محلی)" })
      ).toBeInTheDocument();

      expect(screen.getAllByText("TRAINING ONLY — NO REAL-WORLD ACTION").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/فقط تمرین — هیچ اقدام واقعی انجام نمی‌شود/i).length).toBeGreaterThanOrEqual(1);

      const openBtn = screen.getByRole("button", { name: /باز کردن پیش‌نمایش دسته‌بندی/i });
      expect(openBtn).toBeDisabled();

      const groupABtns = screen.getAllByRole("button", { name: "گروه الف" });
      const groupBBtns = screen.getAllByRole("button", { name: "گروه ب" });
      expect(groupABtns).toHaveLength(3);
      expect(groupBBtns).toHaveLength(3);
      expect(groupABtns[0]).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(groupABtns[0]);
      expect(groupABtns[0]).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(groupABtns[1]);
      fireEvent.click(groupBBtns[2]);
      expect(openBtn).toBeEnabled();

      fireEvent.click(openBtn);
      const confirmNotice = screen.getByText("فقط تمرین محلی بوده و هیچ رخداد، تراکنش POS یا بایگانی واقعی انجام نشده است");
      expect(confirmNotice).toBeInTheDocument();
      const statusBanner = confirmNotice.closest("[role='status']");
      expect(statusBanner).toBeInTheDocument();
      expect(statusBanner).toHaveAttribute("aria-live", "polite");
      expect(screen.getByText("شبیه‌سازی محلی")).toBeInTheDocument();

      expect(screen.getByText("2 آیتم")).toBeInTheDocument();
      expect(screen.getByText("1 آیتم")).toBeInTheDocument();

      // Changing assignment closes preview in Persian
      fireEvent.click(groupBBtns[0]);
      expect(screen.getByText("پیش‌نمایش دسته‌بندی هنوز باز نشده است")).toBeInTheDocument();

      // Toggling off disables open button
      fireEvent.click(groupBBtns[0]);
      expect(openBtn).toBeDisabled();

      // Re-assign to reopen preview
      fireEvent.click(groupABtns[0]);
      fireEvent.click(openBtn);
      const closeBtn = screen.getByRole("button", { name: "بستن پیش‌نمایش" });
      fireEvent.click(closeBtn);
      expect(screen.getByText("پیش‌نمایش دسته‌بندی هنوز باز نشده است")).toBeInTheDocument();

      const resetBtn = screen.getByRole("button", { name: "بازنشانی دسته‌ها" });
      fireEvent.click(resetBtn);
      expect(openBtn).toBeDisabled();

      const pbsSection = screen.getByRole("heading", { name: "پیش‌نمایش دسته‌بندی PBS/POS (صرفاً تمرین محلی)" }).closest("section")!;
      const pbsText = pbsSection.textContent ?? "";
      const disallowedTerms = [
        "David", "Miller", "Medicare", "prescriber", "provider", "Concession",
        "SafetyNet", "RPBS", "DVA", "$", "coPayment", "shred", "archive", "claim"
      ];
      for (const term of disallowedTerms) {
        expect(pbsText).not.toContain(term);
      }

      // Zero side-effects
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });
});
