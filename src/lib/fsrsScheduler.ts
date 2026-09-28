import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { LeitnerRating, SerializedFsrsCard } from "./leitnerTypes";

import { getDesiredRetention } from "./reviewSettings";

const schedulers = new Map<number, ReturnType<typeof fsrs>>();

/** Scheduler honouring the user's Desired Retention (درصد یادآوری هدف). */
function getScheduler(retention = getDesiredRetention()) {
  const key = Math.round(retention * 100) / 100;
  let s = schedulers.get(key);
  if (!s) {
    s = fsrs({
      request_retention: key,
      enable_fuzz: false,
      enable_short_term: true,
      learning_steps: ["1m", "10m"],
      relearning_steps: ["10m"],
    });
    schedulers.set(key, s);
  }
  return s;
}

/** Leitner box → baseline interval (days), used to seed FSRS for migrated cards. */
const BOX_BASE_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

export type LegacyCardLike = {
  box?: number;
  interval_days?: number;
  difficulty?: number; // legacy 0..1
  review_count?: number;
  lapse_count?: number;
  next_review_at?: string;
  last_reviewed_at?: string | null;
  created_at?: string;
};

/**
 * One-way migration of a Leitner/SM-2 card to an initial FSRS state derived from
 * its box number. Review history (counts, dates) is preserved; nothing is reset.
 */
export function migrateLegacyToFsrs(card: LegacyCardLike, now = new Date()): Card {
  const box = Math.min(5, Math.max(1, Math.round(card.box || 1)));
  const interval = Math.max(BOX_BASE_DAYS[box], Math.round(card.interval_days || 0));
  const reps = card.review_count || 0;
  if (reps === 0 && box === 1) return createEmptyCard(card.created_at ? new Date(card.created_at) : now);
  const due = card.next_review_at ? new Date(card.next_review_at) : now;
  const lastReview = card.last_reviewed_at
    ? new Date(card.last_reviewed_at)
    : new Date(due.getTime() - interval * 86_400_000);
  const legacyDifficulty = typeof card.difficulty === "number" && card.difficulty >= 0 && card.difficulty <= 1 ? card.difficulty : 0.5;
  return {
    due,
    stability: interval,
    difficulty: Math.min(10, Math.max(1, 1 + legacyDifficulty * 9)),
    elapsed_days: 0,
    scheduled_days: interval,
    learning_steps: 0,
    reps: Math.max(1, reps),
    lapses: card.lapse_count || 0,
    state: State.Review,
    last_review: lastReview,
  };
}

const ratingMap: Record<LeitnerRating, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

export function createEmptyFsrsCard(at = new Date()): Card {
  return createEmptyCard(at);
}

export function serializeFsrsCard(card: Card): SerializedFsrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString() ?? null,
  };
}

export function deserializeFsrsCard(value: unknown): Card {
  if (!value || typeof value !== "object") {
    throw new Error("FSRS card state is missing or invalid.");
  }

  const raw = value as Partial<SerializedFsrsCard>;
  const due = typeof raw.due === "string" ? new Date(raw.due) : null;
  const lastReview = typeof raw.last_review === "string" ? new Date(raw.last_review) : undefined;
  const numericFields = [
    raw.stability,
    raw.difficulty,
    raw.elapsed_days,
    raw.scheduled_days,
    raw.learning_steps,
    raw.reps,
    raw.lapses,
    raw.state,
  ];

  if (
    !due || !Number.isFinite(due.getTime()) ||
    (lastReview && !Number.isFinite(lastReview.getTime())) ||
    numericFields.some((field) => typeof field !== "number" || !Number.isFinite(field)) ||
    ![State.New, State.Learning, State.Review, State.Relearning].includes(raw.state as State)
  ) {
    throw new Error("FSRS card state is corrupt; the review was not applied.");
  }

  return {
    due,
    stability: raw.stability!,
    difficulty: raw.difficulty!,
    elapsed_days: raw.elapsed_days!,
    scheduled_days: raw.scheduled_days!,
    learning_steps: raw.learning_steps!,
    reps: raw.reps!,
    lapses: raw.lapses!,
    state: raw.state as State,
    ...(lastReview ? { last_review: lastReview } : {}),
  };
}

export function scheduleFsrsReview(card: Card, rating: LeitnerRating, at = new Date()): Card {
  return getScheduler().next(card, at, ratingMap[rating]).card;
}

/** Probability of recall right now for a card (0..1). */
export function currentRetrievability(card: Card, at = new Date()): number {
  return getScheduler().get_retrievability(card, at, false) as number;
}

export function previewFsrsReviews(card: Card, at = new Date()): Record<LeitnerRating, Card> {
  const previews = getScheduler().repeat(card, at);
  return {
    1: previews[Rating.Again].card,
    2: previews[Rating.Hard].card,
    3: previews[Rating.Good].card,
    4: previews[Rating.Easy].card,
  };
}
