export type Language = 'fa' | 'en';
export type VisualTheme = 'day' | 'night' | 'reader-day' | 'reader-night';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type DisplayMode = 'both' | 'text';
export type FlagColor = 'red' | 'yellow' | 'green' | 'blue' | null;

export type StudyMode = 'accordion' | 'speed' | 'flagged';
export type LayoutMode = 'window-grid' | 'list' | 'split';

export type MainModuleId = 1 | 2 | 3 | 4 | 5 | 6;
export type ModuleId = 'software' | 'cyp_matrix' | 'ALL' | 'mod1' | 'mod2' | 'mod3' | 'mod4' | 'mod5' | 'mod6';

export type AiProvider = 'gemini' | 'groq' | 'xai';

export interface AiModelOption {
  id: string;
  name: string;
  provider: AiProvider;
  description: {
    fa: string;
    en: string;
  };
  isDefault?: boolean;
  badge?: string;
}

export interface UserAiConfig {
  preferredProvider: AiProvider;
  geminiApiKey: string;
  groqApiKey: string;
  xaiApiKey?: string;
  flashcardModel: string;
  tutorModel: string;
  temperature: number;
  customModels: AiModelOption[];
}

export interface LocalizedText {
  fa: string;
  en: string;
}

export interface PharmacyCard {
  id: string;
  module: 'mod1' | 'mod2' | 'mod3' | 'mod4' | 'mod5' | 'mod6';
  category: LocalizedText;
  categoryColor: 'sky' | 'amber' | 'teal' | 'rose' | 'purple' | 'emerald' | 'indigo';
  icon: string; // Lucide icon name
  title: LocalizedText;
  actionPearl: LocalizedText;
  detailsHtml: LocalizedText;
}

export interface QuizOption {
  id: string;
  text: LocalizedText;
}

export interface QuizQuestion {
  id: string;
  moduleId: 'mod1' | 'mod2' | 'mod3' | 'mod4' | 'mod5' | 'mod6';
  question: LocalizedText;
  options: QuizOption[];
  correctOptionId: string;
  explanation: LocalizedText;
}

export interface CustomCardEdit {
  title?: string;
  pearl?: string;
  summary?: string;
}

export interface UserProgress {
  flags: Record<string, FlagColor>;
  deleted: string[];
  customEdits: Record<string, CustomCardEdit>;
  reviewedCards: Record<string, boolean>;
  quizScores: Record<string, { total: number; correct: number }>;
  savedNotes?: Record<string, string[]>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export type { DiseaseInfo } from '@/data/diseasesRegistry';

