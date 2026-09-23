import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import type { LeitnerCard, LeitnerBoxStats } from "./leitnerTypes";

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

// Spaced repetition intervals in days for Boxes 1 through 5
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

export function computeDueCards(cards: LeitnerCard[], now = Date.now()): LeitnerCard[] {
  return cards.filter((c) => new Date(c.next_review_at).getTime() <= now);
}

export function computeBoxStats(cards: LeitnerCard[], now = Date.now()): LeitnerBoxStats {
  let box1 = 0;
  let box2 = 0;
  let box3 = 0;
  let box4 = 0;
  let box5 = 0;
  let dueToday = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (c.box === 1) box1++;
    else if (c.box === 2) box2++;
    else if (c.box === 3) box3++;
    else if (c.box === 4) box4++;
    else if (c.box === 5) box5++;

    if (new Date(c.next_review_at).getTime() <= now) {
      dueToday++;
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
  };
}

export async function getDueLeitnerCards(userId: string): Promise<LeitnerCard[]> {
  const cards = await getLeitnerCards(userId);
  return computeDueCards(cards);
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
      await saveEntityToFirestore("leitner_cards", card);
    } catch (e) {
      await enqueueOp({ table: "leitner_cards", op: "insert", payload: card });
    }
  } else {
    await enqueueOp({ table: "leitner_cards", op: "insert", payload: card });
  }

  return card;
}

export async function reviewLeitnerCard(
  userId: string,
  cardId: string,
  isSuccess: boolean
): Promise<LeitnerCard> {
  if (!userId || !cardId) throw new Error("User ID and Card ID are required");

  const cacheKey = getLeitnerCardsCacheKey(userId);
  const existing = (await cacheGet<LeitnerCard[]>(cacheKey)) || [];
  const idx = existing.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error("Card not found");

  const current = existing[idx];
  const now = new Date();

  let nextBox = current.box;
  let lapseCount = current.lapse_count;

  if (isSuccess) {
    nextBox = Math.min(5, current.box + 1);
  } else {
    nextBox = 1;
    lapseCount += 1;
  }

  const nextReviewAt = calculateNextReviewDate(nextBox, now);

  const updated: LeitnerCard = {
    ...current,
    box: nextBox,
    next_review_at: nextReviewAt,
    last_reviewed_at: now.toISOString(),
    review_count: current.review_count + 1,
    lapse_count: lapseCount,
    updated_at: now.toISOString(),
  };

  const next = [...existing];
  next[idx] = updated;
  await cacheSet(cacheKey, next);

  if (isOnline()) {
    try {
      await saveEntityToFirestore("leitner_cards", updated);
    } catch (e) {
      await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
    }
  } else {
    await enqueueOp({ table: "leitner_cards", op: "update", payload: updated, match: { id: cardId } });
  }

  return updated;
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
      await saveEntityToFirestore("leitner_cards", updated);
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
      await deleteEntityFromFirestore("leitner_cards", cardId);
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
