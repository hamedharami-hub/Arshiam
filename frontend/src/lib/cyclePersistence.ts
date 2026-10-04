import { auth, db, doc } from "@/lib/firebase";
import { runTransaction } from "firebase/firestore";

export function cycleTombstoneRef(userId: string, profileId: string) {
  return doc(db, "users", userId, "cycle_profile_tombstones", profileId);
}

/** All current-client profile/log writes participate in the deletion fence transaction. */
export async function writeCycleRecord(userId: string, table: string, row: Record<string, any>) {
  const profileId = table === "cycle_profiles" ? row.id : row.profile_id;
  if (typeof profileId !== "string" || !profileId) throw new Error("A valid cycle profile is required.");
  const reference = doc(db, "users", userId, table, row.id);
  await runTransaction(db, async (transaction) => {
    const marker = await transaction.get(cycleTombstoneRef(userId, profileId));
    const profile = await transaction.get(doc(db, "users", userId, "cycle_profiles", profileId));
    if (auth.currentUser?.uid !== userId) throw new Error("Account changed.");
    if (marker.exists() || (table === "cycle_logs" && !profile.exists())) {
      throw new Error("این پروفایل حذف شده یا در حال حذف است؛ ثبت جدید مجاز نیست.");
    }
    transaction.set(reference, row, { merge: true });
  });
}
