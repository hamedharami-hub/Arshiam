import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const OAUTH_RETURN_KEY = "oauth_return_to";
// If Firebase never resolves, do not leave the user staring at a spinner forever.
const RESOLVE_TIMEOUT_MS = 15_000;

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app/today";
  return value;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setFailed(true), RESOLVE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }

    if (user) {
      const target = safeReturnPath(sessionStorage.getItem(OAUTH_RETURN_KEY));
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      navigate(target, { replace: true });
      return;
    }

    setFailed(true);
  }, [user, loading, navigate]);

  const retry = async () => {
    setRetrying(true);
    try {
      await signInWithGoogle();
    } finally {
      setRetrying(false);
    }
  };

  if (!failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background" data-testid="auth-callback-loading">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{T("در حال تکمیل ورود…", "Completing sign-in…")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center" data-testid="auth-callback-error">
      <p className="text-sm text-destructive">{T("تکمیل ورود انجام نشد.", "Sign-in could not be completed.")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" disabled={retrying} onClick={retry} className="gap-1" data-testid="auth-callback-retry">
          {retrying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {T("تلاش دوباره", "Try again")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/auth", { replace: true })} data-testid="auth-callback-back">
          {T("بازگشت به ورود", "Back to sign in")}
        </Button>
      </div>
    </div>
  );
}
