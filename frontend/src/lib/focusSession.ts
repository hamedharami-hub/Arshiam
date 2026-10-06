import { firebaseStore } from "@/lib/firebaseStore";
import { auth } from "@/lib/firebase";
import { recordPomodoroFocusSession } from "@/lib/garden";
import { todayISO } from "@/lib/timeHorizon";
import { playEndBell, END_BELLS, type EndBellId } from "@/lib/pomodoroSounds";

export type Mode = "work" | "short" | "long";
export type Prefs = { minutes: number; shortBreak: number; longBreak: number; longEvery: number; autoStart: boolean; bell: EndBellId; bellVol: number; ambient: string; ambientVol: number };
export const DEFAULT_PREFS: Prefs = { minutes: 25, shortBreak: 5, longBreak: 15, longEvery: 4, autoStart: false, bell: "bell", bellVol: 60, ambient: "none", ambientVol: 30 };
export type PersistedSession = { userId: string | null; mode: Mode; endAt: number | null; remaining: number; startedAt: number | null; taskId: string | null; id?: string; total?: number; taskTitle?: string; cycle?: number };
type SessionRecord = { id: string; user_id: string; task_id: string | null; duration_minutes: number; completed: boolean; started_at: string; ended_at: string };
export type FocusState = { userId: string | null; prefs: Prefs; session: PersistedSession; doneToday: number; pending: number; completedVersion: number; storageError: boolean };
const sessionKey = (id: string | null) => `pomodoro_session_v1:${id || "guest"}`;
const countKey = (id: string | null) => `pomodoro_today_count_v2:${id || "guest"}`;
const outboxKey = (id: string) => `pomodoro_pending_v1:${id}`;
const prefsKey = (id: string | null) => `pomodoro_prefs_v2:${id || "guest"}`;
const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
export function loadSession(userId: string | null): PersistedSession | null {
  const s = read(sessionKey(userId));
  if (!s || s.userId !== userId || !["work", "short", "long"].includes(s.mode) || !Number.isFinite(s.remaining) || s.remaining < 0 || (s.endAt !== null && (!Number.isFinite(s.endAt) || s.endAt <= 0)) || (s.startedAt !== null && !Number.isFinite(s.startedAt))) return null;
  return s;
}
export function loadCount(id: string | null) { const c = read(countKey(id)); return c?.date === todayISO() ? Math.max(0, Number(c.count) || 0) : 0; }
export function normalizePrefs(input: Partial<Prefs>): Prefs {
  const clamp = (v: unknown, fallback: number, min: number, max: number) => Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v as number))) : fallback;
  return { minutes: clamp(input.minutes, 25, 5, 90), shortBreak: clamp(input.shortBreak, 5, 1, 60), longBreak: clamp(input.longBreak, 15, 1, 90), longEvery: clamp(input.longEvery, 4, 2, 6), autoStart: input.autoStart === true, bell: END_BELLS.some(b => b.id === input.bell) ? input.bell! : "bell", bellVol: clamp(input.bellVol, 60, 0, 100), ambient: ["rain", "sleep_pink"].includes(input.ambient || "") ? input.ambient! : "none", ambientVol: clamp(input.ambientVol, 30, 0, 100) };
}
function loadPrefs(id: string | null) {
  const scoped = read(prefsKey(id));
  // Existing sessions certify the owner for one-time legacy preference recovery.
  // Do not apply an unowned prior account's device preferences to a new account.
  const legacy = id === null || loadSession(id) ? read("pomodoro_prefs_v1") : null;
  const prefs = normalizePrefs(scoped || legacy || {});
  if (!scoped && legacy) { try { localStorage.setItem(prefsKey(id), JSON.stringify(prefs)); } catch { /* Recovery stays usable. */ } }
  return prefs;
}
const lengthOf = (mode: Mode, p: Prefs) => (mode === "work" ? p.minutes : mode === "short" ? p.shortBreak : p.longBreak) * 60;
function idle(userId: string | null, mode: Mode, prefs: Prefs, cycle = 0): PersistedSession { return { userId, mode, endAt: null, remaining: lengthOf(mode, prefs), total: lengthOf(mode, prefs), startedAt: null, taskId: null, cycle }; }
let state: FocusState = { userId: null, prefs: DEFAULT_PREFS, session: idle(null, "work", DEFAULT_PREFS), doneToday: 0, pending: 0, completedVersion: 0, storageError: false };
let bound = false;
let lastDate = todayISO();
let anchor: { wall: number; mono: number; endAt: number } | null = null;
const listeners = new Set<() => void>();
const flushing = new Set<string>();
function emit(patch: Partial<FocusState> = {}) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
function store(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { emit({ storageError: true }); return false; } }
function persist() { store(sessionKey(state.userId), state.session); }
function setSession(s: PersistedSession) { anchor = s.endAt === null ? null : { wall: Date.now(), mono: performance.now(), endAt: s.endAt }; emit({ session: s }); persist(); }
export function bindFocusAccount(userId: string | null) {
  if (bound && state.userId === userId) return;
  bound = true;
  const prefs = loadPrefs(userId);
  const restored = loadSession(userId);
  const s = restored ? { ...restored, id: restored.id || (restored.startedAt !== null ? `focus-legacy-${restored.startedAt}-${encodeURIComponent(restored.taskId || "free")}` : undefined), total: restored.total || Math.max(restored.remaining, lengthOf(restored.mode, prefs)) } : idle(userId, "work", prefs);
  lastDate = todayISO();
  anchor = s.endAt === null ? null : { wall: Date.now(), mono: performance.now(), endAt: s.endAt };
  emit({ userId, prefs, session: s, doneToday: loadCount(userId), pending: userId ? (read(outboxKey(userId)) || []).length : 0, storageError: false });
  void flushFocusSessions();
}
export const getFocusState = () => state;
export function subscribeFocus(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function updateFocusPrefs(change: Partial<Prefs>) {
  if (state.userId !== null && auth.currentUser?.uid !== state.userId) return;
  const prefs = normalizePrefs({ ...state.prefs, ...change });
  emit({ prefs }); store(prefsKey(state.userId), prefs);
  if (!state.session.startedAt && !state.session.endAt) setSession(idle(state.userId, state.session.mode, prefs, state.session.cycle));
}
export function switchFocusMode(mode: Mode, autoStart = false, taskId: string | null = null, taskTitle = "") {
  if (state.session.endAt || (state.userId !== null && auth.currentUser?.uid !== state.userId)) return;
  setSession(idle(state.userId, mode, state.prefs, state.session.cycle));
  if (autoStart) toggleFocus(taskId, taskTitle);
}
export function toggleFocus(taskId: string | null = null, taskTitle = "") {
  if (state.userId !== null && auth.currentUser?.uid !== state.userId) return;
  const s = state.session;
  if (s.endAt !== null) { tickFocus(); if (state.session.id !== s.id) return; setSession({ ...state.session, endAt: null }); return; }
  const now = Date.now();
  setSession({ ...s, id: s.id || crypto.randomUUID(), startedAt: s.startedAt ?? now, taskId: s.startedAt !== null ? s.taskId : taskId, taskTitle: s.startedAt !== null ? s.taskTitle : taskTitle, endAt: now + s.remaining * 1000 });
}
export function resetFocus() { if (state.userId !== null && auth.currentUser?.uid !== state.userId) return; setSession(idle(state.userId, state.session.mode, state.prefs, state.session.cycle)); }
export function skipFocus() { if (state.userId !== null && auth.currentUser?.uid !== state.userId) return; setSession(idle(state.userId, state.session.mode === "work" ? "short" : "work", state.prefs, state.session.cycle)); }
export function tickFocus() {
  if (state.userId !== null && auth.currentUser?.uid !== state.userId) return;
  if (lastDate !== todayISO()) { lastDate = todayISO(); emit({ doneToday: loadCount(state.userId) }); }
  const s = state.session;
  if (s.endAt === null) return;
  // Live process uses a monotonic clock. After process closure, recover from the persisted wall deadline.
  const elapsed = anchor ? performance.now() - anchor.mono : 0;
  const effectiveNow = anchor ? anchor.wall + elapsed : Date.now();
  const remaining = Math.max(0, Math.ceil((s.endAt - effectiveNow) / 1000));
  if (remaining === 0) { finishFocus(true, s.endAt); return; }
  if (remaining !== s.remaining) { emit({ session: { ...s, remaining } }); }
  // Rebase deadline when the device wall clock changes without changing active seconds.
  if (Math.abs(Date.now() - effectiveNow) > 2000) setSession({ ...state.session, endAt: Date.now() + remaining * 1000 });
}
export function finishFocus(completed = false, endedAt = Date.now()) {
  if (state.userId !== null && auth.currentUser?.uid !== state.userId) return;
  const s = state.session;
  if (s.startedAt === null || !s.id) return;
  const total = s.total || lengthOf(s.mode, state.prefs);
  const remaining = s.endAt !== null && !completed ? Math.max(0, Math.ceil((s.endAt - (anchor ? anchor.wall + performance.now() - anchor.mono : Date.now())) / 1000)) : s.remaining;
  const seconds = completed ? total : Math.max(0, total - remaining);
  if (s.mode === "work" && seconds > 0) {
    if (state.userId) {
      const row: SessionRecord = { id: s.id, user_id: state.userId, task_id: s.taskId, duration_minutes: Math.round(seconds / 60 * 100) / 100, completed, started_at: new Date(s.startedAt).toISOString(), ended_at: new Date(endedAt).toISOString() };
      const pending: SessionRecord[] = read(outboxKey(state.userId)) || [];
      if (!pending.some(item => item.id === row.id)) pending.push(row);
      // Do not discard the active session if durable retention failed.
      if (!store(outboxKey(state.userId), pending)) { setSession({ ...s, endAt: null, remaining: completed ? 0 : remaining }); return; }
      emit({ pending: pending.length });
    }
    if (completed) {
      const old = read(countKey(state.userId));
      const date = todayISO(new Date(endedAt));
      const count = old?.date === date ? Number(old.count) || 0 : 0;
      const ids: string[] = old?.date === date && Array.isArray(old.ids) ? old.ids : [];
      if (!ids.includes(s.id)) { ids.push(s.id); store(countKey(state.userId), { date, count: count + 1, ids }); recordPomodoroFocusSession(total / 60, s.id); }
      emit({ doneToday: loadCount(state.userId) });
    }
  }
  const cycle = (s.cycle || 0) + (s.mode === "work" && completed ? 1 : 0);
  const next = s.mode === "work" ? (cycle > 0 && cycle % state.prefs.longEvery === 0 ? "long" : "short") : "work";
  setSession(idle(state.userId, next, state.prefs, cycle));
  emit({ completedVersion: state.completedVersion + 1 });
  if (completed) playEndBell(state.prefs.bell, state.prefs.bellVol);
  if (completed && state.prefs.autoStart) toggleFocus(s.taskId, s.taskTitle);
  void flushFocusSessions();
}
export async function flushFocusSessions() {
  const owner = state.userId;
  if (!owner || flushing.has(owner) || auth.currentUser?.uid !== owner) return;
  flushing.add(owner);
  try {
    for (const row of (read(outboxKey(owner)) || []) as SessionRecord[]) {
      if (auth.currentUser?.uid !== owner || state.userId !== owner) return;
      const { error } = await firebaseStore.from("pomodoro_sessions").upsert(row);
      if (error) return;
      const current: SessionRecord[] = read(outboxKey(owner)) || [];
      store(outboxKey(owner), current.filter(item => item.id !== row.id));
      if (state.userId === owner) emit({ pending: current.filter(item => item.id !== row.id).length, completedVersion: state.completedVersion + 1 });
    }
  } finally { flushing.delete(owner); }
}
export function refreshFocusFromStorage(key: string | null) {
  if (key === sessionKey(state.userId)) { const s = loadSession(state.userId); if (s) { anchor = s.endAt === null ? null : { wall: Date.now(), mono: performance.now(), endAt: s.endAt }; emit({ session: s }); } }
  if (key === prefsKey(state.userId)) emit({ prefs: loadPrefs(state.userId) });
  if (key === countKey(state.userId)) emit({ doneToday: loadCount(state.userId) });
}
