export interface LeitnerCard {
  id: string;
  user_id: string;
  document_id?: string | null;
  folder_id?: string | null;
  front: string; // Question / Concept
  back: string;  // Answer / Clinical note / Solution
  clue?: string; // Optional hint
  box: number;   // 1 to 5
  next_review_at: string;
  last_reviewed_at?: string | null;
  review_count: number;
  lapse_count: number;
  created_at: string;
  updated_at: string;
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
}
