import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldAlert, CheckCircle, Sparkles, User, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { safeInternalPath } from "@/lib/safeNavigation";

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

  return (
    <main
      dir={isEn ? "ltr" : "rtl"}
      className="min-h-screen flex items-start justify-center overflow-y-auto bg-gradient-to-br from-pink-50/70 via-background to-purple-50/70 dark:from-pink-950/20 dark:via-background dark:to-purple-950/20 p-4 sm:p-6"
    >
      <Card className="w-full max-w-md my-auto p-6 sm:p-8 shadow-xl border border-border/70 rounded-2xl bg-card backdrop-blur-sm">
        {/* App Branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img
            src="/favicon.png"
            alt="ARSHNAZ"
            className="w-16 h-16 rounded-2xl shadow-md mb-3 ring-2 ring-primary/20 object-cover"
            width={64}
            height={64}
          />
          <h1 className="text-3xl font-black tracking-wide bg-gradient-to-l from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            ARSHNAZ
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 my-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {T("آماده برای برنامه‌ریزی و تمرکز", "Ready for Planning & Focus")}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {isEn ? "Arshnaz · Manage tasks with love" : "ارشناز · هوشمند، بالینی و متمرکز"}
          </p>
          <p className="text-[11px] text-pink-600 dark:text-pink-400 mt-1 flex items-center gap-1">
            {t("auth.dedication")}
          </p>
        </div>

        {/* Clinical Disclaimer Box */}
        <Alert
          className={`mb-5 transition-all duration-300 border ${
            highlightDisclaimer
              ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/15"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5" />
          <AlertDescription className={`text-xs leading-relaxed ${isEn ? "text-left" : "text-right"}`}>
            <span className="font-semibold text-foreground">{T("یادآوری بالینی: ", "Clinical Note: ")}</span>
            {T("این اپ یک ابزار خودمدیریتی است و جایگزین درمان بالینی یا دارودرمانی نیست.", "This app is a self-management tool and is not a substitute for clinical therapy or medical treatment.")}
            <label className="flex items-center gap-2.5 mt-2.5 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
              <Checkbox
                id="disclaimer-checkbox"
                checked={accepted}
                onCheckedChange={(v) => {
                  const ok = v === true;
                  setAccepted(ok);
                  if (ok) {
                    localStorage.setItem(DISCLAIMER_KEY, "1");
                  } else {
                    localStorage.removeItem(DISCLAIMER_KEY);
                  }
                }}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-xs font-semibold text-foreground">
                {T("مسئولیت‌نامه را مطالعه کردم و می‌پذیرم.", "I have read and agree to the clinical disclaimer.")}
              </span>
            </label>
          </AlertDescription>
        </Alert>

        {/* Auth Forms */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-5 bg-muted/70 p-1 rounded-xl">
            <TabsTrigger value="signin" className="rounded-lg text-xs sm:text-sm font-medium">
              <LogIn className="w-3.5 h-3.5 me-1.5" />
              {T("ورود", "Sign In")}
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg text-xs sm:text-sm font-medium">
              <UserPlus className="w-3.5 h-3.5 me-1.5" />
              {T("ثبت‌نام", "Sign Up")}
            </TabsTrigger>
          </TabsList>

          {/* Sign In Form */}
          <TabsContent value="signin" className="focus:outline-none">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-in" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {T("ایمیل", "Email")}
                </Label>
                <Input
                  id="email-in"
                  type="email"
                  required
                  placeholder="name@example.com"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass-in" className="text-xs font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  {T("رمز عبور", "Password")}
                </Label>
                <Input
                  id="pass-in"
                  type="password"
                  required
                  placeholder="••••••••"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold shadow-md hover:shadow-lg transition-all"
                disabled={loading}
              >
                {loading ? T("در حال ورود...", "Signing in...") : T("ورود به حساب", "Sign In")}
              </Button>
            </form>
          </TabsContent>

          {/* Sign Up Form */}
          <TabsContent value="signup" className="focus:outline-none">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name-up" className="text-xs font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {T("نام و نام خانوادگی", "Full Name")}
                </Label>
                <Input
                  id="name-up"
                  required
                  placeholder={T("مثال: حامد حرامی", "e.g. John Doe")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-up" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {T("ایمیل", "Email")}
                </Label>
                <Input
                  id="email-up"
                  type="email"
                  required
                  placeholder="name@example.com"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass-up" className="text-xs font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  {T("رمز عبور (حداقل ۶ نویسه)", "Password (min 6 characters)")}
                </Label>
                <Input
                  id="pass-up"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold shadow-md hover:shadow-lg transition-all"
                disabled={loading}
              >
                {loading ? T("در حال ثبت‌نام...", "Creating account...") : T("ساخت حساب کاربری", "Create Account")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground font-medium">{T("یا ورود سریع با", "or continue with")}</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-border/80 hover:bg-muted/50 font-medium text-xs sm:text-sm py-5"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg className="w-4 h-4 me-2 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {T("ادامه با حساب Google", "Continue with Google")}
        </Button>

        {GUEST_LOGIN_ENABLED && (
          <div className="mt-3 pt-3 border-t border-dashed border-border/70 flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGuestLogin}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-foreground font-medium gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {T("ورود آزمایشی و سریع (بدون نیاز به رمز)", "Quick Guest Login (No password needed)")}
            </Button>
          </div>
        )}
      </Card>

    </main>
  );
}
