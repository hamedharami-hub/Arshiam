import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";

export function useUserRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setIsAdmin(false); setLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        // Custom claims live on the real Firebase session. `user` from useAuth is
        // the plain AppUser projection built in useAuth.tsx, which has no
        // getIdTokenResult(), so the previous call always resolved to undefined
        // and isAdmin stayed false for every account (hiding /app/admin).
        await auth.authStateReady();
        const tokenResult = await auth.currentUser?.getIdTokenResult();
        if (!mounted) return;
        const claims = tokenResult?.claims || {};
        setIsAdmin(claims.admin === true || claims.role === "admin");
      } catch {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  return { isAdmin, loading };
}
