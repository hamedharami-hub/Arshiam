'use client';

import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  User,
} from '@/lib/firebase';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  LogOut,
  LogIn,
  UserPlus,
  CloudCheck,
  CloudUpload,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  user: User | null;
  language: 'fa' | 'en';
  isSyncing: boolean;
  lastSyncedAt: string | null;
  onClose: () => void;
  onRefreshCloudData: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  language,
  isSyncing,
  lastSyncedAt,
  onClose,
  onRefreshCloudData,
}) => {
  const isFa = language === 'fa';

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccessMsg(isFa ? 'با موفقیت به حساب گوگل وارد شدید.' : 'Signed in with Google successfully.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg(isFa ? 'پنجره ورود توسط کاربر بسته شد.' : 'Popup closed by user.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(isFa ? 'ورود با گوگل در کنسول Firebase هنوز فعال (Enable) نشده است. لطفاً در تب Sign-in method گزینه Google را فعال کنید.' : 'Google provider is not enabled in Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg(isFa ? 'این دامنه در لیست دامنه‌های مجاز (Authorized domains) فایربیس ثبت نشده است.' : 'This domain is not authorized in Firebase Console.');
      } else {
        const detail = err.code ? ` (${err.code})` : (err.message ? ` - ${err.message}` : '');
        setErrorMsg(isFa ? `خطا در ورود با گوگل: ${detail}` : `Failed to sign in with Google: ${detail}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Email/Password Auth
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || (mode !== 'forgot' && !password)) {
      setErrorMsg(isFa ? 'لطفاً تمامی فیلدها را پر کنید.' : 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg(isFa ? 'خوش آمدید! ورود موفقیت‌آمیز بود.' : 'Signed in successfully.');
        setTimeout(() => onClose(), 800);
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setErrorMsg(isFa ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.' : 'Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg(isFa ? 'حساب کاربری شما با موفقیت ساخته شد و اطلاعات همگام شدند.' : 'Account created successfully!');
        setTimeout(() => onClose(), 1000);
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg(
          isFa
            ? 'لینک بازنشانی رمز عبور به ایمیل شما ارسال شد.'
            : 'Password reset link sent to your email.'
        );
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err?.code || '';
      const message = err?.message || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg(isFa ? 'ایمیل یا رمز عبور اشتباه است.' : 'Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg(isFa ? 'این ایمیل قبلاً ثبت‌نام شده است. لطفاً از تب "ورود به حساب" وارد شوید.' : 'Email is already registered. Please sign in.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg(isFa ? 'فرمت ایمیل معتبر نیست (مثال: name@gmail.com).' : 'Invalid email address.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg(isFa ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.' : 'Password is too weak (minimum 6 chars).');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg(isFa ? 'خطای شبکه در اتصال به سرور فایربیس. لطفاً اتصال اینترنت خود را بررسی کنید.' : 'Network request failed. Check your internet connection.');
      } else {
        setErrorMsg(isFa ? `خطای ثبت‌نام/ورود: ${code || message}` : `Auth Error: ${code || message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setSuccessMsg(isFa ? 'از حساب کاربری خارج شدید.' : 'Signed out successfully.');
      setTimeout(() => onClose(), 800);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="app-card border app-border p-5 sm:p-7 rounded-3xl max-w-md w-full space-y-5 shadow-2xl relative text-xs my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b app-border pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 text-sky-400 border border-sky-500/30">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold app-text text-sm sm:text-base">
                {user
                  ? isFa
                    ? 'حساب کاربری ابری شما'
                    : 'Your Cloud Account'
                  : isFa
                  ? 'ورود / ایجاد حساب کاربری'
                  : 'Account Sign In / Register'}
              </h3>
              <p className="text-[11px] app-muted">
                {user
                  ? isFa
                    ? 'تمام تغییرات، کارت‌ها و علامت‌گذاری‌های شما ذخیره می‌شوند'
                    : 'All your changes and edits are saved safely in cloud'
                  : isFa
                  ? 'جهت ذخیره دائمی تغییرات و دسترسی از همه دستگاه‌ها'
                  : 'Sync changes across all devices seamlessly'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border app-border app-muted hover:app-text hover:bg-black/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOGGED IN USER PROFILE */}
        {user ? (
          <div className="space-y-4">
            {/* User Info Badge */}
            <div className="p-4 rounded-2xl bg-black/20 border app-border space-y-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt="User Profile"
                    className="w-12 h-12 rounded-full border border-sky-400/40 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-lg border border-sky-500/30">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CloudCheck className="w-3.5 h-3.5" />
                    <span>{isFa ? 'متصل به سیستم ابری' : 'Connected to Cloud'}</span>
                  </span>
                  <h4 className="font-bold app-text text-xs sm:text-sm truncate mt-0.5">
                    {user.displayName || user.email || 'کاربر فارماکولوژی'}
                  </h4>
                  <p className="text-[10px] app-muted truncate">{user.email}</p>
                </div>
              </div>

              {/* Sync Status Banner */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  {isSyncing ? (
                    <>
                      <CloudUpload className="w-4 h-4 animate-bounce" />
                      <span>{isFa ? 'در حال همگام‌سازی با ابر...' : 'Syncing changes...'}</span>
                    </>
                  ) : (
                    <>
                      <CloudCheck className="w-4 h-4" />
                      <span>{isFa ? 'تغییرات شما در ابعاد ابری ذخیره شده است' : 'All changes saved to cloud'}</span>
                    </>
                  )}
                </div>

                {lastSyncedAt && (
                  <span className="text-[10px] app-muted font-mono dir-ltr">
                    {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Manual Sync Refresh & Sign Out */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onRefreshCloudData}
                className="flex-1 py-2.5 px-4 rounded-xl border app-border app-text hover:bg-black/20 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <CloudUpload className="w-4 h-4 text-sky-400" />
                <span>{isFa ? 'بروزرسانی داده‌ها از ابر' : 'Fetch Cloud Sync'}</span>
              </button>

              <button
                onClick={handleSignOut}
                className="py-2.5 px-4 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>{isFa ? 'خروج از حساب' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* LOGGED OUT: LOGIN / REGISTER / GOOGLE FORM */
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-2xl border app-border">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'app-muted hover:app-text'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isFa ? 'ورود به حساب' : 'Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'app-muted hover:app-text'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isFa ? 'ثبت‌نام جدید' : 'Register'}</span>
              </button>
            </div>

            {/* Google Fast Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-md border border-slate-200 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isFa ? 'ورود سریع با حساب گوگل' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center gap-2 text-slate-500 my-2">
              <div className="h-[1px] flex-1 bg-slate-700/40" />
              <span className="text-[10px] app-muted font-bold">{isFa ? 'یا با ایمیل' : 'OR WITH EMAIL'}</span>
              <div className="h-[1px] flex-1 bg-slate-700/40" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] flex items-center gap-2 animate-fadeIn">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="app-muted font-bold text-[11px] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isFa ? 'آدرس ایمیل:' : 'Email Address:'}</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  dir="ltr"
                  className="w-full bg-black/20 border app-border p-2.5 rounded-xl app-text text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Password Input (if not forgot) */}
              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="app-muted font-bold text-[11px] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isFa ? 'رمز عبور:' : 'Password:'}</span>
                    </label>

                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMsg(null);
                        }}
                        className="text-[10px] text-sky-400 hover:underline"
                      >
                        {isFa ? 'فراموشی رمز عبور؟' : 'Forgot Password?'}
                      </button>
                    )}
                  </div>

                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full bg-black/20 border app-border p-2.5 rounded-xl app-text text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs transition shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>{isFa ? 'در حال پردازش...' : 'Processing...'}</span>
                ) : mode === 'signin' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isFa ? 'ورود به حساب کاربری' : 'Sign In'}</span>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isFa ? 'ثبت‌نام و همگام‌سازی ابری' : 'Register & Sync'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{isFa ? 'ارسال لینک بازیابی رمز' : 'Send Password Reset Email'}</span>
                  </>
                )}
              </button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full text-center text-[11px] text-sky-400 hover:underline pt-1"
                >
                  {isFa ? 'بازگشت به فرم ورود' : 'Back to Sign In'}
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
