import type { Distortion } from "@/lib/distortions";

export type ProvenanceType = "user_report" | "deterministic_calculation" | "ai_suggestion";

export interface ProvenanceField<T = any> {
  value: T;
  provenance: ProvenanceType;
  sourceTimestamp?: string;
  sourceTool?: string;
  verified?: boolean; // explicitly confirmed or accepted by user
}

export type MindAIOperation =
  | "cbt_analysis"
  | "socratic_dialogue"
  | "socratic_summary"
  | "worry_brainstorm"
  | "weekly_insight";

export interface DeterministicScore {
  tool: string;
  scoreName: string;
  rawScore: number | null;
  scaleRange: [number, number];
  interpretation: string;
  scoringVersion: string;
  isStandardized: boolean;
  provenance: "deterministic_calculation";
}

export interface MindAIContext {
  operation: MindAIOperation;
  promptVersion: string;
  language: "fa" | "en";
  userGoal?: string;
  currentRecord: {
    tool: string;
    timestamp: string;
    fields: Record<string, ProvenanceField>;
  };
  missingFields: string[];
  deterministicScores?: DeterministicScore[];
  relevantHistory?: Array<{
    tool: string;
    timestamp: string;
    summary: string;
    provenance: ProvenanceType;
  }>;
  disclaimer: string;
}

// Structured Output Schemas

export interface CbtAnalysisOutput {
  summary: string;
  observations: Array<{
    field: "situation" | "automatic_thought" | "evidence_for" | "evidence_against";
    quoteOrReference: string;
    observation: string;
  }>;
  possible_patterns: Array<{
    distortionKey: Distortion;
    confidenceExplanation: string;
    referencedText: string;
  }>;
  alternative_perspective: string | null;
  missing_information: string[];
  suggested_next_step: string | null;
}

export interface SocraticDialogueOutput {
  question: string;
  observationOrEmpathy?: string;
  focusArea: "evidence" | "perspective" | "value" | "action" | "clarification";
}

export interface SocraticSummaryOutput {
  key_insights: string[];
  potential_next_step: string | null;
  user_agency_note: string;
}

export interface WorryBrainstormOutput {
  control_level_recognized: "actionable" | "partial" | "uncontrollable" | "uncertain";
  clarifying_question?: string | null;
  suggested_options: Array<{
    id: string;
    title: string;
    isWithinUserControl: boolean;
    estimatedEffort?: "low" | "medium" | "high";
  }>;
  acceptance_note?: string | null;
}

export interface WeeklyInsightOutput {
  logged_days_summary: string;
  action_feedback_summary: string;
  cautious_observation: string;
  suggested_reflection_question: string;
}

export interface MindAIResult<T = any> {
  data: T;
  rawText: string;
  promptVersion: string;
  timestamp: string;
  provenance: "ai_suggestion";
}
