import { collection, db, getDocs } from "./firebase";
import { saveEntityToFirestoreWithOutcome } from "./firestoreSync";
import { isOnline } from "./knowledgeService";
import { enqueueOp } from "./offlineQueue";
import type {
  PharmacyReferralLetterDraft,
  PharmacyScenarioProgress,
  PharmacyStarredPhrase,
} from "./pharmacyPracticeStore";

export const PHARMACY_PRACTICE_COLLECTION = "pharmacy_practice";

export type PharmacyPracticeKind = "starred_phrase" | "referral_letter" | "scenario_progress";

interface PracticeDataByKind {
  starred_phrase: PharmacyStarredPhrase;
  referral_letter: PharmacyReferralLetterDraft;
  scenario_progress: PharmacyScenarioProgress;
}

export interface PharmacyPracticeRecord<K extends PharmacyPracticeKind = PharmacyPracticeKind> {
  id: string;
  kind: K;
  key: string;
  data: PracticeDataByKind[K] | null;
  deleted: boolean;
  updated_at: string;
  user_id: string;
}

export type PharmacyPracticeRecords = Record<string, PharmacyPracticeRecord>;

/** saved = in Firestore; queued = durable outbox; remote-newer = another device's newer copy was kept. */
export type PharmacyPracticeSaveStatus = "saved" | "queued" | "remote-newer" | "failed";
export interface PharmacyPracticeSaveResult {
  status: PharmacyPracticeSaveStatus;
  reason?: "signed-out" | "storage-unavailable" | "queue-unavailable";
}

const cacheKey = (userId: string) => `arshnaz:pharmacy:records:${userId}`;
const legacyKey = (userId: string, name: string) => `arshnaz:pharmacy:${name}:${userId}`;

function fnv1a(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Firestore-safe, deterministic document ID so every device writes the same record. */
export const getPracticeRecordId = (kind: PharmacyPracticeKind, key: string) =>
  `${kind}-${fnv1a(key, 0x811c9dc5)}${fnv1a(key, 0x01000193)}`;

function makeRecord<K extends PharmacyPracticeKind>(userId: string, kind: K, key: string, data: PracticeDataByKind[K] | null, updatedAt: string): PharmacyPracticeRecord<K> {
  return { id: getPracticeRecordId(kind, key), kind, key, data, deleted: data === null, updated_at: updatedAt, user_id: userId };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function migrateLegacy(userId: string): PharmacyPracticeRecords {
  const records: PharmacyPracticeRecords = {};
  const add = (record: PharmacyPracticeRecord) => { records[record.id] = record; };
  for (const phrase of readJson<PharmacyStarredPhrase[]>(legacyKey(userId, "starred-phrases")) ?? []) {
    add(makeRecord(userId, "starred_phrase", phrase.id, phrase, phrase.createdAt));
  }
  for (const [scenarioId, draft] of Object.entries(readJson<Record<string, PharmacyReferralLetterDraft>>(legacyKey(userId, "referral-letters")) ?? {})) {
    add(makeRecord(userId, "referral_letter", scenarioId, draft, draft.updatedAt));
  }
  for (const [scenarioId, progress] of Object.entries(readJson<Record<string, PharmacyScenarioProgress>>(legacyKey(userId, "scenario-progress")) ?? {})) {
    add(makeRecord(userId, "scenario_progress", scenarioId, progress, progress.completedAt));
  }
  return records;
}

export function readPracticeRecords(userId: string | null | undefined): PharmacyPracticeRecords {
  if (!userId) return {};
  return readJson<PharmacyPracticeRecords>(cacheKey(userId)) ?? migrateLegacy(userId);
}

function writePracticeRecords(userId: string, records: PharmacyPracticeRecords): boolean {
  try {
    const serialized = JSON.stringify(records);
    window.localStorage.setItem(cacheKey(userId), serialized);
    return window.localStorage.getItem(cacheKey(userId)) === serialized;
  } catch {
    return false;
  }
}

const isNewer = (candidate: PharmacyPracticeRecord, current: PharmacyPracticeRecord | undefined) =>
  !current || new Date(candidate.updated_at).getTime() > new Date(current.updated_at).getTime();

function toRecord(raw: Record<string, unknown>): PharmacyPracticeRecord | null {
  const kind = raw.kind as PharmacyPracticeKind;
  if (!raw.id || !raw.key || !raw.updated_at || !["starred_phrase", "referral_letter", "scenario_progress"].includes(kind)) return null;
  return {
    id: String(raw.id),
    kind,
    key: String(raw.key),
    data: (raw.data ?? null) as PharmacyPracticeRecord["data"],
    deleted: Boolean(raw.deleted),
    updated_at: String(raw.updated_at),
    user_id: String(raw.user_id ?? ""),
  };
}

/** Last-writer-wins per record by application revision time; tombstones propagate deletions. */
export function mergePracticeRecords(local: PharmacyPracticeRecords, remote: readonly PharmacyPracticeRecord[]): { records: PharmacyPracticeRecords; changed: boolean } {
  const records = { ...local };
  let changed = false;
  for (const record of remote) {
    if (isNewer(record, records[record.id])) {
      records[record.id] = record;
      changed = true;
    }
  }
  return { records, changed };
}

export async function pullPracticeRecords(userId: string): Promise<PharmacyPracticeRecords> {
  const local = readPracticeRecords(userId);
  if (!isOnline()) return local;
  const snapshot = await getDocs(collection(db, "users", userId, PHARMACY_PRACTICE_COLLECTION));
  const remote: PharmacyPracticeRecord[] = [];
  snapshot.forEach((item) => {
    const record = toRecord({ ...item.data(), id: item.id });
    if (record) remote.push(record);
  });
  const { records, changed } = mergePracticeRecords(local, remote);
  if (changed && !writePracticeRecords(userId, records)) throw new Error("Device storage is unavailable.");
  return records;
}

export async function savePracticeRecord<K extends PharmacyPracticeKind>(
  userId: string | null | undefined,
  kind: K,
  key: string,
  data: PracticeDataByKind[K] | null,
  now = new Date(),
): Promise<PharmacyPracticeSaveResult> {
  if (!userId) return { status: "failed", reason: "signed-out" };
  const local = readPracticeRecords(userId);
  const previous = local[getPracticeRecordId(kind, key)];
  // Keep revisions strictly increasing even if the clock did not advance.
  const time = Math.max(now.getTime(), previous ? new Date(previous.updated_at).getTime() + 1 : 0);
  const record = makeRecord(userId, kind, key, data, new Date(time).toISOString());
  if (!writePracticeRecords(userId, { ...local, [record.id]: record })) return { status: "failed", reason: "storage-unavailable" };

  const outcome = isOnline()
    ? await saveEntityToFirestoreWithOutcome(userId, PHARMACY_PRACTICE_COLLECTION, record.id, record as unknown as Record<string, unknown>)
    : "failed";
  if (outcome === "saved") return { status: "saved" };
  if (outcome === "stale") {
    await pullPracticeRecords(userId).catch(() => undefined);
    return { status: "remote-newer" };
  }
  const queued = await enqueueOp({ ownerId: userId, table: PHARMACY_PRACTICE_COLLECTION, op: "upsert", payload: record });
  return queued ? { status: "queued" } : { status: "failed", reason: "queue-unavailable" };
}

export function selectStarredPhrases(records: PharmacyPracticeRecords): PharmacyStarredPhrase[] {
  return Object.values(records)
    .filter((record): record is PharmacyPracticeRecord<"starred_phrase"> => record.kind === "starred_phrase" && !record.deleted && Boolean(record.data))
    .map((record) => record.data!)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function selectByScenario<K extends "referral_letter" | "scenario_progress">(records: PharmacyPracticeRecords, kind: K): Record<string, PracticeDataByKind[K]> {
  const result: Record<string, PracticeDataByKind[K]> = {};
  for (const record of Object.values(records)) {
    if (record.kind === kind && !record.deleted && record.data) result[record.key] = record.data as PracticeDataByKind[K];
  }
  return result;
}

export const selectReferralLetters = (records: PharmacyPracticeRecords) => selectByScenario(records, "referral_letter");
export const selectScenarioProgress = (records: PharmacyPracticeRecords) => selectByScenario(records, "scenario_progress");
