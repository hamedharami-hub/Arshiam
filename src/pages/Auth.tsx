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
import GoogleDirectDialog from "@/components/auth/GoogleDirectDialog";

const DISCLAIMER_KEY = "clinical_disclaimer_accepted_v1";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    user,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGoogleDirect,
    signInAsGuest,
  } = useAuth();
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");

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
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [highlightDisclaimer, setHighlightDisclaimer] = useState(false);

  // Next URL redirect handling
  const rawNext = params.get("next") || "";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const returnTo = safeNext || "/app/today";

  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, navigate, returnTo]);

  const requireDisclaimer = () => {
    if (!accepted) {
      setHighlightDisclaimer(true);
      toast.error("لطفاً ابتدا تیک مسئولیت‌نامه بالینی را بزنید.");
      setTimeout(() => setHighlightDisclaimer(false), 2500);
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireDisclaimer()) return;
    if (!email.trim() || !password) {
      toast.error("لطفاً ایمیل و رمز عبور را وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(email, password);
      if (res.success) {
        toast.success("خوش آمدید! ورود موفقیت‌آمیز بود.");
        navigate(returnTo, { replace: true });
      } else {
        toast.error(res.error || "خطا در ورود به حساب کاربری.");
      }
    } catch (err: any) {
      toast.error(err?.message || "خطا در برقراری ارتباط.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireDisclaimer()) return;
    if (!email.trim() || !password) {
      toast.error("لطفاً اطلاعات لازم را وارد کنید.");
      return;
    }
    if (password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    setLoading(true);
    try {
      const res = await signUpWithEmail(email, password, name);
      if (res.success) {
        toast.success("حساب کاربری با موفقیت ساخته شد و وارد شدید!");
        navigate(returnTo, { replace: true });
      } else {
        toast.error(res.error || "خطا در ساخت حساب کاربری.");
      }
    } catch (err: any) {
      toast.error(err?.message || "خطا در ساخت حساب.");
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
        toast.success("ورود با حساب گوگل با موفقیت انجام شد.");
        navigate(returnTo, { replace: true });
      } else if (res.fallbackNeeded) {
        // Show seamless direct Google account dialog
        setShowGoogleDialog(true);
      } else {
        toast.error(res.error || "ورود با گوگل انجام نشد.");
      }
    } catch (err: any) {
      setShowGoogleDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (accountEmail: string, accountName?: string) => {
    setLoading(true);
    try {
      const res = await signInWithGoogleDirect(accountEmail, accountName);
      if (res.success) {
        setShowGoogleDialog(false);
        toast.success("ورود با حساب گوگل تأیید شد!");
        navigate(returnTo, { replace: true });
      }
    } catch (e: any) {
      toast.error(e?.message || "خطا در ورود.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!requireDisclaimer()) return;
    setLoading(true);
    try {
      const res = await signInAsGuest("کاربر مهمان");
      if (res.success) {
        toast.success("ورود سریع به عنوان مهمان انجام شد.");
        navigate(returnTo, { replace: true });
      }
    } catch (e: any) {
      toast.error(e?.message || "خطا در ورود سریع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir={isEn ? "ltr" : "rtl"}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/70 via-background to-purple-50/70 dark:from-pink-950/20 dark:via-background dark:to-purple-950/20 p-4 sm:p-6"
    >
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border border-border/70 rounded-2xl bg-card backdrop-blur-sm">
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
            تست سینک هوش مصنوعی (AI Studio Sync Test ✨)
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
          <AlertDescription className="text-xs leading-relaxed text-right">
            <span className="font-semibold text-foreground">یادآوری بالینی: </span>
            این اپ یک ابزار خودمدیریتی است و جایگزین درمان بالینی یا دارودرمانی نیست.
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
                مسئولیت‌نامه را مطالعه کردم و می‌پذیرم.
              </span>
            </label>
          </AlertDescription>
        </Alert>

        {/* Auth Forms */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-5 bg-muted/70 p-1 rounded-xl">
            <TabsTrigger value="signin" className="rounded-lg text-xs sm:text-sm font-medium">
              <LogIn className="w-3.5 h-3.5 me-1.5" />
              ورود
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg text-xs sm:text-sm font-medium">
              <UserPlus className="w-3.5 h-3.5 me-1.5" />
              ثبت‌نام
            </TabsTrigger>
          </TabsList>

          {/* Sign In Form */}
          <TabsContent value="signin" className="focus:outline-none">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-in" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  ایمیل
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
                  رمز عبور
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
                {loading ? "در حال ورود..." : "ورود به حساب"}
              </Button>
            </form>
          </TabsContent>

          {/* Sign Up Form */}
          <TabsContent value="signup" className="focus:outline-none">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name-up" className="text-xs font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  نام و نام خانوادگی
                </Label>
                <Input
                  id="name-up"
                  required
                  placeholder="مثال: حامد حرامی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-up" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  ایمیل
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
                  رمز عبور (حداقل ۶ نویسه)
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
                {loading ? "در حال ثبت‌نام..." : "ساخت حساب کاربری"}
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
            <span className="bg-card px-3 text-muted-foreground font-medium">یا ورود سریع با</span>
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
          ادامه با حساب Google
        </Button>

        {/* Direct Guest Access Button */}
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
            ورود آزمایشی و سریع (بدون نیاز به رمز)
          </Button>
        </div>
      </Card>

      {/* Google Direct Sign-In Dialog */}
      <GoogleDirectDialog
        open={showGoogleDialog}
        onOpenChange={setShowGoogleDialog}
        onSelectAccount={handleSelectGoogleAccount}
        loading={loading}
      />
    </main>
  );
}
