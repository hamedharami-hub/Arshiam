export type FredScriptKind = "eScript" | "Paper" | "Reg24" | "Chart";
export type FredSchedule = "S4" | "S8";

export interface PharmacyFredPracticeEntry {
  id: string;
  type: FredScriptKind;
  scriptType: string;
  prescribedDrug: string;
  pbsCode: string;
  aFlagGenericSubstitute: string;
  schedule: FredSchedule;
  scriptDate: string;
  quantity: number;
  repeats: number;
  directions: string;
  isExpiredS8?: true;
  sourceUrl: string;
  contentReviewStatus: "unreviewed";
}

export interface FredShortcutPractice {
  id: "standard" | "outside" | "deferred" | "reg24";
  syntax: string;
  aliases: readonly string[];
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
}

export const PBS_REGULATION_49_SOURCE_URL =
  "https://www.pbs.gov.au/healthpro/explanatory-notes/section1/Section_1_2_Explanatory_Notes";

export const SERVICES_AUSTRALIA_SAFETY_NET_SOURCE_URL =
  "https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016";

export const NSW_HEALTH_PRESCRIPTION_EXPIRY_SOURCE_URL =
  "https://www.health.nsw.gov.au/pharmaceutical/Pages/legal-form-prescription.aspx";

/**
 * Verbatim labels/descriptions and accepted aliases from Pharmacy's FRED
 * shortcut panel/parser. These are a source snapshot, not an independently
 * verified statement of current dispensing or legal requirements.
 */
export const FRED_SHORTCUT_PRACTICE: readonly FredShortcutPractice[] = [
  {
    id: "standard",
    syntax: "5/1",
    aliases: ["5", "5/1", "1"],
    titleFa: "دیسپنس استاندارد اول (Standard 1st Supply)",
    titleEn: "Standard 1st Supply + 5 Repeats",
    descriptionFa: "۵ بار تکرار مجاز + ۱ نوبت تحویل در تاریخ جاری",
    descriptionEn: "5 repeats authorized, dispensing 1st supply today",
  },
  {
    id: "outside",
    syntax: "5/3",
    aliases: ["5/3", "3"],
    titleFa: "نسخه تکرار خارجی (Outside Repeat)",
    titleEn: "Outside Repeat (5 Auth, 3 Dispensed)",
    descriptionFa: "۵ تکرار مجاز، ۳ نوبت قبلاً در داروخانه دیگری تحویل شده (۲ تکرار باقی‌مانده)",
    descriptionEn: "5 authorized, 3 previously dispensed elsewhere (2 repeats remaining)",
  },
  {
    id: "deferred",
    syntax: "5D",
    aliases: ["5D", "D5", "DEFER"],
    titleFa: "به تعویق انداختن نسخه (Defer Script)",
    titleEn: "Defer Script (No Drug Supply Today)",
    descriptionFa: "صدور کوپن/فرمت تکرار مجدد بدون تحویل فیزیکی دارو در امروز",
    descriptionEn: "Issues repeat form/token without dispensing physical medication today",
  },
  {
    id: "reg24",
    syntax: "5R",
    aliases: ["5R", "R5", "REG24", "REG 24"],
    titleFa: "مقررات ۴۹ (قانون ۲۴ سابق) — نام مستعار تمرینی",
    titleEn: "Regulation 49 (formerly Regulation 24) — Training Alias",
    descriptionFa: "تحویل همزمان نسخه اصلی و تکرارها در صورت احراز شرایط ۳ گانه توسط نسخه‌نویس مجاز (پزشک، ماما یا Nurse Practitioner (پرستار دارای مجوز تجویز)؛ نه بینایی‌سنج/دندانپزشک) و درج صریح «one supply»: ناکافی بودن مقدار حداکثر PBS برای درمان، ابتلای بیمار به بیماری مزمن یا سکونت دوردست از نزدیک‌ترین داروخانه معتبر، و بروز سختی شدید (great hardship) در تحویل جداگانه. نمادهای 5R/R5/REG24 صرفاً نام‌های مستعار تمرینی هستند نه دستور تاییدشده رسمی FRED. این بخش صرفاً آموزش قواعد است و دستور دیسپنس یا ارسال ادعا نیست.",
    descriptionEn: "Permits simultaneous original and repeat supply only when an authorized prescriber (medical practitioner, midwife, or nurse practitioner; not optometrist or dentist) endorses 'one supply' and is satisfied: (1) max PBS quantity is insufficient; (2) patient has chronic illness OR resides remotely from nearest approved pharmacy; AND (3) great hardship would result from separate supplies. Syntax 5R/R5/REG24 is a custom training-only alias, not verified standard FRED syntax. This is a rules-learning exercise, not a dispensing or claiming instruction.",
  },
];

export const FRED_TRAINING_ERX_BARCODE = "TRAIN-ERX-4821";

export function resolveFredPracticeShortcut(input: string): FredShortcutPractice | null {
  const normalized = input.trim().toLocaleUpperCase().replace(/\s+/g, " ");
  if (!normalized) return null;
  return FRED_SHORTCUT_PRACTICE.find((shortcut) => shortcut.aliases.includes(normalized)) ?? null;
}

export function matchesFredTrainingBarcode(input: string, expected = FRED_TRAINING_ERX_BARCODE): boolean {
  return input.trim().toLocaleUpperCase() === expected;
}

export interface FredOwingNoticePreview {
  noticeId: string;
  prescribedDrug: string;
  quantity: number;
  schedule: FredSchedule;
  scriptDate: string;
  barcode: string;
  issueDate: string;
  noticeStatusTextEn: string;
  noticeStatusTextFa: string;
  isEducationalSampleOnly: true;
}

export function generateFredOwingNoticePreview(entry: PharmacyFredPracticeEntry): FredOwingNoticePreview {
  return {
    noticeId: `OWING-NOTICE-${entry.id.toUpperCase()}`,
    prescribedDrug: entry.prescribedDrug,
    quantity: entry.quantity,
    schedule: entry.schedule,
    scriptDate: entry.scriptDate,
    barcode: FRED_TRAINING_ERX_BARCODE,
    issueDate: "2026-09-26",
    noticeStatusTextEn: "TRAINING PREVIEW ONLY — NOT AN OFFICIAL OWING NOTICE",
    noticeStatusTextFa: "فقط پیش‌نمایش تمرینی — برگه رسمی یا تعهد قانونی نیست",
    isEducationalSampleOnly: true,
  };
}

export interface FredReconciliationResult {
  success: boolean;
  errorMessageEn?: string;
  errorMessageFa?: string;
}

export function evaluateFredReconciliation(barcodeInput: string): FredReconciliationResult {
  const trimmed = barcodeInput.trim();
  if (!trimmed) {
    return {
      success: false,
      errorMessageEn: "Barcode cannot be empty. Enter the educational barcode.",
      errorMessageFa: "بارکد نمی‌تواند خالی باشد. بارکد آموزشی را وارد کنید.",
    };
  }
  if (!matchesFredTrainingBarcode(trimmed)) {
    return {
      success: false,
      errorMessageEn: `Invalid barcode. Only simulated barcode ${FRED_TRAINING_ERX_BARCODE} is accepted.`,
      errorMessageFa: `بارکد نامعتبر است. فقط بارکد شبیه‌سازی ${FRED_TRAINING_ERX_BARCODE} پذیرفته می‌شود.`,
    };
  }
  return { success: true };
}

// -------------------------------------------------------------
// 1. Safety Net Practice Types & Synthetic Data
// -------------------------------------------------------------

export type SafetyNetCategory = "general" | "concessional";

export interface FredSafetyNetScenario {
  id: string;
  category: SafetyNetCategory;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  currentSpend: number;
  syntheticThreshold: number;
  scriptContribution: number;
  expectedRemainingBeforeScript: number;
  expectedCrossesThreshold: boolean;
  expectedPostScriptStatusFa: string;
  expectedPostScriptStatusEn: string;
  sourceSnapshotDate?: string;
  sourceCheckDate?: string;
  sourceUrl?: string;
  contentReviewStatus: "unreviewed";
}

export const FRED_SAFETY_NET_SCENARIOS: readonly FredSafetyNetScenario[] = [
  {
    id: "sn-general-approaching",
    category: "general",
    titleFa: "بیمار عمومی (General) در نزدیکی آستانه Safety Net ۲۰۲۶",
    titleEn: "General Patient Approaching 2026 Safety Net Threshold",
    descriptionFa: "ارقام تمرینی فرضی (Fictional training values): پرداخت سالانه $1,725.30 و سقف فرضی نسخه جاری $25.00 که در این تمرین مجموعاً از آستانهٔ ۲۰۲۶ ($1,748.20) عبور می‌کند.",
    descriptionEn: "Fictional training values: synthetic annual spend $1,725.30 with an illustrative $25.00 maximum before threshold crossing the 2026 threshold ($1,748.20).",
    currentSpend: 1725.30,
    syntheticThreshold: 1748.20,
    scriptContribution: 25.00,
    expectedRemainingBeforeScript: 22.90,
    expectedCrossesThreshold: true,
    expectedPostScriptStatusFa: "در این تمرین ساختگی، مجموع فرضی ($1,750.30) از آستانهٔ فرضی ۲۰۲۶ ($1,748.20) عبور می‌کند؛ این نتیجه صرفاً آموزشی است و واجدشرایط‌بودن واقعی، صدور کارت یا پرداخت نهایی را تعیین نمی‌کند.",
    expectedPostScriptStatusEn: "In this fictional exercise, the mock total ($1,750.30) crosses the 2026 mock threshold ($1,748.20); this is educational only and does not determine real eligibility, card issue, or final payment.",
    sourceSnapshotDate: "2026-01-01",
    sourceCheckDate: "2026-09-26",
    sourceUrl: "https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016",
    contentReviewStatus: "unreviewed",
  },
  {
    id: "sn-concessional-early",
    category: "concessional",
    titleFa: "بیمار دارای سهمیه (Concessional) با ارزیابی آستانه ۲۰۲۶",
    titleEn: "Concessional Patient 2026 Threshold Assessment",
    descriptionFa: "ارقام تمرینی فرضی (Fictional training values): پرداخت سالانه $145.00 و سقف فرضی نسخه جاری $7.70 در برابر آستانهٔ ۲۰۲۶ ($277.20).",
    descriptionEn: "Fictional training values: synthetic annual spend $145.00 with an illustrative $7.70 maximum before threshold against the 2026 threshold ($277.20).",
    currentSpend: 145.00,
    syntheticThreshold: 277.20,
    scriptContribution: 7.70,
    expectedRemainingBeforeScript: 132.20,
    expectedCrossesThreshold: false,
    expectedPostScriptStatusFa: "در این تمرین ساختگی، مجموع فرضی ($152.70) هنوز به آستانهٔ فرضی ۲۰۲۶ ($277.20) نمی‌رسد؛ هیچ نتیجهٔ واقعی دربارهٔ کارت یا پرداخت تعیین نمی‌شود.",
    expectedPostScriptStatusEn: "In this fictional exercise, the mock total ($152.70) does not reach the 2026 mock threshold ($277.20); no real eligibility, card issue, or payment outcome is determined.",
    sourceSnapshotDate: "2026-01-01",
    sourceCheckDate: "2026-09-26",
    sourceUrl: "https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016",
    contentReviewStatus: "unreviewed",
  },
];

// -------------------------------------------------------------
// 2. Labeling Practice Types & Synthetic Data
// -------------------------------------------------------------

export interface FredAuxiliaryWarningLabel {
  id: string;
  code: string;
  textEn: string;
  textFa: string;
  colorClass: string;
}

export const FRED_AUXILIARY_LABELS: readonly FredAuxiliaryWarningLabel[] = [
  {
    id: "lbl-1",
    code: "Label 1",
    textEn: "Take with or immediately after food.",
    textFa: "همراه یا بلافاصله پس از غذا میل شود.",
    colorClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  {
    id: "lbl-13",
    code: "Label 13",
    textEn: "May cause drowsiness. If affected do not drive or operate machinery.",
    textFa: "ممکن است باعث خواب‌آلودگی شود. در این صورت از رانندگی و کار با ماشین‌آلات خودداری کنید.",
    colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  {
    id: "lbl-9",
    code: "Label 9",
    textEn: "Complete the full course of this medication unless directed.",
    textFa: "دوره کامل این دارو را مصرف نمایید مگر اینکه دستور دیگری داده شود.",
    colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    id: "lbl-4",
    code: "Label 4",
    textEn: "Do not drink alcohol while taking this medicine.",
    textFa: "هنگام مصرف این دارو از نوشیدن الکل خودداری فرمایید.",
    colorClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
];

export interface FredLabelState {
  samplePatientCode: string;
  medicationName: string;
  directions: string;
  selectedLabelIds: string[];
  pharmacistInitials: string;
  simulatedScriptNo: string;
}

export const DEFAULT_FRED_LABEL_STATE: FredLabelState = {
  samplePatientCode: "TRAINING-PATIENT-01 (ANONYMIZED)",
  medicationName: "Atorvastatin 20mg Tablets",
  directions: "Take ONE tablet daily at bedtime.",
  selectedLabelIds: ["lbl-1"],
  pharmacistInitials: "TRN",
  simulatedScriptNo: "RX-SIM-9921",
};

// -------------------------------------------------------------
// 3. Document Retention Practice Types & Synthetic Data
// -------------------------------------------------------------

export type RetentionBucket = "bucket_a" | "bucket_b" | "bucket_c";

export interface FredRetentionDocument {
  id: string;
  code: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  exerciseBucket: RetentionBucket;
  exerciseNoteFa: string;
  exerciseNoteEn: string;
  contentReviewStatus: "unreviewed";
}

export const FRED_RETENTION_DOCUMENTS: readonly FredRetentionDocument[] = [
  {
    id: "doc-s8-register",
    code: "SIM-REG-801",
    titleFa: "برگه‌های ثبت دفتر داروهای تحت کنترل (S8 Register Pages)",
    titleEn: "S8 Controlled Drug Balance Register Pages",
    descriptionFa: "سوابق ثبت موجودی، ورود و خروج فیزیکی داروهای مخدر و کنترل‌شده S8.",
    descriptionEn: "Daily balance, supply, and receipt audit log of Schedule 8 medications.",
    exerciseBucket: "bucket_a",
    exerciseNoteFa: "کلید این تمرین ساختگی است و هیچ مدت یا قاعدهٔ واقعی نگهداری اسناد را بیان نمی‌کند؛ برای هیچ حوزهٔ قضایی بازبینی نشده است.",
    exerciseNoteEn: "This fictional exercise key does not state any real retention period or rule and has not been reviewed for any jurisdiction.",
    contentReviewStatus: "unreviewed",
  },
  {
    id: "doc-pbs-script",
    code: "SIM-RX-402",
    titleFa: "نسخه‌های اصلی و فرم‌های تکرار PBS (Prescription Records)",
    titleEn: "Standard PBS Prescriptions and Repeat Documents",
    descriptionFa: "فرم‌های نسخ کاغذی و الکترونیکی تحویل داده شده نسخه عمومی و بیمه.",
    descriptionEn: "Dispensed prescription forms and electronic repeats for PBS records.",
    exerciseBucket: "bucket_b",
    exerciseNoteFa: "کلید این تمرین ساختگی است و هیچ مدت یا قاعدهٔ واقعی نگهداری اسناد را بیان نمی‌کند؛ برای هیچ حوزهٔ قضایی بازبینی نشده است.",
    exerciseNoteEn: "This fictional exercise key does not state any real retention period or rule and has not been reviewed for any jurisdiction.",
    contentReviewStatus: "unreviewed",
  },
  {
    id: "doc-temp-log",
    code: "SIM-LOG-004",
    titleFa: "لاگ دمای یخچال دارویی (Fridge Temperature Log)",
    titleEn: "Dispensary Refrigerator Temperature Daily Log",
    descriptionFa: "گزارش روزانه دماسنج مینیمم/ماکزیمم زنجیره سرد واکسن و داروها.",
    descriptionEn: "Daily min/max temperature monitoring sheet for dispensary cold chain equipment.",
    exerciseBucket: "bucket_c",
    exerciseNoteFa: "کلید این تمرین ساختگی است و هیچ مدت یا قاعدهٔ واقعی نگهداری اسناد را بیان نمی‌کند؛ برای هیچ حوزهٔ قضایی بازبینی نشده است.",
    exerciseNoteEn: "This fictional exercise key does not state any real retention period or rule and has not been reviewed for any jurisdiction.",
    contentReviewStatus: "unreviewed",
  },
];

// -------------------------------------------------------------
// 4. Script Visualizer & Practice Layout Types & Synthetic Data
// -------------------------------------------------------------

export type ScriptVisualizerSectionId =
  | "layout_header"
  | "practice_zone_a"
  | "practice_zone_b"
  | "notice_footer";

export interface ScriptVisualizerSection {
  id: ScriptVisualizerSectionId;
  badgeEn: string;
  badgeFa: string;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  layoutTipEn: string;
  layoutTipFa: string;
}

export interface SyntheticVisualizerScript {
  id: string;
  layoutNameEn: string;
  layoutNameFa: string;
  layoutBadge: string;
  layoutBadgeEn: string;
  layoutBadgeFa: string;
  placeholderItem: string;
  placeholderItemEn: string;
  placeholderItemFa: string;
  illustrativeValue: string;
  illustrativeValueEn: string;
  illustrativeValueFa: string;
  instructionNoticeEn: string;
  instructionNoticeFa: string;
  footerNoticeEn: string;
  footerNoticeFa: string;
  contentReviewStatus: "unreviewed";
}

export const FRED_VISUALIZER_SECTIONS: readonly ScriptVisualizerSection[] = [
  {
    id: "layout_header",
    badgeEn: "Header Area",
    badgeFa: "سربرگ فرم",
    titleEn: "Practice Form Header Area",
    titleFa: "ناحیه سربرگ فرم تمرینی",
    descriptionEn: "Illustrative layout header placeholder. Not a real prescription or medical document.",
    descriptionFa: "جایگاه سربرگ تمرینی صرفاً جهت نمایش ساختار بصری؛ فاقد هرگونه کارکرد نسخه واقعی.",
    layoutTipEn: "Visual layout aid for practice navigation only.",
    layoutTipFa: "راهنمای بصری جهت تمرین کار با رابط کاربری.",
  },
  {
    id: "practice_zone_a",
    badgeEn: "Practice Zone A",
    badgeFa: "ناحیه تمرینی ۱",
    titleEn: "Practice Zone A (Placeholder Content)",
    titleFa: "ناحیه تمرینی ۱ (محتوای فرضی)",
    descriptionEn: "Displays illustrative placeholder text 'Training item'. No medication, dose, or clinical instructions.",
    descriptionFa: "نمایش متن فرضی تمرینی؛ فاقد هرگونه نام دارو، دوز یا دستور بالینی.",
    layoutTipEn: "Illustrative placeholder only.",
    layoutTipFa: "صرفاً جایگاه نمایشی فرضی.",
  },
  {
    id: "practice_zone_b",
    badgeEn: "Practice Zone B",
    badgeFa: "ناحیه تمرینی ۲",
    titleEn: "Practice Zone B (Illustrative Text)",
    titleFa: "ناحیه تمرینی ۲ (متن فرضی)",
    descriptionEn: "Displays placeholder 'Illustrative value only' and 'No use instructions'. Not usable for dispensing.",
    descriptionFa: "نمایش عبارات فرضی 'Illustrative value only' و 'No use instructions'؛ غیرقابل استفاده برای نسخه‌پیچی.",
    layoutTipEn: "Illustrative layout marker only.",
    layoutTipFa: "صرفاً نشانهٔ چیدمان فرضی.",
  },
  {
    id: "notice_footer",
    badgeEn: "Notice Footer",
    badgeFa: "پاورقی هشداری",
    titleEn: "Non-Operational Practice Notice",
    titleFa: "یادداشت عدم عملیاتی بودن",
    descriptionEn: "Static reminder that this layout is for UI practice only, not a prescription, with no dispensing validity.",
    descriptionFa: "یادآوری ثابت که این چیدمان صرفاً تمرین رابط کاربری است و هیچ‌گونه اعتبار نسخه‌پیچی ندارد.",
    layoutTipEn: "Non-operational training notice.",
    layoutTipFa: "یادداشت آموزشی غیرعملیاتی.",
  },
];

export const SYNTHETIC_VISUALIZER_SCRIPTS: readonly SyntheticVisualizerScript[] = [
  {
    id: "layout-a",
    layoutNameEn: "Fictional Practice Layout A",
    layoutNameFa: "چیدمان تمرینی ساختگی الف",
    layoutBadge: "Layout A",
    layoutBadgeEn: "Layout A",
    layoutBadgeFa: "چیدمان الف",
    placeholderItem: "Training item A",
    placeholderItemEn: "Training item A",
    placeholderItemFa: "آیتم تمرینی الف",
    illustrativeValue: "Illustrative value only",
    illustrativeValueEn: "Illustrative value only",
    illustrativeValueFa: "صرفاً مقدار نمایشی",
    instructionNoticeEn: "No use instructions — Not a real prescription",
    instructionNoticeFa: "فاقد دستور مصرف — نسخه واقعی نیست",
    footerNoticeEn: "Fictional layout for interface practice only. Not valid for dispensing or claiming.",
    footerNoticeFa: "چیدمان ساختگی صرفاً برای تمرین رابط کاربری. فاقد هرگونه اعتبار تحویل یا ادعا.",
    contentReviewStatus: "unreviewed",
  },
  {
    id: "layout-b",
    layoutNameEn: "Fictional Practice Layout B",
    layoutNameFa: "چیدمان تمرینی ساختگی ب",
    layoutBadge: "Layout B",
    layoutBadgeEn: "Layout B",
    layoutBadgeFa: "چیدمان ب",
    placeholderItem: "Training item B",
    placeholderItemEn: "Training item B",
    placeholderItemFa: "آیتم تمرینی ب",
    illustrativeValue: "Illustrative value only",
    illustrativeValueEn: "Illustrative value only",
    illustrativeValueFa: "صرفاً مقدار نمایشی",
    instructionNoticeEn: "No use instructions — Not a real prescription",
    instructionNoticeFa: "فاقد دستور مصرف — نسخه واقعی نیست",
    footerNoticeEn: "Fictional layout for interface practice only. Not valid for dispensing or claiming.",
    footerNoticeFa: "چیدمان ساختگی صرفاً برای تمرین رابط کاربری. فاقد هرگونه اعتبار تحویل یا ادعا.",
    contentReviewStatus: "unreviewed",
  },
];

// -------------------------------------------------------------
// 5. Educational Terminal Types & Whitelisted Pure Helpers
// -------------------------------------------------------------

export type EducationalTerminalCommandName =
  | "HELP"
  | "OPEN A"
  | "OPEN B"
  | "STATUS"
  | "CLEAR"
  | "RESET";

export interface EducationalTerminalChip {
  command: EducationalTerminalCommandName;
  labelEn: string;
  labelFa: string;
  descriptionEn: string;
  descriptionFa: string;
}

export const EDUCATIONAL_TERMINAL_CHIPS: readonly EducationalTerminalChip[] = [
  {
    command: "HELP",
    labelEn: "HELP",
    labelFa: "راهنما (HELP)",
    descriptionEn: "Display available practice commands.",
    descriptionFa: "نمایش فهرست فرمان‌های تمرینی مجاز.",
  },
  {
    command: "OPEN A",
    labelEn: "OPEN A",
    labelFa: "باز کردن الف (OPEN A)",
    descriptionEn: "Load fictional Training Entry A.",
    descriptionFa: "بارگذاری آیتم تمرینی ساختگی الف.",
  },
  {
    command: "OPEN B",
    labelEn: "OPEN B",
    labelFa: "باز کردن ب (OPEN B)",
    descriptionEn: "Load fictional Training Entry B.",
    descriptionFa: "بارگذاری آیتم تمرینی ساختگی ب.",
  },
  {
    command: "STATUS",
    labelEn: "STATUS",
    labelFa: "وضعیت (STATUS)",
    descriptionEn: "Show in-memory session status.",
    descriptionFa: "نمایش وضعیت جلسه حافظه‌ای تمرین.",
  },
  {
    command: "CLEAR",
    labelEn: "CLEAR",
    labelFa: "پاکسازی (CLEAR)",
    descriptionEn: "Clear console output history.",
    descriptionFa: "پاکسازی تاریخچهٔ خروجی کنسول.",
  },
  {
    command: "RESET",
    labelEn: "RESET",
    labelFa: "بازنشانی (RESET)",
    descriptionEn: "Reset terminal session to initial default.",
    descriptionFa: "بازنشانی جلسهٔ ترمینال به حالت اولیه.",
  },
];

export interface EducationalTerminalCardDetail {
  id: "entry_a" | "entry_b";
  titleEn: string;
  titleFa: string;
  badgeEn: string;
  badgeFa: string;
  descriptionEn: string;
  descriptionFa: string;
  sampleNoticeEn: string;
  sampleNoticeFa: string;
}

export interface EducationalTerminalLogEntry {
  id: string;
  timestamp: string;
  type: "command" | "output" | "error" | "card" | "system";
  commandText?: string;
  textEn: string;
  textFa: string;
  cardDetail?: EducationalTerminalCardDetail;
}

export interface EducationalTerminalState {
  history: EducationalTerminalLogEntry[];
  selectedEntryId: "entry_a" | "entry_b" | null;
  executedCount: number;
  logSequence: number;
}

export const INITIAL_EDUCATIONAL_TERMINAL_STATE: EducationalTerminalState = {
  history: [],
  selectedEntryId: null,
  executedCount: 0,
  logSequence: 0,
};

export const TERMINAL_INPUT_MAX_LENGTH = 120;
export const TERMINAL_HISTORY_MAX_LENGTH = 100;

export interface ExecuteEducationalTerminalOptions {
  timestamp?: string;
}

export function executeEducationalTerminalCommand(
  rawInput: string,
  currentState: EducationalTerminalState,
  options?: ExecuteEducationalTerminalOptions
): {
  nextState: EducationalTerminalState;
  actionTaken: "cleared" | "executed" | "error" | "empty";
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      nextState: currentState,
      actionTaken: "empty",
    };
  }

  const timestamp = options?.timestamp ?? "12:00:00";
  const seq = (currentState.logSequence ?? currentState.executedCount) + 1;
  const logId = (type: string, subSeq: number) => `term-seq-${seq}-${subSeq}-${type}`;

  const capHistory = (entries: EducationalTerminalLogEntry[]): EducationalTerminalLogEntry[] => {
    if (entries.length <= TERMINAL_HISTORY_MAX_LENGTH) {
      return entries;
    }
    return entries.slice(-TERMINAL_HISTORY_MAX_LENGTH);
  };

  // Enforce maximum input length
  if (trimmed.length > TERMINAL_INPUT_MAX_LENGTH) {
    const errorLog: EducationalTerminalLogEntry = {
      id: logId("cmd", 1),
      timestamp,
      type: "command",
      commandText: "[Exceeded max length]",
      textEn: `> [Command exceeded maximum length of ${TERMINAL_INPUT_MAX_LENGTH} characters]`,
      textFa: `> [فرمان بیش از حد مجاز ${TERMINAL_INPUT_MAX_LENGTH} نویسه است]`,
    };

    const errorEntry: EducationalTerminalLogEntry = {
      id: logId("err", 2),
      timestamp,
      type: "error",
      textEn: `Command input too long (maximum ${TERMINAL_INPUT_MAX_LENGTH} characters).`,
      textFa: `فرمان ورودی بیش از حد طولانی است (حداکثر ${TERMINAL_INPUT_MAX_LENGTH} نویسه).`,
    };

    return {
      nextState: {
        ...currentState,
        history: capHistory([...currentState.history, errorLog, errorEntry]),
        executedCount: currentState.executedCount + 1,
        logSequence: seq,
      },
      actionTaken: "error",
    };
  }

  // Normalize spaces and uppercase for command matching
  const normalized = trimmed.toUpperCase().replace(/\s+/g, " ");

  const commandLog: EducationalTerminalLogEntry = {
    id: logId("cmd", 1),
    timestamp,
    type: "command",
    commandText: trimmed,
    textEn: `> ${trimmed}`,
    textFa: `> ${trimmed}`,
  };

  if (normalized === "CLEAR") {
    return {
      nextState: {
        ...currentState,
        history: [],
        executedCount: currentState.executedCount + 1,
        logSequence: seq,
      },
      actionTaken: "cleared",
    };
  }

  if (normalized === "RESET") {
    const resetEntry: EducationalTerminalLogEntry = {
      id: logId("sys", 2),
      timestamp,
      type: "system",
      textEn: "Terminal session reset to initial state. Active entry cleared and command counter reset to 0.",
      textFa: "جلسه ترمینال به حالت اولیه بازنشانی شد. آیتم فعال پاک شد و شمارندهٔ فرامین به ۰ بازگشت.",
    };
    return {
      nextState: {
        history: capHistory([commandLog, resetEntry]),
        selectedEntryId: null,
        executedCount: 0,
        logSequence: seq,
      },
      actionTaken: "executed",
    };
  }

  if (normalized === "HELP") {
    const helpEntry: EducationalTerminalLogEntry = {
      id: logId("out", 2),
      timestamp,
      type: "output",
      textEn:
        "Available whitelisted commands:\n" +
        "• HELP    - Display this help message\n" +
        "• OPEN A  - Load fictional Training Entry A\n" +
        "• OPEN B  - Load fictional Training Entry B\n" +
        "• STATUS  - Show local memory session state\n" +
        "• CLEAR   - Clear terminal log output\n" +
        "• RESET   - Reset session to initial defaults",
      textFa:
        "فرمان‌های مجاز در این ترمینال تمرینی:\n" +
        "• HELP    - نمایش همین راهنما\n" +
        "• OPEN A  - بارگذاری آیتم تمرینی ساختگی الف\n" +
        "• OPEN B  - بارگذاری آیتم تمرینی ساختگی ب\n" +
        "• STATUS  - نمایش وضعیت جلسهٔ محلی در حافظه\n" +
        "• CLEAR   - پاک‌سازی گزارش خروجی ترمینال\n" +
        "• RESET   - بازنشانی جلسه به مقادیر اولیه",
    };
    return {
      nextState: {
        ...currentState,
        history: capHistory([...currentState.history, commandLog, helpEntry]),
        executedCount: currentState.executedCount + 1,
        logSequence: seq,
      },
      actionTaken: "executed",
    };
  }

  if (normalized === "OPEN A") {
    const cardEntry: EducationalTerminalLogEntry = {
      id: logId("card", 2),
      timestamp,
      type: "card",
      textEn: "Fictional practice card 'Training entry A' opened.",
      textFa: "کارت تمرینی ساختگی «آیتم تمرینی الف» باز شد.",
      cardDetail: {
        id: "entry_a",
        titleEn: "Training entry A",
        titleFa: "آیتم تمرینی الف",
        badgeEn: "Entry A",
        badgeFa: "آیتم الف",
        descriptionEn: "Illustrative sample only — not a real prescription or record.",
        descriptionFa: "نمایش صرفاً نمونه، هیچ نسخه یا رکورد واقعی نیست.",
        sampleNoticeEn: "No medical, dispensing, or patient data.",
        sampleNoticeFa: "فاقد اطلاعات پزشکی، دارویی یا هویتی بیمار.",
      },
    };
    return {
      nextState: {
        ...currentState,
        history: capHistory([...currentState.history, commandLog, cardEntry]),
        selectedEntryId: "entry_a",
        executedCount: currentState.executedCount + 1,
        logSequence: seq,
      },
      actionTaken: "executed",
    };
  }

  if (normalized === "OPEN B") {
    const cardEntry: EducationalTerminalLogEntry = {
      id: logId("card", 2),
      timestamp,
      type: "card",
      textEn: "Fictional practice card 'Training entry B' opened.",
      textFa: "کارت تمرینی ساختگی «آیتم تمرینی ب» باز شد.",
      cardDetail: {
        id: "entry_b",
        titleEn: "Training entry B",
        titleFa: "آیتم تمرینی ب",
        badgeEn: "Entry B",
        badgeFa: "آیتم ب",
        descriptionEn: "Illustrative sample only — not a real prescription or record.",
        descriptionFa: "نمایش صرفاً نمونه، هیچ نسخه یا رکورد واقعی نیست.",
        sampleNoticeEn: "No medical, dispensing, or patient data.",
        sampleNoticeFa: "فاقد اطلاعات پزشکی، دارویی یا هویتی بیمار.",
      },
    };
    return {
      nextState: {
        ...currentState,
        history: capHistory([...currentState.history, commandLog, cardEntry]),
        selectedEntryId: "entry_b",
        executedCount: currentState.executedCount + 1,
        logSequence: seq,
      },
      actionTaken: "executed",
    };
  }

  if (normalized === "STATUS") {
    const activeLabelEn = currentState.selectedEntryId
      ? (currentState.selectedEntryId === "entry_a" ? "Training entry A" : "Training entry B")
      : "None";
    const activeLabelFa = currentState.selectedEntryId
      ? (currentState.selectedEntryId === "entry_a" ? "آیتم تمرینی الف" : "آیتم تمرینی ب")
      : "هیچ‌کدام";

    const nextExecutedCount = currentState.executedCount + 1;

    const statusEntry: EducationalTerminalLogEntry = {
      id: logId("out", 2),
      timestamp,
      type: "output",
      textEn:
        `Session Status: Active (In-Memory Only)\n` +
        `Selected Entry: ${activeLabelEn}\n` +
        `Commands Executed: ${nextExecutedCount}\n` +
        `Persistence: Disabled (State resets on page reload or RESET)`,
      textFa:
        `وضعیت جلسه: فعال (صرفاً در حافظه موقت)\n` +
        `آیتم انتخابی: ${activeLabelFa}\n` +
        `تعداد فرامین اجراشده: ${nextExecutedCount}\n` +
        `ذخیره‌سازی: غیرفعال (حالت با بارگذاری مجدد یا RESET بازنشانی می‌شود)`,
    };
    return {
      nextState: {
        ...currentState,
        history: capHistory([...currentState.history, commandLog, statusEntry]),
        executedCount: nextExecutedCount,
        logSequence: seq,
      },
      actionTaken: "executed",
    };
  }

  // Unknown command
  const errorEntry: EducationalTerminalLogEntry = {
    id: logId("err", 2),
    timestamp,
    type: "error",
    textEn: `Unrecognized command: '${trimmed}'. Type HELP for available commands.`,
    textFa: `فرمان ناشناخته: «${trimmed}». برای مشاهده فهرست فرمان‌ها HELP را وارد کنید.`,
  };
  return {
    nextState: {
      ...currentState,
      history: capHistory([...currentState.history, commandLog, errorEntry]),
      executedCount: currentState.executedCount + 1,
      logSequence: seq,
    },
    actionTaken: "error",
  };
}

// -------------------------------------------------------------
// 7. Final Review Preview Practice Types & Synthetic Data
// -------------------------------------------------------------

export type FinalReviewPracticeId = "review_a" | "review_b";

export interface FinalReviewPracticeEntry {
  id: FinalReviewPracticeId;
  titleEn: string;
  titleFa: string;
  badgeEn: string;
  badgeFa: string;
  descriptionEn: string;
  descriptionFa: string;
  zonePreviewEn: string;
  zonePreviewFa: string;
  watermarkEn: string;
  watermarkFa: string;
  contentReviewStatus: "unreviewed";
}

export const FINAL_REVIEW_WATERMARK_EN = "TRAINING ONLY — NOT A HANDOUT";
export const FINAL_REVIEW_WATERMARK_FA = "فقط تمرین — برگه واقعی نیست";

export const FINAL_REVIEW_CONFIRMATION_EN = "Practice preview opened; no handout or dispensing occurred";
export const FINAL_REVIEW_CONFIRMATION_FA = "پیش‌نمایش تمرینی باز شد؛ هیچ تحویل یا dispensing انجام نشد";

export const FINAL_REVIEW_ENTRIES: readonly FinalReviewPracticeEntry[] = [
  {
    id: "review_a",
    titleEn: "Training A",
    titleFa: "تمرین A",
    badgeEn: "Form Layout A",
    badgeFa: "چیدمان فرم A",
    descriptionEn: "Illustrative practice form preview (Layout A) with synthetic placeholder zones.",
    descriptionFa: "پیش‌نمایش فرم تمرینی نمونه (چیدمان A) با نواحی ساختگی جای‌نگهدار.",
    zonePreviewEn: "Zone 1: Practice Header Area\nZone 2: Synthetic Content Block\nZone 3: Illustrative Footer",
    zonePreviewFa: "ناحیه ۱: سربرگ تمرینی\nناحیه ۲: بلوک محتوای ساختگی\nناحیه ۳: پاورقی نمایشی",
    watermarkEn: FINAL_REVIEW_WATERMARK_EN,
    watermarkFa: FINAL_REVIEW_WATERMARK_FA,
    contentReviewStatus: "unreviewed",
  },
  {
    id: "review_b",
    titleEn: "Training B",
    titleFa: "تمرین B",
    badgeEn: "Form Layout B",
    badgeFa: "چیدمان فرم B",
    descriptionEn: "Illustrative practice form preview (Layout B) with alternating placeholder zones.",
    descriptionFa: "پیش‌نمایش فرم تمرینی نمونه (چیدمان B) با نواحی متناوب جای‌نگهدار.",
    zonePreviewEn: "Zone 1: Practice Alternative Header\nZone 2: Synthetic Outline Block\nZone 3: Educational Notice Area",
    zonePreviewFa: "ناحیه ۱: سربرگ تمرینی متناوب\nناحیه ۲: بلوک طرح‌واره ساختگی\nناحیه ۳: ناحیه هشدار آموزشی",
    watermarkEn: FINAL_REVIEW_WATERMARK_EN,
    watermarkFa: FINAL_REVIEW_WATERMARK_FA,
    contentReviewStatus: "unreviewed",
  },
];

export interface FinalReviewChecklistCriterion {
  id: "legibility" | "notice_visible" | "no_real_data";
  labelEn: string;
  labelFa: string;
  descriptionEn: string;
  descriptionFa: string;
}

export const FINAL_REVIEW_CHECKLIST_CRITERIA: readonly FinalReviewChecklistCriterion[] = [
  {
    id: "legibility",
    labelEn: "Layout legibility verified for training purposes",
    labelFa: "بررسی خوانایی چیدمان برای اهداف تمرینی",
    descriptionEn: "Confirm that placeholder zones and structure are legible.",
    descriptionFa: "تأیید این‌که ساختار و نواحی جای‌نگهدار خوانا هستند.",
  },
  {
    id: "notice_visible",
    labelEn: "Training notice and watermark clearly visible",
    labelFa: "دیده شدن شفاف هشدار تمرینی و واترمارک",
    descriptionEn: "Confirm that the training watermark is prominently displayed.",
    descriptionFa: "تأیید این‌که واترمارک تمرینی به‌صورت واضح و برجسته نمایان است.",
  },
  {
    id: "no_real_data",
    labelEn: "Absence of real patient, prescription, or clinical data verified",
    labelFa: "اطمینان از نبود هرگونه اطلاعات واقعی بیمار، نسخه یا بالینی",
    descriptionEn: "Confirm that no real names, identifiers, or clinical values exist.",
    descriptionFa: "تأیید این‌که هیچ نام، شناسه یا مقدار بالینی واقعی وجود ندارد.",
  },
];

export interface FinalReviewPracticeState {
  selectedEntryId: FinalReviewPracticeId | null;
  checklist: {
    legibility: boolean;
    notice_visible: boolean;
    no_real_data: boolean;
  };
  previewOpen: boolean;
}

export const INITIAL_FINAL_REVIEW_STATE: FinalReviewPracticeState = {
  selectedEntryId: null,
  checklist: {
    legibility: false,
    notice_visible: false,
    no_real_data: false,
  },
  previewOpen: false,
};

export function canOpenFinalReviewPreview(
  selectedEntryId: FinalReviewPracticeId | null,
  checklist: { legibility: boolean; notice_visible: boolean; no_real_data: boolean }
): boolean {
  if (!selectedEntryId) return false;
  return Boolean(checklist.legibility && checklist.notice_visible && checklist.no_real_data);
}

// -------------------------------------------------------------
// Shared Watermark for Non-operational Actions
// -------------------------------------------------------------

export const FRED_ACTION_WATERMARK_EN = "TRAINING ONLY — NO REAL-WORLD ACTION";
export const FRED_ACTION_WATERMARK_FA = "فقط تمرین — هیچ اقدام واقعی انجام نمی‌شود";

// -------------------------------------------------------------
// 8. ODT Session Practice Types & Synthetic Data
// -------------------------------------------------------------

export type OdtSessionPracticeId = "odt_a" | "odt_b";
export type OdtSessionFormat = "format_a" | "format_b";

export interface OdtSessionPracticeEntry {
  id: OdtSessionPracticeId;
  titleEn: string;
  titleFa: string;
  badgeEn: string;
  badgeFa: string;
  descriptionEn: string;
  descriptionFa: string;
  placeholderSessionRefEn: string;
  placeholderSessionRefFa: string;
  placeholderPatternEn: string;
  placeholderPatternFa: string;
  watermarkEn: string;
  watermarkFa: string;
  contentReviewStatus: "unreviewed";
}

export const ODT_SESSION_ENTRIES: readonly OdtSessionPracticeEntry[] = [
  {
    id: "odt_a",
    titleEn: "Training A",
    titleFa: "تمرین A",
    badgeEn: "Pattern A",
    badgeFa: "الگوی A",
    descriptionEn: "Fictional session recording exercise (Training A) with synthetic placeholder layout.",
    descriptionFa: "تمرین ثبت رویداد ساختگی (تمرین A) با چیدمان و جای‌نگهدار نمایشی.",
    placeholderSessionRefEn: "REF-TRAIN-ALPHA-01",
    placeholderSessionRefFa: "شناسه فرضی: REF-TRAIN-ALPHA-01",
    placeholderPatternEn: "Layout: Fictional layout format (Structure A)",
    placeholderPatternFa: "چیدمان: ساختار نمایشی فرضی (ساختار الف)",
    watermarkEn: FRED_ACTION_WATERMARK_EN,
    watermarkFa: FRED_ACTION_WATERMARK_FA,
    contentReviewStatus: "unreviewed",
  },
  {
    id: "odt_b",
    titleEn: "Training B",
    titleFa: "تمرین B",
    badgeEn: "Pattern B",
    badgeFa: "الگوی B",
    descriptionEn: "Fictional session recording exercise (Training B) with alternating placeholder layout.",
    descriptionFa: "تمرین ثبت رویداد ساختگی (تمرین B) با چیدمان جای‌نگهدار متناوب.",
    placeholderSessionRefEn: "REF-TRAIN-BETA-02",
    placeholderSessionRefFa: "شناسه فرضی: REF-TRAIN-BETA-02",
    placeholderPatternEn: "Layout: Fictional layout format (Structure B)",
    placeholderPatternFa: "چیدمان: ساختار نمایشی فرضی (ساختار ب)",
    watermarkEn: FRED_ACTION_WATERMARK_EN,
    watermarkFa: FRED_ACTION_WATERMARK_FA,
    contentReviewStatus: "unreviewed",
  },
];

export interface OdtSessionChecklistCriterion {
  id: "structure_clarity" | "placeholder_verified" | "no_clinical_data";
  labelEn: string;
  labelFa: string;
  descriptionEn: string;
  descriptionFa: string;
}

export const ODT_SESSION_CHECKLIST_CRITERIA: readonly OdtSessionChecklistCriterion[] = [
  {
    id: "structure_clarity",
    labelEn: "Record layout and structure clarity verified",
    labelFa: "بررسی خوانایی و شفافیت ساختار ثبت تمرینی",
    descriptionEn: "Confirm that log columns and synthetic placeholders are visually legible.",
    descriptionFa: "تأیید وضوح بصری ستون‌ها و فیلدهای ساختگی جای‌نگهدار.",
  },
  {
    id: "placeholder_verified",
    labelEn: "Fictional placeholder completeness confirmed",
    labelFa: "تأیید کامل‌بودن فیلدهای جای‌نگهدار فرضی",
    descriptionEn: "Confirm that all mock fields contain non-operational training placeholders.",
    descriptionFa: "تأیید این‌که تمام فیلدها شامل جای‌نگهدار آموزشی و غیرعملیاتی هستند.",
  },
  {
    id: "no_clinical_data",
    labelEn: "Confirmation of zero patient, medication, or clinical data",
    labelFa: "اطمینان قطعی از نبود اطلاعات بیمار، دارو، دوز یا دادهٔ بالینی",
    descriptionEn: "Ensure no real names, medication identities, quantities, or legal claims are present.",
    descriptionFa: "اطمینان از عدم وجود هرگونه نام، مشخصات دارو، دوز یا ادعای قانونی.",
  },
];

export interface OdtSessionPracticeState {
  selectedEntryId: OdtSessionPracticeId | null;
  selectedFormat: OdtSessionFormat;
  checklist: {
    structure_clarity: boolean;
    placeholder_verified: boolean;
    no_clinical_data: boolean;
  };
  previewOpen: boolean;
}

export const INITIAL_ODT_SESSION_STATE: OdtSessionPracticeState = {
  selectedEntryId: null,
  selectedFormat: "format_a",
  checklist: {
    structure_clarity: false,
    placeholder_verified: false,
    no_clinical_data: false,
  },
  previewOpen: false,
};

export function canOpenOdtSessionPreview(
  selectedEntryId: OdtSessionPracticeId | null,
  checklist: { structure_clarity: boolean; placeholder_verified: boolean; no_clinical_data: boolean }
): boolean {
  if (!selectedEntryId) return false;
  return Boolean(checklist.structure_clarity && checklist.placeholder_verified && checklist.no_clinical_data);
}

export const ODT_SESSION_RESULT_NOTICE_EN =
  "Local practice only; no real-world dosing, official log update, or delivery occurred";
export const ODT_SESSION_RESULT_NOTICE_FA =
  "فقط تمرین محلی بوده و هیچ رخداد، ثبت رسمی یا تحویل دوز واقعی انجام نشده است";

// -------------------------------------------------------------
// 9. PBS/POS Categorization Practice Types & Synthetic Data
// -------------------------------------------------------------

export type PbsPosItemId = "item_1" | "item_2" | "item_3";
export type PbsPosGroupId = "group_a" | "group_b";

export interface PbsPosPracticeItem {
  id: PbsPosItemId;
  titleEn: string;
  titleFa: string;
  badgeEn: string;
  badgeFa: string;
  descriptionEn: string;
  descriptionFa: string;
  placeholderRefEn: string;
  placeholderRefFa: string;
  contentReviewStatus: "unreviewed";
}

export const PBS_POS_PRACTICE_ITEMS: readonly PbsPosPracticeItem[] = [
  {
    id: "item_1",
    titleEn: "Training Item 1",
    titleFa: "آیتم تمرینی ۱",
    badgeEn: "Sample Item 1",
    badgeFa: "آیتم نمونه ۱",
    descriptionEn: "Fictional practice card for local batch categorization exercise 1.",
    descriptionFa: "کارت تمرینی فرضی جهت تمرین دسته‌بندی محلی شماره ۱.",
    placeholderRefEn: "BATCH-REF-001",
    placeholderRefFa: "شناسه تمرینی: BATCH-REF-001",
    contentReviewStatus: "unreviewed",
  },
  {
    id: "item_2",
    titleEn: "Training Item 2",
    titleFa: "آیتم تمرینی ۲",
    badgeEn: "Sample Item 2",
    badgeFa: "آیتم نمونه ۲",
    descriptionEn: "Fictional practice card for local batch categorization exercise 2.",
    descriptionFa: "کارت تمرینی فرضی جهت تمرین دسته‌بندی محلی شماره ۲.",
    placeholderRefEn: "BATCH-REF-002",
    placeholderRefFa: "شناسه تمرینی: BATCH-REF-002",
    contentReviewStatus: "unreviewed",
  },
  {
    id: "item_3",
    titleEn: "Training Item 3",
    titleFa: "آیتم تمرینی ۳",
    badgeEn: "Sample Item 3",
    badgeFa: "آیتم نمونه ۳",
    descriptionEn: "Fictional practice card for local batch categorization exercise 3.",
    descriptionFa: "کارت تمرینی فرضی جهت تمرین دسته‌بندی محلی شماره ۳.",
    placeholderRefEn: "BATCH-REF-003",
    placeholderRefFa: "شناسه تمرینی: BATCH-REF-003",
    contentReviewStatus: "unreviewed",
  },
];

export interface PbsPosPracticeGroup {
  id: PbsPosGroupId;
  titleEn: string;
  titleFa: string;
  badgeEn: string;
  badgeFa: string;
  descriptionEn: string;
  descriptionFa: string;
}

export const PBS_POS_PRACTICE_GROUPS: readonly PbsPosPracticeGroup[] = [
  {
    id: "group_a",
    titleEn: "Training Group A",
    titleFa: "دسته تمرینی الف",
    badgeEn: "Group A",
    badgeFa: "گروه الف",
    descriptionEn: "Local fictional grouping container A for training items.",
    descriptionFa: "ظرف دسته‌بندی فرضی و محلی الف برای آیتم‌های تمرینی.",
  },
  {
    id: "group_b",
    titleEn: "Training Group B",
    titleFa: "دسته تمرینی ب",
    badgeEn: "Group B",
    badgeFa: "گروه ب",
    descriptionEn: "Local fictional grouping container B for training items.",
    descriptionFa: "ظرف دسته‌بندی فرضی و محلی ب برای آیتم‌های تمرینی.",
  },
];

export interface PbsPosPracticeState {
  assignments: Record<PbsPosItemId, PbsPosGroupId | null>;
  previewOpen: boolean;
}

export const INITIAL_PBS_POS_STATE: PbsPosPracticeState = {
  assignments: {
    item_1: null,
    item_2: null,
    item_3: null,
  },
  previewOpen: false,
};

export function canOpenPbsPosPreview(
  assignments: Record<PbsPosItemId, PbsPosGroupId | null>
): boolean {
  return Boolean(assignments.item_1 && assignments.item_2 && assignments.item_3);
}

export const PBS_POS_RESULT_NOTICE_EN =
  "Local practice only; no real-world claim, POS transaction, or archive occurred";
export const PBS_POS_RESULT_NOTICE_FA =
  "فقط تمرین محلی بوده و هیچ رخداد، تراکنش POS یا بایگانی واقعی انجام نشده است";
