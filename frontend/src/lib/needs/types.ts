export interface B { fa: string; en: string }

export type NeedsIconKey =
  | "puzzle" | "listChecks" | "cloudRain" | "users" | "briefcase" | "activity" | "sprout" | "home" | "helpCircle";

export interface NeedsTool {
  id: string;
  route: string;
  title: B;
  desc: B;
}

export interface NeedsDetail { id: string; title: B }

export interface NeedsTopic {
  id: string;
  title: B;
  /** Optional third level that refines the topic. */
  details?: NeedsDetail[];
  /** Method ids from the library, easiest first. */
  methods: string[];
  /** Self-check ids (new lightweight checks) or screener ids (phq9, gad7, who5, burnout). */
  checks: string[];
  /** Existing ARSHNAZ tools. */
  tools: string[];
  /** One topic-specific guiding question. */
  question: B;
  /** Show the fixed safety notice for this topic. */
  sensitive?: boolean;
  /** Words (fa/en) used by the offline matcher for the "I don't know" path. */
  keywords: string[];
}

export interface NeedsCategory {
  id: string;
  icon: NeedsIconKey;
  title: B;
  desc: B;
  /** General guiding questions asked after the user describes the situation. */
  questions: B[];
  topics: NeedsTopic[];
}

export interface MethodDef {
  id: string;
  title: B;
  summary: B;
  minutes: number;
  steps: B[];
}

export interface SelfCheckItem { text: B; reverse?: boolean }
export interface SelfCheckBand { max: number; label: B; message: B; methods: string[] }
export interface SelfCheckDef {
  id: string;
  title: B;
  intro: B;
  /** 0..4 answers; labels shown under the options. */
  scale: "frequency" | "agree";
  higherIsBetter: boolean;
  items: SelfCheckItem[];
  /** Bands by ascending maximum percentage score (0..100). */
  bands: SelfCheckBand[];
  /** When true, the fixed safety notice is shown with the result. */
  sensitive?: boolean;
}

export interface NeedsSuggestion {
  id?: string;
  reason?: string;
  methodId?: string;
  source?: "local" | "ai";
  text: string;
  kind: "task" | "note" | "habit";
}

export interface NeedsResult {
  summary: string;
  causes: string[];
  suggestions: NeedsSuggestion[];
  methodIds: string[];
  reflections: string[];
  checkIds: string[];
  source: "ai" | "local";
}

export type NeedsGoal = "calm" | "clarify" | "step";
export type NeedsCapacity = "low" | "usual";
export type NeedsSuggestionFeedback = "irrelevant" | "no_energy" | "other";
export interface NeedsDecision {
  suggestionId: string;
  feedback: NeedsSuggestionFeedback;
  suggestion: NeedsSuggestion;
  alternative: NeedsSuggestion | null;
  created_at: string;
}

export interface NeedsSession {
  preferences?: { goal?: NeedsGoal | null; capacity?: NeedsCapacity | null };
  /** Original result stays intact; each rejection and local alternative is separate. */
  decisionHistory?: NeedsDecision[];
  id: string;
  user_id?: string;
  category: string;
  topic: string | null;
  detail: string | null;
  text: string;
  qa: Array<{ q: string; a: string }>;
  questions: string[];
  result: NeedsResult | null;
  lang: "fa" | "en";
  created_at: string;
  updated_at: string;
  finished?: boolean;
  converted?: Record<string, { kind: NeedsSuggestion["kind"]; destinationId: string }>;
}
