'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  Wifi,
  WifiOff,
  X,
  Share,
  Sparkles,
} from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface PwaInstallPromptProps {
  language: Language;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ language }) => {
  const isFa = language === 'fa';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    }
    return false;
  });
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });
  const [showOfflineToast, setShowOfflineToast] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    }
    return false;
  });
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        setIsOnline(true);
        setShowOfflineToast(true);
        setTimeout(() => setShowOfflineToast(false), 3500);
      };

      const handleOffline = () => {
        setIsOnline(false);
        setShowOfflineToast(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 3. Register Service Worker with Auto-Update & Offline Pre-cache
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);

            // Notify user/update if new SW installed
            reg.onupdatefound = () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version installed and cached.');
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      }

      // 4. Capture BeforeInstallPrompt for Android & Windows
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Show banner after 3 seconds if not already installed and not dismissed in session
        const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
        const isAlreadyStandalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true;
        if (!dismissed && !isAlreadyStandalone) {
          setShowInstallBanner(true);
        }
      };

      const handleAppInstalled = () => {
        setInstallSuccess(true);
        setShowInstallBanner(false);
        setDeferredPrompt(null);
        setIsStandalone(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    }
  };

  return (
    <>
      {/* 1. REAL-TIME OFFLINE / ONLINE TOAST */}
      {showOfflineToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-18 start-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300"
          dir={isFa ? 'rtl' : 'ltr'}
        >
          <div
            className={`px-4 py-2.5 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-bold backdrop-blur-xl ${
              isOnline
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : 'bg-amber-950/95 border-amber-500/50 text-amber-200'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400 animate-bounce" />
            )}
            <span>
              {isOnline
                ? isFa
                  ? '🟢 اتصال اینترنت برقرار است. همگام‌سازی ابری فعال شد.'
                  : '🟢 Back online. Cloud sync active.'
                : isFa
                ? '⚡ حالت آفلاین فعال است: تمامی کارت‌ها، سناریوها و لایتنر از حافظه محلی اجرا می‌شوند.'
                : '⚡ Offline Mode: All cards and modules are accessible locally.'}
            </span>
            <button
              type="button"
              onClick={() => setShowOfflineToast(false)}
              className="ms-2 opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. SUCCESS INSTALL NOTIFICATION */}
      {installSuccess && (
        <div
          role="alert"
          className="fixed bottom-20 start-1/2 -translate-x-1/2 z-50 animate-in zoom-in-95 duration-300"
          dir={isFa ? 'rtl' : 'ltr'}
        >
          <div className="px-5 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>
              {isFa
                ? '🎉 اپلیکیشن با موفقیت روی دستگاه شما نصب شد!'
                : '🎉 App successfully installed on your device!'}
            </span>
          </div>
        </div>
      )}

      {/* 3. PROACTIVE PWA INSTALL FLOATING BANNER (Android / Windows / Chrome / Edge) */}
      {showInstallBanner && !isStandalone && (
        <aside
          aria-label={isFa ? 'نصب اپلیکیشن داروسازی' : 'Install Pharmacy App'}
          className="fixed bottom-18 md:bottom-6 start-3 end-3 sm:start-auto sm:end-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 fade-in duration-300"
          dir={isFa ? 'rtl' : 'ltr'}
        >
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-purple-500/40 shadow-2xl shadow-purple-950/60 backdrop-blur-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                    <span>{isFa ? 'نصب اپلیکیشن داروخانه استرالیا' : 'Install AU Pharmacy App'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-mono">
                      PWA
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-snug pt-0.5">
                    {isFa
                      ? '⚡ دسترسی ۱۰۰٪ آفلاین، اجرای تمام‌صفحه و سرعت فوق‌سریع روی گوشی و کامپیوتر'
                      : '⚡ 100% offline access, fullscreen standalone mode & fast loading on Mobile & PC'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismissBanner}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title={isFa ? 'بستن' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>{isFa ? 'نصب مستقیم اپلیکیشن (رایگان)' : 'Install App (Free)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismissBanner}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                {isFa ? 'بعداً' : 'Later'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 4. IOS SAFARI ADD TO HOME SCREEN MODAL GUIDE */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          dir={isFa ? 'rtl' : 'ltr'}
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">
                  {isFa ? 'نصب روی آیفون / آیپد (iOS)' : 'Install on iPhone / iPad'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0">
                  ۱
                </span>
                <span>
                  {isFa
                    ? 'در نوار پایین مرورگر Safari، روی دکمه اشتراک‌گذاری (Share)'
                    : 'Tap the Share button in Safari bottom bar'}
                  <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" />
                  {isFa ? 'بزنید.' : '.'}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0">
                  ۲
                </span>
                <span>
                  {isFa
                    ? 'از منوی باز شده گزینه «Add to Home Screen» (افزودن به صفحه اصلی) را انتخاب کنید.'
                    : 'Scroll down and select "Add to Home Screen".'}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0">
                  ۳
                </span>
                <span>
                  {isFa
                    ? 'در بالا سمت راست روی «Add» بزنید. آیکون برنامه به صفحه گوشی شما اضافه خواهد شد.'
                    : 'Tap "Add" in the top right. The app will be available on your home screen.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
            >
              {isFa ? 'متوجه شدم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
