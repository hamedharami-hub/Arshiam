import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { LeitnerCard, LeitnerBoxStats, LeitnerRating } from "./leitnerTypes";

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function isOnline(): boolean {
  if (typeof window !== "undefined" && window.navigator && typeof window.navigator.onLine === "boolean") {
    return window.navigator.onLine;
  }
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

export function getLeitnerCardsCacheKey(userId: string): string {
  return `leitner_cards:${userId}`;
}

// Spaced repetition intervals in days for Boxes 1 through 5 (fallback/baseline)
export const BOX_INTERVALS_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export function calculateNextReviewDate(box: number, fromDate = new Date()): string {
  const days = BOX_INTERVALS_DAYS[box] || 1;
  const nextDate = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
  return nextDate.toISOString();
}

/**
 * Maps interval days to visual Leitner Box 1..5 for intuitive UI representation
 */
export function mapIntervalToBox(intervalDays: number): number {
  if (intervalDays <= 1) return 1;
  if (intervalDays <= 4) return 2;
  if (intervalDays <= 9) return 3;
  if (intervalDays <= 20) return 4;
  return 5;
}

export interface SM2Result {
  nextReviewAt: string;
  box: number;
  intervalDays: number;
  easeFactor: number;
  consecutiveCorrect: number;
  lapseCount: number;
  stability: number;
  difficulty: number;
}

/**
 * Modern SuperMemo SM-2 Spaced Repetition calculation
 * Dynamically adjusts intervals based on Ease Factor and recall rating (Again, Hard, Good, Easy)
 */
export function calculateSM2Schedule(
  card: Partial<LeitnerCard>,
  rating: LeitnerRating,
  fromDate = new Date()
): SM2Result {
  const oldEf = card.ease_factor ?? 2.5;
  const currentInterval = card.interval_days || BOX_INTERVALS_DAYS[card.box || 1] || 1;
  const oldConsec = card.consecutive_correct ?? (card.box && card.box > 1 ? card.box - 1 : 0);
  const oldLapses = card.lapse_count ?? 0;

  let newEf = oldEf;
  let newInterval = 1;
  let newConsec = oldConsec;
  let newLapses = oldLapses;
  let newBox = card.box || 1;

  switch (rating) {
    case 1: {
      // Again (دوباره / فراموش کردم): Full reset
      newEf = Math.max(1.3, +(oldEf - 0.2).toFixed(2));
      newInterval = 1;
      newConsec = 0;
      newLapses += 1;
      newBox = 1;
      break;
    }
    case 2: {
      // Hard (سخت): Small advancement with slight penalty to ease
      newEf = Math.max(1.3, +(oldEf - 0.15).toFixed(2));
      newConsec = oldConsec + 1;
      newInterval = Math.max(2, Math.round(currentInterval * 1.25));
      newBox = Math.max(1, Math.min(5, mapIntervalToBox(newInterval)));
      break;
    }
    case 3: {
      // Good (خوب): Standard SM-2 interval progression
      newEf = oldEf;
      newConsec = oldConsec + 1;
      if (newConsec <= 1) {
        newInterval = 1;
      } else if (newConsec === 2) {
        newInterval = Math.max(3, Math.round(currentInterval * 1.8));
      } else {
        newInterval = Math.max(currentInterval + 1, Math.round(currentInterval * newEf));
      }
      newBox = Math.min(5, Math.max((card.box || 1) + 1, mapIntervalToBox(newInterval)));
      break;
    }
    case 4: {
      // Easy (آسان): Bonus interval multiplier and boost to ease factor
      newEf = Math.min(3.2, +(oldEf + 0.15).toFixed(2));
      newConsec = oldConsec + 1;
      if (newConsec <= 1) {
        newInterval = 3;
      } else {
        newInterval = Math.max(currentInterval + 3, Math.round(currentInterval * newEf * 1.35));
      }
      newBox = Math.min(5, Math.max((card.box || 1) + 2, mapIntervalToBox(newInterval) + 1));
      break;
    }
  }

  const nextDate = new Date(fromDate.getTime() + newInterval * 24 * 60 * 60 * 1000);
  const difficulty = +(Math.min(1, Math.max(0.1, 1 - (newEf - 1.3) / (3.2 - 1.3)))).toFixed(2);
  const stability = newInterval;

  return {
    nextReviewAt: nextDate.toISOString(),
    box: newBox,
    intervalDays: newInterval,
    easeFactor: newEf,
    consecutiveCorrect: newConsec,
    lapseCount: newLapses,
    stability,
    difficulty,
  };
}

/**
 * Predicts next interval text to display live on study action buttons
 */
export function previewNextInterval(
  card: LeitnerCard,
  rating: LeitnerRating
): { days: number; textFa: string; textEn: string } {
  const res = calculateSM2Schedule(card, rating);
  const days = res.intervalDays;

  let textFa = "";
  let textEn = "";

  if (rating === 1) {
    textFa = "< ۱ روز";
    textEn = "<1 day";
  } else if (days === 1) {
    textFa = "۱ روز";
    textEn = "1 day";
  } else if (days < 30) {
    textFa = `${days} روز`;
    textEn = `${days} days`;
  } else {
    const months = Math.round(days / 30);
    textFa = `${months} ماه`;
    textEn = `${months} mo`;
  }

  return { days, textFa, textEn };
}

export async function getLeitnerCards(userId: string): Promise<LeitnerCard[]> {
  if (!userId) return [];
  const cacheKey = getLeitnerCardsCacheKey(userId);
  const cached = (await cacheGet<LeitnerCard[]>(cacheKey)) || [];

  if (isOnline()) {
    try {
      const res = await firebaseStore
        .from("leitner_cards")
        .select("*")
        .eq("user_id", userId)
        .order("next_review_at", { ascending: true });

      if (!res.error && Array.isArray(res.data)) {
        const remote = res.data as LeitnerCard[];
        const map = new Map<string, LeitnerCard>();
        for (const c of remote) map.set(c.id, c);
        for (const c of cached) {
          if (!map.has(c.id)) map.set(c.id, c);
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
        );
        await cacheSet(cacheKey, merged);
        return merged;
      }
    } catch (e) {
      console.warn("Failed to fetch leitner_cards remote, falling back to cache", e);
    }
  }

  return cached;
}

/**
 * Computes cards due for review on or before the target date.
 * Resolves the calendar boundary bug by checking through the end of the target day.
 * Sorts box 1 and lapsed cards first for highest cognitive retention.
 */
export function computeDueCards(
  cards: LeitnerCard[],
  referenceTime: number | Date = new Date()
): LeitnerCard[] {
  const targetDate = typeof referenceTime === "number" ? new Date(referenceTime) : referenceTime;
  const endOfDayMs = new Date(targetDate).setHours(23, 59, 59, 999);

  return cards
    .filter((c) => new Date(c.next_review_at).getTime() <= endOfDayMs)
    .sort((a, b) => {
      // Prioritize Box 1 and lapsed cards
      if (a.box !== b.box) return a.box - b.box;
      return new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime();
    });
}

/**
 * Computes box distribution, retention rate, upcoming review forecast, and study streaks
 */
export function computeBoxStats(
  cards: LeitnerCard[],
  referenceTime: number | Date = new Date()
): LeitnerBoxStats {
  let box1 = 0;
  let box2 = 0;
  let box3 = 0;
  let box4 = 0;
  let box5 = 0;
  let dueToday = 0;
  let totalReviews = 0;
  let totalLapses = 0;
  let lapsedCardsCount = 0;

  const now = typeof referenceTime === "number" ? new Date(referenceTime) : referenceTime;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOf3Days = new Date(endOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);
  const endOf7Days = new Date(endOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  let forecastTomorrow = 0;
  let forecast3Days = 0;
  let forecast7Days = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (c.box === 1) box1++;
    else if (c.box === 2) box2++;
    else if (c.box === 3) box3++;
    else if (c.box === 4) box4++;
    else if (c.box >= 5) box5++;

    const reviewTime = new Date(c.next_review_at).getTime();
    if (reviewTime <= endOfToday.getTime()) {
      dueToday++;
    } else if (reviewTime <= endOfTomorrow.getTime()) {
      forecastTomorrow++;
    }
    if (reviewTime > endOfToday.getTime() && reviewTime <= endOf3Days.getTime()) {
      forecast3Days++;
    }
    if (reviewTime > endOfToday.getTime() && reviewTime <= endOf7Days.getTime()) {
      forecast7Days++;
    }

    totalReviews += c.review_count || 0;
    totalLapses += c.lapse_count || 0;
    if ((c.lapse_count || 0) > 0) lapsedCardsCount++;
  }

  const retentionRate =
    totalReviews > 0
      ? Math.round(Math.max(0, (totalReviews - totalLapses) / totalReviews) * 100)
      : 100;

  // Calculate active review streak from last_reviewed_at dates
  const reviewDates = new Set<string>();
  cards.forEach((c) => {
    if (c.last_reviewed_at) {
      reviewDates.add(c.last_reviewed_at.slice(0, 10));
    }
  });

  let streak = 0;
  const checkDate = new Date(now);
  while (true) {
    const key = checkDate.toISOString().slice(0, 10);
    if (reviewDates.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (streak === 0) {
        // Today might not be finished yet, check if yesterday was reviewed
        checkDate.setDate(checkDate.getDate() - 1);
        const yestKey = checkDate.toISOString().slice(0, 10);
        if (reviewDates.has(yestKey)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  return {
    box1,
    box2,
    box3,
    box4,
    box5,
    dueToday,
    totalCards: cards.length,
    masteredCount: box5,
    retentionRate,
    lapsedCardsCount,
    upcomingForecast: {
      today: dueToday,
      tomorrow: forecastTomorrow,
      next3Days: forecast3Days,
      next7Days: forecast7Days,
    },
    streakDays: streak,
  };
}

export async function getDueLeitnerCards(userId: string): Promise<LeitnerCard[]> {
  const cards = await getLeitnerCards(userId);
  return computeDueCards(cards);
}

export interface CramFilterOptions {
  box?: number;
  documentId?: string;
  onlyLapsed?: boolean;
  search?: string;
}

/**
 * Returns filtered cards for custom cramming / free practice
 */
export async function getCramCards(
  userId: string,
  options: CramFilterOptions = {}
): Promise<LeitnerCard[]> {
  const allCards = await getLeitnerCards(userId);
  return allCards.filter((c) => {
    if (options.box && c.box !== options.box) return false;
    if (options.documentId && c.document_id !== options.documentId) return false;
    if (options.onlyLapsed && (c.lapse_count || 0) === 0) return false;
    if (options.search) {
      const q = options.search.toLowerCase();
      const matchFront = c.front.toLowerCase().includes(q);
      const matchBack = c.back.toLowerCase().includes(q);
      const matchClue = c.clue?.toLowerCase().includes(q);
      if (!matchFront && !matchBack && !matchClue) return false;
    }
    return true;
  });
}

export async function createLeitnerCard(
  userId: string,
  data: {
    front: string;
    back: string;
    clue?: string;
    document_id?: string | null;
    folder_id?: string | null;
    box?: number;
  }
): Promise<LeitnerCard> {
  if (!userId) throw new Error("User ID is required");
  const front = data.front.trim();
  const back = data.back.trim();
  if (!front || !back) throw new Error("Front and back of card cannot be empty");

  const now = new Date();
  const initialBox = data.box && data.box >= 1 && data.box <= 5 ? data.box : 1;
  const nextReview = now.toISOString(); // New cards are due immediately

  const card: LeitnerCard = {
    id: makeId(),
    user_id: userId,
    document_id: data.document_id || null,
    folder_id: data.folder_id || null,
    front,
    back,
    clue: data.clue?.trim() || "",
    box: initialBox,
    ease_factor: 2.5,
    interval_days: BOX_INTERVALS_DAYS[initialBox] || 1,
    consecutive_correct: 0,
    difficulty: 0.3,
    stability: 1,
    next_review_at: nextReview,
    last_reviewed_at: null,
    review_count: 0,
    lapse_count: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const cacheKey = getLeitnerCardsCacheKey(userId);
  const existing = (await cacheGet<LeitnerCard[]>(cacheKey)) || [];
  await cacheSet(cacheKey, [card, ...existing]);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "leitner_cards", card.id, card);
      if (!ok) {
        await enqueueOp({ table: "leitner_cards", op: "insert", payload: card });
      }
    } catch (e) {
      await enqueueOp({ table: "leitner_cards", op: "insert", payload: card });
    }
  } else {
    await enqueueOp({ table: "leitner_cards", op: "insert", payload: card });
  }

  return card;
}

/**
 * Advanced review function applying the SM-2 algorithm rating (1: Again, 2: Hard, 3: Good, 4: Easy)
 */
export async function reviewLeitnerCardWithRating(
  userId: string,
  cardId: string,
  rating: LeitnerRating
): Promise<LeitnerCard> {
  if (!userId || !cardId) throw new Error("User ID and Card ID are required");

  const cacheKey = getLeitnerCardsCacheKey(userId);
  const existing = (await cacheGet<LeitnerCard[]>(cacheKey)) || [];
  const idx = existing.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error("Card not found");

  const current = existing[idx];
  const now = new Date();
  const schedule = calculateSM2Schedule(current, rating, now);

  const updated: LeitnerCard = {
    ...current,
    box: schedule.box,
    interval_days: schedule.intervalDays,
    ease_factor: schedule.easeFactor,
    consecutive_correct: schedule.consecutiveCorrect,
    lapse_count: schedule.lapseCount,
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    next_review_at: schedule.nextReviewAt,
    last_reviewed_at: now.toISOString(),
    review_count: current.review_count + 1,
    updated_at: now.toISOString(),
  };

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "leitner_cards", cardId, updated);
      if (!ok) {
        await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
      }
    } catch (e) {
      await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
    }
  } else {
    await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
  }

  return updated;
}

/**
 * Backwards compatible review function (isSuccess: true -> Rating 3 Good, false -> Rating 1 Again)
 */
export async function reviewLeitnerCard(
  userId: string,
  cardId: string,
  isSuccess: boolean
): Promise<LeitnerCard> {
  return reviewLeitnerCardWithRating(userId, cardId, isSuccess ? 3 : 1);
}

export async function updateLeitnerCard(
  userId: string,
  cardId: string,
  patch: Partial<LeitnerCard>
): Promise<LeitnerCard> {
  if (!userId || !cardId) throw new Error("User ID and Card ID are required");

  const cacheKey = getLeitnerCardsCacheKey(userId);
  const existing = (await cacheGet<LeitnerCard[]>(cacheKey)) || [];
  const idx = existing.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error("Card not found");

  const updated: LeitnerCard = {
    ...existing[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  if (isOnline()) {
    try {
      const ok = await saveEntityToFirestore(userId, "leitner_cards", cardId, updated);
      if (!ok) {
        await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
      }
    } catch (e) {
      await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
    }
  } else {
    await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
  }

  return updated;
}

export async function deleteLeitnerCard(userId: string, cardId: string): Promise<boolean> {
  if (!userId || !cardId) return false;

  const cacheKey = getLeitnerCardsCacheKey(userId);
  const existing = (await cacheGet<LeitnerCard[]>(cacheKey)) || [];
  const filtered = existing.filter((c) => c.id !== cardId);
  await cacheSet(cacheKey, filtered);

  if (isOnline()) {
    try {
      const ok = await deleteEntityFromFirestore(userId, "leitner_cards", cardId);
      if (!ok) {
        await enqueueOp({ table: "leitner_cards", op: "delete", match: { id: cardId } });
      }
    } catch (e) {
      await enqueueOp({ table: "leitner_cards", op: "delete", match: { id: cardId } });
    }
  } else {
    await enqueueOp({ table: "leitner_cards", op: "delete", match: { id: cardId } });
  }

  return true;
}

export async function getLeitnerBoxStats(userId: string): Promise<LeitnerBoxStats> {
  const cards = await getLeitnerCards(userId);
  return computeBoxStats(cards);
}
