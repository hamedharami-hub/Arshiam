import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { T, isEn } = useBilingual();

  useEffect(() => {
    if (loading) return;
    console.warn("404 auto-redirecting from:", location.pathname);
    if (user) {
      navigate("/app/today", { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  }, [location.pathname, navigate, user, loading]);

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="flex min-h-screen items-center justify-center bg-background p-4 page-enter">
      <div className="text-center max-w-sm w-full p-6 rounded-3xl bg-card border border-border/60 shadow-xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
          {isEn ? "404" : "۴۰۴"}
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {T("در حال انتقال...", "Redirecting...")}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {T("در حال انتقال به صفحه اصلی برنامه", "Redirecting to the main app screen")}
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Button asChild className="w-full rounded-2xl gap-2">
            <Link to="/app/today">
              <Home className="w-4 h-4" />
              {T("ورود به برنامه (امروز)", "Open App (Today)")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
