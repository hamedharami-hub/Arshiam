import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    const nextPath = location.pathname + location.search + location.hash;
    const search = nextPath && nextPath !== "/" && nextPath !== "/app" ? `?next=${encodeURIComponent(nextPath)}` : "";
    return <Navigate to={`/auth${search}`} replace />;
  }
  return <>{children}</>;
}
