import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useUserRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        // Only trust verified Firebase Auth token custom claims, never user-editable Firestore documents
        const tokenResult = await (user as any).getIdTokenResult?.();
        if (mounted) {
          const claims = tokenResult?.claims || {};
          setIsAdmin(Boolean(claims.admin === true || claims.role === "admin"));
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  return { isAdmin, loading };
}
