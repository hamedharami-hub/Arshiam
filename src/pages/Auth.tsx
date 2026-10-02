import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { AngelLineArt } from "@/components/auth/AngelLineArt";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { safeInternalPath } from "@/lib/safeNavigation";
import { requestPasswordReset } from "@/lib/authService";

const DISCLAIMER_KEY = "clinical_disclaimer_accepted_v1";
const GUEST_LOGIN_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_GUEST_LOGIN === "true";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    user,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsGuest,
  } = useAuth();
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(DISCLAIMER_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [highlightDisclaimer, setHighlightDisclaimer] = useState(false);

  // Next URL redirect handling
  const rawNext = params.get("next") || "";
  const returnTo = safeInternalPath(rawNext);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, navigate, returnTo]);

  const requireDisclaimer = () => {
    if (!accepted) {
      setHighlightDisclaimer(true);
      toast.error(T("لطفاً ابتدا تیک مسئولیت‌نامه بالینی را بزنید.", "Please check and agree to the clinical disclaimer first."));
      setTimeout(() => setHighlightDisclaimer(false), 2500);
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireDisclaimer()) return;
    if (!email.trim() || !password) {
      toast.error(T("لطفاً ایمیل و رمز عبور را وارد کنید.", "Please enter email and password."));
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(email, password);
      if (res.success) {
        toast.success(T("خوش آمدید! ورود موفقیت‌آمیز بود.", "Welcome! Signed in successfully."));
        navigate(returnTo, { replace: true });
      } else {
        toast.error(res.error || T("خطا در ورود به حساب کاربری.", "Failed to sign in."));
      }
    } catch (err: any) {
      toast.error(err?.message || T("خطا در برقراری ارتباط.", "Connection error."));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireDisclaimer()) return;
    if (!email.trim() || !password) {
      toast.error(T("لطفاً اطلاعات لازم را وارد کنید.", "Please enter the required information."));
      return;
    }
    if (password.length < 6) {
      toast.error(T("رمز عبور باید حداقل ۶ کاراکتر باشد.", "Password must be at least 6 characters."));
      return;
    }

    setLoading(true);
    try {
      const res = await signUpWithEmail(email, password, name);
      if (res.success) {
        toast.success(T("حساب کاربری با موفقیت ساخته شد و وارد شدید!", "Account created successfully! Welcome."));
        navigate(returnTo, { replace: true });
      } else {
        toast.error(res.error || T("خطا در ساخت حساب کاربری.", "Failed to create account."));
      }
    } catch (err: any) {
      toast.error(err?.message || T("خطا در ساخت حساب.", "Error creating account."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireDisclaimer()) return;
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        toast.success(T("ورود با حساب گوگل با موفقیت انجام شد.", "Signed in with Google successfully."));
        navigate(returnTo, { replace: true });
      } else {
        toast.error(res.error || T("ورود با گوگل انجام نشد.", "Google sign in failed."));
      }
    } catch (err: any) {
      toast.error(err?.message || T("ورود با گوگل انجام نشد.", "Google sign in failed."));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      toast.error(T("ابتدا ایمیل حساب را وارد کنید.", "Enter your account email first."));
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      toast.success(T("اگر این ایمیل حسابِ رمزدار داشته باشد، پیام بازیابی ارسال می‌شود. پوشهٔ اسپم را هم بررسی کنید.", "If this email has a password account, a reset email will arrive. Check spam too."));
    } catch (err: any) {
      toast.error(err?.code === "auth/invalid-email"
        ? T("فرمت ایمیل درست نیست.", "Enter a valid email address.")
        : T("ارسال ایمیل بازیابی انجام نشد؛ تنظیمات Email/Password در Firebase را بررسی کنید.", "Could not send a reset email. Check Firebase Email/Password settings."));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!requireDisclaimer()) return;
    setLoading(true);
    try {
      const res = await signInAsGuest(T("کاربر مهمان", "Guest User"));
      if (res.success) {
        toast.success(T("ورود سریع به عنوان مهمان انجام شد.", "Guest login successful."));
        navigate(returnTo, { replace: true });
      } else {
        toast.error(res.error || T("ورود مهمان انجام نشد.", "Guest login failed."));
      }
    } catch (e: any) {
      toast.error(e?.message || T("خطا در ورود سریع.", "Quick login error."));
    } finally {
      setLoading(false);
    }
  };

  const signup = mode === "signup";
  const disclaimer = (
    <label
      className={`flex cursor-pointer select-none items-start gap-2.5 rounded-lg py-1.5 text-[12px] leading-6 transition-colors duration-300 ${highlightDisclaimer ? "bg-[hsl(var(--auth-line)/0.14)] px-2 ring-1 ring-[hsl(var(--auth-line))]" : ""}`}
      style={{ color: "hsl(var(--auth-muted))" }}
      data-testid="auth-disclaimer"
    >
      <Checkbox
        id="disclaimer-checkbox"
        checked={accepted}
        onCheckedChange={(v) => {
          const ok = v === true;
          setAccepted(ok);
          if (ok) localStorage.setItem(DISCLAIMER_KEY, "1");
          else localStorage.removeItem(DISCLAIMER_KEY);
        }}
        className="mt-1 h-4 w-4 rounded-[5px] border-[hsl(var(--auth-line))] data-[state=checked]:border-[hsl(var(--auth-ink))] data-[state=checked]:bg-[hsl(var(--auth-ink))] data-[state=checked]:text-[hsl(var(--auth-bg))]"
        data-testid="auth-disclaimer-checkbox"
      />
      <span>{T("می‌دانم ارشناز ابزار خودمراقبتی است و جایگزین درمان یا دارو نیست.", "I understand ARSHNAZ is a self-care tool, not a substitute for therapy or medication.")}</span>
    </label>
  );
  const fieldLabel = "block text-[11px] font-medium tracking-wide";
  const submitCls = "h-12 w-full rounded-full bg-[hsl(var(--auth-ink))] text-sm font-medium text-[hsl(var(--auth-bg))] shadow-[0_10px_30px_-12px_hsl(var(--auth-ink)/0.55)] transition-[transform,box-shadow,opacity] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-14px_hsl(var(--auth-ink)/0.6)] disabled:opacity-60";

  return (
    <main dir={isEn ? "ltr" : "rtl"} className="auth-theme auth-grain relative min-h-screen overflow-hidden" data-testid="auth-page">
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-2">
        <section className="relative flex flex-col items-center justify-center px-6 pb-2 pt-10 lg:py-14" data-testid="auth-art-panel">
          <p className="auth-wordmark auth-rise absolute top-7 start-6 text-[13px] sm:start-10" style={{ color: "hsl(var(--auth-ink))" }} data-testid="auth-wordmark">ARSHNAZ</p>
          <AngelLineArt className="h-56 w-auto sm:h-72 lg:h-[30rem]" />
        </section>

        <section className="relative flex items-center justify-center px-6 pb-12 pt-4 lg:border-s lg:border-[hsl(var(--auth-rule)/0.7)] lg:py-14">
          <div className="auth-rise w-full max-w-[22rem] space-y-7" style={{ animationDelay: "250ms" }}>
            <header className="space-y-2">
              <h1 className="text-[1.75rem] font-light leading-[1.4] sm:text-[2rem]" data-testid="auth-title">
                {signup ? T("ساخت حساب تازه", "Create your account") : T("ورود به حساب کاربری", "Sign in to your account")}
              </h1>
              <p className="text-sm font-light" style={{ color: "hsl(var(--auth-muted))" }}>
                {signup ? T("چند ثانیه، و برنامه‌ات آماده است.", "A few seconds and your space is ready.") : T("خوش برگشتی؛ امروزت منتظر توست.", "Welcome back; your day is waiting.")}
              </p>
            </header>

            <form onSubmit={signup ? handleSignUp : handleSignIn} className="space-y-5" data-testid={signup ? "auth-signup-form" : "auth-signin-form"}>
              {signup && (
                <label className="block space-y-1">
                  <span className={fieldLabel} style={{ color: "hsl(var(--auth-muted))" }}>{T("نام", "Name")}</span>
                  <input id="name-up" required autoComplete="name" placeholder={T("نام شما", "Your name")} value={name} onChange={(e) => setName(e.target.value)} className="auth-field" data-testid="name-up-input" />
                </label>
              )}
              <label className="block space-y-1">
                <span className={fieldLabel} style={{ color: "hsl(var(--auth-muted))" }}>{T("ایمیل", "Email")}</span>
                <input id={signup ? "email-up" : "email-in"} type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-field text-left" data-testid={signup ? "email-up-input" : "email-in-input"} />
              </label>
              <label className="block space-y-1">
                <span className="flex items-center justify-between">
                  <span className={fieldLabel} style={{ color: "hsl(var(--auth-muted))" }}>{signup ? T("رمز عبور (حداقل ۶ نویسه)", "Password (6+ characters)") : T("رمز عبور", "Password")}</span>
                  {!signup && (
                    <button type="button" className="text-[11px] underline-offset-4 hover:underline disabled:opacity-50" style={{ color: "hsl(var(--auth-line))" }} disabled={loading} onClick={handlePasswordReset} data-testid="auth-forgot-password">
                      {T("فراموش کرده‌ام", "Forgot?")}
                    </button>
                  )}
                </span>
                <PasswordInput id={signup ? "pass-up" : "pass-in"} value={password} onChange={setPassword} minLength={signup ? 6 : undefined} show={showPassword} onToggle={() => setShowPassword(!showPassword)} labels={[T("نمایش رمز", "Show password"), T("پنهان کردن رمز", "Hide password")]} />
              </label>
              {disclaimer}
              <button type="submit" className={submitCls} disabled={loading} data-testid={signup ? "auth-signup-submit" : "auth-signin-submit"}>
                {loading ? (signup ? T("در حال ساخت حساب…", "Creating account…") : T("در حال ورود…", "Signing in…")) : signup ? T("ساخت حساب", "Create account") : T("ورود به حساب", "Sign in")}
              </button>
            </form>

            <div className="flex items-center gap-4 text-[11px]" style={{ color: "hsl(var(--auth-muted))" }}>
              <span className="h-px flex-1 bg-[hsl(var(--auth-rule))]" />{T("یا", "or")}<span className="h-px flex-1 bg-[hsl(var(--auth-rule))]" />
            </div>

            <button type="button" onClick={handleGoogle} disabled={loading} data-testid="auth-google"
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[hsl(var(--auth-rule))] text-sm transition-colors duration-300 hover:border-[hsl(var(--auth-line))] hover:bg-[hsl(var(--auth-paper))] disabled:opacity-60">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {T("ادامه با Google", "Continue with Google")}
            </button>

            <p className="text-center text-[13px]" style={{ color: "hsl(var(--auth-muted))" }}>
              {signup ? T("حساب داری؟", "Have an account?") : T("حساب نداری؟", "New here?")}{" "}
              <button type="button" onClick={() => setMode(signup ? "signin" : "signup")} className="font-medium underline-offset-4 hover:underline" style={{ color: "hsl(var(--auth-ink))" }} data-testid={signup ? "auth-tab-signin" : "auth-tab-signup"}>
                {signup ? T("وارد شو", "Sign in") : T("ساخت حساب", "Create one")}
              </button>
            </p>

            {GUEST_LOGIN_ENABLED && (
              <button type="button" onClick={handleGuestLogin} disabled={loading} className="w-full text-center text-xs underline-offset-4 hover:underline" style={{ color: "hsl(var(--auth-muted))" }}>
                {T("ورود آزمایشی", "Guest login")}
              </button>
            )}
          </div>
        </section>
      </div>
      <p className="relative pb-5 text-center text-[11px] font-light" style={{ color: "hsl(var(--auth-muted) / 0.8)" }} data-testid="auth-dedication">{t("auth.dedication")}</p>
    </main>
  );
}

function PasswordInput({ id, value, onChange, minLength, show, onToggle, labels }: {
  id: string; value: string; onChange: (v: string) => void; minLength?: number; show: boolean; onToggle: () => void; labels: [string, string];
}) {
  return (
    <span className="relative block">
      <input id={id} type={show ? "text" : "password"} required minLength={minLength} autoComplete={id === "pass-up" ? "new-password" : "current-password"} placeholder="••••••••" dir="ltr" value={value}
        onChange={(e) => onChange(e.target.value)} className="auth-field pr-10 text-left" data-testid={`${id}-input`} />
      <button type="button" onClick={onToggle} aria-label={show ? labels[1] : labels[0]} data-testid={`${id}-toggle`}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center opacity-60 transition-opacity hover:opacity-100">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  );
}
