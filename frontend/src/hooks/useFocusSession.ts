import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { bindFocusAccount, getFocusState, subscribeFocus } from "@/lib/focusSession";
export function useFocusSession() {
  const { user } = useAuth();
  const id = user?.id ?? null;
  useEffect(() => { bindFocusAccount(id); }, [id]);
  const focus = useSyncExternalStore(subscribeFocus, getFocusState, getFocusState);
  // Never expose another account's session during the effect boundary.
  return focus.userId === id ? focus : null;
}
