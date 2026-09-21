import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Shield, ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBilingual } from "@/hooks/useBilingual";
import { getFeatureCapability } from "@/lib/capabilities";

export default function AdminView() {
  const { isAdmin, loading } = useUserRole();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;
  const adminCapability = getFeatureCapability("admin_panel");

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto page-enter"
      data-testid="admin-view"
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

      <Card className="border-border/60 bg-card/70 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {T("پنل مدیریت ARSHNAZ", "ARSHNAZ Admin Panel")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isEn ? adminCapability.reason_en : adminCapability.reason}
            </p>
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {T(
                "به منظور حفظ امنیت کامل و تفکیک داده‌ها در فایربیس، دسترسی مدیریت صرفاً از طریق توکن‌های احراز هویت سروری (Firebase Custom Claims) کنترل می‌شود و ثبت نقش از طریق داکیومنت‌های کلاینت مجاز نیست.",
                "To maintain strict tenant isolation in Firebase, administrative access is strictly controlled via cryptographically verified server-side claims (Firebase Custom Claims). Client-side role claims are not permitted."
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/40 flex justify-end">
          <Button onClick={() => navigate("/app/today")} size="sm">
            {T("بازگشت به داشبورد", "Return to Dashboard")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
