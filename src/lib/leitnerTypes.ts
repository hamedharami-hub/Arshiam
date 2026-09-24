export interface SerializedFsrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

export type LeitnerRating = 1 | 2 | 3 | 4; // 1: Again (دوباره), 2: Hard (سخت), 3: Good (خوب), 4: Easy (آسان)
export type LeitnerSchedulingAlgorithm = "sm2" | "fsrs6";

export interface LeitnerCard {
  id: string;
  user_id: string;
  document_id?: string | null;
  folder_id?: string | null;
  front: string; // Question / Concept
  back: string;  // Answer / Clinical note / Solution
  clue?: string; // Optional hint
  box: number;   // 1 to 5 (mapped for visual boxes)
  next_review_at: string;
  last_reviewed_at?: string | null;
  review_count: number;
  lapse_count: number;

  // Legacy SM-2 compatibility fields. FSRS state is stored separately below.
  ease_factor?: number;        // Default 2.5, min 1.3
  interval_days?: number;      // Current calculated interval in days
  consecutive_correct?: number;// Number of consecutive successful recalls
  difficulty?: number;         // Legacy SM-2 proxy, 0 to 1 scale
  stability?: number;          // Legacy interval proxy in days
  scheduling_algorithm?: LeitnerSchedulingAlgorithm;
  fsrs_state?: SerializedFsrsCard | null;

  created_at: string;
  updated_at: string;
}

export interface LeitnerUpcomingForecast {
  today: number;
  tomorrow: number;
  next3Days: number;
  next7Days: number;
}

export interface LeitnerBoxStats {
  box1: number;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  dueToday: number;
  totalCards: number;
  masteredCount: number;

  // Extended Retention & Memory Analytics:
  retentionRate: number;       // 0 to 100 percentage
  lapsedCardsCount: number;    // Cards with at least 1 lapse
  upcomingForecast: LeitnerUpcomingForecast;
  streakDays: number;          // Daily review streak count
}
