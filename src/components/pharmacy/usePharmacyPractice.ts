import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [records, setRecords] = useState<PharmacyPracticeRecords>(() => readPracticeRecords(userId));
  const [syncState, setSyncState] = useState<PharmacySyncState>("idle");

  const pull = useCallback(async () => {
    if (!userId) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSyncState("offline");
      return;
    }
    setSyncState("syncing");
    try {
      setRecords(await pullPracticeRecords(userId));
      setSyncState("synced");
    } catch {
      setSyncState("error");
    }
  }, [userId]);

  useEffect(() => {
    setRecords(readPracticeRecords(userId));
    void pull();
    const handleOnline = () => { void pull(); };
    const handleOffline = () => setSyncState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pull, userId]);

  const save = useCallback(async <K extends PharmacyPracticeKind>(kind: K, key: string, data: Parameters<typeof savePracticeRecord<K>>[3]): Promise<PharmacyPracticeSaveResult> => {
    const pending = savePracticeRecord(userId, kind, key, data);
    // The local write happens synchronously before the first await inside savePracticeRecord.
    setRecords(readPracticeRecords(userId));
    const result = await pending;
    setRecords(readPracticeRecords(userId));
    return result;
  }, [userId]);

  const starred = useMemo(() => selectStarredPhrases(records), [records]);
  const letters = useMemo(() => selectReferralLetters(records), [records]);
  const progress = useMemo(() => selectScenarioProgress(records), [records]);

  return { starred, letters, progress, save, syncState };
}

export type PharmacyPracticeApi = ReturnType<typeof usePharmacyPractice>;
