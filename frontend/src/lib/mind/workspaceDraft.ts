import { useCallback, useEffect, useRef, useState } from "react";
import { validMindDraftValue, validMindTimestamp } from "./draftValidation";

const EVENT = "arshiam:mind-workspace";
const VERSION = 1;
export const workspaceDraftKey = (ownerId: string | undefined, slot: string) =>
  `arshiam:mind:workspace:v${VERSION}:${encodeURIComponent(ownerId || "guest")}:${encodeURIComponent(slot)}`;

type Envelope<T> = { version: number; owner: string; slot: string; updatedAt: number; value: T };
function decode<T>(raw: string | null, ownerId: string | undefined, slot: string): T | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed.version !== VERSION || parsed.owner !== (ownerId || "guest") || parsed.slot !== slot
      || typeof parsed.updatedAt !== "number" || !validMindTimestamp(parsed.updatedAt)
      || !validMindDraftValue(slot, parsed.value)) return undefined;
    return parsed.value;
  } catch { return undefined; }
}

/** Checked synchronous retention: memory is never reported as durable storage.
 * Callers key their editor by account/session. A foreign-tab revision cannot silently
 * replace the working copy or be overwritten without an explicit choice.
 */
export function useWorkspaceDraft<T extends object>(ownerId: string | undefined, slot: string, initial: T) {
  const key = workspaceDraftKey(ownerId, slot);
  const seed = useRef(initial);
  const identity = useRef(key);
  const source = useRef({});
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const initialRead = useRef<{ raw: string | null; value: T; readable: boolean }>();
  if (!initialRead.current) {
    try {
      const raw = localStorage.getItem(key);
      initialRead.current = { raw, value: decode<T>(raw, ownerId, slot) ?? initial, readable: true };
    } catch { initialRead.current = { raw: null, value: initial, readable: false }; }
  }
  const [value, setState] = useState<T>(initialRead.current.value);
  const working = useRef(value);
  const baseline = useRef(initialRead.current.raw);
  const [durable, setDurable] = useState(initialRead.current.readable && decode<T>(initialRead.current.raw, ownerId, slot) !== undefined);
  const invalidInitial = initialRead.current.raw !== null && decode<T>(initialRead.current.raw, ownerId, slot) === undefined;
  const [conflict, setConflict] = useState(invalidInitial);
  const [temporary, setTemporaryState] = useState(false);
  const temporaryRef = useRef(false);
  const conflictRef = useRef(invalidInitial);
  const dirty = useRef(false);
  const markConflict = useCallback(() => { conflictRef.current = true; setConflict(true); setDurable(false); }, []);
  const preserve = (raw: string): boolean => {
    const recoveryKey = `arshiam:mind:recovery:v1:${encodeURIComponent(ownerId || "guest")}:${crypto.randomUUID()}`;
    const retained = JSON.stringify({ ownerId: ownerId || "guest", targetKey: key, raw });
    localStorage.setItem(recoveryKey, retained);
    return localStorage.getItem(recoveryKey) === retained;
  };

  const publish = useCallback((next: T, overwrite = false): boolean => {
    if (!alive.current || identity.current !== key) return false;
    working.current = next;
    setState(next);
    dirty.current = true;
    setDurable(false);
    if (temporaryRef.current) return false;
    try {
      const current = localStorage.getItem(key);
      if (!overwrite && (conflictRef.current || current !== baseline.current)) { markConflict(); return false; }
      if (overwrite && current !== null && !preserve(current)) return false;
      const raw = JSON.stringify({ version: VERSION, owner: ownerId || "guest", slot, updatedAt: Date.now(), value: next } satisfies Envelope<T>);
      localStorage.setItem(key, raw);
      if (localStorage.getItem(key) !== raw) { markConflict(); return false; }
      baseline.current = raw;
      dirty.current = false;
      conflictRef.current = false;
      setConflict(false);
      setDurable(true);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, source: source.current } }));
      return true;
    } catch { return false; }
  }, [key, ownerId, slot, markConflict]);

  const acceptRemote = useCallback((): boolean => {
    if (!alive.current || identity.current !== key) return false;
    try {
      const raw = localStorage.getItem(key);
      const next = decode<T>(raw, ownerId, slot);
      if (raw !== null && next === undefined) { markConflict(); return false; }
      if (!temporaryRef.current && conflictRef.current && !preserve(JSON.stringify({ version: VERSION, owner: ownerId || "guest", slot, updatedAt: Date.now(), value: working.current }))) return false;
      baseline.current = raw;
      working.current = next ?? seed.current;
      setState(working.current);
      dirty.current = false;
      conflictRef.current = false;
      setConflict(false);
      setDurable(raw !== null && !temporaryRef.current);
      return true;
    } catch { setDurable(false); return false; }
  }, [key, ownerId, slot, markConflict]);

  useEffect(() => {
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== null && event.key !== key) return;
      if (event instanceof CustomEvent && (event.detail?.key !== key || event.detail?.source === source.current)) return;
      try {
        if (localStorage.getItem(key) === baseline.current) return;
        // Preserve the visible version even if its prior write was durable: the
        // user may currently be reviewing it, and auto replacement is surprising.
        markConflict();
      } catch { setDurable(false); }
    };
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(EVENT, sync); };
  }, [key, markConflict]);

  const clear = useCallback((): boolean => {
    if (!alive.current || identity.current !== key) return false;
    if (temporaryRef.current) {
      working.current = seed.current;
      setState(seed.current);
      setDurable(false);
      return true;
    }
    try {
      if (conflictRef.current || localStorage.getItem(key) !== baseline.current) { markConflict(); return false; }
      localStorage.removeItem(key);
      if (localStorage.getItem(key) !== null) return false;
      baseline.current = null;
      working.current = seed.current;
      setState(seed.current);
      dirty.current = false;
      setDurable(false);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, source: source.current } }));
      return true;
    } catch { return false; }
  }, [key, markConflict]);

  const setTemporary = useCallback((next: boolean) => {
    temporaryRef.current = next;
    setTemporaryState(next);
    setDurable(false);
    if (!next) return publish(working.current);
    return true;
  }, [publish]);
  return { value, setValue: publish, durable, conflict, acceptRemote, temporary, setTemporary,
    keepLocal: useCallback(() => publish(working.current, true), [publish]), clear };
}
