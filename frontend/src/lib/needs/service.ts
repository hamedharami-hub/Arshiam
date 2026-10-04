import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc } from "firebase/firestore";
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

export async function suggestTopics(text: string, lang: Lang): Promise<Array<{ cat: string; topic: string }>> {
  const local = matchTopicsLocal(text);
  if (!hasAI()) return local;
  try {
    const catalog = CATEGORIES.filter((c) => c.id !== "unknown").flatMap((c) => c.topics.map((t) => `${c.id}/${t.id}: ${t.title.en}`)).join("\n");
    const res = await callAI("chat", text, undefined, undefined, lang, {
      systemPromptOverride: `${SAFETY_RULES}\nPick up to 3 best matching topics for the user's text from this catalog. Reply {"matches":[{"cat":"...","topic":"..."}]} using ids exactly.\n${catalog}`,
    });
    const out = parse<{ matches: Array<{ cat: string; topic: string }> }>(res)?.matches ?? [];
    const valid = out.filter((m) => getTopic(m.cat, m.topic)).slice(0, 3);
    return valid.length ? valid : local;
  } catch { return local; }
}

export function localQuestions(s: Pick<NeedsSession, "category" | "topic">, lang: Lang): string[] {
  const c = getCategory(s.category); const t = getTopic(s.category, s.topic);
  return [t?.question[lang], ...(c?.questions.map((q) => q[lang]) ?? [])].filter(Boolean).slice(0, 4) as string[];
}

export async function makeQuestions(s: NeedsSession): Promise<string[]> {
  const fallback = localQuestions(s, s.lang);
  if (!hasAI()) return fallback;
  try {
    const res = await callAI("chat", s.text, undefined, undefined, s.lang, {
      systemPromptOverride: `${SAFETY_RULES}\nTopic: ${ctxFor(s, s.lang)}.\nWrite 3 to 5 short, specific follow-up questions (one sentence each) that help understand this person's situation. Language: ${langName(s.lang)}. Reply {"questions":["..."]}`,
    });
    const q = (parse<{ questions: string[] }>(res)?.questions ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 5);
    return q.length >= 3 ? q : fallback;
  } catch { return fallback; }
}

export function localResult(s: NeedsSession): NeedsResult {
  const lang = s.lang; const t = getTopic(s.category, s.topic);
  const methodIds = (t?.methods ?? []).slice(0, 3);
  const suggestions: NeedsSuggestion[] = methodIds.flatMap((id) => {
    const m = getMethod(id); const step = m?.steps[0];
    return m && step ? [{ text: `${m.title[lang]}: ${step[lang]}`, kind: "task" as const }] : [];
  });
  const first = getMethod(methodIds[0]);
  if (first) suggestions.push({ text: first.title[lang], kind: "habit" });
  suggestions.push({ text: s.text.slice(0, 400), kind: "note" });
  return {
    summary: lang === "fa" ? `از آنچه نوشتی برداشت می‌کنم که درباره‌ی «${ctxFor(s, lang)}» به کمک نیاز داری. می‌توانی از ساده‌ترین روش‌ها شروع کنی.` : `From what you wrote, you'd like support with "${ctxFor(s, lang)}". You can start with the simplest methods below.`,
    causes: [],
    suggestions: suggestions.slice(0, 5),
    methodIds,
    reflections: s.qa.filter((x) => x.a.trim()).slice(0, 2).map((x) => x.q),
    checkIds: (t?.checks ?? []).slice(0, 2),
    source: "local",
  };
}

export async function makeResult(s: NeedsSession): Promise<NeedsResult> {
  if (!hasAI()) return localResult(s);
  try {
    const t = getTopic(s.category, s.topic);
    const lib = METHODS.map((m) => `${m.id}: ${m.title.en}`).join("; ");
    const checks = [...SELF_CHECKS.map((c) => c.id), "phq9", "gad7", "who5", "burnout"].join(", ");
    const body = { situation: s.text, answers: s.qa.filter((x) => x.a.trim()) };
    const res = await callAI("chat", body, undefined, undefined, s.lang, {
      systemPromptOverride: `${SAFETY_RULES}\nTopic: ${ctxFor(s, s.lang)}. Preferred methods for this topic: ${(t?.methods ?? []).join(", ")}.\nMethod library ids: ${lib}.\nSelf-check ids: ${checks}.\nLanguage: ${langName(s.lang)}.\nReply {"summary":"2-3 sentences reflecting what you understood","causes":["possible contributing factors, max 3, tentative wording"],"suggestions":[{"text":"small concrete action, easiest first","kind":"task|note|habit"}] (max 5),"method_ids":["ids from library, max 3"],"reflections":["reflection questions, max 3"],"check_ids":["max 2"]}`,
    });
    const r = parse<any>(res);
    if (!r?.summary) return localResult(s);
    const kinds = new Set(["task", "note", "habit"]);
    const strs = (a: any, n: number) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean).slice(0, n) : []);
    const suggestions: NeedsSuggestion[] = (Array.isArray(r.suggestions) ? r.suggestions : [])
      .map((x: any) => ({ text: String(x?.text ?? x ?? "").trim(), kind: kinds.has(x?.kind) ? x.kind : "task" }))
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
  } catch { return localResult(s); }
}

/** Fixed safety notice is shown for sensitive topics and when the text itself suggests crisis. Never AI-written. */
export function needsSafetyNotice(s: Pick<NeedsSession, "category" | "topic" | "text" | "qa">): boolean {
  const t = getTopic(s.category, s.topic);
  return !!t?.sensitive || detectCrisis([s.text, ...s.qa.map((x) => x.a)].join(" "));
}

// ── Persistence: users/{uid}/need_sessions (private per user) ──
export const newSessionId = () => `need_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export async function saveSession(userId: string, s: NeedsSession): Promise<boolean> {
  try {
    await setDoc(doc(db, "users", userId, "need_sessions", s.id), { ...s, user_id: userId, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (e) { console.warn("[needs] save failed", e); return false; }
}
export async function deleteSession(userId: string, id: string) {
  try { await deleteDoc(doc(db, "users", userId, "need_sessions", id)); return true; } catch { return false; }
}
export function subscribeSessions(userId: string, cb: (items: NeedsSession[]) => void) {
  return onSnapshot(query(collection(db, "users", userId, "need_sessions"), orderBy("updated_at", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as NeedsSession)), () => cb([]));
}

export async function saveCheckResult(userId: string, id: string, pct: number, answers: number[]) {
  try {
    const rid = `${id}_${Date.now()}`;
    await setDoc(doc(db, "users", userId, "selfcheck_results", rid), { id: rid, check_id: id, pct, answers, created_at: new Date().toISOString(), user_id: userId });
    return true;
  } catch { return false; }
}

export async function convertSuggestion(userId: string, s: NeedsSuggestion, sessionId: string): Promise<boolean> {
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
