export type ConversationMode = 'MODE_A_ADMIN' | 'MODE_B_SLANG' | 'MODE_C_CONFLICT';

export interface Scenario {
  id: string;
  mode?: ConversationMode;
  title: { fa: string; en: string };
  category: { fa: string; en: string };
  patientProfile: {
    name: string;
    age: number;
    gender: string;
    presentation: { fa: string; en: string };
    medicalHistory?: string[];
    currentMedications?: string[];
    allergies?: string[];
  };
  redFlags: { fa: string; en: string }[];
  whatQuestions: {
    key: 'W' | 'H' | 'A' | 'T';
    label: { fa: string; en: string };
    question: { fa: string; en: string };
    answer: { fa: string; en: string };
  }[];
  dialogueOptions: {
    id: string;
    text: { fa: string; en: string };
    patientReply: { fa: string; en: string };
    isRedFlagDetector?: boolean;
    isCorrectAdvice?: boolean;
  }[];
  clinicalOutcome: {
    requiresReferral: boolean;
    recommendation: { fa: string; en: string };
    explanation: { fa: string; en: string };
    referralLetterTemplate?: {
      to: string;
      reason: string;
      symptomSummary: string;
      currentMeds: string;
      suggestedAction: string;
    };
  };
  aussieContext?: {
    fa: string;
    en: string;
    keyPhrases?: { phrase: string; meaningFa: string; meaningEn: string }[];
    adminRule?: { fa: string; en: string };
  };
}

export type WwhamQuestion = Scenario['whatQuestions'][number];
export type DialogueOption = Scenario['dialogueOptions'][number];
