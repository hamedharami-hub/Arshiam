import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";

export const EducationRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const educationBase = import.meta.env.VITE_EDUCATION_URL || "https://arshnaz-learning.vercel.app";
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const targetUrl = `${educationBase}${search}`;

  useEffect(() => {
    // If running in native Capacitor (Android), open in system browser to preserve app state
    if (Capacitor.isNativePlatform()) {
      window.open(targetUrl, "_system", "noopener");
      navigate("/app/knowledge", { replace: true });
      return;
    }

    // In web/PWA mode, use location.replace so hitting the browser back button doesn't loop
    const timer = setTimeout(() => {
      window.location.replace(targetUrl);
    }, 150);
    return () => clearTimeout(timer);
  }, [navigate, targetUrl]);

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center select-none"
    >
      <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-sm animate-pulse">
        <GraduationCap className="w-12 h-12" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-bold text-foreground">
          {isEn ? "Opening Arshnaz Learning Academy..." : "در حال انتقال به آکادمی آموزش ارشناز..."}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isEn
            ? "Arshnaz Learning provides 432 clinical lessons, interactive quizzes, and shared Leitner flashcards synced with your Firebase account."
            : "آکادمی آموزش ارشناز شامل ۴۳۲ درس، کوییزهای تعاملی و فلش‌کارت‌های متصل به لایتنر است که مستقیماً با حساب فایربیس شما همگام هستند."}
        </p>
      </div>
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="education-open-now"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition active:scale-95"
      >
        <span>{isEn ? "Open Academy Now" : "ورود مستقیم به آکادمی"}</span>
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
};

export default EducationRedirect;
