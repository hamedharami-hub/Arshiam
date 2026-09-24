import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { LeitnerRating, SerializedFsrsCard } from "./leitnerTypes";

const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});

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
  return scheduler.next(card, at, ratingMap[rating]).card;
}

export function previewFsrsReviews(card: Card, at = new Date()): Record<LeitnerRating, Card> {
  const previews = scheduler.repeat(card, at);
  return {
    1: previews[Rating.Again].card,
    2: previews[Rating.Hard].card,
    3: previews[Rating.Good].card,
    4: previews[Rating.Easy].card,
  };
}
