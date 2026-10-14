import { collection, doc, onSnapshot, orderBy, query, setDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { callAI } from "@/lib/ai";
import { getOpConfig } from "@/lib/aiSettings";
import { getProviderKey } from "@/lib/aiProviders";
import { detectCrisis } from "@/lib/crisisDetection";
import { upsertHabit, upsertNote, upsertTask } from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";
import { CATEGORIES, getCategory, getTopic, matchTopicsLocal } from "./tree";
import { METHODS, getMethod } from "./methods";
import { SELF_CHECKS } from "./selfChecks";
import type { NeedsResult, NeedsSession, NeedsSuggestion } from "./types";

type Lang = "fa" | "en";
export interface NeedsAIOptions { useAI?: boolean; signal?: AbortSignal }
const checkAbort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException("Cancelled", "AbortError"); };
const strings = (value: unknown, limit: number): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, limit) : [];

/** True when the user has an online AI provider with a key (their own key, kept in this browser). */
export function hasAI(): boolean {
  try {
    const cfg = getOpConfig("chat");
    if (!cfg.provider || cfg.provider === "offline") return false;
    return !!(cfg.apiKey || getProviderKey(cfg.provider));
  } catch { return false; }
}

const SAFETY_RULES = `Rules: You are a supportive self-help guide, NOT a therapist or doctor. Never diagnose, never name a disorder as the user's condition, never promise outcomes. Do NOT write any phone numbers or hotline numbers. If the user mentions self-harm, say gently that it is best to talk to a trusted person or a professional now. Warm, simple, non-judgmental language, no heavy medical terms. Reply with ONE JSON object only.`;

function ctxFor(s: Pick<NeedsSession, "category" | "topic" | "detail">, lang: Lang) {
  const c = getCategory(s.category); const t = getTopic(s.category, s.topic); const d = t?.details?.find((x) => x.id === s.detail);
  return [c && c.title[lang], t && t.title[lang], d && d.title[lang]].filter(Boolean).join(" > ") || "(unspecified)";
}

function parse<T>(res: { text?: string; data?: any }): T | null {
  if (res?.data && typeof res.data === "object") return res.data as T;
  try { const m = (res?.text || "").match(/\{[\s\S]*\}/); return m ? (JSON.parse(m[0]) as T) : null; } catch { return null; }
}

const langName = (l: Lang) => (l === "fa" ? "Persian (Farsi)" : "English");

export async function suggestTopics(text: string, lang: Lang, options: NeedsAIOptions = {}): Promise<Array<{ cat: string; topic: string }>> {
  checkAbort(options.signal);
  const local = matchTopicsLocal(text);
  if (!options.useAI || !hasAI()) return local;
  try {
    const catalog = CATEGORIES.filter((c) => c.id !== "unknown").flatMap((c) => c.topics.map((t) => `${c.id}/${t.id}: ${t.title.en}`)).join("\n");
    const res = await callAI("chat", text, undefined, undefined, lang, {
      signal: options.signal, skipPersonalization: true,
      systemPromptOverride: `${SAFETY_RULES}\nPick up to 3 best matching topics for the user's text from this catalog. Reply {"matches":[{"cat":"...","topic":"..."}]} using ids exactly.\n${catalog}`,
    });
    const out = parse<{ matches: Array<{ cat: string; topic: string }> }>(res)?.matches ?? [];
    checkAbort(options.signal);
    const valid = (Array.isArray(out) ? out : []).filter((m) => m && typeof m.cat === "string" && typeof m.topic === "string" && getTopic(m.cat, m.topic)).slice(0, 3);
    return valid.length ? valid : local;
  } catch { checkAbort(options.signal); return local; }
}

export function localQuestions(s: Pick<NeedsSession, "category" | "topic">, lang: Lang): string[] {
  const c = getCategory(s.category); const t = getTopic(s.category, s.topic);
  return [t?.question[lang], ...(c?.questions.map((q) => q[lang]) ?? [])].filter(Boolean).slice(0, 4) as string[];
}

export async function makeQuestions(s: NeedsSession, options: NeedsAIOptions = {}): Promise<string[]> {
  checkAbort(options.signal);
  const fallback = localQuestions(s, s.lang);
  if (!options.useAI || !hasAI()) return fallback;
  try {
    const res = await callAI("chat", s.text, undefined, undefined, s.lang, {
      signal: options.signal, skipPersonalization: true,
      systemPromptOverride: `${SAFETY_RULES}\nTopic: ${ctxFor(s, s.lang)}.\nWrite 3 to 5 short, specific follow-up questions (one sentence each) that help understand this person's situation. Language: ${langName(s.lang)}. Reply {"questions":["..."]}`,
    });
    checkAbort(options.signal);
    const q = strings(parse<{ questions: string[] }>(res)?.questions, 5);
    return q.length >= 3 ? q : fallback;
  } catch { checkAbort(options.signal); return fallback; }
}

export function localResult(s: NeedsSession): NeedsResult {
  const lang = s.lang; const t = getTopic(s.category, s.topic);
  const goal = s.preferences?.goal;
  const history = Array.isArray(s.decisionHistory) ? s.decisionHistory : [];
  const low = s.preferences?.capacity === "low" || history.some((decision) => decision.feedback === "no_energy");
  // Declared choices only: never derive goals, capacity or diagnoses from text/QA.
  const table = {
    calm: { usual: ["grounding", "self-compassion", "progressive-relaxation"], low: ["grounding", "five-min-step"] },
    clarify: { usual: ["define-problem", "pros-cons", "brain-dump"], low: ["five-min-step", "grounding"] },
    step: { usual: ["small-steps", "if-then", "five-min-step"], low: ["five-min-step", "grounding"] },
  } as const;
  const declared = goal && goal in table ? table[goal][low ? "low" : "usual"] : low ? ["grounding", "five-min-step"] : t?.methods ?? ["define-problem", "grounding"];
  const fallback = low ? ["grounding", "five-min-step"] : ["grounding", "five-min-step", "define-problem", "pros-cons", "self-compassion"];
  const rejected = new Set(history.map((decision) => decision.suggestionId));
  const rejectedMethods = new Set(history.filter((decision) => decision.feedback !== "no_energy").map((decision) => decision.suggestion?.methodId).filter(Boolean));
  // Do not offer another currently displayed original/alternative as a replacement.
  const used = new Set(history.length ? [...(s.result?.suggestions ?? []), ...history.flatMap((decision) => decision.alternative ? [decision.alternative] : [])].map((suggestion) => suggestion.id) : []);
  const variant = low ? "small" : "usual";
  const methodIds = [...new Set([...declared, ...fallback])].filter((id) => getMethod(id) && !rejectedMethods.has(id) && !rejected.has(`local-method-${id}-${variant}`) && !used.has(`local-method-${id}-${variant}`)).slice(0, low ? 1 : 3);
  const goalLabel = goal === "calm" ? (lang === "fa" ? "آرام‌تر شدن" : "feeling calmer") : goal === "clarify" ? (lang === "fa" ? "روشن‌تر دیدن" : "seeing more clearly") : goal === "step" ? (lang === "fa" ? "انتخاب یک قدم" : "choosing a step") : (lang === "fa" ? "هدف انتخاب‌نشده" : "no selected goal");
  const capacityLabel = low ? (lang === "fa" ? "ظرفیت کم یا بازخورد انرژی" : "low capacity or energy feedback") : s.preferences?.capacity === "usual" ? (lang === "fa" ? "ظرفیت معمولِ انتخاب‌شده" : "your selected usual capacity") : (lang === "fa" ? "ظرفیت انتخاب‌نشده" : "no selected capacity");
  const reason = lang === "fa"
    ? `گزینهٔ کتابخانه بر پایهٔ ${goalLabel} و ${capacityLabel}${!goal && t ? " و موضوع انتخاب‌شده" : ""}؛ فقط یک پیشنهاد اختیاری است، نه تشخیص.`
    : `Library option based on ${goalLabel} and ${capacityLabel}${!goal && t ? " and your selected topic" : ""}; an optional idea, not a diagnosis.`;
  const suggestions: NeedsSuggestion[] = methodIds.flatMap((id) => {
    const m = getMethod(id);
    if (!m) return [];
    // Low capacity means just the first small instruction, not the full exercise.
    const steps = m.steps.slice(0, low ? 1 : 2).map((step) => step[lang]).join(" ");
    return [{ id: `local-method-${id}-${variant}`, methodId: id, source: "local" as const, reason, text: `${m.title[lang]}: ${steps}`, kind: goal === "step" && !low ? "task" as const : "note" as const }];
  });
  return {
    summary: lang === "fa" ? "این‌ها گزینه‌های کتابخانه‌اند؛ انتخاب‌های اختیاری تو مسیر را تغییر می‌دهند و بدون انتخاب هم گزینهٔ عمومی داریم. برداشت یا تشخیص از نوشته‌ات نیستند. انجام تمرین یا ساخت قدم لازم نیست." : "These are library options; optional choices change the branch, and a general set is available without any selection. This is not an interpretation or diagnosis of your writing. No exercise or task is required.",
    causes: [],
    suggestions,
    // Do not attach a larger exercise pack to a single low-capacity instruction.
    methodIds: low ? [] : methodIds,
    reflections: s.qa.filter((x) => x.a.trim()).slice(0, 2).map((x) => x.q),
    checkIds: low ? [] : (t?.checks ?? []).slice(0, 2),
    source: "local",
  };
}

export async function makeResult(s: NeedsSession, options: NeedsAIOptions = {}): Promise<NeedsResult> {
  checkAbort(options.signal);
  if (!options.useAI || !hasAI()) return localResult(s);
  try {
    const t = getTopic(s.category, s.topic);
    const lib = METHODS.map((m) => `${m.id}: ${m.title.en}`).join("; ");
    const checks = [...SELF_CHECKS.map((c) => c.id), "phq9", "gad7", "who5", "burnout"].join(", ");
    const body = { situation: s.text, answers: s.qa.filter((x) => x.a.trim()) };
    const res = await callAI("chat", body, undefined, undefined, s.lang, {
      signal: options.signal, skipPersonalization: true,
      systemPromptOverride: `${SAFETY_RULES}\nTopic: ${ctxFor(s, s.lang)}. Preferred methods for this topic: ${(t?.methods ?? []).join(", ")}.\nMethod library ids: ${lib}.\nSelf-check ids: ${checks}.\nLanguage: ${langName(s.lang)}.\nSuggestion reasons are optional: a short tentative explanation, never a diagnosis or promise.\nReply {"summary":"2-3 sentences reflecting what you understood","causes":["possible contributing factors, max 3, tentative wording"],"suggestions":[{"text":"small concrete action, easiest first","kind":"task|note|habit","reason":"optional tentative reason"}] (max 5),"method_ids":["ids from library, max 3"],"reflections":["reflection questions, max 3"],"check_ids":["max 2"]}`,
    });
    const r = parse<any>(res);
    checkAbort(options.signal);
    if (typeof r?.summary !== "string" || !r.summary.trim()) return localResult(s);
    const kinds = new Set(["task", "note", "habit"]);
    const strs = strings;
    const suggestions: NeedsSuggestion[] = (Array.isArray(r.suggestions) ? r.suggestions : [])
      .filter((x: any) => x && typeof x.text === "string" && kinds.has(x.kind))
      .map((x: any, index: number) => ({ id: `ai-${s.updated_at}-${index}`, source: "ai" as const, text: x.text.trim(), kind: x.kind, reason: typeof x.reason === "string" && x.reason.trim() ? x.reason.trim().slice(0, 300) : s.lang === "fa" ? "یک ایدهٔ احتمالی است، نه تشخیص." : "A possible idea, not a diagnosis." }))
      .filter((x: NeedsSuggestion) => x.text).slice(0, 5);
    const validChecks = new Set([...SELF_CHECKS.map((c) => c.id), "phq9", "gad7", "who5", "burnout"]);
    return {
      summary: String(r.summary).trim(),
      causes: strs(r.causes, 3),
      suggestions: suggestions.length ? suggestions : localResult(s).suggestions,
      methodIds: strs(r.method_ids, 3).filter((id) => !!getMethod(id)).length ? strs(r.method_ids, 3).filter((id) => !!getMethod(id)) : (t?.methods ?? []).slice(0, 3),
      reflections: strs(r.reflections, 3),
      checkIds: strs(r.check_ids, 2).filter((id) => validChecks.has(id)),
      source: "ai",
    };
  } catch { checkAbort(options.signal); return localResult(s); }
}

/** Fixed safety notice is shown for sensitive topics and when the text itself suggests crisis. Never AI-written. */
export function needsSafetyNotice(s: Pick<NeedsSession, "category" | "topic" | "text" | "qa">): boolean {
  const t = getTopic(s.category, s.topic);
  return !!t?.sensitive || detectCrisis([s.text, ...s.qa.map((x) => x.a)].join(" "));
}

// ── Persistence: users/{uid}/need_sessions (private per user) ──
export const newSessionId = () => `need_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export async function saveSession(userId: string, s: NeedsSession): Promise<boolean> {
  if (!userId || !s.id) return false;
  try {
    const ref = doc(db, "users", userId, "need_sessions", s.id);
    return await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists() && existing.data().deleted_at) return false;
      tx.set(ref, { ...s, user_id: userId }, { merge: true });
      return true;
    });
  } catch { return false; }
}
export async function deleteSession(userId: string, id: string) {
  if (!userId || !id) return false;
  try {
    const ref = doc(db, "users", userId, "need_sessions", id);
    // Remove session content but retain a content-free deletion fence. A save
    // already running in another tab retries against this same document.
    await runTransaction(db, async (tx) => {
      await tx.get(ref);
      const now = new Date().toISOString();
      tx.set(ref, { id, user_id: userId, deleted_at: now, updated_at: now });
    });
    return true;
  } catch { return false; }
}
export function subscribeSessions(userId: string, cb: (items: NeedsSession[]) => void, onError?: (error: unknown) => void) {
  return onSnapshot(query(collection(db, "users", userId, "need_sessions"), orderBy("updated_at", "desc")),
    (snap) => cb(snap.docs.filter((d) => !d.data().deleted_at).map((d) => ({ ...d.data(), id: d.id }) as NeedsSession)), (error) => onError?.(error));
}

export async function saveCheckResult(userId: string, id: string, pct: number, answers: number[], options?: {
  resultId: string; language: "fa" | "en"; interpretationVersion: string;
}) {
  if (!userId || !id || !Number.isFinite(pct) || !answers.every(value => Number.isInteger(value) && value >= 0 && value <= 4)) return false;
  try {
    const rid = options?.resultId || `${id}_${Date.now()}`;
    const data = { id: rid, check_id: id, pct, answers, created_at: new Date().toISOString(), user_id: userId,
      ...(options ? { language: options.language, instrument_version: "personal-form-v1", interpretation_version: options.interpretationVersion } : {}) };
    const ref = doc(db, "users", userId, "selfcheck_results", rid);
    if (options) {
      return await runTransaction(db, async tx => {
        const existing = await tx.get(ref);
        if (existing.exists()) {
          const saved = existing.data();
          return saved.check_id === id && saved.user_id === userId && JSON.stringify(saved.answers) === JSON.stringify(answers);
        }
        tx.set(ref, data);
        return true;
      });
    }
    await setDoc(ref, data);
    return true;
  } catch { return false; }
}

export interface NeedsConversionOptions {
  suggestionId: string;
  title?: string;
  privateNotes?: string;
  dueDate?: string | null;
  frequency?: "daily" | "weekly";
}
export function needsDestinationId(sessionId: string, suggestionId: string, kind: NeedsSuggestion["kind"]): string {
  // Encode without hashing: distinct suggestion identities must not collide.
  const session = encodeURIComponent(sessionId);
  const suggestion = encodeURIComponent(suggestionId);
  return `${kind}_need_${session.length}:${session}${suggestion.length}:${suggestion}`;
}
export async function convertSuggestion(userId: string, s: NeedsSuggestion, sessionId: string, options?: NeedsConversionOptions): Promise<boolean> {
  if (!userId || !sessionId) return false;
  if (options) {
    if (!options.suggestionId || (s.kind === "habit" && !options.frequency)) return false;
    const id = needsDestinationId(sessionId, options.suggestionId, s.kind);
    const now = new Date().toISOString();
    const title = (options.title ?? s.text).trim();
    if (!title) return false;
    const common = { id, user_id: userId, title: title.slice(0, 200), created_at: now, updated_at: now, source_type: "mind_need", source_id: sessionId };
    const data = s.kind === "habit"
      ? { ...common, frequency: options.frequency, streak: 0, completedDates: [] }
      : s.kind === "note"
        ? { ...common, content: options.privateNotes ?? "", pinned: false, kind: "mind" }
        : { ...common, description: options.privateNotes || null, priority: "medium", due_date: options.dueDate ?? null, completed: false, status: "todo", folder_id: null, reminder_at: null, recurrence: "none", recurrence_rule: null, parent_id: null, pinned: false };
    try {
      const ref = doc(db, "users", userId, s.kind === "habit" ? "habits" : s.kind === "note" ? "notes" : "tasks", id);
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (!existing.exists()) tx.set(ref, data);
      });
      return true;
    } catch { return false; }
  }
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  if (s.kind === "habit") {
    return upsertHabit(userId, { id: `habit_${stamp}`, title: s.text.slice(0, 120), frequency: "daily", created_at: now, streak: 0, completedDates: [] });
  }
  if (s.kind === "note") {
    return upsertNote(userId, { id: `note_${stamp}`, title: s.text.slice(0, 60), content: s.text, pinned: false, created_at: now, updated_at: now, kind: "mind" });
  }
  const task: Task = {
    id: `task_${stamp}`, user_id: userId, title: s.text.slice(0, 200), description: null, priority: "medium", due_date: null,
    completed: false, status: "todo", folder_id: null, reminder_at: null, recurrence: "none", recurrence_rule: null, parent_id: null,
    pinned: false, source_type: "mind_need" as never, source_id: sessionId,
  } as Task;
  return upsertTask(userId, task);
}
