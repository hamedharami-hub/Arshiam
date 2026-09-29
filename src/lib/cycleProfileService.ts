import { firebaseStore } from "@/lib/firebaseStore";

/** Store the active profile on the user's settings record, creating it when absent. */
export function persistActiveCycleProfile(userId: string, profileId: string | null) {
  return firebaseStore
    .from("user_settings")
    .upsert({ user_id: userId, active_cycle_profile_id: profileId }, { onConflict: "user_id" });
}

/**
 * Delete a profile defensively. The second log cleanup catches a write from a
 * stale device that races the first cleanup, and verification prevents the UI
 * from announcing success while either the profile or any log remains.
 */
export async function deleteCycleProfileAndLogs(profileId: string) {
  const deleteLogs = () => firebaseStore.from("cycle_logs").delete().eq("profile_id", profileId);
  const firstLogs = await deleteLogs();
  if (firstLogs.error) return { error: firstLogs.error };

  const profileDelete = await firebaseStore.from("cycle_profiles").delete().eq("id", profileId);
  if (profileDelete.error) return { error: profileDelete.error };

  const secondLogs = await deleteLogs();
  if (secondLogs.error) return { error: secondLogs.error };

  const [remainingLogs, remainingProfiles] = await Promise.all([
    firebaseStore.from("cycle_logs").select("id").eq("profile_id", profileId),
    firebaseStore.from("cycle_profiles").select("id").eq("id", profileId),
  ]);
  const verificationError = remainingLogs.error || remainingProfiles.error;
  if (verificationError) return { error: verificationError };
  if ((remainingLogs.data?.length || 0) > 0 || (remainingProfiles.data?.length || 0) > 0) {
    return { error: new Error("Cycle profile deletion is incomplete; data still remains.") };
  }
  return { error: null };
}
