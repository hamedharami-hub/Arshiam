import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { loadSettings } from "@/lib/reminders";
import { readLastRoute } from "@/lib/appNavigation";

const Index = () => {
  const { user, loading } = useAuth();
  const [target, setTarget] = useState<{ uid: string; path: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setTarget(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const s = await loadSettings(user.id);
        if (cancelled) return;
        const lastPath = readLastRoute(user.id);
        if (s?.default_landing === "today") {
          setTarget({ uid: user.id, path: "/app/today" });
        } else if (s?.default_landing === "last" && lastPath) {
          setTarget({ uid: user.id, path: lastPath });
        } else {
          setTarget({ uid: user.id, path: "/app/today" });
        }
      } catch {
        if (!cancelled) setTarget({ uid: user.id, path: "/app/today" });
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!target || target.uid !== user.id) return null;
  return <Navigate to={target.path} replace />;
};
export default Index;
