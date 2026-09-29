import { firebaseStore } from "@/lib/firebaseStore";

/** Store the active profile on the user's settings record, creating it when absent. */
export function persistActiveCycleProfile(userId: string, profileId: string | null) {
  return firebaseStore
    .from("user_settings")
    .upsert({ user_id: userId, active_cycle_profile_id: profileId }, { onConflict: "user_id" });
}

/** Remove a profile's logs first, and keep the profile if that cleanup fails. */
export async function deleteCycleProfileAndLogs(profileId: string) {
  const { error: logsError } = await firebaseStore
    .from("cycle_logs")
    .delete()
    .eq("profile_id", profileId);
  if (logsError) return { error: logsError };

  const { error: profileError } = await firebaseStore
    .from("cycle_profiles")
    .delete()
    .eq("id", profileId);
  return { error: profileError };
}
