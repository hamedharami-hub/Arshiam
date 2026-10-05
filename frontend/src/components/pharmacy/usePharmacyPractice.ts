import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  pullPracticeRecords,
  readPracticeRecords,
  savePracticeRecord,
  selectReferralLetters,
  selectScenarioProgress,
  selectStarredPhrases,
  type PharmacyPracticeKind,
  type PharmacyPracticeRecords,
  type PharmacyPracticeSaveResult,
} from "@/lib/pharmacyPracticeSync";

export type PharmacySyncState = "idle" | "syncing" | "synced" | "offline" | "error";

/** Starred phrases, referral drafts and case progress: local-first, synced through Firestore + outbox. */
export function usePharmacyPractice() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<{ userId: string | null; records: PharmacyPracticeRecords }>(() => ({ userId, records: readPracticeRecords(userId) }));
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  const [syncState, setSyncState] = useState<PharmacySyncState>("idle");

  useEffect(() => {
    let active = true;
    let request = 0;
    setSnapshot({ userId, records: readPracticeRecords(userId) });
    setSyncState("idle");
    const pull = async () => {
      if (!userId) return;
      const currentRequest = ++request;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setSyncState("offline");
        return;
      }
      setSyncState("syncing");
      try {
        await pullPracticeRecords(userId);
        if (active && currentUserId.current === userId && currentRequest === request) {
          setSnapshot({ userId, records: readPracticeRecords(userId) });
          setSyncState("synced");
        }
      } catch {
        if (active && currentUserId.current === userId && currentRequest === request) setSyncState("error");
      }
    };
    void pull();
    const handleOnline = () => { void pull(); };
    const handleOffline = () => { request++; setSyncState("offline"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId]);

  const save = useCallback(async <K extends PharmacyPracticeKind>(kind: K, key: string, data: Parameters<typeof savePracticeRecord<K>>[3]): Promise<PharmacyPracticeSaveResult> => {
    const pending = savePracticeRecord(userId, kind, key, data);
    // The local write happens synchronously before the first await inside savePracticeRecord.
    if (currentUserId.current === userId) setSnapshot({ userId, records: readPracticeRecords(userId) });
    const result = await pending;
    if (currentUserId.current === userId) setSnapshot({ userId, records: readPracticeRecords(userId) });
    return result;
  }, [userId]);

  const records = snapshot.userId === userId ? snapshot.records : readPracticeRecords(userId);
  const starred = useMemo(() => selectStarredPhrases(records), [records]);
  const letters = useMemo(() => selectReferralLetters(records), [records]);
  const progress = useMemo(() => selectScenarioProgress(records), [records]);

  return { starred, letters, progress, save, syncState };
}

export type PharmacyPracticeApi = ReturnType<typeof usePharmacyPractice>;
