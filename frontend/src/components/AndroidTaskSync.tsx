import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToTasks } from "@/features/tasks/taskService";

/** Keep native surfaces current even when the user edits from a detail/notes route. */
export default function AndroidTaskSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToTasks(user.id, () => {});
  }, [user?.id]);
  return null;
}
