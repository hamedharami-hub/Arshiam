export type LeitnerCardType =
  | 'clinical_pearl'
  | 'mcq'
  | 'triage_redflag'
  | 'calculation'
  | 'cal_warning'
  | 'interaction'
  | 'conversation'
  | 'triage_wwham'
  | 'scheduling_legal'
  | 'matrix_comparison'
  | 'custom';

export interface McqOption {
  id: string;
  text: { fa: string; en: string };
  isCorrect: boolean;
  explanation?: { fa: string; en: string };
}

export interface KnowledgeTreeItem {
  domain: { fa: string; en: string };         // Level 1: حوزه اصلی (e.g. Clinical Pharmacy, Australian Pharmacy Law, OTC Triage, FRED Dispense)
  system: { fa: string; en: string };         // Level 2: سیستم یا فصل کلان (e.g. Cardiovascular System, Schedule 8 & PBS, Respiratory)
  subsystem?: { fa: string; en: string };      // Level 3: رده درمانی / وضعیت بیماری (e.g. Antihypertensives & Heart Failure, Asthma Management)
  condition?: { fa: string; en: string };      // Level 3 alias: وضعیت بالینی / رده کلان
  subClass?: { fa: string; en: string };       // Level 4 (جدید): زیررده دارویی / گروه مولکولی (e.g. RAAS Inhibitors: ACEi vs ARB, ICS + Formoterol)
  drugGroup?: { fa: string; en: string };      // Level 4 alias
  microTopic?: { fa: string; en: string };    // Level 5 (جدید): مفهوم دقیق / تله آزمون (e.g. Bradykinin Cough Mechanism, S8 Safe Custody Rules)
  clinicalAspect?: { fa: string; en: string };// Level 5 alias
  path: {
    fa: string[]; // ['داروسازی بالینی', 'قلب و عروق', 'داروهای فشار خون', 'مهارکننده‌های رنین-آنژیوتانسین', 'عوارض برادی‌کینین و سرفه']
    en: string[]; // ['Clinical Pharmacy', 'Cardiovascular', 'Antihypertensives', 'RAAS Inhibitors', 'Bradykinin Cough Mechanism']
  };
}

export interface LeitnerCard {
  id: string;
  userId: string;
  module: 1 | 2 | 3 | 4 | 5 | 6;
  moduleName: { fa: string; en: string };
  category: string;
  topic: string;
  question: { fa: string; en: string };
  answer: { fa: string; en: string };
  pearl?: { fa?: string; en?: string };
  type: LeitnerCardType;
  box: 1 | 2 | 3 | 4 | 5;
  nextReviewDate: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)
  lastReviewedDate?: string;
  lastReviewed?: string;
  reviewCount: number;
  successCount: number;
  consecutiveCorrect?: number;
  history?: Array<{
    date: string;
    result: 'correct' | 'incorrect';
    rating?: string;
    boxFrom?: number;
    boxTo?: number;
  }>;
  tags: string[];
  knowledgeTree?: KnowledgeTreeItem;
  sourceSnippet?: string;
  customUserNote?: string;
  createdAt: string;
  // Specialized card extensions
  mcqOptions?: McqOption[];
  distractorRationale?: { fa: string; en: string };
  calculationFormula?: { fa: string; en: string };
  calLabels?: string[];
  triageOutcome?: 'supply_otc' | 'urgent_referral' | 'gp_referral';
  easeFactor?: number; // SM-2 Ease Factor (default 2.5)
  intervalDays?: number;
  // FSRS (Free Spaced Repetition Scheduler) extensions
  fsrsStability?: number;    // S (in days)
  fsrsDifficulty?: number;   // D (1.0 to 10.0)
  fsrsLapses?: number;       // Number of times forgotten
  fsrsReps?: number;         // Total review repetitions
  isStarred?: boolean;       // ⭐ User Starred / Bookmarked status
}

export interface CandidateCard {
  id: string;
  module?: 1 | 2 | 3 | 4 | 5 | 6;
  question: { fa: string; en: string };
  answer: { fa: string; en: string };
  pearl?: { fa?: string; en?: string };
  type: LeitnerCardType;
  category: string;
  topic: string;
  tags: string[];
  knowledgeTree?: KnowledgeTreeItem;
  sourceSnippet?: string;
  selected?: boolean;
  mcqOptions?: McqOption[];
  distractorRationale?: { fa: string; en: string };
  calculationFormula?: { fa: string; en: string };
  calLabels?: string[];
  triageOutcome?: 'supply_otc' | 'urgent_referral' | 'gp_referral';
}

export type FlashcardGenerationMode =
  | 'auto'
  | 'mcq'
  | 'triage_redflag'
  | 'calculation'
  | 'cal_warning'
  | 'interaction';

export interface GenerateCardsRequest {
  selectedText: string;
  module: 1 | 2 | 3 | 4;
  category?: string;
  topic?: string;
  customPrompt?: string;
  language?: 'fa' | 'en';
  generationMode?: FlashcardGenerationMode;
}

// Leitner review intervals in days
export const LEITNER_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,  // Box 1: 1 day
  2: 3,  // Box 2: 3 days
  3: 7,  // Box 3: 7 days
  4: 14, // Box 4: 14 days
  5: 30, // Box 5: 30 days (Mastered)
};

export const LEITNER_BOX_NAMES: Record<1 | 2 | 3 | 4 | 5, { fa: string; en: string; color: string }> = {
  1: { fa: 'جعبه ۱ (مرور فردا - روزانه)', en: 'Box 1 (Daily Review)', color: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
  2: { fa: 'جعبه ۲ (مرور ۳ روز بعد)', en: 'Box 2 (3-Day Interval)', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  3: { fa: 'جعبه ۳ (مرور ۱ هفته بعد)', en: 'Box 3 (1-Week Interval)', color: 'border-sky-500/40 text-sky-300 bg-sky-500/10' },
  4: { fa: 'جعبه ۴ (مرور ۲ هفته بعد)', en: 'Box 4 (2-Week Interval)', color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' },
  5: { fa: 'جعبه ۵ (تسلط کامل - ۱ ماه)', en: 'Box 5 (Mastered - 30 Days)', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
};

