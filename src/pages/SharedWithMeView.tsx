import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShieldAlert, ArrowLeft, ArrowRight } from "lucide-react";
import { getFeatureCapability } from "@/lib/capabilities";

export default function SharedWithMeView() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const cap = getFeatureCapability("sharing");
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="p-4 md:p-8 max-w-2xl mx-auto page-enter space-y-6"
      data-testid="shared-with-me-view"
    >
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/today")}
          className="text-xs text-muted-foreground"
        >
          <BackIcon className={`w-3.5 h-3.5 ${isEn ? "me-1" : "ms-1"}`} />
          {T("بازگشت به صفحه امروز", "Back to Today")}
        </Button>
      </div>

      <Card className="p-6 space-y-4 border-border/60 bg-card/70">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {T("به اشتراک گذاشته‌شده با من", "Shared with me")}
            </h1>
            <p className="text-xs text-muted-foreground">{isEn ? cap.name_en : cap.name}</p>
          </div>
        </header>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>{isEn ? cap.reason_en : cap.reason}</p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {T(
            "به منظور حفظ محرمانگی و ایزولاسیون کامل داده‌های فردی در فایربیس، اشتراک‌گذاری متقابل منابع تا زمان راه‌اندازی توابع سروری امن غیرفعال است. داده‌های فردی شما کاملاً محرمانه و محفوظ هستند.",
            "To ensure strict privacy and tenant isolation in Firebase, cross-user sharing is temporarily disabled until secure server-side functions are established. Your individual productivity data remains private and secure."
          )}
        </p>

        <div className="pt-4 border-t border-border/40 flex justify-end">
          <Button onClick={() => navigate("/app/today")} size="sm">
            {T("بازگشت به داشبورد", "Return to Dashboard")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
