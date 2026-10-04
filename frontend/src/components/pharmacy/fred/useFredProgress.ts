import { useCallback, useEffect, useRef, useState } from "react";
import {
  archiveLegacyProgress, archiveLegacyToCloud, createFirestoreRemote, emptyRecord, flushOutbox, loadLocalProgress, loadOutbox,
  mergeProgress, purgeForeignOutboxes, pushRecord, saveLocalProgress,
  type FredProgressRecord, type FredRemote, type FredStatus, type SaveState,
} from "./fredProgress";

export type LoadState = "loading" | "ready" | "error";
export interface ProgressPatch { status?: FredStatus; stepIndex?: number; attemptId?: string }

const defaultRemote = createFirestoreRemote();
export const isCloudUser = (uid: string) => !!uid && uid !== "guest" && uid !== "anonymous-kb-user";

export function useFredProgress(uid: string, remote: FredRemote = defaultRemote) {
  const cloud = isCloudUser(uid);
  const [records, setRecords] = useState<Record<string, FredProgressRecord>>(() => loadLocalProgress(uid));
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>(() => {
    const out: Record<string, SaveState> = {};
    for (const [id, item] of Object.entries(loadOutbox(uid))) out[id] = item.failed ? "failed" : "queued";
    return out;
  });
  const [loadState, setLoadState] = useState<LoadState>(cloud ? "loading" : "ready");
  const recordsRef = useRef(records);
  recordsRef.current = records;

  const commit = useCallback((next: Record<string, FredProgressRecord>) => {
    recordsRef.current = next;
    setRecords(next);
    saveLocalProgress(uid, next);
  }, [uid]);

  const applyResults = useCallback((results: Record<string, { state: SaveState; merged: FredProgressRecord }>) => {
    const next = { ...recordsRef.current };
    const states: Record<string, SaveState> = {};
    for (const [id, r] of Object.entries(results)) {
      states[id] = r.state;
      next[id] = next[id] ? mergeProgress(next[id], r.merged) : r.merged;
    }
    commit(next);
    setSaveStates(prev => ({ ...prev, ...states }));
  }, [commit]);

  const load = useCallback(async () => {
    if (!cloud) { setLoadState("ready"); return; }
    setLoadState("loading");
    purgeForeignOutboxes(uid);
    const legacy = archiveLegacyProgress(uid);
    if (legacy !== null) void archiveLegacyToCloud(uid, legacy).catch(() => undefined);
    try {
      const remoteList = await remote.list(uid);
      const next = { ...recordsRef.current };
      for (const rec of remoteList) next[rec.lessonId] = next[rec.lessonId] ? mergeProgress(next[rec.lessonId], rec) : rec;
      commit(next);
      applyResults(await flushOutbox(uid, remote));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [applyResults, cloud, commit, remote, uid]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!cloud) return;
    const onOnline = () => { void flushOutbox(uid, remote).then(applyResults); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [applyResults, cloud, remote, uid]);

  const update = useCallback(async (lessonId: string, patch: ProgressPatch) => {
    const current = recordsRef.current[lessonId] ?? emptyRecord(lessonId);
    const candidate: FredProgressRecord = {
      lessonId,
      status: patch.status ?? current.status,
      stepIndex: patch.stepIndex ?? current.stepIndex,
      attemptId: patch.attemptId ?? current.attemptId,
      updatedAt: Math.max(Date.now(), current.updatedAt + 1),
    };
    const unchanged = candidate.status === current.status && candidate.stepIndex === current.stepIndex && candidate.attemptId === current.attemptId;
    if (unchanged && current.updatedAt > 0) return;
    const next = { ...recordsRef.current, [lessonId]: mergeProgress(current, candidate) };
    commit(next);
    if (!cloud) return;
    const { state, merged } = await pushRecord(uid, next[lessonId], remote);
    applyResults({ [lessonId]: { state, merged } });
  }, [applyResults, cloud, commit, remote, uid]);

  const retry = useCallback(async () => {
    if (!cloud) return;
    if (loadState === "error") { await load(); return; }
    applyResults(await flushOutbox(uid, remote));
  }, [applyResults, cloud, load, loadState, remote, uid]);

  return { records, saveStates, loadState, cloud, update, retry };
}
