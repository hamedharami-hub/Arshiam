import { firebaseStore } from "@/lib/firebaseStore";
import { auth, db, doc, collection, query, where, getDocs, getDoc, deleteDoc, limit } from "@/lib/firebase";
import { runTransaction, writeBatch } from "firebase/firestore";
import { cycleTombstoneRef } from "./cyclePersistence";

/** Store the active profile on the user's settings record, creating it when absent. */
export function persistActiveCycleProfile(userId: string, profileId: string | null) {
  return firebaseStore
    .from("user_settings")
    .upsert({ user_id: userId, active_cycle_profile_id: profileId }, { onConflict: "user_id" });
}

/** Fence first, then clean up. The small permanent tombstone prevents resurrection on stale devices. */
export async function deleteCycleProfileAndLogs(profileId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) return { error: new Error("Sign in before deleting a profile.") };
  const assertAccount = () => { if (auth.currentUser?.uid !== userId) throw new Error("Account changed; deletion remains retryable."); };
  try {
    const marker = cycleTombstoneRef(userId, profileId);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(marker);
      assertAccount();
      if (!existing.exists()) transaction.set(marker, { deleted: true, requested_at: new Date().toISOString() });
    });
    // A log writer reads this tombstone in its transaction. Published Rules also enforce it for old clients.
    const logsQuery = query(collection(db, "users", userId, "cycle_logs"), where("profile_id", "==", profileId), limit(400));
    while (true) {
      assertAccount();
      const logs = await getDocs(logsQuery);
      if (logs.empty) break;
      const batch = writeBatch(db);
      logs.docs.forEach((log) => batch.delete(log.ref));
      assertAccount();
      await batch.commit();
    }
    assertAccount();
    const profile = doc(db, "users", userId, "cycle_profiles", profileId);
    await deleteDoc(profile);
    const [remainingLogs, remainingProfile] = await Promise.all([getDocs(logsQuery), getDoc(profile)]);
    if (!remainingLogs.empty || remainingProfile.exists()) throw new Error("Deletion is incomplete; retry cleanup.");
    return { error: null };
  } catch (cause) {
    return { error: cause instanceof Error ? cause : new Error(String(cause)) };
  }
}
