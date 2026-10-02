import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldAlert, CheckCircle, Sparkles, User, Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const disclaimer = (
    <label
      className={`flex cursor-pointer select-none items-start gap-2.5 rounded-xl border p-3 text-xs leading-6 transition-colors duration-300 ${
        highlightDisclaimer ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30" : "border-amber-500/30 bg-amber-500/5"
      }`}
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
        className="mt-1 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        data-testid="auth-disclaimer-checkbox"
      />
      <span>
        <ShieldAlert className="me-1 inline h-3.5 w-3.5 text-amber-600" />
        <span className="font-semibold text-foreground">{T("یادآوری بالینی: ", "Clinical note: ")}</span>
        {T("این اپ ابزار خودمدیریتی است و جایگزین درمان یا دارو نیست. با ورود، این را می‌پذیرم.", "This app is a self-management tool, not a substitute for therapy or medication. I accept this.")}
      </span>
    </label>
  );
  const pwLabels: [string, string] = [T("نمایش رمز", "Show password"), T("پنهان کردن رمز", "Hide password")];
  const inputCls = "h-11 rounded-xl text-sm";

  return (
    <main dir={isEn ? "ltr" : "rtl"} className="min-h-screen bg-background p-3 sm:p-5" data-testid="auth-page">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-6xl gap-4 sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <AuthBrandPanel fa={!isEn} dedication={t("auth.dedication")} />

        <section className="flex items-center justify-center py-2 lg:py-8">
          <div className="w-full max-w-md space-y-5">
            <header className="space-y-1">
              <h1 className="text-2xl font-bold sm:text-3xl">{T("خوش برگشتی", "Welcome back")}</h1>
              <p className="text-sm text-muted-foreground">{T("وارد شو تا برنامهٔ امروزت را ببینی.", "Sign in to see today's plan.")}</p>
            </header>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="signin" className="h-9 rounded-lg text-sm font-medium" data-testid="auth-tab-signin">
                  <LogIn className="me-1.5 h-4 w-4" />{T("ورود", "Sign In")}
                </TabsTrigger>
                <TabsTrigger value="signup" className="h-9 rounded-lg text-sm font-medium" data-testid="auth-tab-signup">
                  <UserPlus className="me-1.5 h-4 w-4" />{T("ثبت‌نام", "Sign Up")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="focus:outline-none">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Field id="email-in" label={T("ایمیل", "Email")} icon={Mail}>
                    <Input id="email-in" type="email" required placeholder="name@example.com" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} font-mono`} data-testid="email-in-input" />
                  </Field>
                  <Field id="pass-in" label={T("رمز عبور", "Password")} icon={Lock}>
                    <PasswordInput id="pass-in" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} labels={pwLabels} />
                  </Field>
                  <div className="flex justify-end">
                    <button type="button" className="text-xs font-medium text-primary hover:underline disabled:opacity-50" disabled={loading} onClick={handlePasswordReset} data-testid="auth-forgot-password">
                      {T("رمز عبور را فراموش کرده‌ام", "Forgot password?")}
                    </button>
                  </div>
                  {disclaimer}
                  <Button type="submit" className="h-11 w-full rounded-xl text-sm font-bold shadow-sm transition-shadow hover:shadow-md" disabled={loading} data-testid="auth-signin-submit">
                    {loading ? T("در حال ورود...", "Signing in...") : T("ورود به حساب", "Sign In")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="focus:outline-none">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Field id="name-up" label={T("نام و نام خانوادگی", "Full Name")} icon={User}>
                    <Input id="name-up" required placeholder={T("مثال: حامد حرامی", "e.g. John Doe")} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} data-testid="name-up-input" />
                  </Field>
                  <Field id="email-up" label={T("ایمیل", "Email")} icon={Mail}>
                    <Input id="email-up" type="email" required placeholder="name@example.com" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} font-mono`} data-testid="email-up-input" />
                  </Field>
                  <Field id="pass-up" label={T("رمز عبور (حداقل ۶ نویسه)", "Password (min 6 characters)")} icon={Lock}>
                    <PasswordInput id="pass-up" value={password} onChange={setPassword} minLength={6} show={showPassword} onToggle={() => setShowPassword(!showPassword)} labels={pwLabels} />
                  </Field>
                  {disclaimer}
                  <Button type="submit" className="h-11 w-full rounded-xl text-sm font-bold shadow-sm transition-shadow hover:shadow-md" disabled={loading} data-testid="auth-signup-submit">
                    {loading ? T("در حال ثبت‌نام...", "Creating account...") : T("ساخت حساب کاربری", "Create Account")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />{T("یا", "or")}<span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" className="h-11 w-full rounded-xl text-sm font-medium" onClick={handleGoogle} disabled={loading} data-testid="auth-google">
              <svg className="me-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {T("ادامه با حساب Google", "Continue with Google")}
            </Button>

            {GUEST_LOGIN_ENABLED && (
              <Button type="button" variant="ghost" size="sm" onClick={handleGuestLogin} disabled={loading} className="w-full gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />{T("ورود آزمایشی و سریع (بدون نیاز به رمز)", "Quick Guest Login (No password needed)")}
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </Label>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, minLength, show, onToggle, labels }: {
  id: string; value: string; onChange: (v: string) => void; minLength?: number; show: boolean; onToggle: () => void; labels: [string, string];
}) {
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} required minLength={minLength} placeholder="••••••••" dir="ltr" value={value}
        onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl pe-11 font-mono text-sm" data-testid={`${id}-input`} />
      <button type="button" onClick={onToggle} aria-label={show ? labels[1] : labels[0]} data-testid={`${id}-toggle`}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
