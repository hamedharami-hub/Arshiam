import { useEffect, useRef, useState } from 'react';
import { getDB, CACHE_STORE } from '@/lib/offlineDb';

const draftWrites = new Map<string, Promise<void>>();
function sameShape(value: unknown, sample: unknown): boolean {
  if (sample === null || sample === undefined) return value === null || value === undefined || ['string', 'number', 'boolean', 'object'].includes(typeof value);
  if (Array.isArray(sample)) return Array.isArray(value) && (!sample.length || value.every(item => sameShape(item, sample[0])));
  if (typeof sample === "object") return !!value && typeof value === "object" && Object.entries(sample).every(([key, item]) => (key === "folderId" ? (value as Record<string, unknown>)[key] === null || typeof (value as Record<string, unknown>)[key] === "string" : sameShape((value as Record<string, unknown>)[key], item)));
  return typeof value === typeof sample;
}
interface Draft<T> { baseline: string; values: T[]; position: number }
/** Account-scoped durable drafts and a bounded undo history. No cloud writes. */
export function useLearningDraft<T>(key: string, initial: T, baseline: string, validate?: (value: unknown) => boolean) {
  const [state, setState] = useState<Draft<T>>({ baseline, values: [initial], position: 0 });
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving');
  const [conflict, setConflict] = useState<Draft<T> | null>(null);
  const current = useRef(state); current.current = state;
  const serial = useRef(Promise.resolve());
  const lastChange = useRef(0);
  const epoch = useRef(0);
  const allowWrites = useRef(true);
  const write = (snapshot: Draft<T>): Promise<boolean> => {
    if (!allowWrites.current) return Promise.resolve(false);
    const generation = epoch.current;
    setStatus('saving');
    const attempt = (draftWrites.get(key) || serial.current).catch(() => undefined).then(async () => {
      const db = await getDB(); if (!db) throw new Error('Browser storage unavailable');
      await db.put(CACHE_STORE, snapshot, key);
      if (generation === epoch.current && current.current === snapshot) setStatus('saved');
      return true;
    }).catch(() => { if (generation === epoch.current) setStatus('unavailable'); return false; });
    const tail = attempt.then(() => undefined); serial.current = tail; draftWrites.set(key, tail);
    void tail.finally(() => { if (draftWrites.get(key) === tail) draftWrites.delete(key); });
    return attempt;
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await draftWrites.get(key);
        const db = await getDB(); if (!db) throw new Error('Browser storage unavailable');
        const cached = await db.get(CACHE_STORE, key) as Draft<T> | undefined;
        if (cancelled) return;
        const validCached = cached && typeof cached.baseline === 'string' && Array.isArray(cached.values) && cached.values.length && cached.values.every(value => validate ? validate(value) : sameShape(value, initial)) && Number.isInteger(cached.position) && cached.position >= 0 && cached.position < cached.values.length;
        if (cached && !validCached) {
          // Preserve incompatible data before allowing a fresh draft to replace it.
          allowWrites.current = false;
          await db.put(CACHE_STORE, cached, `${key}:recovery:${Date.now()}`);
          allowWrites.current = true;
          if (cancelled) return;
        }
        if (validCached) {
          if (cached.baseline === baseline) { current.current = cached; setState(cached); }
          else setConflict(cached);
        }
        setStatus(cached ? 'saved' : 'saving');
      } catch { if (!cancelled) setStatus('unavailable'); }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; epoch.current++; };
    // Callers key the component by owner/document, preserving drafts across panel closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready || conflict) return;
    const timer = setTimeout(() => void write(current.current), 400);
    return () => { clearTimeout(timer); void write(current.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready, conflict]);
  const change = (value: T | ((previous: T) => T), groupTyping = false) => {
    const next = typeof value === "function" ? (value as (previous: T) => T)(current.current.values[current.current.position]) : value;
    const previous = current.current;
    const values = previous.values.slice(0, previous.position + 1);
    const now = Date.now();
    if (groupTyping && now - lastChange.current < 650 && values.length > 1) values[values.length - 1] = next;
    else values.push(next);
    lastChange.current = groupTyping ? now : 0;
    const bounded = values.slice(-25);
    const snapshot = { baseline: previous.baseline, values: bounded, position: bounded.length - 1 };
    current.current = snapshot; setState(snapshot);
  };
  const step = (offset: number) => { const previous = current.current; const snapshot = { ...previous, position: Math.max(0, Math.min(previous.values.length - 1, previous.position + offset)) }; current.current = snapshot; setState(snapshot); lastChange.current = 0; };
  const accept = (value: T, version: string) => { const next = { baseline: version, values: [value], position: 0 }; current.current = next; setState(next); setConflict(null); lastChange.current = 0; void write(next); };
  const rebaseline = (version: string) => { const next = { ...current.current, baseline: version }; current.current = next; setState(next); };
  const clear = async () => { allowWrites.current = false; await serial.current; const db = await getDB(); if (db) await db.delete(CACHE_STORE, key); };
  return { clear, rebaseline, isCurrent: (value: T) => current.current.values[current.current.position] === value, value: state.values[state.position], baseline: state.baseline, ready, status, conflict, change, undo: () => step(-1), redo: () => step(1), canUndo: state.position > 0, canRedo: state.position < state.values.length - 1, accept,
    restore: () => { if (conflict) { const next = { ...conflict, baseline }; current.current = next; setState(next); setConflict(null); } }, dismissConflict: () => setConflict(null), flush: () => write(current.current) };
}
